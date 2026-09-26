export interface AudioPortNode { input?: AudioNode; output?: AudioNode }
export interface AudioConnection { id: string; from: string; to: string }

/** Each cable owns a gain so removing a branch cannot disconnect other branches. */
export class AudioGraph {
  private nodes = new Map<string, AudioPortNode>();
  private edges = new Map<string, { connection: AudioConnection; gain: GainNode }>();
  constructor(private context: BaseAudioContext) {}
  get connections(): AudioConnection[] { return [...this.edges.values()].map(({ connection }) => ({ ...connection })); }
  add(id: string, node: AudioPortNode): void {
    if (this.nodes.has(id)) throw new Error('Node already exists');
    this.nodes.set(id, node);
  }
  connect(from: string, to: string): AudioConnection {
    const source = this.nodes.get(from)?.output;
    const destination = this.nodes.get(to)?.input;
    if (!source || !destination) throw new Error('Connect a source or effect OUT to an effect or master IN.');
    const id = `${from}>${to}`;
    if (this.edges.has(id)) throw new Error('These nodes are already connected.');
    const reachable = (start: string, goal: string, seen = new Set<string>()): boolean => {
      if (start === goal) return true;
      if (seen.has(start)) return false;
      seen.add(start);
      return this.connections.some((edge) => edge.from === start && reachable(edge.to, goal, seen));
    };
    if (reachable(to, from)) throw new Error('That cable would create a feedback cycle. Use the delay node’s feedback control.');
    const gain = this.context.createGain();
    gain.gain.value = 0;
    source.connect(gain).connect(destination);
    gain.gain.setTargetAtTime(1, this.context.currentTime, 0.01);
    const connection = { id, from, to };
    this.edges.set(id, { connection, gain });
    return { ...connection };
  }
  disconnect(id: string): void {
    const edge = this.edges.get(id);
    if (!edge) return;
    const source = this.nodes.get(edge.connection.from)?.output;
    this.edges.delete(id);
    edge.gain.gain.setTargetAtTime(0, this.context.currentTime, 0.01);
    setTimeout(() => {
      try { source?.disconnect(edge.gain); } catch { /* Source was disposed during the fade. */ }
      edge.gain.disconnect();
    }, 60);
  }
  remove(id: string): void {
    for (const edge of this.connections) if (edge.from === id || edge.to === id) this.disconnect(edge.id);
    this.nodes.delete(id);
  }
}
