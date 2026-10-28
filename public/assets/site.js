/* =========================================================================
   MD. Zarif Hasan — Portfolio front-end
   • Renders every section from the JSON injected by the Worker (#site-data)
   • Premium motion: reveal-on-scroll, parallax, magnetic buttons, tilt,
     counters, kinetic marquee, custom cursor, theme switcher, contact form
   ========================================================================= */

(() => {
  'use strict';

  /* ------------------------------------------------------------- helpers */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** Bengali-friendly paragraphs: splits on blank lines, keeps <br>. */
  const paragraphs = (text) =>
    String(text || '')
      .split(/\n{2,}/)
      .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
      .join('');

  /* ---------------------------------------------------------------- data */

  let DATA = { settings: {} };
  try {
    const el = $('#site-data');
    if (el && el.textContent.trim()) DATA = JSON.parse(el.textContent);
  } catch (e) {
    console.warn('site data parse failed', e);
  }
  const S = DATA.settings || {};
  const pick = (key, fallback = '') => (S[key] !== undefined && S[key] !== null && S[key] !== '' ? S[key] : fallback);

  /* --------------------------------------------------------------- icons */

  const ICONS = {
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    instagram:
      '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/>',
    x: '<path d="M4 4l7.5 9.5L4.5 20h2.6l5.6-5.9L17 20h3l-7.8-10L19.5 4h-2.6l-5.2 5.5L7 4z"/>',
    whatsapp:
      '<path d="M20.5 3.5A11 11 0 0 0 3.6 17L2 22l5.2-1.5A11 11 0 1 0 20.5 3.5z"/><path d="M8.4 7.6c.3-.6.6-.5.9-.5h.5c.2 0 .4 0 .6.5l.8 1.8c.1.3 0 .5-.1.7l-.5.6c-.2.2-.2.3 0 .6.4.7 1.6 1.9 2.4 2.2.3.1.4.1.6-.1l.6-.7c.2-.2.4-.2.6-.1l1.7.8c.3.2.4.3.4.5 0 .5-.3 1.2-.6 1.5-.4.4-1 .7-1.7.7-1 0-2.6-.6-4-1.9-1.5-1.4-2.4-3-2.7-3.9-.2-.7-.2-1.4.1-1.7z" fill="currentColor" stroke="none"/>',
    youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/>',
    linkedin: '<rect x="2" y="2" width="20" height="20" rx="3"/><path d="M7 10v7M7 7v.01M12 17v-4a2 2 0 0 1 4 0v4"/>',
    github:
      '<path d="M9 19c-4 1.5-4-2.5-6-3m12 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.1-1.5 6.1-6.7a5.2 5.2 0 0 0-1.4-3.6 4.9 4.9 0 0 0-.1-3.6s-1.1-.3-3.7 1.4a12.6 12.6 0 0 0-6.6 0C6.8 1.7 5.7 2 5.7 2a4.9 4.9 0 0 0-.1 3.6A5.2 5.2 0 0 0 4.2 9.2c0 5.2 3 6.4 6.1 6.7a3.4 3.4 0 0 0-.9 2.6V22"/>',
    telegram: '<path d="M22 3 2 10.5l6 2 2 7 3.5-4.5 5 3.5z"/>',
    tiktok: '<path d="M14 3v10.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.4 2.6 2 4.2 5 4.5"/>',
    email: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/>',
    link: '<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>',
  };
  const icon = (name, fallback = 'link') =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
      ICONS[(name || fallback).toLowerCase()] || ICONS[fallback]
    }</svg>`;

  const telHref = (num) => 'tel:' + String(num).replace(/[^\d+]/g, '');

  /* ------------------------------------------------------------ rendering */

  function renderStatic() {
    document.title = pick('site_title', document.title);
    const metaDesc = $('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', pick('meta_description', metaDesc.content));
    const ogTitle = $('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', pick('site_title', document.title));

    const set = (sel, value, html = false) => {
      const el = $(sel);
      if (!el || value === undefined || value === null) return;
      if (html) el.innerHTML = value;
      else el.textContent = value;
    };

    set('#brandName', pick('brand', 'Zarif Hasan'));
    set('#brandMark', (pick('brand', 'Z') || 'Z').trim().charAt(0).toUpperCase());
    set('#heroKicker', pick('hero_kicker'));
    set('#heroCta1', pick('hero_cta_1'));
    set('#heroCta2', pick('hero_cta_2'));
    set('#heroMeta1', pick('hero_meta_1'));
    set('#heroMeta2', pick('hero_meta_2'));
    set('#aboutHeading', pick('about_heading'));
    set('#aboutBody', paragraphs(pick('about_body')), true);
    set('#aboutNote', pick('about_note'));
    set('#stat1', pick('stat_1'));
    set('#stat1Label', pick('stat_1_label'));
    set('#stat2', pick('stat_2'));
    set('#stat2Label', pick('stat_2_label'));
    set('#stat3', pick('stat_3'));
    set('#stat3Label', pick('stat_3_label'));
    set('#experienceHeading', pick('experience_heading'));
    set('#experienceBody', paragraphs(pick('experience_body')), true);
    set('#futureHeading', pick('future_heading'));
    set('#futureBody', pick('future_body'));
    set('#quote', pick('quote'));
    set('#contactHeading', pick('contact_heading'));
    set('#contactIntro', pick('contact_intro'));
    set('#footerNote', pick('footer_note'));
    set('#year', String(new Date().getFullYear()));

    // hero name: first word(s) plain, last word italic accent
    const nameEl = $('#heroName');
    if (nameEl && pick('hero_name')) {
      const words = pick('hero_name').trim().split(/\s+/);
      const last = words.pop();
      nameEl.innerHTML =
        (words.length ? `<span class="line-mask"><span>${esc(words.join(' '))}</span></span>` : '') +
        `<span class="line-mask"><span class="accent-word">${esc(last)}</span></span>`;
    }

    // tagline: emphasise the last word
    const tagEl = $('#heroTagline');
    if (tagEl && pick('hero_tagline')) {
      const parts = pick('hero_tagline').trim().split(/\s+/);
      const lastWord = parts.pop();
      tagEl.innerHTML = `${esc(parts.join(' '))} <b>${esc(lastWord)}</b>`;
    }

    set('#heroDesc', pick('hero_desc'));

    const img = $('#portraitImg');
    const photo = pick('photo_url', '/zarif.jpg');
    if (img && photo) img.src = photo;

    // marquee items (two identical halves for a seamless loop)
    const marquee = $('#marqueeTrack');
    if (marquee) {
      const items = String(pick('marquee_text', ''))
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const half = items.map((t) => `<span>${esc(t)}</span>`).join('');
      marquee.innerHTML = half + half;
    }
  }

  function renderEducation(rows) {
    const tl = $('#timeline');
    if (!tl || !rows) return;
    tl.querySelectorAll('.tl-item').forEach((n) => n.remove());
    rows.forEach((row, i) => {
      const item = document.createElement('article');
      item.className = 'tl-item';
      item.setAttribute('data-reveal', '');
      item.style.setProperty('--d', `${i * 70}ms`);
      item.innerHTML = `
        <div class="tl-item__year">${esc(row.year)}</div>
        <h3 class="tl-item__title">${esc(row.title)}</h3>
        ${row.subtitle ? `<div class="tl-item__sub">${esc(row.subtitle)}</div>` : ''}
        ${row.description ? `<div class="tl-item__desc">${esc(row.description)}</div>` : ''}`;
      tl.appendChild(item);
    });
  }

  function renderSkills(rows) {
    const grid = $('#skillsGrid');
    if (!grid || !rows) return;
    grid.innerHTML = rows
      .map(
        (row, i) => `
      <article class="card" data-reveal="scale" style="--d:${i * 70}ms">
        <span class="card__num">${String(i + 1).padStart(2, '0')}</span>
        <h3 class="card__title">${esc(row.title)}</h3>
        <p class="card__text">${esc(row.description)}</p>
        <span class="card__arrow">আরও জানুন
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </span>
      </article>`
      )
      .join('');
  }

  function renderInterests(rows) {
    const wrap = $('#interestsWrap');
    if (!wrap || !rows) return;
    wrap.innerHTML = rows
      .map(
        (row, i) =>
          `<span class="interest" data-reveal style="--d:${i * 60}ms"><span>${esc(row.emoji || '✦')}</span>${esc(row.label)}</span>`
      )
      .join('');
  }

  function renderPhones(rows) {
    const wrap = $('#phonesWrap');
    if (!wrap || !rows) return;
    if (!rows.length) {
      wrap.innerHTML = '<p style="color:var(--ink-faint);font-size:.9rem">নম্বর যোগ করা হয়নি।</p>';
      return;
    }
    wrap.innerHTML = rows
      .map(
        (row) => `
      <a class="phone-row" href="${esc(telHref(row.number))}">
        <span><small>${esc(row.label || 'PHONE')}</small><b>${esc(row.number)}</b></span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>
      </a>`
      )
      .join('');
  }

  function renderSocials(rows) {
    const wrap = $('#socialsWrap');
    if (!wrap || !rows) return;
    if (!rows.length) {
      wrap.innerHTML = '<p style="color:var(--ink-faint);font-size:.9rem">লিংক যোগ করা হয়নি।</p>';
      return;
    }
    wrap.innerHTML = rows
      .map(
        (row) => `
      <a class="social" href="${esc(row.url)}" target="_blank" rel="noopener noreferrer">
        ${icon(row.icon)}
        <span>${esc(row.label)}</span>
      </a>`
      )
      .join('');
  }

  /* -------------------------------------------------------------- motion */

  function initTheme() {
    const saved = localStorage.getItem('zh-theme');
    if (saved) document.documentElement.dataset.theme = saved;
    const sync = () => {
      $$('[data-theme-btn]').forEach((btn) =>
        btn.setAttribute('aria-pressed', String(btn.dataset.themeBtn === document.documentElement.dataset.theme))
      );
      const meta = $('meta[name="theme-color"]');
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();
      if (meta && bg) meta.setAttribute('content', bg);
    };
    $$('[data-theme-btn]').forEach((btn) =>
      btn.addEventListener('click', () => {
        document.documentElement.dataset.theme = btn.dataset.themeBtn;
        localStorage.setItem('zh-theme', btn.dataset.themeBtn);
        sync();
      })
    );
    // rotate through themes with the "T" key (nice easter egg)
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 't' && !/input|textarea/i.test(document.activeElement.tagName)) {
        const order = ['sage', 'sand', 'forest'];
        const cur = document.documentElement.dataset.theme || 'sage';
        const next = order[(order.indexOf(cur) + 1) % order.length];
        document.documentElement.dataset.theme = next;
        localStorage.setItem('zh-theme', next);
        sync();
      }
    });
    sync();
  }

  function initLoader() {
    const loader = $('#loader');
    const mark = $('#loaderMark');
    if (mark) {
      mark.innerHTML = pick('brand', 'Zarif')
        .split('')
        .slice(0, 9)
        .map((ch, i) => `<span style="animation-delay:${i * 55}ms">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`)
        .join('');
    }
    const done = () => {
      if (loader) loader.classList.add('is-done');
      document.body.classList.remove('is-locked');
      document.documentElement.classList.add('is-loaded');
      // kick off first-screen reveals
      $$('.hero [data-reveal], .hero .line-mask').forEach((el, i) => {
        setTimeout(() => el.classList.add('is-in'), 60 + i * 80);
      });
    };
    if (reduceMotion) return done();
    window.addEventListener('load', () => setTimeout(done, 700));
    setTimeout(done, 2600); // safety net
  }

  function initReveal() {
    const els = $$('[data-reveal], .line-mask, .section-head, .tl-item');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    els.forEach((el) => io.observe(el));
  }

  function initNav() {
    const nav = $('#nav');
    const progress = $('#progress');
    const links = $$('.nav__links a');
    const sections = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);

    const onScroll = () => {
      const y = window.scrollY;
      nav.classList.toggle('is-stuck', y > 24);
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;

      // timeline progress line
      const tl = $('#timeline');
      const fill = $('#timelineFill');
      if (tl && fill) {
        const rect = tl.getBoundingClientRect();
        const p = Math.min(Math.max((innerHeight * 0.55 - rect.top) / rect.height, 0), 1);
        fill.style.height = `${p * 100}%`;
      }

      // active section
      let current = null;
      for (const sec of sections) {
        if (sec.getBoundingClientRect().top <= innerHeight * 0.4) current = sec.id;
      }
      links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${current}`));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    const burger = $('#burger');
    if (burger) burger.addEventListener('click', () => document.body.classList.toggle('menu-open'));
    links.forEach((a) => a.addEventListener('click', () => document.body.classList.remove('menu-open')));
  }

  function initCursor() {
    if (reduceMotion || window.matchMedia('(pointer: coarse)').matches) return;
    const ring = $('.cursor');
    const dot = $('.cursor-dot');
    let rx = 0, ry = 0, tx = 0, ty = 0;
    window.addEventListener('mousemove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
      dot.style.transform = `translate(${tx - 3}px, ${ty - 3}px)`;
      document.body.classList.add('cursor-ready');
    });
    (function loop() {
      rx += (tx - rx) * 0.16;
      ry += (ty - ry) * 0.16;
      ring.style.transform = `translate(${rx - 19}px, ${ry - 19}px)`;
      requestAnimationFrame(loop);
    })();
    const hoverable = 'a, button, .card, .interest, .stat, input, textarea, .social, .phone-row';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverable)) document.body.classList.add('cursor-hover');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverable)) document.body.classList.remove('cursor-hover');
    });
  }

  function initMagnetic() {
    if (reduceMotion || window.matchMedia('(pointer: coarse)').matches) return;
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.18;
        const y = (e.clientY - r.top - r.height / 2) * 0.28;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  function initTilt() {
    if (reduceMotion || window.matchMedia('(pointer: coarse)').matches) return;
    const frame = $('#portraitFrame');
    const portrait = $('#portrait');
    if (!frame || !portrait) return;
    portrait.addEventListener('mousemove', (e) => {
      const r = portrait.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      frame.style.transform = `rotateY(${px * 13}deg) rotateX(${-py * 13}deg) translateZ(0)`;
    });
    portrait.addEventListener('mouseleave', () => {
      frame.style.transform = '';
    });

    // card spotlight
    $$('.card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  function initCounters() {
    const nums = $$('[data-count]');
    if (!nums.length) return;
    const animate = (el) => {
      const raw = el.textContent.trim();
      const digits = raw.replace(/[^\d.]/g, '');
      if (!digits) return;
      const target = Number(digits);
      if (!Number.isFinite(target) || reduceMotion) return;
      const dur = 1200;
      const start = performance.now();
      const zero = raw.length <= 2 ? raw.length : 0;
      const step = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = Math.round(target * eased);
        el.textContent = p < 1 ? String(val).padStart(zero, '0') : raw;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          animate(en.target);
          io.unobserve(en.target);
        }),
      { threshold: 0.6 }
    );
    nums.forEach((n) => io.observe(n));
  }

  function initParallax() {
    if (reduceMotion) return;
    const layers = [
      { el: $('#portrait'), speed: 0.06 },
      { el: $('.aurora span:nth-child(1)'), speed: -0.02 },
    ].filter((l) => l.el);
    let ticking = false;
    window.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const y = window.scrollY;
          layers.forEach(({ el, speed }) => {
            el.style.translate = `0 ${(y * speed).toFixed(2)}px`;
          });
          ticking = false;
        });
      },
      { passive: true }
    );
  }

  function initForm() {
    const form = $('#contactForm');
    if (!form) return;
    const status = $('#formStatus');
    const btn = $('#formBtn');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = {
        name: String(fd.get('name') || '').trim(),
        email: String(fd.get('email') || '').trim(),
        phone: String(fd.get('phone') || '').trim(),
        message: String(fd.get('message') || '').trim(),
        honey: String(fd.get('honey') || ''),
      };
      if (!payload.name || !payload.message) {
        status.textContent = 'নাম এবং মেসেজ লিখুন।';
        status.classList.add('is-error');
        return;
      }
      status.classList.remove('is-error');
      status.textContent = 'পাঠানো হচ্ছে…';
      const original = btn.querySelector('span').textContent;
      btn.disabled = true;
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'মেসেজ পাঠানো যায়নি।');
        status.textContent = 'ধন্যবাদ! আপনার মেসেজ পৌঁছেছে। ✓';
        form.reset();
      } catch (err) {
        status.textContent = 'দুঃখিত — ' + (err.message || 'সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।');
        status.classList.add('is-error');
      } finally {
        btn.disabled = false;
        btn.querySelector('span').textContent = original;
      }
    });
  }

  function initSmoothAnchors() {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const target = $(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', id);
      });
    });
  }

  /* ----------------------------------------------------------------- boot */

  renderStatic();
  renderEducation(DATA.education);
  renderSkills(DATA.skills);
  renderInterests(DATA.interests);
  renderPhones(DATA.phones);
  renderSocials(DATA.socials);

  initTheme();
  initNav();
  initReveal();
  initLoader();
  initCursor();
  initMagnetic();
  initTilt();
  initCounters();
  initParallax();
  initForm();
  initSmoothAnchors();
})();
