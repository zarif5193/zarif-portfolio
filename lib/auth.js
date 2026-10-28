/**
 * Minimal, dependency-free admin auth:
 *   password (ADMIN_PASSWORD secret) -> HMAC-SHA256 signed cookie
 */

const enc = new TextEncoder();
const COOKIE = 'zh_admin';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const b64url = (bytes) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return b64url(new Uint8Array(sig));
}

async function signPayload(secret, payload) {
  return `${payload}.${await hmac(secret, payload)}`;
}

export function adminPassword(env) {
  return env.ADMIN_PASSWORD || env.ADMIN_SECRET || '';
}

export function secret(env) {
  return env.SESSION_SECRET || adminPassword(env) || 'insecure-dev-secret-change-me';
}

/** Constant-time-ish string compare. */
export function safeEqual(a, b) {
  const A = String(a);
  const B = String(b);
  let diff = A.length ^ B.length;
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    diff |= (A.charCodeAt(i) || 0) ^ (B.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export async function createSessionCookie(env) {
  const exp = Date.now() + MAX_AGE * 1000;
  const token = await signPayload(secret(env), `v1.${exp}`);
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function readCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

export async function isLoggedIn(request, env) {
  if (!adminPassword(env)) return false;
  const token = readCookie(request, COOKIE);
  if (!token || !token.includes('.')) return false;
  const idx = token.lastIndexOf('.');
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = await hmac(secret(env), payload);
  if (!safeEqual(sig, expected)) return false;
  const exp = Number(payload.split('.').pop());
  return Number.isFinite(exp) && exp > Date.now();
}

export async function requireAdmin(request, env) {
  const ok = await isLoggedIn(request, env);
  if (!ok) return json({ error: 'unauthorized' }, 401);
  return null;
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}
