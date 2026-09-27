/** Keep native slider positions separate from the parameter values used by audio and LFOs. */
export interface SliderDefinition { min: number; max: number; step: number; scale?: 'linear' | 'log' }
export interface SliderBinding {
  read(): number;
  write(value: number): void;
  bounds(): { min: number; max: number };
}
const bindings = new WeakMap<HTMLInputElement, SliderBinding>();
const LOG_STEPS = 1000;

export function bindParameterSlider(input: HTMLInputElement, binding: SliderBinding): void { bindings.set(input, binding); }
export function readSliderValue(input: HTMLInputElement): number { return bindings.get(input)?.read() ?? Number(input.value); }
export function sliderBounds(input: HTMLInputElement): { min: number; max: number } {
  return bindings.get(input)?.bounds() ?? { min: Number(input.min), max: Number(input.max) };
}
export function writeSliderValue(input: HTMLInputElement, value: number): void {
  const binding = bindings.get(input);
  if (binding) binding.write(value); else input.value = String(value);
}

export function configureParameterSlider(input: HTMLInputElement, definition: SliderDefinition, initial: number): void {
  const { min, max, step } = definition;
  const logarithmic = definition.scale === 'log';
  if (logarithmic && (min <= 0 || max <= min)) throw new Error('Logarithmic sliders need positive, ordered bounds');
  input.min = String(logarithmic ? 0 : min);
  input.max = String(logarithmic ? LOG_STEPS : max);
  input.step = String(logarithmic ? 1 : step);
  const clamp = (value: number) => Math.max(min, Math.min(max, value));
  const binding: SliderBinding = {
    bounds: () => ({ min, max }),
    read() {
      if (!logarithmic) return Number(input.value);
      const value = min * (max / min) ** (Number(input.value) / LOG_STEPS);
      return clamp(Number((min + Math.round((value - min) / step) * step).toFixed(4)));
    },
    write(value) {
      input.value = String(logarithmic ? Math.round(Math.log(clamp(value) / min) / Math.log(max / min) * LOG_STEPS) : value);
      if (logarithmic) input.setAttribute('aria-valuetext', `${Math.round(clamp(value))} Hz`);
    },
  };
  bindParameterSlider(input, binding); binding.write(initial);
}
