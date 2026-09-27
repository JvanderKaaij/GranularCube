import { effectControls, type EffectNode, type EffectSnapshot, type EffectValues } from '../audio/EffectNode';
import { ParameterLfoControl } from './ParameterLfoControl';
import type { ParameterLfoMap } from '../audio/ParameterLfo';
import { configureParameterSlider, readSliderValue, writeSliderValue } from './ParameterSlider';
import { createParameterLock } from './ParameterLock';

export interface EffectPanel {
  root: HTMLElement; inputPort: HTMLElement; outputPort: HTMLElement; engine: EffectNode;
  getSnapshot(): EffectSnapshot; applyParameters(values: EffectValues): void;
  lfos: ParameterLfoMap;
  applyLfos(settings: ParameterLfoMap): void;
  applyBypass(bypass: boolean): void;
}
export function createEffectPanel(id: string, engine: EffectNode, remove: () => void, edited: () => void): EffectPanel {
  const root = document.createElement('article'); root.className = 'module-card effect-card';
  root.style.setProperty('--accent', { delay: '#d3b182', filter: '#99c5a6', reverb: '#b9a8d4', spectral: '#8eb9d6' }[engine.type]);
  root.innerHTML = `<div class="module-head"><div class="module-identity"><span class="module-icon">${{ delay: '↔', filter: '⌁', reverb: '≋', spectral: '⌁·' }[engine.type]}</span><div><span class="module-kicker">EFFECT / ${id.toUpperCase()}</span><h2>${engine.type === 'spectral' ? 'spectral~' : `${engine.type}~`}</h2></div></div><div class="module-actions"><button type="button" class="icon-button remove-button" aria-label="Remove ${id}">×</button></div></div>
    <div class="module-flow"><button type="button" class="port input-port" aria-label="Connect to ${id} input">IN</button><span>STEREO</span><button type="button" class="port output-port" aria-label="Connect ${id} output">OUT</button></div>
    <div class="module-controls effect-controls"></div>${engine.type === 'spectral' ? '<div class="module-section spectral-freeze"><label><input type="checkbox" /> FREEZE SPECTRUM</label><span class="spectral-status" role="status"></span></div>' : ''}<div class="module-section effect-bypass"><label><input type="checkbox" /> BYPASS</label></div>`;
  root.querySelector('.remove-button')!.addEventListener('click', remove);
  const controls = root.querySelector<HTMLElement>('.effect-controls')!;
  const freeze = root.querySelector<HTMLInputElement>('.spectral-freeze input');
  const spectralStatus = root.querySelector<HTMLElement>('.spectral-status');
  const inputs = new Map<string, HTMLInputElement | HTMLSelectElement>();
  const outputs = new Map<string, HTMLOutputElement>();
  const lfos: ParameterLfoMap = {};
  const lfoByKey = new Map<string, ParameterLfoControl>();
  if (engine.type === 'spectral') {
    createParameterLock(root.querySelector<HTMLElement>('.spectral-freeze')!, 'freeze');
    freeze!.checked = Boolean(engine.parameters.freeze);
    freeze!.addEventListener('change', () => { edited(); engine.set('freeze', freeze!.checked); });
    if (spectralStatus) {
      spectralStatus.textContent = engine.status;
      const statusTimer = window.setInterval(() => {
        if (!root.isConnected) { window.clearInterval(statusTimer); return; }
        spectralStatus.textContent = engine.status;
      }, 500);
    }
  }
  if (engine.type === 'filter') {
    const label = document.createElement('div'); label.className = 'control';
    label.innerHTML = `<span class="control-heading"><span class="control-label">MODE</span></span><select aria-label="${id} filter mode"><option value="lowpass">Low-pass</option><option value="highpass">High-pass</option><option value="bandpass">Band-pass</option><option value="notch">Notch</option></select>`;
    createParameterLock(label.querySelector<HTMLElement>('.control-heading')!, 'filterType');
    const select = label.querySelector('select')!;
    select.addEventListener('change', () => { edited(); engine.set('filterType', select.value); });
    inputs.set('filterType', select); controls.append(label);
  }
  for (const control of effectControls[engine.type]) {
    const label = document.createElement('div'); label.className = 'control'; label.title = control.moodEffect;
    label.innerHTML = `<span class="control-heading"><span class="control-label">${control.label}</span><output></output></span><input type="range" min="${control.min}" max="${control.max}" step="${control.step}" aria-label="${id} ${control.label}" />`;
    const input = label.querySelector('input')!; const output = label.querySelector('output')!;
    configureParameterSlider(input, control, Number(engine.parameters[control.key]));
    lfoByKey.set(control.key, new ParameterLfoControl(label.querySelector<HTMLElement>('.control-heading')!, control.key, input, (settings) => { lfos[control.key] = settings; engine.setParameterLfos(lfos); }, (value) => `${Number(value.toFixed(2))}${control.unit ? ` ${control.unit}` : ''}`));
    inputs.set(control.key, input); outputs.set(control.key, output);
    input.addEventListener('input', () => { edited(); engine.set(control.key, readSliderValue(input)); render(); });
    controls.append(label);
  }
  const bypass = root.querySelector<HTMLInputElement>('.effect-bypass input')!;
  bypass.addEventListener('change', () => { edited(); engine.setBypass(bypass.checked); root.classList.toggle('bypassed', bypass.checked); });
  function render(): void {
    if (freeze) freeze.checked = Boolean(engine.parameters.freeze);
    for (const [key, input] of inputs) {
      const value = engine.parameters[key];
      if (input instanceof HTMLInputElement) writeSliderValue(input, Number(value)); else input.value = String(value);
      lfoByKey.get(key)?.setBase(Number(value));
      const output = outputs.get(key);
      if (output) output.value = `${Number(Number(value).toFixed(2))} ${effectControls[engine.type].find((c) => c.key === key)?.unit ?? ''}`.trim();
    }
  }
  render();
  return { root, inputPort: root.querySelector('.input-port')!, outputPort: root.querySelector('.output-port')!, engine, lfos,
    applyLfos(settings) { for (const [key, settingsForKey] of Object.entries(settings)) lfoByKey.get(key)?.applySettings(settingsForKey); },
    applyBypass(value) { bypass.checked = value; engine.setBypass(value); root.classList.toggle('bypassed', value); },
    getSnapshot: () => ({ id, type: engine.type, parameters: engine.parameters, bypass: engine.bypass }),
    applyParameters(values) { engine.apply(values); render(); },
  };
}
