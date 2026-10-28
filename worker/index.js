/**
 * Cloudflare Worker entry point.
 *  /        -> portfolio page (HTML from /public, live data injected from the DB)
 *  /admin   -> admin panel (password protected)
 *  /api/*   -> JSON API
 * Everything else is served from the static assets binding.
 *
 * Database back-end is auto-detected by lib/repo.js:
 *   Supabase (SUPABASE_URL + key)  →  D1 (binding DB)  →  PostgreSQL (DATABASE_URL)
 */

import { getRepo, hasDB, loadSiteData, loadAdminData } from '../lib/repo.js';
import { TABLES, SETTINGS_FIELDS } from '../lib/schema.js';
import {
  adminPassword,
  safeEqual,
  createSessionCookie,
  clearSessionCookie,
  isLoggedIn,
  requireAdmin,
  json,
} from '../lib/auth.js';

const TEXT_LIMIT = 4000;
const LONG_LIMIT = 20000;

/* ------------------------------------------------------------- helpers */

const noStore = (headers = {}) => ({ 'Cache-Control': 'no-store, must-revalidate', ...headers });

function withHtmlHeaders(res) {
  const h = new Headers(res.headers);
  h.set('Content-Type', 'text/html; charset=utf-8');
  h.set('Cache-Control', 'no-store, must-revalidate');
  return h;
}

async function asset(env, request, pathname) {
  if (!env.ASSETS) return new Response('Static assets binding missing', { status: 500 });
  const url = new URL(request.url);
  url.pathname = pathname;
  return env.ASSETS.fetch(new Request(url.toString(), request));
}

