/**
 * Tiny PostgreSQL client for Cloudflare Workers / Pages Functions.
 * Pure JS, no npm dependencies. Uses the `cloudflare:sockets` API.
 *
 * Supports: TLS (sslmode=require/prefer/disable), SCRAM-SHA-256, MD5 and
 * cleartext password auth, and the simple query protocol.
 * Works with Neon, Supabase, Railway, Render, RDS, self-hosted Postgres, etc.
 */

import { connect } from 'cloudflare:sockets';

/* ------------------------------------------------------------------ utils */

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function unb64(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function concat(...parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}
function u32(n) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, false);
  return b;
}
function i32(n) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setInt32(0, n, false);
  return b;
}
function cstr(s) {
  return concat(enc.encode(s), new Uint8Array([0]));
}
function hex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* --------------------------------------------------------------- md5 (js) */

function md5(input) {
  const bytes = typeof input === 'string' ? enc.encode(input) : input;
  const K = new Uint32Array(64);
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0;
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  const len = bytes.length;
  const total = (((len + 8) >> 6) + 1) * 64;
  const buf = new Uint8Array(total);
  buf.set(bytes);
  buf[len] = 0x80;
  const bitLen = len * 8;
  new DataView(buf.buffer).setUint32(total - 8, bitLen >>> 0, true);
  new DataView(buf.buffer).setUint32(total - 4, Math.floor(bitLen / 2 ** 32), true);

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const M = new Uint32Array(16);
  for (let off = 0; off < total; off += 64) {
    const dv = new DataView(buf.buffer, off, 64);
    for (let i = 0; i < 16; i++) M[i] = dv.getUint32(i * 4, true);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      const rot = (i >> 4) * 4 + (i % 4);
      const tmp = D;
      D = C;
      C = B;
      const sum = (A + F + K[i] + M[g]) >>> 0;
      const sh = S[rot];
      B = (B + ((sum << sh) | (sum >>> (32 - sh)))) >>> 0;
      A = tmp;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }
  const out = new Uint8Array(16);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, a0, true);
  dv.setUint32(4, b0, true);
  dv.setUint32(8, c0, true);
  dv.setUint32(12, d0, true);
  return out;
}

/* ------------------------------------------------------------ crypto bits */

async function hmacSha256(key, data) {
  const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? enc.encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, typeof data === 'string' ? enc.encode(data) : data));
}
async function sha256(data) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', typeof data === 'string' ? enc.encode(data) : data));
}
async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
  return new Uint8Array(bits);
}
const xor = (a, b) => a.map((v, i) => v ^ b[i]);

/* ------------------------------------------------------------- connection */

class Connection {
  constructor(socket) {
    this.socket = socket;
    this.writer = socket.writable.getWriter();
    this.reader = socket.readable.getReader();
    this.buf = new Uint8Array(0);
    this.closed = false;
  }
  async send(bytes) {
    await this.writer.write(bytes);
  }
  async fill() {
    const { value, done } = await this.reader.read();
    if (done) throw new Error('Postgres connection closed unexpectedly');
    this.buf = this.buf.length ? concat(this.buf, value) : value;
  }
  async readExact(n) {
    while (this.buf.length < n) await this.fill();
    const out = this.buf.slice(0, n);
    this.buf = this.buf.subarray(n);
    return out;
  }
  async readMessage() {
    const header = await this.readExact(5);
    const type = String.fromCharCode(header[0]);
    const length = new DataView(header.buffer, header.byteOffset, 5).getInt32(1, false);
    const body = length > 4 ? await this.readExact(length - 4) : new Uint8Array(0);
    return { type, body };
  }
  async close() {
    if (this.closed) return;
    this.closed = true;
    try { this.reader.releaseLock(); } catch {}
    try { this.writer.releaseLock(); } catch {}
    try { await this.socket.close(); } catch {}
  }
}

function readCString(bytes, offset = 0) {
  let end = offset;
  while (end < bytes.length && bytes[end] !== 0) end++;
  return { value: dec.decode(bytes.subarray(offset, end)), next: end + 1 };
}

function parseError(body) {
  let i = 0;
  const fields = {};
  while (i < body.length && body[i] !== 0) {
    const code = String.fromCharCode(body[i]);
    const s = readCString(body, i + 1);
    fields[code] = s.value;
    i = s.next;
  }
  const msg = [fields.S, fields.M, fields.D].filter(Boolean).join(' | ') || 'Postgres error';
  const err = new Error(msg);
  err.code = fields.C;
  err.detail = fields.D;
  return err;
}

/* ------------------------------------------------------------------ client */

