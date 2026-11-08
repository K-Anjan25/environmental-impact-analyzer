import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import type { Plugin, ViteDevServer } from 'vite';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const apiRoot = resolve(repositoryRoot, 'services/api');
const isWindows = process.platform === 'win32';
const localPython = resolve(repositoryRoot, isWindows ? '.venv/Scripts/python.exe' : '.venv/bin/python');
const python = process.env.PYTHON || (existsSync(localPython) ? localPython : (isWindows ? 'python' : 'python3'));
const apiHealthUrl = 'http://127.0.0.1:8000/healthz';

async function apiIsHealthy(): Promise<boolean> {
  try {
    const response = await fetch(apiHealthUrl, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch {
    return false;
  }
}

function localApiPlugin(): Plugin {
  let apiProcess: ChildProcess | undefined;

  return {
    name: 'environmental-impact-local-api',
    apply: (_config, environment) => environment.command === 'serve' && environment.mode !== 'test' && process.env.VITEST !== 'true',
    async configureServer(server: ViteDevServer) {
      if (await apiIsHealthy()) {
        console.info('Using the API already running at http://127.0.0.1:8000.');
        return;
      }

      const dependencies = spawnSync(python, ['-c', 'import uvicorn, fastapi, pydantic'], {
        cwd: apiRoot,
        encoding: 'utf8',
      });
      if (dependencies.status !== 0) {
        throw new Error(
          `The API is unavailable and its Python dependencies cannot be imported with "${python}". ` +
            'Install services/api/requirements-dev.txt in .venv, or set PYTHON to the configured interpreter.',
        );
      }

      console.info('API unavailable; starting it before Vite accepts requests…');
      apiProcess = spawn(python, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'], {
        cwd: apiRoot,
        stdio: 'inherit',
        env: process.env,
      });

      const ready = await new Promise<boolean>((resolveReady) => {
        const deadline = Date.now() + 45_000;
        const check = async () => {
          if (await apiIsHealthy()) {
            resolveReady(true);
            return;
          }
          if (apiProcess?.exitCode !== null && apiProcess?.exitCode !== undefined) {
            resolveReady(false);
            return;
          }
          if (Date.now() >= deadline) {
            resolveReady(false);
            return;
          }
          setTimeout(check, 350);
        };
        apiProcess?.once('error', () => resolveReady(false));
        void check();
      });

      if (!ready) {
        apiProcess?.kill();
        throw new Error('The API failed to become healthy at http://127.0.0.1:8000/healthz; Vite was not started.');
      }

      console.info('API is healthy at http://127.0.0.1:8000.');
      apiProcess?.once('exit', (code) => {
        if (code !== null && server.httpServer?.listening) {
          console.error(`Local API exited unexpectedly (${code}); shutting Vite down to prevent proxy errors.`);
          void server.close();
        }
      });
      server.httpServer?.once('close', () => {
        if (apiProcess && apiProcess.exitCode === null) apiProcess.kill();
      });
    },
  };
}

export default defineConfig({
  plugins: [localApiPlugin(), react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app'],
    // Legal pages import the repository's root legal files (see src/legal/legal-docs.ts).
    fs: { allow: ['..', '../..'] },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/healthz': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'ui-vendor',
              test: /node_modules[\\/](@mui|@emotion)[\\/]/,
              priority: 2,
            },
            {
              name: 'vendor',
              test: /node_modules[\\/]/,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
