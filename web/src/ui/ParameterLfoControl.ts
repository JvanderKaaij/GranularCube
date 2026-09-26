import { defaultParameterLfo, parameterLfoValue, type ParameterLfoSettings } from '../audio/ParameterLfo';

const controls = new Set<ParameterLfoControl>();
let openControl: ParameterLfoControl | null = null;
export function updateParameterLfoDisplays(timeSeconds: number): void {
  for (const control of controls) { if (!control.isConnected) controls.delete(control); else control.updateLive(timeSeconds); }
}

export class ParameterLfoControl {
  readonly settings: ParameterLfoSettings;
  private readonly alwaysEnabled: boolean;
  private readonly button: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly live: HTMLOutputElement;
  private readonly root: HTMLElement;
  private base = 0;
  get isConnected(): boolean { return this.button.isConnected; }

  constructor(
    host: HTMLElement,
    readonly key: string,
    private readonly input: HTMLInputElement,
    private readonly onChange: (settings: ParameterLfoSettings) => void,
    private readonly format: (value: number) => string = (value) => Number(value.toFixed(2)).toString(),
    private readonly onLiveValue?: (value: number) => void,
  ) {
    this.settings = defaultParameterLfo(key);
    this.alwaysEnabled = key === 'gain';
    controls.add(this);
    host.classList.add('parameter-lfo-host');
    host.dataset.lfoParam = key;
    this.base = Number(input.value);
    const root = document.createElement('span'); root.className = 'parameter-lfo'; this.root = root;
    this.button = document.createElement('button'); this.button.type = 'button'; this.button.className = 'parameter-lfo-button';
    this.button.textContent = '∿'; this.button.title = `${key}: configure its LFO`; this.button.setAttribute('aria-label', `${key}: configure LFO`); this.button.setAttribute('aria-expanded', 'false');
    this.panel = document.createElement('span'); this.panel.className = 'parameter-lfo-popover'; this.panel.hidden = true;
    const period = document.createElement('label'); period.innerHTML = '<span>PERIOD</span><input type="range" min="20" max="240" step="1"><output></output>';
    const depth = document.createElement('label'); depth.innerHTML = '<span>DEPTH</span><input type="range" min="0" max="1" step="0.01"><output></output>';
    const enabled = document.createElement('label'); enabled.className = 'parameter-lfo-enabled'; enabled.innerHTML = `<input type="checkbox"> ${this.alwaysEnabled ? 'ALWAYS ON' : 'ENABLE'}`;
    const waveform = document.createElement('select'); waveform.setAttribute('aria-label', `${key} LFO waveform`); waveform.innerHTML = '<option value="sine">Sine</option><option value="triangle">Triangle</option>';
    this.live = document.createElement('output'); this.live.className = 'parameter-lfo-live';
    const periodInput = period.querySelector('input')!; const periodOutput = period.querySelector('output')!;
    const depthInput = depth.querySelector('input')!; const depthOutput = depth.querySelector('output')!;
    periodInput.value = String(this.settings.periodSeconds); depthInput.value = String(this.settings.depth); enabled.querySelector('input')!.checked = this.settings.enabled;
    enabled.querySelector('input')!.disabled = this.alwaysEnabled;
    this.panel.append(enabled, period, depth, waveform, this.live);
    const render = () => {
      this.settings.enabled = this.alwaysEnabled || enabled.querySelector('input')!.checked;
      if (this.alwaysEnabled) enabled.querySelector('input')!.checked = true;
      this.settings.periodSeconds = Number(periodInput.value); this.settings.depth = Number(depthInput.value);
      this.settings.waveform = waveform.value as ParameterLfoSettings['waveform'];
      periodOutput.value = `${this.settings.periodSeconds}s`; depthOutput.value = `${Math.round(this.settings.depth * 100)}%`;
      this.button.classList.toggle('active', this.settings.enabled);
      root.classList.toggle('enabled', this.settings.enabled);
      this.onChange({ ...this.settings }); this.updateLive(performance.now() / 1000);
    };
    for (const control of [enabled.querySelector('input')!, periodInput, depthInput, waveform]) control.addEventListener('input', render);
    this.button.addEventListener('click', (event) => {
      event.preventDefault(); event.stopPropagation();
      if (openControl && openControl !== this) openControl.close();
      this.panel.hidden = !this.panel.hidden; this.button.setAttribute('aria-expanded', String(!this.panel.hidden));
      const card = this.root.closest('.module-card, .master-node'); card?.classList.toggle('lfo-open', !this.panel.hidden);
      openControl = this.panel.hidden ? null : this;
    });
    root.append(this.button, this.panel); host.append(root); render();
    input.addEventListener('input', () => { if (input.dataset.lfoManaged !== 'true') this.base = Number(input.value); });
  }

  updateLive(timeSeconds: number): void {
    const value = this.settings.enabled
      ? parameterLfoValue(this.base, this.key, this.settings, timeSeconds, Number(this.input.min), Number(this.input.max))
      : this.base;
    if (!this.input.dataset.lfoManaged) this.input.value = String(value);
    this.onLiveValue?.(value);
    const output = this.input.closest('.control')?.querySelector<HTMLOutputElement>('.control-heading > output')
      ?? this.input.closest('.master-control')?.querySelector<HTMLOutputElement>('.master-control-head > output');
    if (output) output.value = this.format(value);
    this.live.textContent = '';
  }

  setBase(value: number): void { this.base = value; this.updateLive(performance.now() / 1000); }

  close(): void {
    this.panel.hidden = true; this.button.setAttribute('aria-expanded', 'false');
    this.root.closest('.module-card, .master-node')?.classList.remove('lfo-open');
    if (openControl === this) openControl = null;
  }
}
