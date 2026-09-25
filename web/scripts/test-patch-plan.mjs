import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['src/ai/PatchPlan.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`;
const { buildImagePatchPrompt, buildMoodPrompt, IMAGE_PATCH_SYSTEM_PROMPT, parseImagePatchPlan, parsePatchPlan } = await import(moduleUrl);

const snapshot = {
  master: { reverbMix: 0.6, reverbDecay: 2.8, gain: 1 },
  modules: [
    {
      id: 1, type: 'granular', label: 'GRAIN 01', playing: true,
      sample: 'violin.wav', sampleDurationMs: 18853.56,
      parameters: {
        density: 6, lengthMin: 100, lengthMax: 200, ampMin: 0.5, ampMax: 1,
        selectionStart: 0, selectionEnd: 18853.56, filterFreqMin: 200,
        filterFreqMax: 20000, filterQMin: 0.5, filterQMax: 0.5,
        filterType: 'lowpass', reverbMix: 0.28, reverbDecay: 7,
        reverbShimmer: 0.35, gain: 0.2,
      },
    },
    {
      id: 2, type: 'bell', label: 'BELL 02', playing: false,
      sequence: [0, 7, 12, 4, 9, 2, 7, 14],
      parameters: {
        rootNote: 60, rate: 0.8, decay: 5, softness: 0.75,
        strikePosition: 0.28, noiseAmount: 0.22, noiseColor: 0.48, noiseDecay: 0.06,
        inharmonicity: 1, brightness: 0.6, damping: 0.25, beating: 0.08, body: 0.2, spread: 0.35,
        reverbMix: 0.25, reverbDecay: 6, gain: 0.28,
      },
    },
  ],
};

const response = {
  master: { reverbMix: 0.4, reverbDecay: 3.5, gain: 0.8 },
  modules: [
    { id: 1, type: 'granular', sample: 'violin.wav', parameters: { ...snapshot.modules[0].parameters, density: 9, filterFreqMin: 340, filterFreqMax: 2400 } },
    { id: 2, type: 'bell', parameters: { ...snapshot.modules[1].parameters, rootNote: 62, rate: 1.1, noiseAmount: 0.75, inharmonicity: 0.4 }, sequence: [0, 3, 7, 10, 12] },
  ],
};

const plan = parsePatchPlan(`\`\`\`json\n${JSON.stringify(response)}\n\`\`\``, snapshot);
assert.equal(plan.modules[0].parameters.density, 9);
assert.equal(plan.modules[0].sample, 'violin.wav');
assert.equal(plan.modules[1].parameters.rootNote, 62);
assert.equal(plan.modules[1].parameters.noiseAmount, 0.75);
assert.equal(plan.modules[1].parameters.inharmonicity, 0.4);
assert.deepEqual(plan.modules[1].sequence, [0, 3, 7, 10, 12]);
assert.equal(plan.master.gain, 0.8);
assert.match(buildMoodPrompt('quiet dawn', snapshot), /quiet dawn/);
assert.match(buildMoodPrompt('quiet dawn', snapshot), /violin\.wav/);
assert.match(buildMoodPrompt('quiet dawn', snapshot), /egg_shaker\.wav/);
assert.match(buildMoodPrompt('quiet dawn', snapshot), /"sequence": \[/);

assert.throws(() => parsePatchPlan(JSON.stringify({ ...response, modules: response.modules.slice(0, 1) }), snapshot), /every current module/);
assert.throws(() => parsePatchPlan(JSON.stringify({ ...response, modules: [
  { ...response.modules[0], sample: 'unknown.wav' }, response.modules[1],
] }), snapshot), /sample must be an available sample filename/);
assert.throws(() => parsePatchPlan(JSON.stringify({ ...response, modules: [
  { ...response.modules[0], sample: undefined }, response.modules[1],
] }), snapshot), /sample must be an available sample filename/);
const switched = parsePatchPlan(JSON.stringify({ ...response, modules: [
  { ...response.modules[0], sample: 'egg_shaker.wav', parameters: { ...response.modules[0].parameters, selectionStart: 0, selectionEnd: 0 } },
  response.modules[1],
] }), snapshot);
assert.equal(switched.modules[0].sample, 'egg_shaker.wav');
assert.equal(switched.modules[0].parameters.selectionEnd, 0);
assert.throws(() => parsePatchPlan(JSON.stringify({ ...response, master: { reverbMix: 0.4, reverbDecay: 3.5, gain: 4 } }), snapshot), /master\.gain/);
assert.throws(() => parsePatchPlan(JSON.stringify({ ...response, modules: [
  { ...response.modules[0], parameters: { ...response.modules[0].parameters, lengthMin: 500, lengthMax: 100 } },
  response.modules[1],
] }), snapshot), /lengthMin exceeds lengthMax/);
assert.throws(() => parsePatchPlan(JSON.stringify({ ...response, modules: [
  { ...response.modules[0], parameters: { ...response.modules[0].parameters, selectionEnd: 20000 } },
  response.modules[1],
] }), snapshot), /selectionEnd/);
assert.throws(() => parsePatchPlan(JSON.stringify({ ...response, modules: [
  response.modules[0], { ...response.modules[1], sequence: undefined },
] }), snapshot), /sequence/);
assert.throws(() => parsePatchPlan(JSON.stringify({ ...response, modules: [
  response.modules[0], { ...response.modules[1], sequence: [0, 3, 7, 10.5] },
] }), snapshot), /sequence/);
assert.throws(() => parsePatchPlan(JSON.stringify({ ...response, modules: [
  response.modules[0], { ...response.modules[1], parameters: { ...response.modules[1].parameters, rootNote: 84 }, sequence: [0, 7, 12, 14] },
] }), snapshot), /sequence/);
assert.throws(() => parsePatchPlan(JSON.stringify({ ...response, master: { gain: 0.8, reverbDecay: 3.5 } }), snapshot), /master\.reverbMix/);
assert.throws(() => parsePatchPlan(JSON.stringify({ ...response, modules: [
  { ...response.modules[0], parameters: { ...response.modules[0].parameters, reverbShimmer: undefined } },
  response.modules[1],
] }), snapshot), /reverbShimmer/);
assert.throws(() => parsePatchPlan(JSON.stringify({ ...response, modules: [
  response.modules[0], { ...response.modules[1], parameters: { ...response.modules[1].parameters, reverbMix: undefined } },
] }), snapshot), /reverbMix/);
assert.throws(() => parsePatchPlan(JSON.stringify({ ...response, modules: [
  response.modules[0], { ...response.modules[1], parameters: { ...response.modules[1].parameters, noiseAmount: undefined } },
] }), snapshot), /noiseAmount/);

const imageSnapshot = {
  ...snapshot,
  modules: [
    ...snapshot.modules,
    { ...snapshot.modules[0], id: 3, label: 'GRAIN 03', playing: false, sample: 'choir_children.wav' },
    { ...snapshot.modules[0], id: 4, label: 'GRAIN 04', playing: false, sample: 'egg_shaker.wav' },
  ],
};
const imageResponse = {
  ...response,
  description: 'A person walks through heavy rain.',
  mood: 'Tense, rain-soaked, with a slow pulsing rhythm.',
  composition: 'Rain footsteps sit in front of a choir pad, with shaker pulses and bell accents echoing the walking rhythm.',
  modules: [
    { ...response.modules[0], role: 'recognizable wet footsteps', source: 'sfx', sfx_keyword: 'rain footsteps', parameters: { ...response.modules[0].parameters, selectionStart: 0, selectionEnd: 0 } },
    { ...response.modules[1], role: 'bell accents' },
    { id: 3, type: 'granular', role: 'soft sustained pad', source: 'built_in', sample: 'choir_children.wav', parameters: { ...imageSnapshot.modules[2].parameters, selectionStart: 0, selectionEnd: 0 } },
    { id: 4, type: 'granular', role: 'shaker pulse', source: 'built_in', sample: 'egg_shaker.wav', parameters: { ...imageSnapshot.modules[3].parameters, selectionStart: 0, selectionEnd: 0 } },
  ],
};
const imagePlan = parseImagePatchPlan(JSON.stringify(imageResponse), imageSnapshot);
assert.equal(imagePlan.description, imageResponse.description);
assert.equal(imagePlan.mood, imageResponse.mood);
assert.equal(imagePlan.composition, imageResponse.composition);
assert.equal(imagePlan.sfxKeywords.get(1), 'rain footsteps');
assert.equal(imagePlan.sfxKeywords.size, 1);
assert.equal(imagePlan.roles.get(3), 'soft sustained pad');
assert.equal(imagePlan.sources.get(4), 'built_in');
assert.equal(imagePlan.plan.modules[2].sample, 'choir_children.wav');
assert.equal(imagePlan.plan.modules[0].parameters.selectionEnd, 0);
assert.match(buildImagePatchPrompt('make it tense', imageSnapshot), /make it tense/);
assert.match(buildImagePatchPrompt('make it tense', imageSnapshot), /sfx_keyword/);
assert.match(buildImagePatchPrompt('make it tense', imageSnapshot), /"mood"/);
assert.match(buildImagePatchPrompt('make it tense', imageSnapshot), /choir_children\.wav/);
assert.match(IMAGE_PATCH_SYSTEM_PROMPT, /music and SFX feel connected/);
assert.match(IMAGE_PATCH_SYSTEM_PROMPT, /EXACTLY ONE granular module/);
assert.throws(() => parseImagePatchPlan(JSON.stringify({ ...imageResponse, modules: [
  { ...imageResponse.modules[0], sfx_keyword: '' }, ...imageResponse.modules.slice(1),
] }), imageSnapshot), /sfx_keyword/);
assert.throws(() => parseImagePatchPlan(JSON.stringify({ ...imageResponse, modules: imageResponse.modules.map((module) => module.type === 'granular' ? { ...module, source: 'built_in', sfx_keyword: undefined } : module) }), imageSnapshot), /exactly one generated SFX/);
assert.throws(() => parseImagePatchPlan(JSON.stringify({ ...imageResponse, modules: [imageResponse.modules[0], imageResponse.modules[1], { ...imageResponse.modules[2], source: 'sfx', sample: 'choir_children.wav', sfx_keyword: 'wind' }, imageResponse.modules[3]] }), imageSnapshot), /exactly one generated SFX/);
assert.throws(() => parseImagePatchPlan(JSON.stringify({ ...imageResponse, description: '' }), imageSnapshot), /scene description/);
assert.throws(() => parseImagePatchPlan(JSON.stringify({ ...imageResponse, mood: '' }), imageSnapshot), /musical mood/);
assert.throws(() => parseImagePatchPlan(JSON.stringify({ ...imageResponse, composition: '' }), imageSnapshot), /composition description/);

console.log('Patch response validation passed.');
