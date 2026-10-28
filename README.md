# MD. Zarif Hasan — Personal Portfolio + Admin Panel

সব তথ্য ডেটাবেস থেকে আসে, `/admin` থেকে নিজেই সব এডিট/ডিলিট করা যায়।
ডেটাবেস: **Supabase** (কানেক্টেড) · D1 · PostgreSQL — যেকোনোটা। Cloudflare Workers-এ শুধু `git push` করলেই ডিপ্লয়।

---

## ✨ কী কী আছে

**পাবলিক সাইট (`/`)**
- ৩টি প্রিমিয়াম থিম — **Botanical Sage** (ডিফল্ট), **Sand & Warm Earth**, **Forest & Earthy** (নিচের বাঁ দিকের বাটন দিয়ে ভিজিটর বদলাতে পারে, `T` চাপলেও বদলায়)
- প্রিমিয়াম মোশন: লোডার অ্যানিমেশন, স্ক্রল-রিভিল, প্যারালাক্স, ম্যাগনেটিক বাটন, 3D টিল্ট পোর্ট্রেট, কাস্টম কার্সর, কাউন্টার, ইনফিনিট মার্কি, গ্রেইন টেক্সচার
- সেকশন: হিরো + ছবি, About + স্ট্যাটস, শিক্ষা (টাইমলাইন), দক্ষতা, অভিজ্ঞতা, আগ্রহ, ফিউচার গোল, Contact (ফোন + সোশ্যাল + মেসেজ ফর্ম)
- সম্পূর্ণ রেসপন্সিভ, `prefers-reduced-motion` সাপোর্ট করে

**অ্যাডমিন প্যানেল (`/admin`)**
- পাসওয়ার্ড লগইন (HMAC সাইন করা HttpOnly কুকি)
- সাইটের সব লেখা, নাম, ট্যাগলাইন, ছবি এডিট (ছবি আপলোড করলে অটো রিসাইজ হয়ে সেভ হয়)
- শিক্ষা / দক্ষতা / আগ্রহ / সোশ্যাল লিংক / ফোন নম্বর — যোগ, এডিট, ডিলিট, শো/হাইড
- কন্টাক্ট ফর্মের সব মেসেজ ইনবক্সে (পড়া/আনরিড/ডিলিট)
- সাইটে কোথাও `/admin`-এর লিংক নেই, `robots.txt` + `noindex` দিয়ে সার্চ থেকেও লুকানো

---

## 🗂️ ফাইল স্ট্রাকচার

```
zarif-portfolio/
├─ wrangler.toml            ← Cloudflare কনফিগ + ডেটাবেস নোট
├─ package.json
├─ worker/index.js          ← রাউটিং + সব API (/api/*, /admin, /)
├─ lib/
│  ├─ schema.js             ← টেবিল ডেফিনিশন + ডিফল্ট ডেটা (একই ফাইল সব ডেটাবেসে কাজ করে)
│  ├─ repo.js               ← Supabase / D1 / PostgreSQL — তিনটার অ্যাডাপ্টার (অটো ডিটেক্ট)
│  ├─ pg.js                 ← ডিপেন্ডেন্সি-ফ্রি PostgreSQL ক্লায়েন্ট (Workers-এ চলে)
│  └─ auth.js               ← লগইন + সেশন কুকি
├─ public/
│  ├─ index.html            ← পাবলিক সাইট
│  ├─ assets/site.css       ← ৩ থিমের ডিজাইন টোকেন + সব স্টাইল
│  ├─ assets/site.js        ← রেন্ডারিং + মোশন + ফর্ম
│  ├─ admin/index.html      ← অ্যাডমিন প্যানেল
│  ├─ admin/admin.css
│  ├─ admin/app.js
│  └─ zarif.jpg
├─ schema/
│  ├─ schema.supabase.sql   ← ⭐ Supabase (SQL Editor-এ রান করুন — DROP + CREATE + seed + RLS)
│  ├─ schema.postgres.sql   ← PostgreSQL টেবিল + ডিফল্ট ডেটা
│  └─ schema.sqlite.sql     ← D1 / SQLite টেবিল + ডিফল্ট ডেটা
└─ scripts/build-preview.mjs ← এক ফাইলের অফলাইন প্রিভিউ বানায়
```

