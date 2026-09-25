export const IMAGE_PATCH_URL = 'http://localhost:8000/api/image-patch';
const FALLBACK_URL = 'http://127.0.0.1:8000/api/image-patch';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export interface ImagePatchResponse {
  success: boolean;
  response: string;
  is_mock?: boolean;
}

export async function requestImagePatch(prompt: string, systemPrompt: string, file: File, signal?: AbortSignal): Promise<ImagePatchResponse> {
  if (!IMAGE_TYPES.has(file.type)) throw new Error('Choose a PNG, JPEG, or WebP image.');
  if (!file.size || file.size > MAX_IMAGE_BYTES) throw new Error('Image must be smaller than 8 MB.');
  const imageDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.onabort = () => reject(new DOMException('Image read canceled.', 'AbortError'));
    signal?.addEventListener('abort', () => reader.abort(), { once: true });
    reader.readAsDataURL(file);
  });
  if (signal?.aborted) throw new DOMException('Image request canceled.', 'AbortError');
  const request: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, system_prompt: systemPrompt, image_data_url: imageDataUrl }),
    signal,
  };
  let response: Response;
  try {
    response = await fetch(IMAGE_PATCH_URL, request);
  } catch (error) {
    if (signal?.aborted) throw error;
    response = await fetch(FALLBACK_URL, request);
  }
  let body: Record<string, unknown>;
  try {
    const value: unknown = await response.json();
    if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Invalid response');
    body = value as Record<string, unknown>;
  } catch {
    throw new Error(`Image API returned invalid JSON (${response.status})`);
  }
  if (!response.ok) throw new Error(`Image request failed: ${String(body.detail ?? `HTTP ${response.status}`)}`);
  if (body.is_mock) throw new Error('Image API is in mock mode; configure its OpenAI key.');
  if (body.success !== true || typeof body.response !== 'string') throw new Error('Image API response has no synth settings.');
  return { success: true, response: body.response };
}
