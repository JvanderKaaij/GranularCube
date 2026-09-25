import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['src/ai/PatchTransition.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`;
const { morphParameters, fitSampleWindow } = await import(moduleUrl);

const from = { lengthMin: 100, lengthMax: 200, filterType: 'lowpass', reverbMix: 0.2 };
const to = { lengthMin: 300, lengthMax: 450, filterType: 'bandpass', reverbMix: 0.8 };
assert.deepEqual(morphParameters(from, to, 0, ['filterType']), from);
assert.deepEqual(morphParameters(from, to, 1, ['filterType']), to);
for (const progress of [0.1, 0.3, 0.5, 0.7, 0.9]) {
  const current = morphParameters(from, to, progress, ['filterType']);
  assert.ok(current.lengthMin <= current.lengthMax);
  assert.ok(current.reverbMix > from.reverbMix && current.reverbMix < to.reverbMix);
  assert.equal(current.filterType, progress < 0.5 ? 'lowpass' : 'bandpass');
}

const selection = { selectionStart: 0, selectionEnd: 0 };
assert.deepEqual(fitSampleWindow(selection, 8000, true), { selectionStart: 0, selectionEnd: 8000 });
assert.deepEqual(fitSampleWindow({ selectionStart: 10000, selectionEnd: 18000 }, 8000, true), { selectionStart: 0, selectionEnd: 8000 });
assert.deepEqual(fitSampleWindow({ selectionStart: 1000, selectionEnd: 18000 }, 8000, true), { selectionStart: 1000, selectionEnd: 8000 });
assert.deepEqual(fitSampleWindow(selection, 8000, false), selection);

console.log('Patch transition validation passed.');
