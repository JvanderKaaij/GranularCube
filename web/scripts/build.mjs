import { build } from 'esbuild';
import { buildOptions, cleanOutput, prepareOutput } from './shared.mjs';

await cleanOutput();
await prepareOutput();
await build({ ...buildOptions, minify: true });
