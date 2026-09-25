import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['src/ai/SfxClient.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`;
const { requestSoundEffect } = await import(moduleUrl);
const originalFetch = globalThis.fetch;

try {
  let requestBody;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'http://localhost:8000/api/sfx');
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ success: true, filename: 'rain.mp3', audio_url: 'http://localhost:8000/static/sfx/rain.mp3' }));
  };
  assert.deepEqual(await requestSoundEffect('rain'), { filename: 'rain.mp3', audioUrl: 'http://localhost:8000/static/sfx/rain.mp3' });
  assert.deepEqual(requestBody, { prompt: 'rain' });

  let attempts = 0;
  globalThis.fetch = async (url) => {
    attempts++;
    if (attempts === 1) throw new TypeError('Failed to fetch');
    assert.equal(url, 'http://127.0.0.1:8000/api/sfx');
    return new Response(JSON.stringify({ success: true, audio_url: 'http://127.0.0.1:8000/static/sfx/wind.mp3' }));
  };
  assert.equal((await requestSoundEffect('wind')).filename, 'wind.mp3');
  assert.equal(attempts, 2);

  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, is_mock: true, audio_url: 'http://localhost:8000/static/sfx/mock.mp3' }));
  await assert.rejects(requestSoundEffect('mock'), /ElevenLabs is not configured/);

  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, audio_url: 'https://example.com/other.mp3' }));
  await assert.rejects(requestSoundEffect('unsafe'), /must be served by the local API/);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('SFX client validation passed.');
