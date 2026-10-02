import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const vitePkgPath = require.resolve('vite/package.json');
const vitePkg = require(vitePkgPath);
const viteBin = path.join(
  path.dirname(vitePkgPath),
  typeof vitePkg.bin === 'string' ? vitePkg.bin : vitePkg.bin.vite
);

const port = process.env.PORT || '4173';

const child = spawn(
  process.execPath,
  [viteBin, 'preview', '--host', '0.0.0.0', '--port', port, '--strictPort'],
  { stdio: 'inherit' }
);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
