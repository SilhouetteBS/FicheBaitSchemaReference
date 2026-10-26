import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Launch JavaScript with Node directly: Windows cannot spawn a .cmd shim without a shell.
const viteBin = fileURLToPath(new URL('./bin/vite.js', import.meta.resolve('vite/package.json')));

const child = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', ...process.argv.slice(2)], {
  env: {
    ...process.env,
    VITE_ENABLE_EDITING: 'true',
  },
  stdio: 'inherit',
  shell: false,
});

child.on('error', (error) => {
  console.error(`Unable to start editing server: ${error.message}`);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
