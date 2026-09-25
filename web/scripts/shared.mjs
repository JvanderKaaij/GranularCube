import { cp, copyFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

export const webRoot = fileURLToPath(new URL('../', import.meta.url));
export const outputRoot = join(webRoot, 'dist');
const samplesRoot = fileURLToPath(new URL('../../Samples/', import.meta.url));

export async function cleanOutput() {
  // Only this app's generated directory may be removed.
  if (resolve(outputRoot) !== resolve(webRoot, 'dist')) {
    throw new Error('Unexpected build output path');
  }
  await rm(outputRoot, { recursive: true, force: true });
}

export const buildOptions = {
  entryPoints: [join(webRoot, 'src/main.ts')],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  outfile: join(outputRoot, 'app.js'),
  logLevel: 'info',
};

export async function prepareOutput() {
  await mkdir(outputRoot, { recursive: true });
  await copyFile(join(webRoot, 'index.html'), join(outputRoot, 'index.html'));
  await cp(samplesRoot, outputRoot, { recursive: true });
}
