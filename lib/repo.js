/**
 * Data access layer with three interchangeable back-ends:
 *
 *   1. Supabase (PostgREST) — SUPABASE_URL + SUPABASE_SECRET_KEY / publishable key
 *   2. Cloudflare D1       — binding `DB`
 *   3. PostgreSQL wire     — DATABASE_URL (Neon / Railway / self-hosted …)
 *
 * The rest of the app never writes SQL; it only calls the small repository
 * interface below, so switching databases is a one-line change of secrets.
 */

import { PgClient } from './pg.js';
import { TABLES, DEFAULT_SETTINGS, DEFAULT_ROWS, ddlFor } from './schema.js';

const enc = new TextEncoder();

/* ==========================================================> helpers ==== */

export const lit = (() => {
  // literal escaper used by the raw-SQL back-ends only
  return function lit(value) {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    const s = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return `'${s.replace(/\u0000/g, '').replace(/'/g, "''")}'`;
  };
})();

const INT_COLUMNS = new Set(['id', 'sort_order', 'is_visible', 'is_read']);

function coerce(row) {
  const out = {};
  for (const [k, v] of Object.entries(row || {})) {
    out[k] = INT_COLUMNS.has(k) && v !== null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : v;
  }
  return out;
}

const orderClause = (table) => (TABLES[table] && TABLES[table].order) || 'id ASC';

/* ======================================================== supabase ===== */

const SUPABASE_URL = (env) =>
  env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_PROJECT_URL || '';

const SUPABASE_KEY = (env) =>
  env.SUPABASE_SECRET_KEY ||
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SUPABASE_SERVICE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.SUPABASE_ANON_KEY ||
  '';

export function hasSupabase(env) {
  return Boolean(SUPABASE_URL(env) && SUPABASE_KEY(env));
}

function supabaseRepo(env) {
  const base = SUPABASE_URL(env).replace(/\/+$/, '');
  const key = SUPABASE_KEY(env);
  const root = base.endsWith('/rest/v1') ? base : `${base}/rest/v1`;

  const request = async (path, { method = 'GET', body, headers = {}, prefer } = {}) => {
    const res = await fetch(`${root}${path}`, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(prefer ? { Prefer: prefer } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!res.ok) {
      const msg = (data && (data.message || data.hint || data.error_description)) || text || `HTTP ${res.status}`;
      const err = new Error(`Supabase: ${msg}`);
      err.status = res.status;
      err.code = data && data.code;
      throw err;
    }
    return data;
  };

  const q = (params) => {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) usp.set(k, v);
    const s = usp.toString();
    return s ? `?${s}` : '';
  };

  const orderToQuery = (table) => {
    // "sort_order ASC, id ASC" -> "sort_order.asc,id.asc"
    return orderClause(table)
      .split(',')
      .map((part) => {
        const [col, dir] = part.trim().split(/\s+/);
        return `${col}.${(dir || 'ASC').toLowerCase() === 'desc' ? 'desc' : 'asc'}`;
      })
      .join(',');
  };

  return {
    kind: 'supabase',
    label: 'Supabase (PostgREST)',
    secure: Boolean(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY),

    async health() {
      await request(`/settings${q({ select: 'key', limit: 1 })}`);
      return true;
    },

    /** Supabase tables are created with schema/schema.supabase.sql (SQL editor). */
    async ensureSchema() {
      try {
        await request(`/settings${q({ select: 'key', limit: 1 })}`);
        return true;
      } catch (e) {
        throw new Error(
          'Supabase টেবিল পাওয়া যাচ্ছে না। Supabase Dashboard → SQL Editor-এ schema/schema.supabase.sql ফাইলটি রান করুন। ' +
            (e.message || '')
        );
      }
    },

    async getSettings() {
      const rows = await request(`/settings${q({ select: 'key,value' })}`);
      const out = {};
      for (const r of rows || []) if (!String(r.key).startsWith('__')) out[r.key] = r.value;
      return out;
    },

    async setSettings(values) {
      const rows = Object.entries(values).map(([key, value]) => ({ key, value: value === null ? '' : String(value) }));
      if (!rows.length) return 0;
      await request(`/settings`, {
        method: 'POST',
        body: rows,
        prefer: 'resolution=merge-duplicates,return=minimal',
        headers: { 'Content-Type': 'application/json' },
      });
      return rows.length;
    },

    async list(table, { visibleOnly = false } = {}) {
      const rows = await request(
        `/${table}${q({ select: '*', ...(visibleOnly ? { is_visible: 'eq.1' } : {}), order: orderToQuery(table) })}`
      );
      return (rows || []).map(coerce);
    },

    async insert(table, data) {
      const rows = await request(`/${table}`, {
        method: 'POST',
        body: data,
        prefer: 'return=representation',
      });
      return { id: Number((rows && rows[0] && rows[0].id) || 0) };
    },

    async update(table, id, data) {
      await request(`/${table}${q({ id: `eq.${id}` })}`, {
        method: 'PATCH',
        body: data,
        prefer: 'return=minimal',
      });
      return { id: Number(id) };
    },

    async remove(table, id) {
      await request(`/${table}${q({ id: `eq.${id}` })}`, { method: 'DELETE', prefer: 'return=minimal' });
      return true;
    },

    async close() {},
  };
}

