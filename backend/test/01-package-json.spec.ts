import fs from 'fs';
import path from 'path';

describe('package.json', () => {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  it('has required dependencies', () => {
    const deps = pkg.dependencies;
    const required = [
      'express',
      'socket.io',
      'mongoose',
      'zod',
      'jsonwebtoken',
      'dotenv',
      'bcryptjs',
      'ioredis',
      '@socket.io/redis-adapter',
    ];
    for (const dep of required) {
      expect(deps[dep]).toBeDefined();
    }
  });

  it('has required scripts', () => {
    const scripts = pkg.scripts;
    for (const s of ['dev', 'build', 'start', 'test']) {
      expect(scripts[s]).toBeDefined();
    }
  });
});
