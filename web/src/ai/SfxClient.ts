export const SFX_URL = 'http://localhost:8000/api/sfx';
const FALLBACK_URL = 'http://127.0.0.1:8000/api/sfx';

export interface GeneratedSample {
  filename: string;
  audioUrl: string;
}

/** Requests a sound effect and returns the saved audio file served by the local API. */
export async function requestSoundEffect(word: string, signal?: AbortSignal): Promise<GeneratedSample> {
  const request: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: word }),
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
