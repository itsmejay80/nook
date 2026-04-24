import { context } from 'esbuild';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outdir = path.join(root, 'dist-electron');

const VITE_PORT = 5173;
const VITE_URL = `http://localhost:${VITE_PORT}`;

async function waitForUrl(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await new Promise((resolve) => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(true);
      });
      req.once('error', () => resolve(false));
      req.setTimeout(1000, () => {
        req.destroy();
        resolve(false);
      });
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Vite dev server did not start at ${url}`);
}

/** @type {import('esbuild').BuildOptions} */
const shared = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  external: ['electron', 'electron-updater', 'better-sqlite3'],
  logLevel: 'info',
};

const mainCtx = await context({
  ...shared,
  entryPoints: [path.join(root, 'src/main.ts')],
  outfile: path.join(outdir, 'main.cjs'),
});
const preloadCtx = await context({
  ...shared,
  entryPoints: [path.join(root, 'src/preload.ts')],
  outfile: path.join(outdir, 'preload.cjs'),
});

await Promise.all([mainCtx.rebuild(), preloadCtx.rebuild()]);
await Promise.all([mainCtx.watch(), preloadCtx.watch()]);

console.log(`[nook] waiting for Vite at ${VITE_URL} …`);
await waitForUrl(VITE_URL);
console.log(`[nook] Vite up — launching Electron`);

const electronBin = (await import('electron')).default;
const child = spawn(electronBin, [path.join(outdir, 'main.cjs')], {
  stdio: 'inherit',
  env: { ...process.env, VITE_DEV_SERVER_URL: VITE_URL },
});

const shutdown = async (code = 0) => {
  await Promise.allSettled([mainCtx.dispose(), preloadCtx.dispose()]);
  process.exit(code);
};

child.on('exit', (code) => shutdown(code ?? 0));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));

await once(child, 'exit');