export class PgClient {
  static async connect(connectionString, options = {}) {
    const url = new URL(connectionString);
    if (!/^postgres(ql)?:$/.test(url.protocol)) throw new Error('DATABASE_URL must start with postgres:// or postgresql://');
    const user = decodeURIComponent(url.username || 'postgres');
    const password = decodeURIComponent(url.password || '');
    const host = url.hostname;
    const port = Number(url.port || 5432);
    const database = decodeURIComponent(url.pathname.replace(/^\//, '') || 'postgres');
    const sslmode = (url.searchParams.get('sslmode') || options.sslmode || 'prefer').toLowerCase();

    const client = new PgClient();
    let socket = connect({ hostname: host, port });
    if (sslmode !== 'disable') {
      try {
        socket = socket.startTls({ expectedServerHostname: host });
      } catch (e) {
        if (sslmode === 'require' || sslmode === 'verify-full' || sslmode === 'verify-ca') throw e;
      }
    }
    client.conn = new Connection(socket);
    await client.startup(user, password, database);
    return client;
  }

  async startup(user, password, database) {
    // StartupMessage
    const params = concat(
      cstr('user'), cstr(user),
      cstr('database'), cstr(database),
      cstr('client_encoding'), cstr('UTF8'),
      cstr('application_name'), cstr('portfolio'),
      new Uint8Array([0])
    );
    const body = concat(i32(196608), params); // protocol 3.0
    await this.conn.send(concat(u32(body.length + 4), body));

    let scram = null;
    for (;;) {
      const { type, body } = await this.conn.readMessage();
      if (type === 'E') throw parseError(body);
      if (type === 'R') {
        const code = new DataView(body.buffer, body.byteOffset, body.length).getInt32(0, false);
        if (code === 0) continue;
        if (code === 3) {
          await this.conn.send(concat(new Uint8Array([0x70]), u32(password.length + 5), cstr(password)));
          continue;
        }
        if (code === 5) {
          const salt = body.subarray(4, 8);
          const inner = hex(md5(password + user));
          const outer = hex(md5(concat(enc.encode(inner), salt)));
          const payload = enc.encode('md5' + outer);
          await this.conn.send(concat(new Uint8Array([0x70]), u32(payload.length + 5), concat(payload, new Uint8Array([0]))));
          continue;
        }
        if (code === 10) {
          const mechs = dec.decode(body.subarray(4)).split('\0').filter(Boolean);
          if (!mechs.includes('SCRAM-SHA-256')) throw new Error('Unsupported SASL mechanism: ' + mechs.join(','));
          const nonce = b64(crypto.getRandomValues(new Uint8Array(18)));
          const clientFirstBare = `n=${user.replace(/=/g, '=3D').replace(/,/g, '=2C')},r=${nonce}`;
          const first = enc.encode('n,,' + clientFirstBare);
          const mech = cstr('SCRAM-SHA-256');
          const payload = concat(mech, concat(i32(first.length), first));
          await this.conn.send(concat(new Uint8Array([0x70]), u32(payload.length + 4), payload));
          scram = { nonce, clientFirstBare, password };
          continue;
        }
        if (code === 11 && scram) {
          const serverFirst = dec.decode(body.subarray(4));
          const parts = Object.fromEntries(serverFirst.split(',').map((p) => [p[0], p.slice(2)]));
          const salt = unb64(parts.s);
          const iterations = Number(parts.i);
          const salted = await pbkdf2(scram.password, salt, iterations);
          const clientKey = await hmacSha256(salted, 'Client Key');
          const storedKey = await sha256(clientKey);
          const clientFinalNoProof = `c=biws,r=${parts.r}`;
          const authMessage = `${scram.clientFirstBare},${serverFirst},${clientFinalNoProof}`;
          const clientSig = await hmacSha256(storedKey, authMessage);
          const proof = b64(xor(clientKey, clientSig));
          const final = enc.encode(`${clientFinalNoProof},p=${proof}`);
          await this.conn.send(concat(new Uint8Array([0x70]), u32(final.length + 4), final));
          continue;
        }
        throw new Error('Unsupported Postgres auth request: ' + code);
      }
      if (type === 'Z') return; // ReadyForQuery
      if (type === 'K' || type === 'S' || type === 'N') continue;
    }
  }

  /** Runs any SQL (single or multiple statements for DDL). Returns rows of the last SELECT. */
  async query(text) {
    await this.conn.send(concat(new Uint8Array([0x51]), u32(enc.encode(text).length + 5), cstr(text))); // 'Q'
    let rows = [];
    let fields = [];
    let error = null;
    for (;;) {
      const { type, body } = await this.conn.readMessage();
      if (type === 'T') {
        rows = [];
        const count = new DataView(body.buffer, body.byteOffset, body.length).getInt16(0, false);
        let i = 2;
        fields = [];
        for (let c = 0; c < count; c++) {
          const s = readCString(body, i);
          fields.push(s.value);
          i = s.next + 18; // table oid (4) + attr (2) + type oid (4) + size (2) + modifier (4) + format (2)
        }
      } else if (type === 'D') {
        const count = new DataView(body.buffer, body.byteOffset, body.length).getInt16(0, false);
        let i = 2;
        const row = {};
        for (let c = 0; c < count; c++) {
          const len = new DataView(body.buffer, body.byteOffset, body.length).getInt32(i, false);
          i += 4;
          let val = null;
          if (len !== -1) {
            val = dec.decode(body.subarray(i, i + len));
            i += len;
          }
          row[fields[c] !== undefined ? fields[c] : c] = val;
        }
        rows.push(row);
      } else if (type === 'E') {
        error = parseError(body);
      } else if (type === 'Z') {
        if (error) throw error;
        return rows;
      } else if (type === 'S' || type === 'N' || type === 'C' || type === 'I' || type === 'A') {
        // ParameterStatus / Notice / CommandComplete / EmptyQuery / Notification -> ignore
      }
    }
  }

  async close() {
    try {
      await this.conn.send(concat(new Uint8Array([0x58]), u32(4))); // Terminate
    } catch {}
    await this.conn.close();
  }
}

/* -------------------------------------------------------------- utilities */

/** Escape a JS value into a Postgres literal. */
export function pgLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (value instanceof Date) return `'${value.toISOString()}'`;
  const s = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `'${s.replace(/\u0000/g, '').replace(/'/g, "''")}'`;
}
