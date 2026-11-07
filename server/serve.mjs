// Production server for the built app (no dependencies): serves dist/ with SPA fallback and
// proxies /api/* to the Readie API. With API_AUTH_KEY + API_BASIC_TOKEN set, it injects the auth
// headers server-side, so the browser bundle can be built with VITE_API_CREDENTIALS=proxy and no secrets.
//
//   npm run build && npm run serve
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @typedef {import('node:http').IncomingMessage} Request */
/** @typedef {import('node:http').ServerResponse} Response */

const PORT = Number(process.env.PORT ?? 8080);
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const BASE = process.env.VITE_API_BASE_PATH ?? '/api';
const TARGET = process.env.API_PROXY_TARGET ?? '';
const SERVER_AUTH =
  process.env.API_AUTH_KEY && process.env.API_BASIC_TOKEN
    ? { MyAuthorizationx: process.env.API_AUTH_KEY, Authorization: `Basic ${process.env.API_BASIC_TOKEN}` }
    : null;

/** @type {Readonly<Record<string, string>>} */
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/**
 * @param {Request} req
 * @param {Response} res
 * @param {string} url
 */
async function proxy(req, res, url) {
  if (!TARGET) return send(res, 502, 'API_PROXY_TARGET is not configured');
  if (req.method !== 'GET') return send(res, 405, 'Method not allowed');
  // Forward the raw (still percent-encoded) path: never decode or re-encode room names.
  const upstream = TARGET.replace(/\/$/, '') + url.slice(BASE.length);
  /** @type {Record<string, string>} */
  const headers = { 'Content-Type': 'application/json' };
  if (SERVER_AUTH) Object.assign(headers, SERVER_AUTH);
  else {
    // Client-credentials mode: pass through only the two auth headers the API expects.
    if (req.headers.myauthorizationx) headers.MyAuthorizationx = String(req.headers.myauthorizationx);
    if (req.headers.authorization) headers.Authorization = String(req.headers.authorization);
  }
  try {
    const r = await fetch(upstream, { headers, signal: AbortSignal.timeout(30_000) });
    const body = Buffer.from(await r.arrayBuffer());
    res.writeHead(r.status, { 'Content-Type': r.headers.get('content-type') ?? 'application/json', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch (e) {
    send(res, 502, `Upstream request failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * @param {string} url
 * @returns {string} the decoded pathname, or "/" when it cannot be decoded
 */
function decodePathname(url) {
  try {
    return decodeURIComponent(new URL(url, 'http://local').pathname);
  } catch {
    return '/';
  }
}

/**
 * @param {Response} res
 * @param {string} url
 */
async function serveStatic(res, url) {
  const pathname = decodePathname(url);
  const file = normalize(join(DIST, pathname));
  const inside = file === DIST.replace(/[/\\]$/, '') || file.startsWith(DIST.endsWith(sep) ? DIST : DIST + sep);
  if (inside) {
    try {
      const s = await stat(file);
      if (s.isFile()) {
        const immutable = pathname.startsWith('/assets/');
        res.writeHead(200, {
          'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
          'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
        });
        res.end(await readFile(file));
        return;
      }
    } catch {
      // fall through to the SPA shell
    }
  }
  // SPA fallback: every app route (including room names containing dots) gets index.html.
  res.writeHead(200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-cache' });
  res.end(await readFile(join(DIST, 'index.html')));
}

/**
 * @param {Response} res
 * @param {number} status
 * @param {string} message
 */
function send(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}

createServer((req, res) => {
  const url = req.url ?? '/';
  if (url === BASE || url.startsWith(`${BASE}/`)) return void proxy(req, res, url);
  return void serveStatic(res, url);
}).listen(PORT, () => {
  console.log(`Readie Audit Portal on http://localhost:${PORT} (credentials: ${SERVER_AUTH ? 'injected by server' : 'from browser'})`);
});
