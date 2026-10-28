/* Alpenlume: ultra motion layer. Adds motion only; the page, its texts and its colours stay as they are.
   One rAF loop that runs only while something moves. Off for prefers-reduced-motion; without JS the page is simply the page.
   Switch off completely: remove the <link> to motion.css and the <script> for this file. Intensity: variables at the top of motion.css.
   Debug: ?mo=manual lets a test harness drive time (window.__mo). */
(function () {
  'use strict';
  const W = window, D = document, R = D.documentElement;
  const RMQ = matchMedia('(prefers-reduced-motion: reduce)');
  if (RMQ.matches || !W.IntersectionObserver || !(W.CSS && CSS.supports && CSS.supports('translate', '1px 1px'))) return;
  try { RMQ.addEventListener('change', () => location.reload()); } catch (e) {}
  const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const LITE = !FINE || innerWidth <= 900;              /* phones, tablets, touch: lighter variant */
  R.classList.add('mo'); if (LITE) R.classList.add('mo-lite');
  const cs = getComputedStyle(R), num = (n, d) => { const v = parseFloat(cs.getPropertyValue(n)); return isNaN(v) ? d : v; };
  const K = { scroll: num('--mo-scroll', 7), skew: num('--mo-skew', 1) * (LITE ? .6 : 1), depth: num('--mo-depth', 1), tilt: num('--mo-tilt', 1), mag: num('--mo-magnet', 1) };
  const $ = (s, r) => (r || D).querySelector(s), $$ = (s, r) => Array.from((r || D).querySelectorAll(s));
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, f = (v, n) => v.toFixed(n == null ? 2 : n);
  const MANUAL = /[?&]mo=manual/.test(location.search);
  let mt = 0; const NOW = () => MANUAL ? mt : performance.now();
  /* cheap style writes: nothing is touched when the value did not change */
  const wr = (el, k, v) => { if (!el) return; const c = el._m || (el._m = {}); if (c[k] === v) return; c[k] = v; if (k[0] === '-') el.style.setProperty(k, v); else el.style[k] = v; };

  let vw = innerWidth, vh = innerHeight, maxY = 1;
  const meas = () => { vw = innerWidth; vh = innerHeight; maxY = Math.max(1, R.scrollHeight - vh); };
  meas();

  /* ───────── 2. kinetic typography: the big headings split into masked words / letters, then go back to plain text ─────────
     The split is made just before a heading is revealed, the letters are nudged so that every one stands exactly where it stood
     in the plain heading (kerning), and when the reveal has finished the original markup is put back: real text again,
     findable, selectable, nothing left over. While it plays, the heading carries its text as aria-label. */
  const CJK = /[\u2E80-\u9FFF\uAC00-\uD7AF\uFF00-\uFFEF]/;
  const mk = (c, t) => { const s = D.createElement('span'); s.className = c; if (t != null) s.textContent = t; return s; };
  const lefts = h => {
    const rg = D.createRange(), out = [], w = D.createTreeWalker(h, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) for (let i = 0; i < n.length; i++) { if (/\s/.test(n.data[i])) continue; rg.setStart(n, i); rg.setEnd(n, i + 1); const b = rg.getBoundingClientRect(); out.push([b.left, b.top, b.height]); }
    return out;
  };
  function split(el, hd) {
    let li = 0, maxD = 0; const d = v => { maxD = Math.max(maxD, v); return v; };
    const unit = (t, cjk) => {
      const w = mk('mo-w'); if (hd) w.setAttribute('aria-hidden', 'true');
      if (LITE || !hd) { const l = mk('mo-l', t); l.style.setProperty('--d', d(li++ * (cjk ? 30 : 75))); w.appendChild(l); }
      else Array.from(t).forEach(c => { const l = mk('mo-l', c); l.style.setProperty('--d', d(li++ * 11)); w.appendChild(l); });
      return w;
    };
    const walk = n => Array.from(n.childNodes).forEach(c => {
      if (c.nodeType === 3) {
        const fr = D.createDocumentFragment();
        c.data.split(/(\s+)/).forEach(p => { if (!p) return; if (/^\s+$/.test(p)) fr.appendChild(D.createTextNode(p)); else if (CJK.test(p)) Array.from(p).forEach(ch => fr.appendChild(unit(ch, 1))); else fr.appendChild(unit(p)); });
        c.replaceWith(fr);
      } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
    });
    walk(el); return maxD;
  }
  function play(h, base) {
    if (h._p) return; h._p = 1; h.classList.remove('mo-pre');
    const hd = /^H[1-6]$/.test(h.tagName), fine = hd && !LITE, o = fine ? lefts(h) : null;
    if (hd) h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    const maxD = split(h, hd);
    if (o) {                                                    /* put every letter where the plain heading had it */
      const L = $$('.mo-l', h);
      if (L.length === o.length) {
        const a = L.map(l => l.getBoundingClientRect().left); let ref = 0, prev = 0;
        L.forEach((l, i) => { if (Math.abs(o[i][1] - o[ref][1]) > o[i][2] * .5) { ref = i; prev = 0; } const D = (o[i][0] - o[ref][0]) - (a[i] - a[ref]), m = D - prev; prev = D; if (Math.abs(m) > .04) l.style.marginLeft = m.toFixed(2) + 'px'; });
      }
    }
    h.style.transformOrigin = getComputedStyle(h).textAlign === 'center' ? '50% 60%' : '0 60%'; h.style.setProperty('--b', base + 'ms');
    h.classList.add('mo-h', 'mo-vis');
    setTimeout(() => { h.innerHTML = h._o; h.classList.remove('mo-h', 'mo-vis'); h.removeAttribute('aria-label'); }, base + maxD + 1250);
  }
  const HS = '.hero h1,.camp .card h2,.summit h2,.moment q,.sec .hd h2,.convert h2,.ms-rd h2,.offer h2,.band h3';
  const heads = Array.from(new Set($$(HS))).filter(h => h.textContent.trim());
  const heroH = [], trig = new Map();
  heads.forEach(h => {
    h._o = h.innerHTML;
    if (h.closest('.hero')) { h._hero = true; heroH.push(h); return; }
    const t = h.closest('.camp,.rv') || h; if (t === h) h.classList.add('mo-pre');
    (trig.get(t) || trig.set(t, []).get(t)).push(h);
  });
  const reveal = l => l.forEach(h => play(h, h.closest('.camp') ? 650 : 150));
  const rio = new IntersectionObserver(es => es.forEach(e => { if (!(e.isIntersecting || e.boundingClientRect.top < 0)) return; rio.unobserve(e.target); reveal(trig.get(e.target)); }), { threshold: .2 });
  trig.forEach((v, t) => rio.observe(t));
  const go = () => { if (R.classList.contains('mo-go')) return; heroH.forEach(h => play(h, 90)); R.classList.add('mo-go'); };
  if (!MANUAL) { Promise.race([D.fonts ? D.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 380))]).then(go); setTimeout(go, 700); }
  setTimeout(() => heads.forEach(h => { if (h.classList.contains('mo-pre')) { const r = h.getBoundingClientRect(); if (r.top < vh && r.bottom > 0) play(h, 0); } }), 6000);

  /* ───────── 1. inertial scrolling over the native scroll: every other part of the page keeps reading scrollY ───────── */
  let raf = 0, pt = 0, cur = scrollY, tar = cur, glide = null, wheel = false, prevY = cur, vs = 0, vn = 0;
  const wake = () => { if (MANUAL || raf || D.hidden) return; raf = requestAnimationFrame(tick); };
  const inner = (el, dy) => {
    for (; el && el !== D.body && el !== R; el = el.parentElement) {
      const o = getComputedStyle(el).overflowY;
      if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight + 1 && (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1)) return true;
    }
    return false;
  };
  if (!LITE && K.scroll > 0) addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || $('.pal.on')) return;
    let dy = e.deltaY; if (!dy || Math.abs(e.deltaX) > Math.abs(dy)) return;
    if (e.deltaMode === 1) dy *= 32; else if (e.deltaMode === 2) dy *= vh;
    if (inner(e.target, dy)) return;
    e.preventDefault();
    if (!wheel) { meas(); cur = tar = scrollY; wheel = true; }
    glide = null; tar = clamp(tar + dy, 0, maxY); wake();
  }, { passive: false });
  addEventListener('scroll', () => { const y = scrollY; if (!glide && Math.abs(y - cur) > 2.5) { cur = tar = y; wheel = false; } wake(); }, { passive: true });
  addEventListener('touchstart', () => { glide = null; }, { passive: true });
  function glideTo(y, sec) { meas(); cur = scrollY; glide = { a: cur, b: clamp(y, 0, maxY), t0: NOW(), d: sec * 1000 }; wheel = false; wake(); }
  D.addEventListener('click', e => {                     /* in-page links glide instead of jumping */
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a || a.classList.contains('skip') || a.id === 'totop') return;
    let id = a.getAttribute('href').slice(1); try { id = decodeURIComponent(id); } catch (x) {}
    const el = id && D.getElementById(id); if (!el) return;
    e.preventDefault(); const pad = parseFloat(cs.scrollPaddingTop) || 0, y = el.getBoundingClientRect().top + scrollY - pad;
    glideTo(y, clamp(.7 + Math.abs(y - scrollY) / vh * .12, .7, 1.7));
    try { history.pushState(null, '', '#' + id); } catch (x) {}
    el.tabIndex = -1; el.style.outline = '0'; el.focus({ preventScroll: true });
  });

  /* ───────── scene: layers, camps, hero, trail ───────── */
  const sky = $('#sky'), world = $('#world'), sun = $('#sun'), seas = $('#season');
  const camps = $$('.camp').map((el, i) => ({ el, i, ph: $('.ph .wrap', el), glow: $('.glowp', el), sc: $('.dv .sc', el), card: $('.card', el), icon: $('.ap img', el), side: i % 2 ? -1 : 1, v: false }));
  const vio = new IntersectionObserver(es => es.forEach(e => { e.target._v = e.isIntersecting; }), { rootMargin: '25% 0px' });
  camps.forEach(c => vio.observe(c.el));
  const heroEls = $$('.hero>h1,.hero>.sub,.hero>.go,.hero>.trust,.hero.app .l>*,.hero.app .r').map((el, i) => ({ el, k: .14 + i * .05, h1: el.tagName === 'H1' }));
  const trail = $('.trail'), svgp = trail && $('svg.path', trail), base = svgp && $('.base', svgp), hk = $('.hiker i'), ruler = $('.ruler');
  let ga, gb, gL = 0;
  if (base) {
    const mkp = c => { const p = D.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('class', 'mo-glow ' + c); svgp.appendChild(p); return p; };
    ga = mkp('a'); gb = mkp('b');
    const sync = () => { const d = base.getAttribute('d'); if (!d) return; ga.setAttribute('d', d); gb.setAttribute('d', d); gL = ga.getTotalLength(); ga.style.strokeDasharray = gb.style.strokeDasharray = gL + ' ' + gL; wake(); };
    new MutationObserver(sync).observe(base, { attributes: true, attributeFilter: ['d'] }); sync();
  }
  let fill = null; if (ruler) { fill = D.createElement('i'); fill.className = 'mo-fill'; ruler.appendChild(fill); }
  if (!LITE) { for (const c of ['a', 'b']) { const h = D.createElement('div'); h.className = 'mo-haze ' + c; h.setAttribute('aria-hidden', 'true'); D.body.appendChild(h); } const g = D.createElement('div'); g.className = 'mo-grain'; g.setAttribute('aria-hidden', 'true'); D.body.appendChild(g); }

  /* pointer: smoothed, subtle */
  let px = -1, py = -1, ptx = 0, pty = 0, mx = 0, my = 0;
  if (!LITE) {
    addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; px = e.clientX; py = e.clientY; ptx = px / vw * 2 - 1; pty = py / vh * 2 - 1; hover(e.target); wake(); }, { passive: true });
    R.addEventListener('pointerleave', () => { ptx = pty = 0; px = py = -1; hov = null; wake(); });
  }
  /* 5. magnetic buttons and tilting cards */
  const mags = LITE ? [] : $$('.badge,.card .row a.pr,.hero .go,.gbtn,.sbtn,.store,.fin>a,nav .logo,.rt .kbd,.lang>button,.cta>a').map(el => ({ el, x: 0, y: 0 }));
  const tl = new Map(); let hov = null; const TS = '.card,.mc,.step,.ex,.why>div,.sup>.glass';
  function hover(t) { const c = t && t.closest ? t.closest(TS) : null; if (c !== hov) { hov = c; if (c && !tl.has(c)) tl.set(c, { rx: 0, ry: 0, on: false }); } }
  /* counters: the page's own numbers count up with an ease */
  const tws = [];
  const tween = (el, to, d, delay) => tws.push({ el, to, d, t0: NOW() + (delay || 0) });
  if (typeof co !== 'undefined' && co && co.disconnect) co.disconnect();   /* the page's own step counter gives way to this one */
  const cio = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; cio.unobserve(e.target); tween(e.target, +e.target.dataset.count || 0, 1500); wake(); }), { threshold: .6 });
  $$('[data-count]').forEach(x => cio.observe(x));
  $$('.hero .trust span').forEach(s => { const m = /^(\d+)([\s\S]*)$/.exec(s.textContent.trim()); if (!m) return; const n = D.createElement('b'); n.className = 'mo-n'; n.textContent = m[1]; n.style.cssText = 'display:inline-block;text-align:left;font-weight:inherit;font-variant-numeric:tabular-nums'; s.textContent = ''; s.append(n, m[2]); n.style.minWidth = n.getBoundingClientRect().width + 'px'; n.textContent = '0'; tween(n, +m[1], 1300, 1300); });

  function tick(t) {
    raf = 0; let dt = (t - pt) / 1000; if (!(dt > 0) || dt > .1) dt = .016; dt = Math.min(dt, .05); pt = t;
    if (glide) { const u = clamp((t - glide.t0) / glide.d, 0, 1), e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; cur = glide.a + (glide.b - glide.a) * e; tar = cur; if (u >= 1) glide = null; scrollTo(0, cur); }
    else if (wheel) { cur += (tar - cur) * (1 - Math.exp(-dt * K.scroll)); if (Math.abs(tar - cur) < .4) { cur = tar; wheel = false; } scrollTo(0, cur); }
    const y = scrollY, dep = K.depth;
    vs += ((y - prevY) / (dt * 1000) - vs) * (1 - Math.exp(-dt * 9)); prevY = y; vn = clamp(vs / 1.5, -1, 1);
    const k = 1 - Math.exp(-dt * 5); mx += (ptx - mx) * k; my += (pty - my) * k;

    /* camps: depth, camera push, screen parallax */
    let push = 0;
    for (const c of camps) {
      if (!c.el._v) continue;
      const r = c.el.getBoundingClientRect(), d = clamp((r.top + r.height / 2 - vh / 2) / vh, -1.4, 1.4), a = Math.min(1, Math.abs(d));
      push = Math.max(push, Math.max(0, 1 - Math.abs(d) * 1.15));
      if (c.ph && !LITE) wr(c.ph, 'transform', 'perspective(1400px) rotateY(' + f(-d * c.side * 9 * dep) + 'deg) rotateX(' + f(d * 3 * dep) + 'deg)');
      if (c.glow) { wr(c.glow, 'opacity', f(.66 - .4 * a, 3)); wr(c.glow, 'transform', 'translate3d(0,' + f(d * -40 * dep, 1) + 'px,0) scale(' + f(1.14 - .24 * a, 3) + ')'); }
      if (c.sc) wr(c.sc, '--sy', f(clamp(d * -1.4 * dep, -1.5, 1.5)) + '%');
      if (c.icon) wr(c.icon, 'translate', '0 ' + f(d * -12 * dep, 1) + 'px');
      if (c.card && !tl.has(c.card)) wr(c.card, 'translate', '0 ' + f(d * -18 * dep, 1) + 'px');
    }
    /* the world as a camera: sky, sun, mountains and season layers move at their own depth; each camp pushes in */
    const A = .014 * dep;
    if (!LITE) {
      wr(world, 'transform', 'translate3d(' + f(-mx * A * vw) + 'px,' + f(-my * .012 * vh * dep) + 'px,0) scale(' + f(1 + 2.2 * A + .008 + .03 * push, 4) + ')');
      wr(sky, 'transform', 'translate3d(' + f(-mx * .004 * vw * dep) + 'px,' + f(-my * .004 * vh * dep) + 'px,0) scale(' + f(1.012 + .008 * dep + .012 * push, 4) + ')');
      wr(sun, 'translate', f(-mx * .009 * vw * dep) + 'px ' + f(-my * .01 * vh * dep) + 'px');
      wr(seas, 'transform', 'translate3d(' + f(-mx * .026 * vw * dep) + 'px,' + f(-my * .02 * vh * dep) + 'px,0) scale(' + f(1 + 2 * .026 * dep + .01, 4) + ')');
    } else { wr(world, 'transform', 'scale(' + f(1.03 + .03 * push, 4) + ')'); }

    /* hero: its layers part at different speeds as the page leaves it; headings lean with the scroll speed */
    if (y < vh * 1.3) {
      const o = clamp(y / (vh * .85), 0, 1), op = Math.max(0, 1 - o * 1.15), sk = Math.abs(vn) < .004 ? '' : ' skewY(' + f(-vn * 2.6 * K.skew) + 'deg)';
      const ae = D.activeElement; for (const h of heroEls) { const keep = ae && h.el.contains(ae); const t3 = y > 2 ? 'translate3d(0,' + f(y * h.k, 1) + 'px,0)' : ''; wr(h.el, 'opacity', op >= .999 || keep ? '' : f(op, 3)); wr(h.el, 'transform', (t3 + (h.h1 ? sk : '')).trim()); }
    }
    for (const h of heads) {
      if (h._hero || !h._p) continue;
      if (Math.abs(vn) < .004) { if (h._m && h._m.transform) wr(h, 'transform', ''); continue; }
      const r = h.getBoundingClientRect(); if (r.bottom < -80 || r.top > vh + 80) { wr(h, 'transform', ''); continue; }
      wr(h, 'transform', 'skewY(' + f(-vn * 2.6 * K.skew) + 'deg) scaleY(' + f(1 + Math.abs(vn) * .05 * K.skew, 4) + ')');
    }

    /* progress: the glowing path along the trail (the hiker is moved by the page itself) and the lit altitude ruler */
    const p = clamp(y / maxY, 0, 1);
    if (gL && trail) { const tr = trail.getBoundingClientRect(); if (tr.bottom > -200 && tr.top < vh + 200) { const q = clamp((vh * .5 - tr.top) / tr.height, 0, 1), o = f(gL * (1 - q), 1); wr(ga, 'strokeDashoffset', o); wr(gb, 'strokeDashoffset', o); } }
    if (hk) wr(hk, 'scale', f(1 + Math.abs(vn) * .7, 3));
    if (fill) wr(fill, 'transform', 'scaleY(' + f(typeof pp === 'number' ? pp : p, 4) + ')');

    /* magnets and tilt */
    let busy = false;
    for (const m of mags) {
      let tx = 0, ty = 0;
      if (px >= 0 || m.x || m.y) {
        const r = m.el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh && px >= 0) {
          const cx = r.left + r.width / 2 - m.x, cy = r.top + r.height / 2 - m.y, R_ = Math.max(r.width, r.height) * .7 + 36, d = Math.hypot(px - cx, py - cy);
          if (d < R_) { const s = 1 - d / R_; tx = clamp((px - cx) * .4 * s * K.mag * 1.6, -13, 13); ty = clamp((py - cy) * .45 * s * K.mag * 1.6, -11, 11); }
        }
        m.x += (tx - m.x) * .2; m.y += (ty - m.y) * .2;
        if (Math.abs(m.x) < .05 && Math.abs(m.y) < .05 && !tx && !ty) { m.x = m.y = 0; wr(m.el, 'translate', ''); } else { wr(m.el, 'translate', f(m.x) + 'px ' + f(m.y) + 'px'); busy = true; }
      }
    }
    const A2 = 5.2 * K.tilt;
    for (const [el, s] of tl) {
      let trx = 0, try_ = 0;
      if (el === hov && px >= 0) {
        const r = el.getBoundingClientRect(), u = (px - r.left) / r.width, v = (py - r.top) / r.height;
        if (u >= 0 && u <= 1 && v >= 0 && v <= 1) { try_ = (u - .5) * 2 * A2; trx = -(v - .5) * 2 * A2; wr(el, '--sx', f(u * 100, 1) + '%'); wr(el, '--sy', f(v * 100, 1) + '%'); if (!s.on) { s.on = true; el.classList.add('tl'); } } else hov = null;
      }
      if (el !== hov && s.on) { s.on = false; el.classList.remove('tl'); }
      s.rx += (trx - s.rx) * .14; s.ry += (try_ - s.ry) * .14;
      if (el !== hov && Math.abs(s.rx) < .02 && Math.abs(s.ry) < .02) { wr(el, 'transform', ''); tl.delete(el); continue; }
      wr(el, 'transform', 'perspective(1100px) rotateX(' + f(s.rx) + 'deg) rotateY(' + f(s.ry) + 'deg)'); busy = true;
    }
    /* counters */
    for (let i = tws.length - 1; i >= 0; i--) { const w = tws[i], u = clamp((t - w.t0) / w.d, 0, 1); w.el.textContent = Math.round(w.to * (1 - Math.pow(1 - u, 3))); if (u >= 1) tws.splice(i, 1); }

    if (glide || wheel || tws.length || busy || Math.abs(vs) > .02 || Math.abs(ptx - mx) > .003 || Math.abs(pty - my) > .003) wake();
  }

  /* palette: its list animates when it opens, not on every keystroke */
  const pal = $('.pal'); if (pal) { const inp = $('#pq'); if (inp) inp.addEventListener('input', () => pal.classList.add('typed')); let was = false; new MutationObserver(() => { const on = pal.classList.contains('on'); if (on && !was) pal.classList.remove('typed'); was = on; }).observe(pal, { attributes: true, attributeFilter: ['class'] }); }

  addEventListener('resize', () => { meas(); wake(); });
  addEventListener('load', () => { meas(); wake(); });
  D.addEventListener('visibilitychange', () => { if (!D.hidden) { pt = 0; wake(); } });
  wake();
  if (MANUAL) W.__mo = {
    step(ms) { mt += ms; tick(mt); }, now: () => mt, pointer(x, y) { px = x; py = y; ptx = x / vw * 2 - 1; pty = y / vh * 2 - 1; hover(D.elementFromPoint(x, y)); },
    wheel(dy) { const ev = new WheelEvent('wheel', { deltaY: dy, bubbles: true, cancelable: true }); D.body.dispatchEvent(ev); }, go
  };
})();
