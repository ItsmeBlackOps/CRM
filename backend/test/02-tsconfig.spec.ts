import fs from 'fs';
import path from 'path';

describe('tsconfig.json', () => {
  const cfgPath = path.join(__dirname, '..', 'tsconfig.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
  const opts = cfg.compilerOptions;

  it('enables strict mode', () => {
    expect(opts.strict).toBe(true);
  });

  it('targets ES2022/Node20', () => {
    expect(opts.target).toMatch(/ES2022/);
  });

  it('enables esModuleInterop', () => {
    expect(opts.esModuleInterop).toBe(true);
  });

  it('uses incremental build', () => {
    expect(opts.incremental).toBe(true);
  });
});
