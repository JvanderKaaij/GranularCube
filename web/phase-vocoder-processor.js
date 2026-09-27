const SIZE = 1024;
const HOP = SIZE >> 2;
const RING = 8192;

function fft(real, imag, inverse) {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (inverse ? 2 : -2) * Math.PI / len;
    const stepR = Math.cos(angle), stepI = Math.sin(angle);
    for (let start = 0; start < n; start += len) {
      let wr = 1, wi = 0;
      for (let j = 0; j < (len >> 1); j++) {
        const even = start + j, odd = even + (len >> 1);
        const tr = wr * real[odd] - wi * imag[odd];
        const ti = wr * imag[odd] + wi * real[odd];
        real[odd] = real[even] - tr; imag[odd] = imag[even] - ti;
        real[even] += tr; imag[even] += ti;
        const nextR = wr * stepR - wi * stepI;
        wi = wr * stepI + wi * stepR; wr = nextR;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { real[i] /= n; imag[i] /= n; }
}

class PhaseVocoderProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'mix', defaultValue: 0.35, minValue: 0, maxValue: 1 },
      { name: 'pitch', defaultValue: 0, minValue: -12, maxValue: 12 },
      { name: 'smear', defaultValue: 0.25, minValue: 0, maxValue: 1 },
    ];
  }
  constructor() {
    super();
    this.channels = Array.from({ length: 2 }, () => ({
      input: new Float32Array(SIZE), delayed: new Float32Array(SIZE + 1), output: new Float32Array(RING),
      real: new Float64Array(SIZE), imag: new Float64Array(SIZE), previous: new Float64Array(SIZE >> 1),
      phase: new Float64Array(SIZE >> 1), smooth: new Float64Array(SIZE >> 1), frozen: new Float64Array(SIZE >> 1),
      frozenAdvance: new Float64Array(SIZE >> 1), phaseAdvance: new Float64Array(SIZE >> 1),
      outReal: new Float64Array(SIZE), outImag: new Float64Array(SIZE),
    }));
    this.window = Float64Array.from({ length: SIZE }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / SIZE));
    this.write = 0; this.samples = 0; this.freeze = false; this.freezeCapturePending = false;
    this.port.onmessage = ({ data }) => {
      if (typeof data.freeze === 'boolean') {
        if (data.freeze && !this.freeze) this.freezeCapturePending = true;
        this.freeze = data.freeze;
      }
    };
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0], output = outputs[0];
    if (!output || output.length === 0) return true;
    const mixValues = parameters.mix, pitchValues = parameters.pitch, smearValues = parameters.smear;
    for (let i = 0; i < output[0].length; i++) {
      for (let ch = 0; ch < 2; ch++) {
        const state = this.channels[ch];
        const source = input[ch] || input[0];
        const sample = source ? source[i] : 0;
        state.input[this.write] = sample;
        state.delayed[this.samples % state.delayed.length] = sample;
      }
      this.write = (this.write + 1) % SIZE;
      const frameReady = this.samples >= SIZE - 1 && (this.samples - (SIZE - 1)) % HOP === 0;
      if (frameReady) this.processFrame(pitchValues[0], smearValues[0]);
      const mix = Math.max(0, Math.min(1, mixValues.length > 1 ? mixValues[i] : mixValues[0]));
      for (let ch = 0; ch < output.length; ch++) {
        const state = this.channels[Math.min(ch, 1)];
        const wet = state.output[this.samples % RING]; state.output[this.samples % RING] = 0;
        const dryIndex = ((this.samples - (SIZE - 1)) % state.delayed.length + state.delayed.length) % state.delayed.length;
        const dry = this.samples >= SIZE - 1 ? state.delayed[dryIndex] : 0;
        output[ch][i] = dry * (1 - mix) + wet * mix;
      }
      this.samples++;
    }
    return true;
  }
  processFrame(pitchSemitones, smear) {
    const ratio = 2 ** (Math.max(-12, Math.min(12, pitchSemitones)) / 12);
    const strength = Math.max(0, Math.min(1, smear));
    for (const state of this.channels) {
      state.real.fill(0); state.imag.fill(0);
      for (let i = 0; i < SIZE; i++) state.real[i] = state.input[(this.write + i) % SIZE] * this.window[i];
      fft(state.real, state.imag, false);
      const phaseAdvance = state.phaseAdvance;
      for (let k = 0; k < SIZE / 2; k++) {
        const phase = Math.atan2(state.imag[k], state.real[k]);
        const expected = 2 * Math.PI * k * HOP / SIZE;
        let delta = phase - state.previous[k] - expected;
        delta -= 2 * Math.PI * Math.round(delta / (2 * Math.PI));
        phaseAdvance[k] = expected + delta;
        state.previous[k] = phase;
      }
      if (this.freeze && this.freezeCapturePending) {
        for (let k = 0; k < SIZE / 2; k++) {
          state.frozen[k] = Math.hypot(state.real[k], state.imag[k]);
          state.frozenAdvance[k] = phaseAdvance[k];
        }
        if (state === this.channels[this.channels.length - 1]) this.freezeCapturePending = false;
      }
      const outReal = state.outReal, outImag = state.outImag;
      outReal.fill(0); outImag.fill(0);
      for (let k = 1; k < SIZE / 2; k++) {
        const raw = this.freeze ? state.frozen[k] : Math.hypot(state.real[k], state.imag[k]);
        state.smooth[k] += (raw - state.smooth[k]) * (1 - strength * 0.94);
        const mag = raw * (1 - strength) + state.smooth[k] * strength;
        state.phase[k] += (this.freeze ? state.frozenAdvance[k] : phaseAdvance[k]) * ratio;
        const destination = Math.round(k * ratio);
        if (destination < 1 || destination >= SIZE / 2) continue;
        outReal[destination] += mag * Math.cos(state.phase[k]);
        outImag[destination] += mag * Math.sin(state.phase[k]);
      }
      for (let k = 1; k < SIZE / 2; k++) {
        outReal[SIZE - k] = outReal[k]; outImag[SIZE - k] = -outImag[k];
      }
      fft(outReal, outImag, true);
      for (let i = 0; i < SIZE; i++) {
        const at = (this.samples + i) % RING;
        state.output[at] += outReal[i] * this.window[i] * (2 / 3);
      }
    }
  }
}

registerProcessor('phase-vocoder', PhaseVocoderProcessor);