> **নোট:** D1 ও PostgreSQL-এ অ্যাপ নিজেই টেবিল বানিয়ে নেয়।
> **Supabase-এ টেবিল বানাতে `schema/schema.supabase.sql` একবার রান করতে হবে** (REST API দিয়ে DDL চলে না)।

---

## 🚀 ডিপ্লয় — Supabase + Cloudflare (এখন এটাই সেট করা আছে)

### ১) Supabase ডেটাবেস প্রস্তুত
1. [Supabase Dashboard](https://supabase.com/dashboard) → আপনার প্রজেক্ট
   (`jcrfwkanqxuaisnjgdmo`) → বাঁ দিকের মেনু থেকে **SQL Editor** → **New query**
2. `schema/schema.supabase.sql` ফাইলটির **পুরো কোড** পেস্ট করে **Run** চাপুন।
   → আগের সব টেবিল মুছে নতুন করে তৈরি হবে + ডিফল্ট ডেটা বসবে + RLS চালু হবে।
   (ফাইলটি পুরনো টেবিল DROP করে, তাই আগে ডেটা ব্যাকআপ নিতে চাইলে নিয়ে নিন)
3. **Settings → API keys** থেকে **Secret key** (`sb_secret_…`) কপি করুন।
   *(`sb_publishable_…` key দিয়ে শুধু পড়া যায়; লেখা/অ্যাডমিনের জন্য secret key দরকার)*

### ২) Cloudflare-এ পুশ করার আগে সিক্রেট সেট
```bash
npm install
npx wrangler login

npx wrangler secret put SUPABASE_URL          # https://jcrfwkanqxuaisnjgdmo.supabase.co
npx wrangler secret put SUPABASE_SECRET_KEY   # sb_secret_...  ← Supabase থেকে
npx wrangler secret put ADMIN_PASSWORD        # আপনার অ্যাডমিন পাসওয়ার্ড
npx wrangler secret put SESSION_SECRET        # যেকোনো লম্বা র‍্যান্ডম স্ট্রিং
```

### ৩) ডিপ্লয়
```bash
npx wrangler deploy
```

**GitHub থেকে অটো-ডিপ্লয়:** Cloudflare Dashboard → *Workers & Pages* → *Create* →
*Connect to Git* → রিপো সিলেক্ট → Build command **খালি** রাখুন, Deploy command `npx wrangler deploy`।
সিক্রেটগুলো Dashboard → Settings → *Variables and Secrets*-এ একবার বসিয়ে দিলেই প্রতিবার `git push`-এ ডিপ্লয় হবে।

---

### বিকল্প ডেটাবেস (দরকার হলে)

<details>
<summary><b>Cloudflare D1</b></summary>

`wrangler.toml`-এ `[[d1_databases]]` আনকমেন্ট করে `database_id` বসান, আর
`SUPABASE_URL` / `SUPABASE_SECRET_KEY` সিক্রেট দুটি রাখবেন না (থাকলে Supabase অগ্রাধিকার পাবে)।

```bash
npx wrangler d1 create zarif-portfolio
npx wrangler d1 execute zarif-portfolio --remote --file=schema/schema.sqlite.sql
```
</details>

<details>
<summary><b>সরাসরি PostgreSQL (Neon / Railway …)</b></summary>

```bash
npx wrangler secret delete SUPABASE_URL
npx wrangler secret put DATABASE_URL     # postgresql://user:pass@host/db?sslmode=require
psql "$DATABASE_URL" -f schema/schema.postgres.sql
```
</details>

## 💻 লোকাল ডেভেলপমেন্ট

```bash
cp .dev.vars.example .dev.vars     # পাসওয়ার্ড ও DATABASE_URL বসান
npm run dev                        # http://localhost:8787
```

- সাইট: http://localhost:8787
- অ্যাডমিন: http://localhost:8787/admin

`.dev.vars` কখনো Git-এ কমিট করবেন না (`.gitignore`-এ আছে)।

---

## 🔐 অ্যাডমিন ব্যবহার

1. ব্রাউজারে যান → `আপনার-ডোমেইন/admin` (যেমন `zarif.com/admin`)
2. `ADMIN_PASSWORD` দিয়ে লগইন (৭ দিন সেশন থাকে)
3. বাঁ দিকের মেনু থেকে যা চান এডিট করুন — বদলানো সাথে সাথেই সাইটে দেখা যাবে

**টিপস**
- "ক্রম" ছোট সংখ্যা আগে দেখায় → সাজানোর জন্য ব্যবহার করুন
- চোখের বাটন = সাইটে দেখানো / লুকানো
- প্রোফাইল ছবি: অ্যাডমিন → *সাইটের লেখা* → **প্রোফাইল ছবি** → ফাইল সিলেক্ট করলেই
  অটো রিসাইজ হয়ে ডেটাবেসে সেভ হবে (আলাদা কোনো আপলোড সার্ভার লাগবে না)
- পাসওয়ার্ড বদলাতে: `npx wrangler secret put ADMIN_PASSWORD` আবার চালান

---

## 🔌 API (চাইলে নিজের কাস্টম প্যানেল বানাতে পারবেন)

| Method | Path | কাজ |
|---|---|---|
| GET | `/api/health` | ডেটাবেস কানেকশন চেক (`supabase` / `d1` / `postgres`) |
| GET | `/api/site` | পাবলিক সাইটের সব ডেটা (JSON) |
| POST | `/api/contact` | কন্টাক্ট ফর্ম সেভ |
| GET | `/api/session` | লগইন আছে কি না |
| POST | `/api/login` `{password}` | লগইন |
| POST | `/api/logout` | লগআউট |
| GET | `/api/admin/data` | সব টেবিল + সেটিংস (লগইন লাগবে) |
| POST | `/api/admin/row` `{table,id?,values}` | রো যোগ/আপডেট |
| POST | `/api/admin/delete` `{table,id}` | রো ডিলিট |
| POST | `/api/admin/settings` `{key:value,...}` | লেখা/সেটিংস সেভ |
| POST | `/api/admin/message` `{id,is_read}` বা `{id,action:'delete'}` | মেসেজ |

---

## 🎨 থিম কালার (আপনার দেওয়া হুবহু)

```css
/* Botanical Sage (ডিফল্ট) */
--bg-color: #F4F6F0;  --text-color: #1F3A29;
--accent-color: #9DC08B;  --card-bg: #EAEFE5;

/* Sand & Warm Earth */
--bg-color: #FBF7F4;  --text-color: #5C3D2E;
--accent-color: #D3A27D;  --card-bg: #F5EFEB;

/* Forest & Earthy */
--bg-color: #F9F8F6;  --text-color: #2C3E35;
--accent-color: #76A08A;  --card-bg: #FFFFFF;
```

---

## 🧪 এক ফাইলে প্রিভিউ (ইন্টারনেট ছাড়াই)

```bash
npm run build:preview
# → preview/portfolio-preview.html (CSS, JS, ছবি সব ভেতরে)
```

---

## ✅ ছোট ছোট দরকারি কথা

- Node 22+ দরকার (wrangler-এর জন্য)। `nvm use 22`
- ফ্রি প্ল্যানেই যথেষ্ট (Supabase: 500MB DB / Workers: ১ লাখ রিকোয়েস্ট/দিন)
- ডোমেইন যোগ করতে: Cloudflare Dashboard → Worker → Settings → Domains & Routes
- ব্যাকআপ: Supabase → Database → Backups, অথবা
  `pg_dump "postgresql://postgres:PASSWORD@db.jcrfwkanqxuaisnjgdmo.supabase.co:5432/postgres" > backup.sql`

Made with 🌿 for **MD. Zarif Hasan** — Jashore, Bangladesh.
