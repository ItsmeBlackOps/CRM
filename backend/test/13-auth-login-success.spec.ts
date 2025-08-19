import { MongoMemoryServer } from 'mongodb-memory-server';
import { io as Client } from 'socket.io-client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../src/models/user.js';

jest.setTimeout(20000);
jest.mock('ioredis', () => {
  class RedisMock {
    store = new Map<string, number>();
    duplicate() { return new RedisMock(); }
    incr(key: string) {
      const v = (this.store.get(key) || 0) + 1;
      this.store.set(key, v);
      return Promise.resolve(v);
    }
    expire() { return Promise.resolve(1); }
    ping() { return Promise.resolve('PONG'); }
    quit() { return Promise.resolve(); }
  }
  return RedisMock;
});

jest.mock('@socket.io/redis-adapter', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Adapter } = require('socket.io-adapter');
  return { createAdapter: () => Adapter };
});

describe('auth:login success', () => {
  let mongod: MongoMemoryServer;
  let start: any, shutdown: any, server: any;
  let url: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    process.env.JWT_SECRET = 'testsecret';
    process.env.PORT = '6010';
    process.env.REDIS_URL = 'redis://localhost:6379';
    ({ start, shutdown, server } = await import('../src/server.js'));
    await start();
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    url = `http://localhost:${port}`;

    await UserModel.create({
      email: 'test@example.com',
      passwordHash: await bcrypt.hash('secret', 10),
      role: 'user',
    });
  });

  afterAll(async () => {
    await shutdown();
    await mongod.stop();
  });

  it('emits auth:ok for valid credentials', async () => {
    const client = Client(url, { transports: ['websocket'] });
    await new Promise<void>((resolve) => client.on('connect', resolve));
    const res: any = await new Promise((resolve) => {
      client.emit('auth:login', { email: 'TEST@example.com', password: 'secret' });
      client.on('auth:ok', (data) => resolve({ type: 'ok', data }));
      client.on('auth:error', (data) => resolve({ type: 'error', data }));
    });
    client.close();

    expect(res.type).toBe('ok');
    expect(res.data).toMatchObject({
      token: expect.any(String),
      userId: expect.any(String),
      role: 'user',
    });
    const payload: any = jwt.decode(res.data.token);
    expect(payload.sub).toBe(res.data.userId);
  });
});
