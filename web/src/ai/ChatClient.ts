export const CHAT_URL = 'http://localhost:8000/api/chat';

export async function requestChat(prompt: string, systemPrompt: string, signal: AbortSignal, model?: string): Promise<string> {
  const request: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, system_prompt: systemPrompt, json_mode: true, ...(model ? { model } : {}) }), signal };
  let response: Response;
  try { response = await fetch(CHAT_URL, request); }
  catch (error) { if (signal.aborted) throw error; response = await fetch('http://127.0.0.1:8000/api/chat', request); }
  const body = await response.json();
  if (!response.ok) throw new Error(`Composition request failed: ${body.detail ?? response.status}`);
  if (body.is_mock) throw new Error('Configure the server OpenAI key to compose a patch.');
  if (!body.success || typeof body.response !== 'string') throw new Error('Composition response has no text');
  return body.response;
}
