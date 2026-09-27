/** Per-parameter composition protection. LFOs and manual editing remain independent. */
export function setParameterLock(button: HTMLButtonElement, ignored: boolean): void {
  const key = button.dataset.parameterKey!;
  button.setAttribute('aria-pressed', String(ignored));
  button.classList.toggle('active', ignored);
  button.title = `${key}: ${ignored ? 'ignore LLM (click to follow mood)' : 'follow mood (click to ignore LLM)'}. Existing LFO movement continues. Save in Config to keep this choice.`;
  button.setAttribute('aria-label', `${key}: ignore LLM`);
}

export function createParameterLock(host: HTMLElement, key: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'parameter-lock-button'; button.dataset.parameterKey = key;
  button.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path class="lock-shackle" d="M5 7V5a3 3 0 0 1 6 0v2"/><path d="M8 10v1.5"/></svg>';
  setParameterLock(button, false);
  button.addEventListener('click', (event) => {
    event.preventDefault(); event.stopPropagation();
    const ignored = button.getAttribute('aria-pressed') !== 'true';
    setParameterLock(button, ignored);
    button.dispatchEvent(new CustomEvent('parameter-lock-change', { bubbles: true, detail: { key, ignored } }));
  });
  host.append(button); return button;
}

export function ignoredParameterKeys(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('.parameter-lock-button[aria-pressed="true"]')).map((button) => button.dataset.parameterKey!);
}

export function applyParameterLocks(root: HTMLElement, keys: string[]): void {
  for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>('.parameter-lock-button'))) setParameterLock(button, keys.includes(button.dataset.parameterKey!));
}
