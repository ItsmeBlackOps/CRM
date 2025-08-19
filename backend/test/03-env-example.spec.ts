import fs from 'fs';
import path from 'path';

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
jest.mock('@socket.io/redis-adapter', () => ({ createAdapter: () => class {} }));

describe('.env.example', () => {
  const envPath = path.join(__dirname, '..', '.env.example');
  const content = fs.readFileSync(envPath, 'utf-8');

  it('contains required keys', () => {
    for (const key of ['MONGODB_URI', 'JWT_SECRET', 'REDIS_URL', 'PORT']) {
      expect(content).toMatch(new RegExp(`^${key}=`, 'm'));
    }
  });
});

describe('bootstrap', () => {
  const original = process.env.JWT_SECRET;
  afterAll(async () => {
    process.env.JWT_SECRET = original;
  });

  it('fails without JWT_SECRET', async () => {
    process.env.JWT_SECRET = '';
    const { start } = await import('../src/server');
    await expect(start()).rejects.toThrow('JWT_SECRET');
  });
});
