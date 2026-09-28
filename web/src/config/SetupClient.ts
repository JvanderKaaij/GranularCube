import { SFX_URL } from '../ai/SfxClient';
import type { PatchSetup, SetupSummary, StoredSetup } from './Setup';

const origin = new URL(SFX_URL).origin;
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const signal = options.signal ?? AbortSignal.timeout(120_000);
  let response: Response;
  try { response = await fetch(`${origin}${path}`, { ...options, signal }); }
  catch (error) {
    if (signal.aborted || !origin.includes('://localhost:')) throw error;
    response = await fetch(`${origin.replace('localhost', '127.0.0.1')}${path}`, { ...options, signal });
  }
  const body = await response.json();
  if (!response.ok) {
    const detail = typeof body.detail === 'string' ? body.detail : Array.isArray(body.detail)
      ? body.detail.slice(0, 3).map((issue: { loc?: string[]; msg?: string }) => `${issue.loc?.slice(1).join('.') ?? 'Setup'}: ${issue.msg ?? 'invalid value'}`).join('; ')
      : `Setup request failed (${response.status}).`;
    throw new Error(detail);
  }
  return body as T;
}
export const listSetups = () => request<{ setups: SetupSummary[]; defaultId: string | null }>('/api/setups');
export const readSetup = (id: string, signal?: AbortSignal) => request<StoredSetup>(`/api/setups/${encodeURIComponent(id)}`, { signal });
export const saveSetup = (name: string, setup: PatchSetup, id?: string) => request<SetupSummary>(`/api/setups${id ? `/${encodeURIComponent(id)}` : ''}`, {
  method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, setup }),
});
export const setDefaultSetup = (setupId: string | null) => request<{ defaultId: string | null }>('/api/setups/default', {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ setupId }),
});
export function sampleUrl(sample: { kind: 'builtin' | 'asset'; filename?: string }): string {
  return sample.kind === 'builtin' ? `${origin}/api/samples/${encodeURIComponent(sample.filename!)}` : `${origin}/api/setup-audio/${encodeURIComponent(sample.filename!)}`;
}
