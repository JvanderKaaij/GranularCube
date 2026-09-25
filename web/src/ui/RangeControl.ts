import type { RangeControlDefinition } from '../parameters';

const LOG_SLIDER_STEPS = 1000;

function format(value: number, unit = ''): string {
  const number = Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
  return `${number}${unit ? ` ${unit}` : ''}`;
}

function formatFrequencyTick(value: number): string {
  return value >= 1000 ? `${Number((value / 1000).toFixed(1))} kHz` : `${Math.round(value)} Hz`;
}

export interface RangeControl {
  root: HTMLElement;
  setBounds(min: number, max: number): void;
  setValues(lower: number, upper: number): void;
  getValues(): [number, number];
}

/** Two native range inputs sharing one track and one highlighted interval. */
export function createRangeControl(
  definition: RangeControlDefinition,
  moduleLabel: string,
  initialLower: number,
  initialUpper: number,
  onChange: (lower: number, upper: number) => void,
): RangeControl {
  const root = document.createElement('div');
  root.className = 'range-control';
  const scale = definition.scale === 'log'
    ? `<div class="range-scale" aria-hidden="true">${[0, 1, 2, 3].map((index) => {
      const value = definition.min * (definition.max / definition.min) ** (index / 3);
      return `<span style="left:${(index / 3) * 100}%">${formatFrequencyTick(value)}</span>`;
    }).join('')}</div>`
    : '';
  root.innerHTML = `
    <div class="range-heading"><span class="control-label">${definition.label.toUpperCase()}</span><output class="range-display"></output></div>
    <div class="range-track">
      <div class="range-rail"></div><div class="range-fill"></div>
      <input class="range-thumb lower" type="range" aria-label="${moduleLabel} ${definition.label} ${definition.lowerLabel ?? 'minimum'}" />
      <input class="range-thumb upper" type="range" aria-label="${moduleLabel} ${definition.label} ${definition.upperLabel ?? 'maximum'}" />
    </div>
    <div class="range-ends"><span class="lower-value"></span><span class="upper-value"></span></div>
    ${scale}
  `;

  const track = root.querySelector<HTMLElement>('.range-track')!;
  const fill = root.querySelector<HTMLElement>('.range-fill')!;
  const lowerInput = root.querySelector<HTMLInputElement>('.lower')!;
  const upperInput = root.querySelector<HTMLInputElement>('.upper')!;
  const display = root.querySelector<HTMLOutputElement>('.range-display')!;
  const lowerValue = root.querySelector<HTMLElement>('.lower-value')!;
  const upperValue = root.querySelector<HTMLElement>('.upper-value')!;
  let boundMin = definition.min;
  let boundMax = definition.max;
  const logarithmic = definition.scale === 'log';

  function clamp(value: number): number {
    return Math.min(boundMax, Math.max(boundMin, value));
  }

  function sliderMin(): number { return logarithmic ? 0 : boundMin; }
  function sliderMax(): number { return logarithmic ? LOG_SLIDER_STEPS : boundMax; }
  function sliderStep(): number { return logarithmic ? 1 : definition.step; }

  function positionToValue(position: number): number {
    if (!logarithmic) return clamp(position);
    const fraction = Math.max(0, Math.min(1, position / LOG_SLIDER_STEPS));
    const frequency = boundMin * (boundMax / boundMin) ** fraction;
    const steps = Math.round((frequency - boundMin) / definition.step);
    return clamp(Number((boundMin + steps * definition.step).toFixed(4)));
  }

  function valueToPosition(value: number): number {
    if (!logarithmic) return clamp(value);
    const fraction = Math.log(clamp(value) / boundMin) / Math.log(boundMax / boundMin);
    return Math.round(fraction * LOG_SLIDER_STEPS);
  }

  function render(): void {
    const lowPosition = Number(lowerInput.value);
    const highPosition = Number(upperInput.value);
    const low = positionToValue(lowPosition);
    const high = positionToValue(highPosition);
    const span = sliderMax() - sliderMin();
    const lowPercent = ((lowPosition - sliderMin()) / span) * 100;
    const highPercent = ((highPosition - sliderMin()) / span) * 100;
    fill.style.left = `${lowPercent}%`;
    fill.style.width = `${Math.max(0, highPercent - lowPercent)}%`;
    display.value = `${format(low, definition.unit)} — ${format(high, definition.unit)}`;
    lowerValue.textContent = `${definition.lowerLabel ?? 'MIN'} ${format(low, definition.unit)}`;
    upperValue.textContent = `${definition.upperLabel ?? 'MAX'} ${format(high, definition.unit)}`;
    lowerInput.setAttribute('aria-valuetext', format(low, definition.unit));
    upperInput.setAttribute('aria-valuetext', format(high, definition.unit));
  }

  function commit(changed: 'lower' | 'upper'): void {
    let low = Number(lowerInput.value);
    let high = Number(upperInput.value);
    if (changed === 'lower' && low > high) low = high;
    if (changed === 'upper' && high < low) high = low;
    lowerInput.value = String(low);
    upperInput.value = String(high);
    render();
    onChange(positionToValue(low), positionToValue(high));
  }

  for (const input of [lowerInput, upperInput]) {
    input.min = String(sliderMin());
    input.max = String(sliderMax());
    input.step = String(sliderStep());
  }
  lowerInput.addEventListener('input', () => commit('lower'));
  upperInput.addEventListener('input', () => commit('upper'));

  track.addEventListener('pointerdown', (event) => {
    if (event.target instanceof HTMLInputElement) return;
    const rect = track.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const raw = sliderMin() + fraction * (sliderMax() - sliderMin());
    const steps = Math.round((raw - sliderMin()) / sliderStep());
    const value = sliderMin() + steps * sliderStep();
    const low = Number(lowerInput.value);
    const high = Number(upperInput.value);
    const nearest = Math.abs(value - low) <= Math.abs(value - high) ? lowerInput : upperInput;
    nearest.value = String(value);
    nearest.dispatchEvent(new Event('input', { bubbles: true }));
    nearest.focus();
  });

  const control: RangeControl = {
    root,
    setBounds(min: number, max: number) {
      const lower = positionToValue(Number(lowerInput.value));
      const upper = positionToValue(Number(upperInput.value));
      boundMin = min;
      boundMax = Math.max(min + definition.step, max);
      for (const input of [lowerInput, upperInput]) {
        input.min = String(sliderMin());
        input.max = String(sliderMax());
      }
      control.setValues(lower, upper);
    },
    setValues(lower: number, upper: number) {
      lowerInput.value = String(valueToPosition(Math.min(lower, upper)));
      upperInput.value = String(valueToPosition(Math.max(lower, upper)));
      render();
    },
    getValues() {
      return [positionToValue(Number(lowerInput.value)), positionToValue(Number(upperInput.value))];
    },
  };
  control.setValues(initialLower, initialUpper);
  return control;
}
