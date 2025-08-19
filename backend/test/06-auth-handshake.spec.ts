import { MongoMemoryServer } from 'mongodb-memory-server';
import { io as Client } from 'socket.io-client';
import jwt from 'jsonwebtoken';

jest.setTimeout(60000);

jest.mock('ioredis', () => {
  class RedisMock {
    duplicate() { return new RedisMock(); }
    incr() { return Promise.resolve(1); }
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

describe('socket auth handshake', () => {
  let mongod: MongoMemoryServer;
  let start: any, shutdown: any, server: any;
  let url: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    process.env.JWT_SECRET = 'testsecret';
    process.env.PORT = '6012';
    ({ start, shutdown, server } = await import('../src/server.js'));
    await start();
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    url = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await shutdown();
    await mongod.stop();
  });

  it('connects with valid token', async () => {
    const token = jwt.sign({ sub: 'u1', role: 'user' }, process.env.JWT_SECRET as string);
    const client = Client(url, { transports: ['websocket'], auth: { token } });
    await new Promise<void>((resolve) => client.on('connect', resolve));
    expect(client.connected).toBe(true);
    client.close();
  });

  it('rejects invalid token', async () => {
    const client = Client(url, { transports: ['websocket'], auth: { token: 'bad' } });
    const err: any = await new Promise((resolve) => client.on('connect_error', resolve));
    expect(err.data.code).toBe('AUTH');
    client.close();
  });
});
