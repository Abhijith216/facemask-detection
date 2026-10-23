import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const backend = resolve(root, 'backend');
const venvPython = process.platform === 'win32'
  ? resolve(backend, '.venv', 'Scripts', 'python.exe')
  : resolve(backend, '.venv', 'bin', 'python');
const python = existsSync(venvPython) ? venvPython : (process.platform === 'win32' ? 'py' : 'python3');
const pythonArgs = existsSync(venvPython) ? ['app.py'] : (process.platform === 'win32' ? ['-3.12', 'app.py'] : ['app.py']);

const backendProcess = spawn(python, pythonArgs, { cwd: backend, stdio: 'inherit' });
const frontendProcess = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev:vite'], {
  cwd: resolve(root, 'frontend'), stdio: 'inherit', shell: process.platform === 'win32'
});

const stop = (code = 0) => {
  if (!backendProcess.killed) backendProcess.kill();
  if (!frontendProcess.killed) frontendProcess.kill();
  process.exit(code);
};
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
backendProcess.on('exit', (code) => { if (code && code !== 0) stop(code); });
frontendProcess.on('exit', (code) => { if (code && code !== 0) stop(code); });
