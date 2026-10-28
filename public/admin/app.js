/* =========================================================================
   Admin panel logic — talks to /api/admin/*
   ========================================================================= */

(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const EYE_ON =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/></svg>';
  const EYE_OFF =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 3l18 18"/><path d="M10.6 6.1A9.7 9.7 0 0 1 12 6c6.5 0 10 6 10 6a17.6 17.6 0 0 1-3.3 3.9M6.3 7.9A17.3 17.3 0 0 0 2 12s3.5 6 10 6a9.6 9.6 0 0 0 3.6-.7"/></svg>';

  const TABLE_VIEWS = {
    education: { title: 'শিক্ষা', sub: 'টাইমলাইনের প্রতিটি ধাপ', icon: '' },
    skills: { title: 'দক্ষতা', sub: 'স্কিল কার্ডগুলো', icon: '' },
    interests: { title: 'আগ্রহ', sub: 'শখ ও আগ্রহের চিপ', icon: '' },
    socials: { title: 'সোশ্যাল লিংক', sub: 'আপনার সোশ্যাল প্রোফাইল', icon: '' },
    phones: { title: 'ফোন নম্বর', sub: 'যোগাযোগের নম্বর', icon: '' },
  };

  const state = {
    data: null, // {settings, tables, meta, dialect}
    view: 'overview',
    editing: null, // {table, id}
  };

  /* ------------------------------------------------------------------ api */

  async function api(path, options = {}) {
    const res = await fetch(path, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (res.status === 401) {
      showLogin('সেশন শেষ হয়েছে, আবার লগইন করুন।');
      throw new Error('unauthorized');
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'অনুরোধ ব্যর্থ হয়েছে');
    return json;
  }

  function toast(msg, isError = false) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.toggle('is-error', isError);
    el.classList.add('is-show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('is-show'), 2600);
  }

  /* ---------------------------------------------------------------- views */

  function showLogin(message) {
    $('#appView').hidden = true;
    $('#loginView').hidden = false;
    if (message) {
      const s = $('#loginStatus');
      s.textContent = message;
      s.classList.add('is-error');
    }
  }

  function showApp() {
    $('#loginView').hidden = true;
    $('#appView').hidden = false;
  }

  async function loadData() {
    state.data = await api('/api/admin/data');
    const pill = $('#dbPill');
    const db = state.data.db || { label: '—', secure: true };
    pill.textContent = 'DB: ' + db.label;
    pill.title = db.secure
      ? 'লেখার অনুমতি সুরক্ষিত (secret key)'
      : 'সতর্কতা: শুধু publishable key দিয়ে চলছে — লেখার অনুমতি ডেটাবেস লেভেলে খোলা';
    pill.classList.toggle('pill--warn', !db.secure);
    renderMessagesBadge();
  }

  function renderMessagesBadge() {
    const msgs = (state.data && state.data.tables.messages) || [];
    const unread = msgs.filter((m) => Number(m.is_read) !== 1).length;
    const badge = $('#msgBadge');
    badge.textContent = String(unread);
    badge.hidden = unread === 0;
  }

  function setView(view) {
    state.view = view;
    $$('#sidebarNav button').forEach((b) => b.classList.toggle('is-active', b.dataset.view === view));
    const content = $('#content');
    content.innerHTML = '';

    if (view === 'overview') return renderOverview(content);
    if (view === 'settings') return renderSettings(content);
    if (view === 'messages') return renderMessages(content);
    return renderTable(content, view);
  }

  /* ------------------------------------------------------------- overview */

  function renderOverview(root) {
    $('#viewTitle').textContent = 'ড্যাশবোর্ড';
    $('#viewSub').textContent = 'আপনার পোর্টফোলিওর সব কিছু এক জায়গায়';
    const t = state.data.tables;
    const msgs = t.messages || [];
    const unread = msgs.filter((m) => Number(m.is_read) !== 1).length;

    const tiles = [
      { n: t.education.length, l: 'শিক্ষা এন্ট্রি' },
      { n: t.skills.length, l: 'দক্ষতা' },
      { n: t.socials.length, l: 'সোশ্যাল লিংক' },
      { n: t.phones.length, l: 'ফোন নম্বর' },
      { n: msgs.length, l: 'মোট মেসেজ' },
      { n: unread, l: 'অপঠিত মেসেজ' },
    ];

    root.innerHTML = `
      <div class="stat-grid">
        ${tiles.map((x) => `<div class="stat-tile"><b>${x.n}</b><small>${x.l}</small></div>`).join('')}
      </div>

      <div class="card">
        <div class="card__head">
          <div>
            <h2>দ্রুত কাজ</h2>
            <p>এক ক্লিকে পরিচিত জায়গায় যান</p>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button class="btn btn--primary btn--sm" data-quick="settings">সাইটের লেখা এডিট করুন</button>
          <button class="btn btn--ghost btn--sm" data-quick="socials">সোশ্যাল লিংক</button>
          <button class="btn btn--ghost btn--sm" data-quick="phones">ফোন নম্বর</button>
          <button class="btn btn--ghost btn--sm" data-quick="messages">মেসেজ দেখুন</button>
          <a class="btn btn--ghost btn--sm" href="/" target="_blank" rel="noopener">সাইট প্রিভিউ ↗</a>
        </div>
      </div>

      <div class="card">
        <div class="card__head">
          <div>
            <h2>সংযোগ ও ডেটাবেস</h2>
            <p>সব কিছু ঠিকভাবে কানেক্টেড আছে কি না দেখে নিন</p>
          </div>
        </div>
        <div class="form-grid">
          <div class="field"><span>ডেটাবেস</span><b>${esc((state.data.db && state.data.db.label) || '—')}</b></div>
          <div class="field"><span>সর্বশেষ রিফ্রেশ</span><b>${new Date().toLocaleString('bn-BD')}</b></div>
        </div>
        <p class="hint" style="margin-top:12px">
          অ্যাডমিন প্যানেলটি <code>/admin</code> ঠিকানায় আছে — সাইটের কোথাও লিংক করা নেই, তাই সাধারণ ভিজিটর এটি দেখতে পাবে না।
        </p>
        ${
          state.data.db && state.data.db.secure === false
            ? `<p class="hint" style="margin-top:10px;color:#b4562f">
                 ⚠ এখন শুধু <b>publishable (anon) key</b> দিয়ে চলছে। ডেটা নিরাপদ রাখতে Cloudflare Secret-এ
                 <code>SUPABASE_SECRET_KEY</code> (sb_secret_…) যোগ করুন।
               </p>`
            : ''
        }
      </div>`;

    root.querySelectorAll('[data-quick]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.quick)));
  }

  /* ------------------------------------------------------------- settings */

  function renderSettings(root) {
    $('#viewTitle').textContent = 'সাইটের লেখা';
    $('#viewSub').textContent = 'নাম, বর্ণনা, ছবি — সবকিছু এখান থেকে বদলান';
    const fields = state.data.meta.settingsFields;
    const values = state.data.settings;
    const groups = [...new Set(fields.map((f) => f.group || 'অন্যান্য'))];

    const fieldHtml = (f) => {
      const value = values[f.key] !== undefined ? values[f.key] : '';
      if (f.type === 'textarea') {
        return `<label class="field field--wide"><span>${esc(f.label)}</span>
          <textarea data-key="${f.key}" rows="4">${esc(value)}</textarea></label>`;
      }
      if (f.type === 'image') {
        return `<div class="field field--wide">
          <span>${esc(f.label)}</span>
          <div class="image-field">
            <img id="photoPreview" src="${esc(value || '/zarif.jpg')}" alt="preview" />
            <div class="image-field__inputs">
              <input data-key="${f.key}" id="photoUrl" type="text" value="${esc(value)}" placeholder="/zarif.jpg অথবা https://..." />
              <input type="file" accept="image/*" id="photoFile" />
              <p class="hint">নতুন ছবি আপলোড করলে সেটি স্বয়ংক্রিয়ভাবে ছোট করে ডেটাবেসে সেভ হবে।</p>
            </div>
          </div>
        </div>`;
      }
      return `<label class="field"><span>${esc(f.label)}</span>
        <input data-key="${f.key}" type="text" value="${esc(value)}" /></label>`;
    };

    root.innerHTML = `
      <form class="card" id="settingsForm">
        ${groups
          .map(
            (g) => `
          <div class="group">
            <div class="group__title">${esc(g)}</div>
            <div class="form-grid">
              ${fields.filter((f) => (f.group || 'অন্যান্য') === g).map(fieldHtml).join('')}
            </div>
          </div>`
          )
          .join('')}
        <div style="display:flex;gap:10px;align-items:center;margin-top:22px;flex-wrap:wrap">
          <button class="btn btn--primary" type="submit">সব পরিবর্তন সেভ করুন</button>
          <span class="status" id="settingsStatus"></span>
        </div>
      </form>`;

    // image upload -> resize -> data URL
    const fileInput = $('#photoFile');
    if (fileInput) {
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        try {
          const dataUrl = await resizeImage(file, 900);
          $('#photoUrl').value = dataUrl;
          $('#photoPreview').src = dataUrl;
          toast('ছবি প্রস্তুত — এখন "সেভ" করুন।');
        } catch (e) {
          toast('ছবি প্রসেস করা যায়নি: ' + e.message, true);
        }
      });
      $('#photoUrl').addEventListener('input', (e) => {
        if (e.target.value) $('#photoPreview').src = e.target.value;
      });
    }

    $('#settingsForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = $('#settingsStatus');
      const payload = {};
      root.querySelectorAll('[data-key]').forEach((el) => {
        payload[el.dataset.key] = el.value;
      });
      status.textContent = 'সেভ হচ্ছে…';
      status.classList.remove('is-error');
      try {
        await api('/api/admin/settings', { method: 'POST', body: JSON.stringify(payload) });
        Object.assign(state.data.settings, payload);
        status.textContent = 'সেভ হয়েছে ✓';
        toast('সেটিংস আপডেট হয়েছে');
      } catch (err) {
        status.textContent = 'সমস্যা: ' + err.message;
        status.classList.add('is-error');
        toast('সেভ করা যায়নি', true);
      }
    });
  }

  function resizeImage(file, maxSize) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('ফাইল পড়া যায়নি'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('ছবি খোলা যায়নি'));
        img.onload = () => {
          const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * ratio);
          canvas.height = Math.round(img.height * ratio);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.86));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------------------------------------------------------------- table */

  function renderTable(root, table) {
    const info = TABLE_VIEWS[table];
    const meta = state.data.meta.tables[table];
    const rows = state.data.tables[table] || [];
    $('#viewTitle').textContent = info.title;
    $('#viewSub').textContent = info.sub;

    const primary = (row) => {
      if (table === 'education') return `${row.title || '—'} <span class="tag">${esc(row.year || '')}</span>`;
      if (table === 'interests') return `${esc(row.emoji || '✦')} ${esc(row.label || '—')}`;
      if (table === 'socials') return esc(row.label || row.url || '—');
      if (table === 'phones') return esc(row.number || '—');
      return esc(row.title || '—');
    };
    const secondary = (row) => {
      if (table === 'education') return esc(row.subtitle || row.description || '');
      if (table === 'socials') return esc(row.url || '');
      if (table === 'phones') return esc(row.label || '');
      return esc(row.description || '');
    };

    root.innerHTML = `
      <div class="card">
        <div class="card__head">
          <div>
            <h2>${esc(info.title)} <span class="muted">(${rows.length})</span></h2>
            <p>${esc(info.sub)}</p>
          </div>
          <button class="btn btn--primary btn--sm" id="addRow">+ নতুন যোগ করুন</button>
        </div>
        <div id="rowList">
          ${rows.length ? rows.map((row) => rowHtml(table, row, primary(row), secondary(row))).join('') : '<div class="empty">এখনো কিছু যোগ করা হয়নি।</div>'}
        </div>
        <p class="hint" style="margin-top:14px">
          টিপস: "ক্রম" ছোট সংখ্যা আগে দেখাবে। চোখের বাটনে চাপ দিলে সাইটে দেখানো/লুকানো বদলে যাবে।
        </p>
      </div>`;

    $('#addRow').addEventListener('click', () => openEditor(table, null));
    bindRowActions(root, table, meta);
  }

  function rowHtml(table, row, primary, secondary) {
    const visible = Number(row.is_visible) === 1;
    return `
      <div class="row ${visible ? '' : 'tag--hidden'}" data-id="${row.id}">
        <div class="row__main">
          <div class="row__title">${primary}</div>
          ${secondary ? `<div class="row__sub">${secondary}</div>` : ''}
        </div>
        <div class="row__actions">
          <button class="icon-btn" data-act="toggle" data-id="${row.id}" title="${visible ? 'সাইটে দেখানো হচ্ছে — লুকাতে চাপ দিন' : 'লুকানো আছে — দেখাতে চাপ দিন'}">${visible ? EYE_ON : EYE_OFF}</button>
          <button class="btn btn--ghost btn--sm" data-act="edit" data-id="${row.id}">এডিট</button>
          <button class="btn btn--danger btn--sm" data-act="delete" data-id="${row.id}">ডিলিট</button>
        </div>
      </div>`;
  }

  function bindRowActions(root, table, meta) {
    root.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.id);
        const row = state.data.tables[table].find((r) => Number(r.id) === id);
        if (!row) return;

        if (btn.dataset.act === 'edit') return openEditor(table, row);

        if (btn.dataset.act === 'delete') {
          if (!confirm(`"${row.title || row.label || row.number || row.id}" ডিলিট করবেন? এটি ফিরিয়ে আনা যাবে না।`)) return;
          try {
            await api('/api/admin/delete', { method: 'POST', body: JSON.stringify({ table, id }) });
            toast('ডিলিট হয়েছে');
            await refresh();
          } catch (e) {
            toast(e.message, true);
          }
          return;
        }

        if (btn.dataset.act === 'toggle') {
          try {
            await api('/api/admin/row', {
              method: 'POST',
              body: JSON.stringify({ table, id, values: { is_visible: Number(row.is_visible) === 1 ? 0 : 1 } }),
            });
            await refresh();
          } catch (e) {
            toast(e.message, true);
          }
        }
      });
    });
  }

  /* --------------------------------------------------------------- editor */

  function openEditor(table, row) {
    const meta = state.data.meta.tables[table];
    const editing = Boolean(row && row.id);
    state.editing = { table, id: editing ? row.id : null };

    $('#modalTitle').textContent = `${editing ? 'এডিট করুন' : 'নতুন যোগ করুন'} — ${TABLE_VIEWS[table] ? TABLE_VIEWS[table].title : table}`;

    const body = $('#modalBody');
    body.innerHTML = Object.entries(meta.columns)
      .filter(([key]) => key !== 'created_at')
      .map(([key, def]) => {
        const value = row ? row[key] ?? '' : def.default !== undefined ? def.default : '';
        if (def.type === 'textarea') {
          return `<label class="field field--wide"><span>${esc(def.label)}</span>
            <textarea data-col="${key}" rows="4" placeholder="${esc(def.placeholder || '')}">${esc(value)}</textarea></label>`;
        }
        if (def.type === 'select') {
          return `<label class="field"><span>${esc(def.label)}</span>
            <select data-col="${key}">
              ${(def.options || []).map((o) => `<option value="${esc(o)}" ${String(value) === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}
            </select></label>`;
        }
        if (def.type === 'int') {
          return `<label class="field"><span>${esc(def.label)}</span>
            <input data-col="${key}" type="number" value="${esc(value)}" /></label>`;
        }
        return `<label class="field"><span>${esc(def.label)}</span>
          <input data-col="${key}" type="text" value="${esc(value)}" placeholder="${esc(def.placeholder || '')}" /></label>`;
      })
      .join('');

    $('#modal').hidden = false;
    const first = body.querySelector('input, textarea, select');
    if (first) setTimeout(() => first.focus(), 60);
  }

  function closeModal() {
    $('#modal').hidden = true;
    state.editing = null;
  }

  async function saveModal() {
    if (!state.editing) return;
    const { table, id } = state.editing;
    const values = {};
    $('#modalBody').querySelectorAll('[data-col]').forEach((el) => {
      let v = el.value;
      if (el.type === 'number') v = Number(v || 0);
      values[el.dataset.col] = v;
    });
    const btn = $('#modalSave');
    btn.disabled = true;
    try {
      await api('/api/admin/row', { method: 'POST', body: JSON.stringify({ table, id, values }) });
      toast(id ? 'আপডেট হয়েছে ✓' : 'যোগ করা হয়েছে ✓');
      closeModal();
      await refresh();
    } catch (e) {
      toast(e.message, true);
    } finally {
      btn.disabled = false;
    }
  }

  /* ------------------------------------------------------------- messages */

  function renderMessages(root) {
    $('#viewTitle').textContent = 'মেসেজ';
    $('#viewSub').textContent = 'কন্টাক্ট ফর্ম থেকে আসা সব মেসেজ';
    const rows = state.data.tables.messages || [];

    root.innerHTML = `
      <div class="card">
        <div class="card__head">
          <div><h2>ইনবক্স <span class="muted">(${rows.length})</span></h2><p>অপঠিত মেসেজ হাইলাইট করা থাকে</p></div>
        </div>
        <div id="msgList">
          ${rows.length
            ? rows
                .map(
                  (m) => `
            <div class="msg ${Number(m.is_read) === 1 ? '' : 'is-unread'}" data-id="${m.id}">
              <div class="msg__head">
                <div>
                  <b>${esc(m.name)}</b>
                  <span class="msg__meta">${esc(m.email || '')} ${m.phone ? '• ' + esc(m.phone) : ''}</span>
                </div>
                <span class="msg__meta">${esc((m.created_at || '').replace('T', ' ').slice(0, 16))}</span>
              </div>
              <p class="msg__body">${esc(m.message)}</p>
              <div class="row__actions">
                <button class="btn btn--ghost btn--sm" data-mact="read" data-id="${m.id}">${Number(m.is_read) === 1 ? 'আনরিড করুন' : 'পড়া হয়েছে'}</button>
                <button class="btn btn--danger btn--sm" data-mact="delete" data-id="${m.id}">ডিলিট</button>
              </div>
            </div>`
                )
                .join('')
            : '<div class="empty">এখনো কোনো মেসেজ আসেনি।</div>'}
        </div>
      </div>`;

    root.querySelectorAll('[data-mact]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.id);
        const msg = rows.find((m) => Number(m.id) === id);
        try {
          if (btn.dataset.mact === 'delete') {
            if (!confirm('মেসেজটি ডিলিট করবেন?')) return;
            await api('/api/admin/message', { method: 'POST', body: JSON.stringify({ id, action: 'delete' }) });
          } else {
            await api('/api/admin/message', {
              method: 'POST',
              body: JSON.stringify({ id, is_read: Number(msg && msg.is_read) === 1 ? 0 : 1 }),
            });
          }
          await refresh();
        } catch (e) {
          toast(e.message, true);
        }
      });
    });
  }

  /* ------------------------------------------------------------- refresh */

  async function refresh() {
    try {
      await loadData();
      setView(state.view);
    } catch (e) {
      if (e.message !== 'unauthorized') toast(e.message, true);
    }
  }

  /* ----------------------------------------------------------------- boot */

  function bindGlobal() {
    $$('#sidebarNav button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
    $('#reloadBtn').addEventListener('click', refresh);

    $('#logoutBtn').addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
      location.reload();
    });

    $$('[data-close]').forEach((el) => el.addEventListener('click', closeModal));
    $('#modalSave').addEventListener('click', saveModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
      if (e.key === 'Enter' && !$('#modal').hidden && (e.metaKey || e.ctrlKey)) saveModal();
    });

    $('#loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = $('#loginStatus');
      const btn = $('#loginBtn');
      status.textContent = 'যাচাই করা হচ্ছে…';
      status.classList.remove('is-error');
      btn.disabled = true;
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: $('#password').value }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err = new Error(json.error || 'লগইন ব্যর্থ হয়েছে');
          err.code = json.code;
          throw err;
        }
        status.textContent = 'সফল ✓';
        await start();
      } catch (err) {
        status.textContent = err.message;
        status.classList.add('is-error');
        if (err.code === 'ADMIN_PASSWORD_MISSING') showSetupCheck();
      } finally {
        btn.disabled = false;
      }
    });
  }

  /** Tells the user exactly what is missing on the server (names only). */
  async function showSetupCheck() {
    const box = $('#setupCheck');
    if (!box) return;
    try {
      const res = await fetch('/api/health', { credentials: 'same-origin' });
      const h = await res.json();
      const c = h.config || {};
      const missing = [];
      if (!c.DATABASE_URL && !c.SUPABASE_URL && !c.D1) missing.push('DATABASE_URL');
      if (!c.ADMIN_PASSWORD) missing.push('ADMIN_PASSWORD');
      if (!missing.length) {
        box.hidden = true;
        return;
      }
      box.hidden = false;
      box.innerHTML = `
        <b>⚠️ সার্ভারে সেটিংস নেই</b>
        <p>এই Worker-এ এখনো ${missing.map((m) => `<code>${m}</code>`).join(' ও ')} যোগ করা হয়নি, তাই লগইন কাজ করবে না।</p>
        <p><b>Cloudflare Dashboard</b> → Workers &amp; Pages → <b>zarif-portfolio</b> → Settings →
           Variables and Secrets → <b>Add</b> → Type: <b>Secret</b></p>
        <ul>
          <li><code>ADMIN_PASSWORD</code> = আপনার পাসওয়ার্ড</li>
          <li><code>DATABASE_URL</code> = postgresql://... (Neon URL)</li>
          <li><code>SESSION_SECRET</code> = যেকোনো লম্বা র‍্যান্ডম স্ট্রিং</li>
        </ul>
        <p>তারপর <b>Save and Deploy</b> চাপুন। (অথবা টার্মিনালে <code>npx wrangler secret put ADMIN_PASSWORD</code>)</p>`;
    } catch {
      box.hidden = true;
    }
  }

  async function start() {
    try {
      const session = await api('/api/session');
      if (!session.loggedIn) {
        showLogin();
        showSetupCheck();
        return;
      }
      await loadData();
      showApp();
      setView(state.view);
    } catch (e) {
      if (e.message !== 'unauthorized') showLogin('ডেটাবেস সংযোগে সমস্যা: ' + e.message);
    }
  }

  bindGlobal();
  start();
})();