/** Drops empty values so a partial UPDATE never wipes untouched columns. */
function compact(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

/* ---------------------------------------------------------------- site */

async function serveSite(request, env) {
  const indexRes = await asset(env, request, '/index.html');
  if (!indexRes.ok) return indexRes;
  let html = await indexRes.text();

  let payload = { settings: {}, education: [], skills: [], interests: [], socials: [], phones: [], dbError: null };
  try {
    const repo = getRepo(env);
    await repo.ensureSchema();
    payload = { ...(await loadSiteData(repo)), admin: await isLoggedIn(request, env) };
    await repo.close();
  } catch (err) {
    payload.dbError = String((err && err.message) || err);
    console.error('site data error:', payload.dbError);
  }

  const jsonData = JSON.stringify(payload).replace(/</g, '\\u003c');
  html = html.replace('<!--SITE_DATA-->', `<script id="site-data" type="application/json">${jsonData}</script>`);
  return new Response(html, { status: 200, headers: withHtmlHeaders(indexRes) });
}

async function serveAdmin(request, env, url) {
  const p = url.pathname;
  if (!(p === '/admin' || p === '/admin/' || p === '/admin/index.html')) return asset(env, request, p);

  const res = await asset(env, request, '/admin/index.html');
  if (!res.ok) return res;
  return new Response(await res.text(), {
    status: 200,
    headers: noStore({
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'same-origin',
    }),
  });
}

/* ---------------------------------------------------------- validation */

function cleanValue(def, value) {
  if (def.type === 'int') {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : Number(def.default ?? 0);
  }
  if (value === null || value === undefined) return '';
  return String(value).slice(0, def.type === 'textarea' ? LONG_LIMIT : TEXT_LIMIT);
}

function sanitizeRow(table, body, { partial = false } = {}) {
  const meta = TABLES[table];
  if (!meta) throw new Error('unknown table: ' + table);
  const out = {};
  for (const [key, def] of Object.entries(meta.columns)) {
    if (key === 'created_at') continue;
    if (partial && !(key in body)) continue;
    out[key] = cleanValue(def, body[key]);
  }
  return out;
}

function sanitizeSettings(body) {
  const fields = new Map(SETTINGS_FIELDS.map((f) => [f.key, f]));
  const out = {};
  for (const [k, v] of Object.entries(body || {})) {
    const field = fields.get(k);
    if (!field) continue;
    const s = v === null || v === undefined ? '' : String(v);
    out[k] = s.slice(0, field.type === 'textarea' ? LONG_LIMIT : TEXT_LIMIT);
  }
  return out;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

/* ---------------------------------------------------------------- API */

async function handleApi(request, env, url) {
  const path = url.pathname;
  const method = request.method;
  let repo = null;

  const open = async () => {
    repo = getRepo(env);
    await repo.ensureSchema();
    return repo;
  };

  try {
    if (path === '/api/health') {
      if (!hasDB(env)) return json({ ok: false, db: null, error: 'কোনো ডেটাবেস কনফিগার করা নেই' });
      const r = await open();
      await r.health();
      return json({ ok: true, db: r.kind, label: r.label, secure: r.secure });
    }

    if (path === '/api/site' && method === 'GET') {
      const r = await open();
      return json({ ...(await loadSiteData(r)), admin: await isLoggedIn(request, env) });
    }

    if (path === '/api/session' && method === 'GET') {
      return json({ loggedIn: await isLoggedIn(request, env) });
    }

    if (path === '/api/login' && method === 'POST') {
      const { password } = await readJson(request);
      if (!adminPassword(env)) {
        return json({ error: 'ADMIN_PASSWORD সেট করা হয়নি। Cloudflare Secret-এ এটা যোগ করুন।' }, 500);
      }
      if (!password || !safeEqual(password, adminPassword(env))) {
        await new Promise((r) => setTimeout(r, 600));
        return json({ error: 'পাসওয়ার্ড সঠিক নয়।' }, 401);
      }
      return json({ ok: true }, 200, { 'Set-Cookie': await createSessionCookie(env) });
    }

    if (path === '/api/logout' && method === 'POST') {
      return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
    }

    if (path === '/api/contact' && method === 'POST') {
      const b = await readJson(request);
      if (b.honey) return json({ ok: true });
      const name = String(b.name || '').trim().slice(0, 120);
      const email = String(b.email || '').trim().slice(0, 160);
      const phone = String(b.phone || '').trim().slice(0, 60);
      const message = String(b.message || '').trim().slice(0, 4000);
      if (!name || !message) return json({ error: 'নাম এবং মেসেজ লিখুন।' }, 400);
      const r = await open();
      await r.insert('messages', {
        name,
        email,
        phone,
        message,
        is_read: 0,
        created_at: new Date().toISOString(),
      });
      return json({ ok: true });
    }

    /* --------------------------- everything below requires a session --- */

    if (path.startsWith('/api/admin/')) {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
    }

    if (path === '/api/admin/data' && method === 'GET') {
      const r = await open();
      const data = await loadAdminData(r);
      return json({
        ...data,
        db: { kind: r.kind, label: r.label, secure: r.secure },
        meta: { tables: TABLES, settingsFields: SETTINGS_FIELDS },
      });
    }

    if (path === '/api/admin/row' && method === 'POST') {
      const body = await readJson(request);
      const table = String(body.table || '');
      if (!TABLES[table] || table === 'messages') return json({ error: 'invalid table' }, 400);
      const r = await open();
      const values = sanitizeRow(table, body.values || {}, { partial: Boolean(body.id) });
      if (!Object.keys(compact(values)).length) return json({ error: 'nothing to save' }, 400);
      if (body.id) {
        await r.update(table, Number(body.id), values);
        return json({ ok: true, id: Number(body.id) });
      }
      const inserted = await r.insert(table, values);
      return json({ ok: true, id: inserted.id });
    }

    if (path === '/api/admin/delete' && method === 'POST') {
      const body = await readJson(request);
      const table = String(body.table || '');
      const id = Number(body.id);
      if (!TABLES[table] || !Number.isFinite(id)) return json({ error: 'invalid request' }, 400);
      const r = await open();
      await r.remove(table, id);
      return json({ ok: true });
    }

    if (path === '/api/admin/settings' && method === 'POST') {
      const body = await readJson(request);
      const values = sanitizeSettings(body);
      if (!Object.keys(values).length) return json({ error: 'nothing to save' }, 400);
      const r = await open();
      await r.setSettings(values);
      return json({ ok: true, saved: Object.keys(values).length });
    }

    if (path === '/api/admin/message' && method === 'POST') {
      const body = await readJson(request);
      const id = Number(body.id);
      if (!Number.isFinite(id)) return json({ error: 'invalid id' }, 400);
      const r = await open();
      if (body.action === 'delete') {
        await r.remove('messages', id);
        return json({ ok: true });
      }
      await r.update('messages', id, { is_read: body.is_read ? 1 : 0 });
      return json({ ok: true });
    }

    if (path === '/api/admin/rows' && method === 'GET') {
      const table = url.searchParams.get('table') || '';
      if (!TABLES[table]) return json({ error: 'invalid table' }, 400);
      const r = await open();
      return json({ rows: await r.list(table) });
    }

    return json({ error: 'not found' }, 404);
  } catch (err) {
    console.error('API error', path, err && err.stack);
    return json({ error: String((err && err.message) || err) }, 500);
  } finally {
    if (repo && repo.close) {
      try {
        await repo.close();
      } catch {}
    }
  }
}

/* ------------------------------------------------------------- router */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.startsWith('/api/')) return handleApi(request, env, url);
    if (path === '/admin' || path.startsWith('/admin/')) return serveAdmin(request, env, url);
    if (path === '/' || path === '/index.html') return serveSite(request, env);

    return asset(env, request, path);
  },
};