/* ============================================================== d1 ===== */

function d1Repo(d1) {
  const bind = (sql, values) => (values && values.length ? d1.prepare(sql).bind(...values) : d1.prepare(sql));
  return {
    kind: 'd1',
    label: 'Cloudflare D1',
    secure: true,
    async health() {
      await d1.prepare('SELECT 1 AS ok').all();
      return true;
    },
    async ensureSchema() {
      for (const stmt of ddlFor('sqlite')) await d1.exec(stmt);
      await seedIfEmpty(this);
    },
    async getSettings() {
      const rows = await d1.prepare('SELECT "key", "value" FROM "settings"').all();
      const out = {};
      for (const r of rows.results || []) if (!String(r.key).startsWith('__')) out[r.key] = r.value;
      return out;
    },
    async setSettings(values) {
      const stmts = [];
      for (const [k, v] of Object.entries(values)) {
        stmts.push(d1.prepare('DELETE FROM "settings" WHERE "key" = ?').bind(k));
        stmts.push(d1.prepare('INSERT INTO "settings" ("key", "value") VALUES (?, ?)').bind(k, v === null ? '' : String(v)));
      }
      if (stmts.length) await d1.batch(stmts);
      return Object.keys(values).length;
    },
    async list(table, { visibleOnly = false } = {}) {
      const where = visibleOnly ? ' WHERE "is_visible" = 1' : '';
      const rows = await d1.prepare(`SELECT * FROM "${table}"${where} ORDER BY ${orderClause(table)}`).all();
      return (rows.results || []).map(coerce);
    },
    async insert(table, data) {
      const cols = Object.keys(data);
      const sql = `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${cols
        .map(() => '?')
        .join(', ')})`;
      const res = await d1.batch([bind(sql, cols.map((c) => data[c])), d1.prepare('SELECT last_insert_rowid() AS id')]);
      const row = (res[1].results || [])[0] || {};
      return { id: Number(row.id) };
    },
    async update(table, id, data) {
      const cols = Object.keys(data);
      if (!cols.length) return { id };
      const sql = `UPDATE "${table}" SET ${cols.map((c) => `"${c}" = ?`).join(', ')} WHERE "id" = ?`;
      await bind(sql, [...cols.map((c) => data[c]), id]).run();
      return { id };
    },
    async remove(table, id) {
      await d1.prepare(`DELETE FROM "${table}" WHERE "id" = ?`).bind(id).run();
      return true;
    },
    async close() {},
  };
}

/* ========================================================= postgres === */

/* ---------------------------------------------------------- postgres ---
 * Workers cannot share I/O objects between requests, so every request opens
 * its own TCP+TLS connection. To keep it fast:
 *   • the schema check is remembered per isolate (plain string set)
 *   • the public page loads everything in ONE round trip (JSON aggregate)
 * ---------------------------------------------------------------------- */

const schemaChecked = new Set();

