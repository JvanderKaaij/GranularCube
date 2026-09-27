import type { AudioGraph } from '../audio/AudioGraph';
import { ignoredParameterKeys, applyParameterLocks } from './ParameterLock';

interface NodeView { id: string; root: HTMLElement; input?: HTMLElement; output?: HTMLElement; x: number; y: number; ignoreLlm: boolean }
export interface NodeLayout { x: number; y: number; collapsed: boolean; ignoreLlm?: boolean; ignoredParameters?: string[] }
const svgNS = 'http://www.w3.org/2000/svg';

/** Pointer/keyboard patching and node placement. AudioGraph remains the routing authority. */
export class PatchEditor {
  private nodes = new Map<string, NodeView>();
  private pending: string | null = null;
  private selected: string | null = null;
  private pointer = { x: 0, y: 0 };
  private frame = 0;
  private observer = new ResizeObserver(() => this.redraw());
  private zIndex = 2;
  constructor(private stage: HTMLElement, private cables: SVGSVGElement, private graph: AudioGraph,
    private status: HTMLElement, private disconnectButton: HTMLButtonElement, private changed: () => void) {
    disconnectButton.addEventListener('click', () => this.disconnectSelected());
    document.addEventListener('pointermove', (event) => {
      const rect = stage.getBoundingClientRect(); this.pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      if (this.pending) this.redraw();
    });
    document.addEventListener('pointerup', (event) => {
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-input-node]');
      if (target && this.pending) this.finish(target.dataset.inputNode!);
    });
    document.addEventListener('keydown', (event) => {
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'Escape') { this.pending = null; this.select(null); this.message('Connection canceled.'); this.redraw(); }
      if ((event.key === 'Delete' || event.key === 'Backspace') && this.selected) { event.preventDefault(); this.disconnectSelected(); }
    });
    stage.addEventListener('pointerdown', (event) => {
      if (event.target === stage || event.target === cables) { this.pending = null; this.select(null); this.redraw(); }
    });
    window.addEventListener('resize', () => this.redraw());
  }
  message(text: string, error = false): void { this.status.textContent = text; this.status.classList.toggle('error', error); }
  add(id: string, root: HTMLElement, input: HTMLElement | undefined, output: HTMLElement | undefined, x: number, y: number): void {
    const node = { id, root, input, output, x, y, ignoreLlm: false }; this.nodes.set(id, node);
    root.classList.add('patch-node', 'node-collapsed'); root.dataset.nodeId = id;
    this.stage.append(root); this.place(node, x, y);
    const head = root.querySelector<HTMLElement>('.module-head, .master-head')!;
    head.setAttribute('aria-label', `Move ${id}`); head.tabIndex = 0;
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'node-toggle'; toggle.textContent = 'CONTROLS';
    toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', `Toggle ${id} controls`);
    toggle.addEventListener('click', () => { root.classList.toggle('node-collapsed'); toggle.setAttribute('aria-expanded', String(!root.classList.contains('node-collapsed'))); this.redraw(); });
    head.append(toggle);
    const policy = document.createElement('div'); policy.className = 'node-llm-policy';
    policy.innerHTML = '<label><input type="checkbox" /> IGNORE LLM</label><span class="node-llm-state">FOLLOW MOOD</span>';
    policy.title = 'Keep this node’s current parameters, sample, notes and evolution during compositions. Manual controls and existing LFOs still work. Save the setup in Config to keep this choice.';
    const ignore = policy.querySelector<HTMLInputElement>('input')!;
    ignore.setAttribute('aria-label', `Ignore LLM changes for ${root.querySelector('h2')?.textContent ?? id} (${id})`);
    ignore.addEventListener('change', () => {
      this.setIgnored(node, ignore.checked); this.changed();
      this.message(ignore.checked ? `${id}: current settings are protected from composition changes. Save the setup to keep this choice.` : `${id}: follows composition settings again.`);
    });
    root.querySelector('.module-flow, .master-flow')!.after(policy);
    root.addEventListener('parameter-lock-change', (event) => {
      const { key, ignored } = (event as CustomEvent<{ key: string; ignored: boolean }>).detail;
      this.changed();
      this.message(`${id}.${key}: ${ignored ? 'protected from LLM changes' : 'follows mood again'}. Save the setup to keep this choice.`);
    });
    const bringToFront = () => { root.style.zIndex = String(++this.zIndex); };
    // Controls and ports also count as interaction, not just dragging the header.
    root.addEventListener('pointerdown', bringToFront);
    root.addEventListener('focusin', bringToFront);
    head.addEventListener('keydown', (event) => {
      if (event.target !== head || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault(); const step = event.shiftKey ? 40 : 10;
      this.place(node, node.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0), node.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0));
    });
    head.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || (event.target as Element).closest('button, input, select')) return;
      event.preventDefault(); head.setPointerCapture(event.pointerId); bringToFront();
      const start = { x: event.clientX, y: event.clientY, nx: node.x, ny: node.y };
      root.classList.add('dragging');
      const viewport = this.stage.parentElement!;
      const initialScroll = { x: viewport.scrollLeft, y: viewport.scrollTop };
      const move = (e: PointerEvent) => {
        const bounds = viewport.getBoundingClientRect();
        if (e.clientX > bounds.right - 35) viewport.scrollLeft += 12;
        if (e.clientX < bounds.left + 35) viewport.scrollLeft -= 12;
        if (e.clientY > bounds.bottom - 35) viewport.scrollTop += 12;
        if (e.clientY < bounds.top + 35) viewport.scrollTop -= 12;
        this.place(node, start.nx + e.clientX - start.x + viewport.scrollLeft - initialScroll.x, start.ny + e.clientY - start.y + viewport.scrollTop - initialScroll.y);
      };
      const end = () => { head.removeEventListener('pointermove', move); head.removeEventListener('pointerup', end); head.removeEventListener('pointercancel', end); root.classList.remove('dragging'); };
      head.addEventListener('pointermove', move); head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
    });
    if (output) {
      output.dataset.outputNode = id;
      const begin = () => { this.pending = id; this.select(null); const rect = output.getBoundingClientRect(), bounds = this.stage.getBoundingClientRect(); this.pointer = { x: rect.right - bounds.left + 30, y: rect.top + rect.height / 2 - bounds.top }; this.message(`Connect ${id} OUT to an IN port. Escape cancels.`); this.redraw(); };
      output.addEventListener('pointerdown', begin); output.addEventListener('click', begin);
    }
    if (input) { input.dataset.inputNode = id; input.addEventListener('click', () => this.finish(id)); }
    this.observer.observe(root); this.redraw();
  }
  remove(id: string): void {
    const node = this.nodes.get(id); if (!node) return;
    this.observer.unobserve(node.root); node.root.remove(); this.nodes.delete(id);
    if (this.pending === id) this.pending = null;
    this.select(null); this.redraw();
  }
  connect(from: string, to: string): void { this.graph.connect(from, to); this.redraw(); }
  isIgnored(id: string): boolean { return this.nodes.get(id)?.ignoreLlm ?? false; }
  get ignoredNodes(): string[] { return [...this.nodes.values()].filter((node) => node.ignoreLlm).map((node) => node.id); }
  get ignoredParameters(): Record<string, string[]> {
    return Object.fromEntries([...this.nodes.values()].map((node) => [node.id, ignoredParameterKeys(node.root)] as const).filter(([, keys]) => keys.length));
  }
  private setIgnored(node: NodeView, value: boolean): void {
    node.ignoreLlm = value; node.root.classList.toggle('llm-ignored', value);
    node.root.querySelector<HTMLInputElement>('.node-llm-policy input')!.checked = value;
    node.root.querySelector<HTMLElement>('.node-llm-state')!.textContent = value ? 'KEEP CURRENT' : 'FOLLOW MOOD';
  }
  getLayout(): Record<string, NodeLayout> {
    return Object.fromEntries([...this.nodes].map(([id, node]) => [id, { x: node.x, y: node.y, collapsed: node.root.classList.contains('node-collapsed'), ignoreLlm: node.ignoreLlm, ignoredParameters: ignoredParameterKeys(node.root) }]));
  }
  applyLayout(layout: Record<string, NodeLayout>): void {
    for (const [id, saved] of Object.entries(layout)) {
      const node = this.nodes.get(id); if (!node) continue;
      this.place(node, saved.x, saved.y);
      node.root.classList.toggle('node-collapsed', saved.collapsed);
      node.root.querySelector('.node-toggle')?.setAttribute('aria-expanded', String(!saved.collapsed));
      this.setIgnored(node, saved.ignoreLlm ?? false);
      applyParameterLocks(node.root, saved.ignoredParameters ?? []);
    }
    this.redraw();
  }
  private finish(to: string): void {
    if (!this.pending) return;
    try { const from = this.pending; this.graph.connect(from, to); this.pending = null; this.changed(); this.message(`Connected ${from} → ${to}.`); }
    catch (error) { this.message(error instanceof Error ? error.message : String(error), true); }
    this.redraw();
  }
  private disconnectSelected(): void {
    if (!this.selected) return;
    this.graph.disconnect(this.selected); this.select(null); this.changed(); this.message('Cable disconnected.'); this.redraw();
  }
  private select(id: string | null): void { this.selected = id; this.disconnectButton.disabled = !id; this.redraw(); }
  private place(node: NodeView, x: number, y: number): void {
    node.x = Math.max(16, Math.round(x)); node.y = Math.max(16, Math.round(y));
    node.root.style.left = `${node.x}px`; node.root.style.top = `${node.y}px`; this.redraw();
  }
  arrange(): void {
    const columns = new Map<string, number>();
    const depth = (id: string, visited = new Set<string>()): number => {
      if (visited.has(id)) return 0; visited.add(id);
      const incoming = this.graph.connections.filter((edge) => edge.to === id);
      return incoming.length ? 1 + Math.max(...incoming.map((edge) => depth(edge.from, new Set(visited)))) : 0;
    };
    const rows = new Map<number, number>();
    for (const [id] of this.nodes) columns.set(id, depth(id));
    for (const [id, node] of this.nodes) {
      const column = columns.get(id)!; const y = rows.get(column) ?? 40;
      this.place(node, 40 + column * 370, y); rows.set(column, y + node.root.offsetHeight + 70);
    }
    this.message('Nodes arranged along the audio routes.');
  }
  redraw(): void { if (!this.frame) this.frame = requestAnimationFrame(() => this.draw()); }
  private draw(): void {
    this.frame = 0;
    const width = Math.max(1300, ...[...this.nodes.values()].map((n) => n.x + n.root.offsetWidth + 100));
    const height = Math.max(700, ...[...this.nodes.values()].map((n) => n.y + n.root.offsetHeight + 100));
    this.stage.style.width = `${width}px`; this.stage.style.height = `${height}px`;
    this.cables.setAttribute('viewBox', `0 0 ${width} ${height}`); this.cables.replaceChildren();
    const bounds = this.stage.getBoundingClientRect();
    const point = (port: HTMLElement) => { const r = port.getBoundingClientRect(); return { x: r.left + r.width / 2 - bounds.left, y: r.top + r.height / 2 - bounds.top }; };
    const path = (a: { x: number; y: number }, b: { x: number; y: number }) => { const bend = Math.max(70, Math.abs(b.x - a.x) * 0.45); return `M ${a.x} ${a.y} C ${a.x + bend} ${a.y}, ${b.x - bend} ${b.y}, ${b.x} ${b.y}`; };
    for (const edge of this.graph.connections) {
      const from = this.nodes.get(edge.from)?.output, to = this.nodes.get(edge.to)?.input; if (!from || !to) continue;
      const line = document.createElementNS(svgNS, 'path'); line.setAttribute('d', path(point(from), point(to)));
      line.classList.add('audio-cable'); if (this.selected === edge.id) line.classList.add('selected');
      line.dataset.connection = edge.id; line.setAttribute('tabindex', '0'); line.setAttribute('role', 'button'); line.setAttribute('aria-label', `Select cable ${edge.from} to ${edge.to}`);
      const choose = () => { this.pending = null; this.select(edge.id); this.message(`${edge.from} → ${edge.to}. Press Delete or Disconnect to remove this cable.`); };
      line.addEventListener('click', choose); line.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); } });
      this.cables.append(line);
    }
    for (const node of this.nodes.values()) { node.output?.classList.toggle('patching', node.id === this.pending); node.input?.classList.toggle('patch-target', Boolean(this.pending)); }
    const from = this.pending ? this.nodes.get(this.pending)?.output : null;
    if (from) { const ghost = document.createElementNS(svgNS, 'path'); ghost.classList.add('pending-cable'); ghost.setAttribute('d', path(point(from), this.pointer)); this.cables.append(ghost); }
  }
}
