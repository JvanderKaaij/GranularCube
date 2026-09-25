import { context } from 'esbuild';
import { buildOptions, cleanOutput, outputRoot, prepareOutput } from './shared.mjs';

await cleanOutput();
await prepareOutput();
const builder = await context({ ...buildOptions, sourcemap: true });
await builder.watch();
const { port } = await builder.serve({ servedir: outputRoot, host: '127.0.0.1', port: 5173 });
console.log(`GranularCube Web: http://127.0.0.1:${port}`);