function pgRepo(url) {
  let clientPromise = null;
  const client = () => {
    if (!clientPromise) {
      clientPromise = PgClient.connect(url).catch((e) => {
        clientPromise = null;
        throw e;
      });
    }
    return clientPromise;
  };
  const fill = (sql, values) => {
    if (!values || !values.length) return sql;
    let out = '';
    let i = 0;
    for (const ch of sql) out += ch === '?' && i < values.length ? lit(values[i++]) : ch;
    return out;
  };
  const run = async (sql, values) => (await client()).query(fill(sql, values));

  const jsonTable = (table, extraWhere = '') =>
    `(SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT * FROM "${table}"${extraWhere} ORDER BY ${orderClause(
      table
    )}) t)`;

  return {
    kind: 'postgres',
    label: 'PostgreSQL (Neon)',
    secure: true,

    async health() {
      await run('SELECT 1 AS ok');
      return true;
    },

    async ensureSchema() {
      if (schemaChecked.has(url)) return true;
      try {
        await run('SELECT 1 FROM "settings" LIMIT 1');
      } catch (e) {
        for (const stmt of ddlFor('postgres')) await run(stmt);
        await seedIfEmpty(this);
      }
      schemaChecked.add(url);
      return true;
    },

    /** One round trip for the whole public page. */
    async siteSnapshot() {
      const rows = await run(
        `SELECT json_build_object(
           'settings', (SELECT COALESCE(json_object_agg(s."key", s."value"), '{}'::json) FROM "settings" s WHERE s."key" NOT LIKE '\\_\\_%'),
           'education', ${jsonTable('education', ' WHERE "is_visible" = 1')},
           'skills', ${jsonTable('skills', ' WHERE "is_visible" = 1')},
           'interests', ${jsonTable('interests', ' WHERE "is_visible" = 1')},
           'socials', ${jsonTable('socials', ' WHERE "is_visible" = 1')},
           'phones', ${jsonTable('phones', ' WHERE "is_visible" = 1')}
         )::text AS payload`
      );
      const raw = rows && rows[0] && rows[0].payload;
      const data = JSON.parse(raw || '{}');
      data.education = (data.education || []).map(coerce);
      data.skills = (data.skills || []).map(coerce);
      data.interests = (data.interests || []).map(coerce);
      data.socials = (data.socials || []).map(coerce);
      data.phones = (data.phones || []).map(coerce);
      return data;
    },

    async getSettings() {
      const rows = await run('SELECT "key", "value" FROM "settings"');
      const out = {};
      for (const r of rows || []) if (!String(r.key).startsWith('__')) out[r.key] = r.value;
      return out;
    },

    async setSettings(values) {
      const entries = Object.entries(values);
      if (!entries.length) return 0;
      const payload = JSON.stringify(Object.fromEntries(entries));
      await run(
        `INSERT INTO "settings" ("key", "value")
         SELECT key, value FROM json_each_text(?::json)
         ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value"`,
        [payload]
      );
      return entries.length;
    },

    async list(table, { visibleOnly = false } = {}) {
      const where = visibleOnly ? ' WHERE "is_visible" = 1' : '';
      const rows = await run(`SELECT * FROM "${table}"${where} ORDER BY ${orderClause(table)}`);
      return (rows || []).map(coerce);
    },

    async insert(table, data) {
      const cols = Object.keys(data);
      const rows = await run(
        `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${cols
          .map(() => '?')
          .join(', ')}) RETURNING "id"`,
        cols.map((c) => data[c])
      );
      return { id: Number(rows && rows[0] && rows[0].id) };
    },

    async update(table, id, data) {
      const cols = Object.keys(data);
      if (!cols.length) return { id };
      await run(`UPDATE "${table}" SET ${cols.map((c) => `"${c}" = ?`).join(', ')} WHERE "id" = ?`, [
        ...cols.map((c) => data[c]),
        id,
      ]);
      return { id };
    },

    async remove(table, id) {
      await run(`DELETE FROM "${table}" WHERE "id" = ?`, [id]);
      return true;
    },

    async close() {
      if (!clientPromise) return;
      try {
        await (await clientPromise).close();
      } catch {}
      clientPromise = null;
    },
  };
}

/* ============================================================= seed === */

async function seedIfEmpty(repo) {
  const settings = await repo.getSettings();
  if (!Object.keys(settings).length) {
    await repo.setSettings(DEFAULT_SETTINGS);
  }
  for (const [table, rows] of Object.entries(DEFAULT_ROWS)) {
    const existing = await repo.list(table);
    if (existing.length) continue;
    for (const row of rows) await repo.insert(table, row);
  }
  await repo.setSettings({ __seeded: '1' });
}

/* ========================================================== factory === */

export function getRepo(env) {
  if (hasSupabase(env)) return supabaseRepo(env);
  if (env && env.DB) return d1Repo(env.DB);
  const url = env && (env.DATABASE_URL || env.POSTGRES_URL || env.DATABASE_URL_PG);
  if (url) return pgRepo(url);
  throw new Error(
    'কোনো ডেটাবেস কনফিগার করা নেই। SUPABASE_URL + key দিন, অথবা D1 বাইন্ডিং "DB", অথবা DATABASE_URL সেট করুন।'
  );
}

export function hasDB(env) {
  return hasSupabase(env) || Boolean((env && env.DB) || (env && (env.DATABASE_URL || env.POSTGRES_URL)));
}

/* ================================================= site/admin payload = */

export async function loadSiteData(repo) {
  if (typeof repo.siteSnapshot === 'function') return await repo.siteSnapshot();
  return {
    settings: await repo.getSettings(),
    education: await repo.list('education', { visibleOnly: true }),
    skills: await repo.list('skills', { visibleOnly: true }),
    interests: await repo.list('interests', { visibleOnly: true }),
    socials: await repo.list('socials', { visibleOnly: true }),
    phones: await repo.list('phones', { visibleOnly: true }),
  };
}

export async function loadAdminData(repo) {
  const tables = {};
  for (const name of Object.keys(TABLES)) tables[name] = await repo.list(name);
  return { settings: await repo.getSettings(), tables };
}

export { TABLES };
