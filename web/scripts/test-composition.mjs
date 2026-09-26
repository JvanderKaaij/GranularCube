import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle = await build({ stdin: { contents: `export * from './src/ai/Composition'; export * from './src/ai/PatchPreparation'; export * from './src/audio/AmbientMotion'; export * from './src/audio/GranularEngine'; export * from './src/parameters'; export * from './src/ai/PhysicalPresets';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`);
const clone = (v) => JSON.parse(JSON.stringify(v));
const snapshot = { master: { ...api.masterDefaults }, modules: [
  { id: 1, type: 'granular', label: 'GRAIN 01', playing: true, sample: 'violin.wav', sampleDurationMs: 12000, parameters: { ...api.defaults, selectionEnd: 12000 } },
  { id: 2, type: 'physical', label: 'PHYSICAL 02', playing: true, parameters: { ...api.physicalDefaults }, sequence: [0, 7, 12, 4] },
  { id: 3, type: 'granular', label: 'GRAIN 03', playing: true, sample: 'choir_children.wav', sampleDurationMs: 8000, parameters: { ...api.defaults, selectionEnd: 8000 } },
] };
const briefData = { description: 'Still water and pale mist', era: 'Likely nineteenth-century landscape', mood: 'Low tension, warm diffuse bed, slow plucked accents', composition: 'Water foreground above a restrained bed with sparse plucks',
  axes: { tension: 0.2, warmth: 0.7, movement: 0.2, density: 0.3, space: 0.7, brightness: 0.3 }, evolution: { amount: 0.3, periodSeconds: 80 }, modules: [
    { id: 1, role: 'focal', weight: 0.7, reason: 'Water creates the scene detail', source: 'sfx', keyword: 'gentle water lapping', sound: { source: 'small waves', action: 'lapping against a wooden boat', character: 'soft irregular splashes and hollow gurgles', evidence: 'a boat floating on rippled water' }, overlap: 0.8 },
    { id: 2, role: 'accent', weight: 0.4, reason: 'Plucks echo isolated trees', model: 'string' },
    { id: 3, role: 'bed', weight: 0.4, reason: 'Warm sustained tones evoke mist', source: 'built_in', overlap: 2, sampleCandidates: ['choir_children.wav', 'flute_d4.wav', 'clarinet_key_d4.wav'] },
] };
const brief = api.parseBrief(JSON.stringify(briefData), snapshot, true);
assert.equal(brief.modules[1].model, 'string');
assert.ok(!api.briefPrompt(snapshot, 'OLD MOOD MUST NOT LEAK', true, []).includes('OLD MOOD MUST NOT LEAK'));
assert.ok(api.parameterPrompt(brief, snapshot, []).includes('physicalPresets'));
const choices = api.chooseSources(brief, snapshot, ['flute_d4.wav']);
assert.equal(choices[2].sample, 'clarinet_key_d4.wav', 'Only a ranked, relevant alternative may be substituted');
const reused = clone(brief); reused.modules[2].reuseReason = 'The choral timbre is essential to this scene';
assert.equal(api.chooseSources(reused, snapshot, [])[2].sample, 'choir_children.wav');
const invalid = clone(briefData); invalid.modules[2].sampleCandidates = ['invented.wav', 'flute_d4.wav'];
assert.throws(() => api.parseBrief(JSON.stringify(invalid), snapshot, true), /Unknown ranked sample/);
const duplicate = clone(briefData); duplicate.modules[2].id = 1;
assert.throws(() => api.parseBrief(JSON.stringify(duplicate), snapshot, true), /duplicate/);
const response = { master: { reverbMix: 0.3, reverbDecay: 3, gain: 1.5 }, modules: [
  { id: 1, type: 'granular', parameters: { ...api.defaults, lengthMin: 1000, lengthMax: 2500, gain: 1 }, targetOverlap: 0.8, intent: 'Long grains preserve the water detail' },
  { id: 2, type: 'physical', parameters: { model: 'string', brightness: 0.35 }, sequence: [0, 7, 12, 4], intent: 'Darker plucks stay behind the water' },
  { id: 3, type: 'granular', parameters: { ...api.defaults, lengthMin: 500, lengthMax: 500, gain: 1 }, targetOverlap: 2, intent: 'Two overlapping grains form a restrained bed' },
] };
const result = api.composePatch(JSON.stringify(response), brief, snapshot, ['flute_d4.wav']);
assert.equal(result.plan.modules[2].parameters.density, 4);
assert.equal(result.plan.modules[0].parameters.lengthMax, 2000);
assert.equal(result.plan.modules[2].sample, 'clarinet_key_d4.wav');
assert.equal(result.plan.modules[2].parameters.selectionEnd, 0);
assert.equal(result.plan.modules[1].parameters.model, 'string');
assert.equal(result.plan.modules[1].parameters.noiseAmount, api.physicalPresets.string.noiseAmount, 'Changing mode must use the new preset instead of the old bell values');
assert.ok(result.plan.modules[2].parameters.gain < 0.12);
assert.equal(result.plan.master.gain, 0.85);
assert.ok(result.debug.corrections.some((s) => s.includes('lengthMax')));
assert.ok(result.debug.changes.some((c) => c.key === 'model' && c.after === 'string'));
const missing = clone(response); delete missing.modules[0].parameters.lengthMax;
assert.throws(() => api.composePatch(JSON.stringify(missing), brief, snapshot, []), /explicitly composed/);
const badNotes = clone(response); badNotes.modules[1].sequence = [0, 200, 12, 4];
assert.throws(() => api.composePatch(JSON.stringify(badNotes), brief, snapshot, []), /invalid note/);
const physicalOnly = { master: snapshot.master, modules: [snapshot.modules[1]] };
const soloBrief = clone(briefData); soloBrief.modules = [soloBrief.modules[1]];
assert.equal(api.parseBrief(JSON.stringify(soloBrief), physicalOnly, true).modules.length, 1, 'A physical-only image patch needs no SFX');

// Two hours of bounded motion; fixed authored values must not drift.
const motion = new api.AmbientMotion(4);
motion.set({ amount: 1, periodSeconds: 20 }, 0);
const base = { ...api.defaults, selectionEnd: 8000 };
for (let time = 0; time <= 7200; time += 13) {
  const p = motion.granular(base, time, 8000);
  assert.ok(p.density >= 0.1 && p.density <= 60);
  assert.ok(p.selectionStart >= 0 && p.selectionStart <= p.selectionEnd && p.selectionEnd <= 8000);
  assert.ok(p.filterFreqMin <= p.filterFreqMax && p.filterFreqMax <= 20000);
  const physical = motion.physical(api.physicalDefaults, time);
  assert.ok(physical.rate >= 0.2 && physical.rate <= 3 && physical.spread >= 0 && physical.spread <= 1);
}
assert.deepEqual(base, { ...api.defaults, selectionEnd: 8000 });
motion.enabled = false;
assert.deepEqual(motion.granular(base, 8000, 8000), base);

// Sample preparation is an all-or-nothing barrier, including manual changes and removal.
let commits = [];
let live = clone(snapshot);
const makePanels = (fail = false) => new Map(snapshot.modules.map((m) => [m.id, { kind: m.type,
  async preparePatchSample() { if (fail && m.id === 3) throw new Error('decode failed'); return { changed: true, durationMs: 5000, validate() {}, commit() { commits.push(m.id); } }; },
}]));
await assert.rejects(api.preparePatchSamples(result.plan, makePanels(true), () => live, new Map()), /decode failed/);
assert.deepEqual(commits, []);
const panels = makePanels();
const transaction = await api.preparePatchSamples(result.plan, panels, () => live, new Map());
assert.deepEqual(commits, []);
live.modules[0].parameters.gain = 0.03;
assert.throws(() => transaction.commit(1), /Patch changed/);
assert.deepEqual(commits, []);
live = clone(snapshot);
const removed = await api.preparePatchSamples(result.plan, panels, () => live, new Map());
panels.delete(3);
assert.throws(() => removed.commit(1), /removed/);
const ready = await api.preparePatchSamples(result.plan, makePanels(), () => live, new Map());
ready.commit(1);
assert.deepEqual(commits, [1, 3]);
assert.throws(() => ready.commit(1), /already committed/);

// The real granular engine's prepare path must not replace an active buffer.
const param = () => ({ value: 0, setTargetAtTime() {}, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
const node = () => ({ gain: param(), pan: param(), frequency: param(), delayTime: param(), Q: param(), connect(target) { return target; }, disconnect() {}, start() {}, stop() {} });
const context = { sampleRate: 100, currentTime: 0, createGain: node, createDelay: node, createBiquadFilter: node, createOscillator: node, createStereoPanner: node, createConvolver: node,
  createBuffer(channels, length, rate) { const arrays = Array.from({ length: channels }, () => new Float32Array(length)); return { length, duration: length / rate, getChannelData: (i) => arrays[i] }; },
  async decodeAudioData() { return { length: 1000, duration: 10 }; },
};
const fetchOriginal = globalThis.fetch;
globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
const engine = new api.GranularEngine(context, node());
engine.commitSample({ length: 500, duration: 5 });
const prepared = await engine.prepareSample('new.wav');
assert.equal(engine.sampleDurationMs, 5000);
engine.commitSample(prepared);
assert.equal(engine.sampleDurationMs, 10000);
context.decodeAudioData = async () => { throw new Error('unsupported audio'); };
await assert.rejects(engine.prepareSample('bad.wav'), /unsupported/);
assert.equal(engine.sampleDurationMs, 10000);
globalThis.fetch = fetchOriginal;
engine.dispose();
console.log('Composition, ranked samples, physical presets, overlap/levels, two-hour motion, and atomic sample preparation passed.');
