import { MongoMemoryServer } from 'mongodb-memory-server';
import { io as Client } from 'socket.io-client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../src/models/user.js';

jest.setTimeout(20000);
jest.mock('ioredis', () => {
  class RedisMock {
    store = new Map<string, any>();
    duplicate() { return new RedisMock(); }
    incr(key: string) {
      const v = (this.store.get(key) || 0) + 1;
      this.store.set(key, v);
      return Promise.resolve(v);
    }
    expire() { return Promise.resolve(1); }
    ping() { return Promise.resolve('PONG'); }
    get(key: string) { return Promise.resolve(this.store.get(key)); }
    set(key: string, val: string) { this.store.set(key, val); return Promise.resolve('OK'); }
    del(key: string) { this.store.delete(key); return Promise.resolve(1); }
    quit() { return Promise.resolve(); }
  }
  return RedisMock;
});

jest.mock('@socket.io/redis-adapter', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Adapter } = require('socket.io-adapter');
  return { createAdapter: () => Adapter };
});

describe('tasks events', () => {
  let mongod: MongoMemoryServer;
  let start: any, shutdown: any, server: any;
  let url: string;
  let token: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    process.env.JWT_SECRET = 'testsecret';
    process.env.PORT = '6011';
    process.env.REDIS_URL = 'redis://localhost:6379';
    ({ start, shutdown, server } = await import('../src/server.js'));
    await start();
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    url = `http://localhost:${port}`;

    const user = await UserModel.create({
      email: 'tasker@example.com',
      passwordHash: await bcrypt.hash('secret', 10),
      role: 'user',
    });
    token = jwt.sign({ sub: user._id.toString(), role: 'user' }, process.env.JWT_SECRET as string);
  });

  afterAll(async () => {
    await shutdown();
    await mongod.stop();
  });

  it('creates a task and lists todays tasks', async () => {
    const client = Client(url, { transports: ['websocket'], auth: { token } });
    await new Promise<void>((resolve) => client.on('connect', resolve));

    const created: any = await new Promise((resolve) => {
      client.once('tasks:created', (data) => resolve({ type: 'created', data }));
      client.once('tasks:error', (data) => resolve({ type: 'error', data }));
      client.emit('tasks:create', { description: 'first task' });
    });
    expect(created.type).toBe('created');
    expect(created.data.task.description).toBe('first task');

    const list: any = await new Promise((resolve) => {
      client.emit('tasks:listToday');
      client.on('tasks:list', (data) => resolve(data));
    });
    expect(list.tasks.length).toBe(1);
    expect(list.tasks[0].description).toBe('first task');
    client.close();
  });

  it('rate limits tasks:create after 10', async () => {
    const user = await UserModel.create({
      email: 'limit@example.com',
      passwordHash: await bcrypt.hash('secret', 10),
      role: 'user',
    });
    const limitToken = jwt.sign({ sub: user._id.toString(), role: 'user' }, process.env.JWT_SECRET as string);
    const client = Client(url, { transports: ['websocket'], auth: { token: limitToken } });
    await new Promise<void>((resolve) => client.on('connect', resolve));

    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => {
        client.once('tasks:created', () => resolve(null));
        client.emit('tasks:create', { description: `t${i}` });
      });
    }
    const res: any = await new Promise((resolve) => {
      client.once('tasks:error', (data) => resolve({ type: 'error', data }));
      client.once('tasks:created', (data) => resolve({ type: 'created', data }));
      client.emit('tasks:create', { description: 'overflow' });
    });
    expect(res.type).toBe('error');
    expect(res.data.code).toBe('RATE_LIMIT');
    client.close();
  });
});
