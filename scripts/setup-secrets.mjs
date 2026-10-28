#!/usr/bin/env node
/**
 * একটি কমান্ডে Cloudflare Worker-এ সব সিক্রেট বসিয়ে দেয় (.env ফাইল থেকে)।
 *
 *   node scripts/setup-secrets.mjs           → সিক্রেটগুলো সেট করবে (wrangler secret put)
 *   node scripts/setup-secrets.mjs --check   → শুধু দেখাবে কী কী আছে/নেই
 *
 * আগে একবার `npx wrangler login` করা থাকতে হবে।
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const envFile = path.join(root, '.env');

const KEYS = ['DATABASE_URL', 'ADMIN_PASSWORD', 'SESSION_SECRET'];
const REQUIRED = ['DATABASE_URL', 'ADMIN_PASSWORD'];

function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

if (!fs.existsSync(envFile)) {
  console.error('✗ .env ফাইল পাওয়া যায়নি। আগে `cp .env.example .env` করে মানগুলো বসান।');
  process.exit(1);
}

const env = parseEnv(fs.readFileSync(envFile, 'utf8'));
const missing = REQUIRED.filter((k) => !env[k]);
if (missing.length) {
  console.error('✗ .env-এ এই মানগুলো নেই:', missing.join(', '));
  process.exit(1);
}

const wrangler = process.platform === 'win32' ? 'npx.cmd' : 'npx';

if (process.argv.includes('--check')) {
  console.log('Cloudflare Worker-এ এখন যে সিক্রেটগুলো আছে:\n');
  const res = spawnSync(wrangler, ['wrangler', 'secret', 'list'], { encoding: 'utf8' });
  process.stdout.write(res.stdout || res.stderr || '');
  console.log('\n.env-এ আছে:', Object.keys(env).filter((k) => KEYS.includes(k)).join(', '));
  process.exit(0);
}

console.log('→ .env থেকে সিক্রেট Cloudflare-এ পাঠানো হচ্ছে…\n');
for (const key of KEYS) {
  const value = env[key];
  if (!value) {
    console.log(`• ${key} — .env-এ নেই, বাদ দেওয়া হলো`);
    continue;
  }
  process.stdout.write(`• ${key} … `);
  const res = spawnSync(wrangler, ['wrangler', 'secret', 'put', key], {
    input: value + '\n',
    encoding: 'utf8',
    cwd: root,
  });
  if (res.status === 0) {
    console.log('✓ সেট হয়েছে');
  } else {
    console.log('✗ ব্যর্থ');
    console.log((res.stderr || res.stdout || '').trim().split('\n').slice(-4).join('\n'));
  }
}

console.log('\n→ এখন ডিপ্লয় করুন:  npx wrangler deploy');
