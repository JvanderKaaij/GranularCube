import { sampleCatalog } from '../sampleCatalog';

export const SFX_URL = 'http://localhost:8000/api/sfx';
const FALLBACK_URL = 'http://127.0.0.1:8000/api/sfx';
const SAMPLES_URL = 'http://localhost:8000/api/samples';

/** Read the server's authoritative built-in sample filenames before asking the model to select one. */
export async function requestAvailableSamples(signal?: AbortSignal): Promise<string[]> {
  let response: Response;
  try { response = await fetch(SAMPLES_URL, { signal }); }
  catch (error) {
    if (signal?.aborted) throw error;
    response = await fetch('http://127.0.0.1:8000/api/samples', { signal });
  }
  const body: unknown = await response.json();
  if (!response.ok || typeof body !== 'object' || body === null || !('samples' in body) || !Array.isArray(body.samples))
    throw new Error('The API did not return its available built-in samples. Check that the server and Samples folder are running.');
  const present = new Set(body.samples.filter((file: unknown): file is string => typeof file === 'string' && /^[\w.-]+\.(wav|aif|aiff|mp3|m4a|ogg)$/i.test(file)));
  const samples = sampleCatalog.map(({ file }) => file).filter((file) => present.has(file));
  if (!samples.length) throw new Error('The API found no available built-in audio samples.');
  return samples;
}

export interface GeneratedSample {
  filename: string;
  audioUrl: string;
}
export interface SfxOptions { durationSeconds?: number; promptInfluence?: number }

/** Requests a sound effect and returns the saved audio file served by the local API. */
export async function requestSoundEffect(word: string, signal?: AbortSignal, options: SfxOptions = {}): Promise<GeneratedSample> {
  if (!word.trim() || word.length > 450) throw new Error('Sound effect description must be between 1 and 450 characters.');
  if (/^(?:only for\b|for sfx only\b|audible action of\b|literal acoustic\b|visible evidence supporting\b|concrete physical\b|short physical source\b|describe (?:a|the)\b)|\bsource\s*\+\s*(?:audible\s+)?action\b/i.test(word.trim()))
    throw new Error('That is a prompt template instruction, not a sound. Describe an audible source and action from the artwork.');
  const request: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: word, duration_seconds: options.durationSeconds, prompt_influence: options.promptInfluence }),
    signal,
  };
  let endpoint = SFX_URL;
  let response: Response;
  try {
    response = await fetch(endpoint, request);
  } catch (error) {
    if (signal?.aborted) throw error;
    endpoint = FALLBACK_URL;
    response = await fetch(endpoint, request);
  }
  let body: Record<string, unknown>;
  try {
    const value: unknown = await response.json();
    if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Invalid response');
    body = value as Record<string, unknown>;
  } catch {
    throw new Error(`SFX API returned invalid JSON (${response.status})`);
  }
  if (!response.ok) throw new Error(`SFX request failed: ${String(body.detail ?? `HTTP ${response.status}`)}`);
  if (body.is_mock) throw new Error('ElevenLabs is not configured on the API server.');
  if (body.success !== true || typeof body.audio_url !== 'string') throw new Error('SFX response has no audio URL');
  const audioUrl = new URL(body.audio_url);
  if (!['http:', 'https:'].includes(audioUrl.protocol) || audioUrl.origin !== new URL(endpoint).origin) {
    throw new Error('SFX response audio URL must be served by the local API');
  }
  const filename = typeof body.filename === 'string' && body.filename ? body.filename : audioUrl.pathname.split('/').pop() || 'generated.mp3';
  return { filename, audioUrl: audioUrl.href };
}
