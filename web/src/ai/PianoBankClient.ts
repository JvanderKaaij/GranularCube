import { SFX_URL } from './SfxClient';
import { validatePianoBank, type PianoBank } from '../audio/PianoProgram';
const origin = new URL(SFX_URL).origin;
export async function requestPianoBank(signal?: AbortSignal): Promise<PianoBank> {
  const response = await fetch(`${origin}/api/piano-bank`, { signal: signal ?? AbortSignal.timeout(30_000) });
  const body = await response.json();
  if (!response.ok) throw new Error(typeof body.detail === 'string' ? body.detail : 'Could not read the piano sample bank');
  validatePianoBank(body); return body;
}
export function pianoSampleUrl(filename: string, revision: string): string { return `${origin}/api/piano-samples/${filename.split('/').map(encodeURIComponent).join('/')}?v=${encodeURIComponent(revision)}`; }
