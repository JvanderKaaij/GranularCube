import { context } from 'esbuild';
import { createServer as createHttpServer, request as httpRequest } from 'node:http';
import { createServer as createHttpsServer, request as httpsRequest } from 'node:https';
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { buildOptions, outputRoot, prepareOutput } from './shared.mjs';

// One phone-facing origin for the player, requests and audio, including a backend in WSL.
await prepareOutput();
const builder = await context({ ...buildOptions, sourcemap: true });
await builder.watch();
const assets = await builder.serve({ servedir: outputRoot, host: '127.0.0.1', port: 0 });
const backend = new URL(process.env.GRANULARCUBE_API_ORIGIN || 'http://127.0.0.1:8000');
const port = Number(process.env.MOBILE_PORT || 5174);
const cert = process.env.MOBILE_TLS_CERT, key = process.env.MOBILE_TLS_KEY;
if (Boolean(cert) !== Boolean(key)) throw new Error('Set both MOBILE_TLS_CERT and MOBILE_TLS_KEY for HTTPS.');
const secure = Boolean(cert && key);

function handler(request, response) {
  const url = new URL(request.url, 'http://player.local');
  const api = url.pathname.startsWith('/api/') || url.pathname.startsWith('/static/') || url.pathname === '/health';
  const destination = api ? backend : new URL(`http://127.0.0.1:${assets.port}`);
  const path = !api && (url.pathname === '/' || url.pathname === '/mobile/' || url.pathname === '/mobile') ? `/mobile.html${url.search}`
    : !api && url.pathname.startsWith('/mobile/') ? `${url.pathname.slice('/mobile'.length)}${url.search}` : request.url;
  const headers = { ...request.headers, host: api ? request.headers.host : `127.0.0.1:${assets.port}`, 'x-forwarded-proto': secure ? 'https' : 'http' };
  const upstream = (destination.protocol === 'https:' ? httpsRequest : httpRequest)({
    hostname: destination.hostname, port: destination.port, method: request.method, path, headers,
  }, (result) => { response.writeHead(result.statusCode || 502, result.headers); result.pipe(response); });
  upstream.on('error', () => {
    if (response.headersSent) { response.destroy(); return; }
    response.writeHead(502, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ detail: api ? 'The audio API is unavailable. Start the Python server on port 8000.' : 'The client is still building. Reload shortly.' }));
  });
  upstream.setTimeout(310_000, () => upstream.destroy());
  response.on('close', () => { if (!response.writableFinished) upstream.destroy(); });
  request.pipe(upstream);
}
const server = secure ? createHttpsServer({ cert: await readFile(cert), key: await readFile(key) }, handler) : createHttpServer(handler);
server.listen(port, '0.0.0.0', () => {
  const protocol = secure ? 'https' : 'http';
  console.log(`Museum player: ${protocol}://localhost:${port}/`);
  for (const entries of Object.values(networkInterfaces())) for (const entry of entries || []) if (entry.family === 'IPv4' && !entry.internal) console.log(`Phone on the same Wi-Fi: ${protocol}://${entry.address}:${port}/`);
  if (!secure) console.log('For spectral effects and keeping the phone screen awake, use HTTPS with MOBILE_TLS_CERT and MOBILE_TLS_KEY.');
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { server.close(); await builder.dispose(); process.exit(0); });
