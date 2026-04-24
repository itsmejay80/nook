import { build } from 'esbuild';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outdir = path.join(root, 'dist-electron');

await rm(outdir, { recursive: true, force: true });

/** @type {import('esbuild').BuildOptions} */
const shared = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  minify: process.env.NODE_ENV === 'production',
  external: ['electron', 'electron-updater', 'better-sqlite3'],
  logLevel: 'info',
};

await Promise.all([
  build({
    ...shared,
    entryPoints: [path.join(root, 'src/main.ts')],
    outfile: path.join(outdir, 'main.cjs'),
  }),
  build({
    ...shared,
    entryPoints: [path.join(root, 'src/preload.ts')],
    outfile: path.join(outdir, 'preload.cjs'),
  }),
]);
