import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webDir = resolve(scriptDir, '..');
const repoDir = resolve(webDir, '../..');
const apiDir = resolve(repoDir, 'services/api');
const isWindows = process.platform === 'win32';
const localPython = resolve(repoDir, isWindows ? '.venv/Scripts/python.exe' : '.venv/bin/python');
const python = process.env.PYTHON || (existsSync(localPython) ? localPython : (isWindows ? 'python' : 'python3'));
const apiHealthUrl = 'http://127.0.0.1:8000/healthz';
const viteEntry = resolve(webDir, 'node_modules/vite/bin/vite.js');
let apiProcess;
let viteProcess;
let shuttingDown = false;

function stopChildren(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (viteProcess && !viteProcess.killed) viteProcess.kill();
  if (apiProcess && !apiProcess.killed) apiProcess.kill();
  process.exitCode = exitCode;
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => stopChildren(signal === 'SIGINT' ? 130 : 143));
}

function pythonCanImportApi() {
  const result = spawnSync(python, ['-c', 'import uvicorn, fastapi, pydantic'], {
    cwd: apiDir,
    encoding: 'utf8',
  });
  return result.status === 0;
}

async function apiIsHealthy() {
  try {
    const response = await fetch(apiHealthUrl, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForApi() {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (await apiIsHealthy()) return true;
    if (apiProcess?.exitCode !== null && apiProcess?.exitCode !== undefined) return false;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 350));
  }
  return false;
}

async function main() {
  if (!existsSync(viteEntry)) {
    console.error('Web dependencies are missing. Run: npm ci --prefix apps/web');
    process.exitCode = 1;
    return;
  }

  if (!(await apiIsHealthy())) {
    if (!pythonCanImportApi()) {
      console.error(`\nThe API cannot start because Python dependencies are unavailable for "${python}".\nInstall them with:\n  python -m venv .venv\n  ${isWindows ? '.venv\\Scripts\\python.exe' : '.venv/bin/python'} -m pip install -r services/api/requirements-dev.txt\nThen run:\n  npm run dev --prefix apps/web\n`);
      process.exitCode = 1;
      return;
    }

    console.log('Starting the API for the web development server…');
    apiProcess = spawn(python, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'], {
      cwd: apiDir,
      stdio: 'inherit',
      env: process.env,
    });
    apiProcess.on('error', (error) => {
      console.error(`Could not start the API process: ${error.message}`);
      stopChildren(1);
    });

    if (!(await waitForApi())) {
      console.error('\nThe API did not become healthy at http://127.0.0.1:8000/healthz; the web server was not started.');
      stopChildren(1);
      return;
    }
    console.log('API is healthy at http://127.0.0.1:8000.');
  } else {
    console.log('Using the already-running API at http://127.0.0.1:8000.');
  }

  if (shuttingDown) return;
  viteProcess = spawn(process.execPath, [viteEntry, ...process.argv.slice(2)], {
    cwd: webDir,
    stdio: 'inherit',
    env: process.env,
  });
  viteProcess.on('error', (error) => {
    console.error(`Could not start Vite: ${error.message}`);
    stopChildren(1);
  });
  viteProcess.on('exit', (code, signal) => {
    stopChildren(signal ? 1 : (code ?? 1));
  });
  apiProcess?.on('exit', (code) => {
    if (!shuttingDown && code !== null) {
      console.error(`\nThe API process exited unexpectedly (${code}); stopping Vite to avoid proxy failures.`);
      stopChildren(code || 1);
    }
  });
}

main().catch((error) => {
  console.error(`Development startup failed: ${error.message}`);
  stopChildren(1);
});
