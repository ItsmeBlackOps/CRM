import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';

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

let start: any, shutdown: any, app: any, io: any, server: any;

describe('server bootstrap', () => {
  beforeAll(async () => {
    process.env.MONGODB_URI = (await MongoMemoryServer.create()).getUri();
    process.env.JWT_SECRET = 'test';
    process.env.PORT = '0';
    process.env.REDIS_URL = 'redis://localhost:6379';
    ({ start, shutdown, app, io, server } = await import('../src/server'));
    await start();
  });

  afterAll(async () => {
    await shutdown();
  });

  it('express listens', () => {
    expect(server.listening).toBe(true);
  });

  it('socket.io is websocket only', () => {
    expect(io.engine.opts.transports).toEqual(['websocket']);
  });

  it('health endpoints respond', async () => {
    await supertest(app).get('/healthz').expect(200, 'ok');
    const ready = await supertest(app).get('/readyz').expect(200);
    expect(ready.body).toEqual({ mongo: true, redis: true });
    process.env.GIT_SHA = 'abc123';
    const version = await supertest(app).get('/version').expect(200);
    expect(version.body.sha).toBe('abc123');
  });
});
