import { createServer } from 'node:http';

import { generateWithGemini } from './gemini.mjs';

// Render and similar hosts provide PORT and require binding to all interfaces.
// Keep the local defaults unchanged when PORT is not provided.
const port = Number(process.env.PORT || process.env.GO_GOAL_AI_PORT) || 8787;
const host = process.env.GO_GOAL_AI_HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
const provider = process.env.GO_GOAL_AI_PROVIDER?.trim().toLowerCase() || 'gemini';
if (!['gemini', 'vertex'].includes(provider)) throw new Error('GO_GOAL_AI_PROVIDER must be "gemini" or "vertex"');
const model = provider === 'vertex' ? process.env.VERTEX_AI_MODEL || 'gemini-2.5-flash' : process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const apiKey = process.env.GEMINI_API_KEY?.trim();
const vertexProject = process.env.GOOGLE_CLOUD_PROJECT?.trim();
const vertexLocation = process.env.GOOGLE_CLOUD_LOCATION?.trim() || 'global';
const maxBodyBytes = 18 * 1024 * 1024;

function headers(contentType = 'application/json; charset=utf-8') {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  };
}

function sendJson(response, status, body) {
  response.writeHead(status, headers());
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) throw new Error('Request image is too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, headers());
    response.end();
    return;
  }
  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, { ok: true, configured: provider === 'vertex' ? Boolean(vertexProject) : Boolean(apiKey), provider, model });
    return;
  }
  if (request.method !== 'POST' || request.url !== '/go-go-goal') {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }
  if (provider === 'gemini' && !apiKey) {
    sendJson(response, 503, { error: 'GEMINI_API_KEY is not configured on the server' });
    return;
  }
  if (provider === 'vertex' && !vertexProject) {
    sendJson(response, 503, { error: 'GOOGLE_CLOUD_PROJECT is not configured for Vertex AI' });
    return;
  }
  try {
    const input = await readJson(request);
    const result = await generateWithGemini(input, { provider, apiKey, model, project: vertexProject, location: vertexLocation });
    sendJson(response, 200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown AI error';
    const clientError = /Invalid|Unsupported|Missing|too large/.test(message);
    console.error(`[Gemini] ${message}`);
    sendJson(response, clientError ? 400 : 502, { error: clientError ? message : 'Gemini request failed' });
  }
});

server.listen(port, host, () => {
  console.log(`Go Go Goal AI server: http://${host}:${port}`);
  console.log(`AI provider: ${provider}; model: ${model}`);
  console.log(provider === 'vertex' ? `Vertex project: ${vertexProject ?? 'missing'}; location: ${vertexLocation}` : `Gemini API key: ${apiKey ? 'configured' : 'missing'}`);
});
