/* The four seasons of the page. The season is read from the visitor's own date (northern hemisphere):
   winter  — snow falls in three depths; a cap of snow settles on the summit of the mountain and a drift slowly
             gathers along the bottom of the window,
   spring  — blossom petals tumble across and a few come to rest,
   summer  — fireflies and pollen drift upward in the dusk,
   autumn  — leaves tumble down and gather in a loose litter at the bottom.
   Everything is drawn behind the page and stays in the colours of the page. Nothing is fetched.
   ?season=winter|spring|summer|autumn shows one on purpose, ?season=off shows none. With "reduce motion" set,
   one still picture of the season is drawn and nothing moves.
   © 2026 Alpenlume. All rights reserved. */
(function () {
  'use strict';
  var NAMES = ['winter', 'spring', 'summer', 'autumn'];
  var asked = '';
  try { asked = new URLSearchParams(location.search).get('season') || ''; } catch (e) {}
  if (asked === 'off') return;
  var month = new Date().getMonth();
  var season = NAMES.indexOf(asked) >= 0 ? asked : (month === 11 || month < 2 ? 'winter' : month < 5 ? 'spring' : month < 8 ? 'summer' : 'autumn');
  document.documentElement.setAttribute('data-season', season);

  var reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var tint = document.createElement('div');
  tint.id = 'stint';
  tint.setAttribute('aria-hidden', 'true');
  var cv = document.createElement('canvas');
  cv.id = 'season';
  cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tint);
  document.body.appendChild(cv);
  var ctx = cv.getContext('2d');
  if (!ctx) return;

  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var parts = [], rest = [], glints = [], last = 0, raf = 0, now = 0;
  var LEAF = ['#D9822B', '#C4501F', '#E8B23A', '#A63A1B', '#9A7424', '#CF6A2A'];
  var PETAL = ['#FFD3E0', '#FFFFFF', '#FFC1D5', '#F8E1EC'];
  var TAU = 6.2832;

  // how long this visit has lasted (kept in the tab, so the snow does not start again on every page)
  var t0 = Date.now();
  try {
    var saved = parseInt(sessionStorage.getItem('alp-snow-t0') || '', 10);
    if (saved > 0 && saved < Date.now()) t0 = saved; else sessionStorage.setItem('alp-snow-t0', String(t0));
  } catch (e) {}
  function secs() { return (Date.now() - t0) / 1000; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function wind() { return Math.sin(now / 5200) * 12 + Math.sin(now / 2300 + 1.3) * 5; }

  // a soft round dot, drawn once and stamped many times
  var sprites = {};
  function glow(key, r, g, b, mid) {
    if (sprites[key]) return sprites[key];
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',1)');
    gr.addColorStop(0.3, 'rgba(' + r + ',' + g + ',' + b + ',' + mid + ')');
    gr.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    return (sprites[key] = c);
  }
  function stamp(sp, x, y, rad, a) { ctx.globalAlpha = a; ctx.drawImage(sp, x - rad, y - rad, rad * 2, rad * 2); }

  // — the mountain's summit, found in the canvas the page itself draws (#world) —
  var LW = 200, LH = 100, SK = 0;
  var sky = null, lastRead = -1e9;
  var summit = { x: 0, y: 0, ok: false };
  var probe = document.createElement('canvas');
  var pctx = probe.getContext('2d', { willReadFrequently: true });

  function readSky(t) {
    var world = document.getElementById('world');
    if (!world || !world.width || !pctx) return;
    LH = Math.max(40, Math.round(LW * H / W));
    if (probe.width !== LW || probe.height !== LH) { probe.width = LW; probe.height = LH; }
    pctx.clearRect(0, 0, LW, LH);
    try { pctx.drawImage(world, 0, 0, world.width, world.height, 0, 0, LW, LH); } catch (e) { return; }
    var d;
    try { d = pctx.getImageData(0, 0, LW, LH).data; } catch (e) { return; }
    var s = sky || new Float32Array(LW), best = -1;
    for (var x = 0; x < LW; x++) {
      var found = H;
      for (var y = 0; y < LH - 5; y++) {
        // a mountain is solid for several rows; a star, a bird or a cloud is not
        var ok = true;
        for (var k = 0; k < 5; k++) { if (d[((y + k) * LW + x) * 4 + 3] < 200) { ok = false; break; } }
        if (ok) { found = y / LH * H; break; }
      }
      s[x] = found;
      if (found < H - 4 && (best < 0 || found < s[best])) best = x;
    }
    sky = s; lastRead = t;
    // a summit is a real peak: clearly lower on both sides, and not the edge of the window
    var good = false;
    if (best > 2 && best < LW - 3) {
      var span = Math.round(LW * 0.12);
      good = s[Math.max(0, best - span)] > s[best] + H * 0.05 && s[Math.min(LW - 1, best + span)] > s[best] + H * 0.05;
    }
    if (good) {
      var nx = (best + 0.5) * SK, ny = s[best];
      if (summit.ok) { summit.x += (nx - summit.x) * 0.35; summit.y += (ny - summit.y) * 0.35; } else { summit.x = nx; summit.y = ny; }
      summit.ok = true;
    } else summit.ok = false;
  }
  function skyAt(i) { return sky ? sky[Math.max(0, Math.min(LW - 1, i))] : H; }

  // a smooth line through points, so the snow edge is soft and not a zig-zag of columns
  function smooth(pts, first) {
    var i, n = pts.length;
    if (first) ctx.moveTo(pts[0][0], pts[0][1]); else ctx.lineTo(pts[0][0], pts[0][1]);
    for (i = 1; i < n - 1; i++) {
      var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
  }

  // 0 → 1; quickly at first, then slowly. The summit comes down in a few minutes, the drift in a quarter of an hour.
  function summitLevel() { return Math.min(1, 0.16 + 0.84 * (1 - Math.exp(-secs() / 70))); }
  function driftLevel() { return Math.min(1, 0.12 + 0.88 * (1 - Math.exp(-secs() / 260))); }

  function drawCap(t, lvl) {
    if (!sky || !summit.ok) return;
    var depth = Math.max(60, Math.min(170, H * 0.2)) * lvl, amp = Math.max(3, depth * 0.1);
    var xs = summit.x, ys = summit.y, i;
    function line(x) {
      var w = Math.sin(x * 0.045) + Math.sin(x * 0.113 + 1.3) * 0.65 + Math.sin(x * 0.27 + 0.4) * 0.35;
      return ys + depth + w * amp + (x > xs ? depth * 0.12 : 0);
    }
    var ci = Math.max(0, Math.min(LW - 1, (xs / SK) | 0)), lo = ci, hi = ci;
    while (lo > 0 && skyAt(lo - 1) < line((lo - 0.5) * SK)) lo--;
    while (hi < LW - 1 && skyAt(hi + 1) < line((hi + 1.5) * SK)) hi++;
    if (hi - lo < 2) return;
    var top = [], bot = [];
    for (i = lo; i <= hi; i++) {
      var x = (i + 0.5) * SK, y0 = skyAt(i);
      top.push([x, y0 - 0.5]);
      bot.push([x, Math.max(y0 + 1, line(x))]);
    }
    var rbot = bot.slice().reverse();
    function path() {
      ctx.beginPath(); smooth(top, true); smooth(rbot, false); ctx.closePath();
    }
    ctx.save();
    var g = ctx.createLinearGradient(0, ys, 0, ys + depth * 1.25);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(250,252,255,1)'); g.addColorStop(1, 'rgba(208,224,250,.97)');
    ctx.fillStyle = g; ctx.shadowColor = 'rgba(255,255,255,.65)'; ctx.shadowBlur = 12;
    path(); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    ctx.save(); path(); ctx.clip();
    // the shaded face to the right of the summit, cool and soft
    var sg = ctx.createLinearGradient(xs, 0, xs + depth * 1.4, 0);
    sg.addColorStop(0, 'rgba(140,164,212,.20)'); sg.addColorStop(1, 'rgba(140,164,212,.50)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.moveTo(xs, ys - 4); ctx.lineTo(xs + depth * 0.1, ys + depth * 0.5); ctx.lineTo(xs + depth * 0.38, ys + depth * 1.7);
    ctx.lineTo(W + 10, ys + depth * 1.7); ctx.lineTo(W + 10, ys - 4); ctx.closePath(); ctx.fill();
    // a little shadow under the snow line, where it lies thickest
    var ug = ctx.createLinearGradient(0, ys + depth * 0.55, 0, ys + depth * 1.3);
    ug.addColorStop(0, 'rgba(110,138,196,0)'); ug.addColorStop(1, 'rgba(110,138,196,.28)');
    ctx.fillStyle = ug; ctx.fillRect(lo * SK - 4, ys + depth * 0.55, (hi - lo + 3) * SK, depth * 0.9);
    ctx.restore();
    ctx.strokeStyle = 'rgba(112,140,196,.34)'; ctx.lineWidth = 1.1; ctx.lineJoin = 'round';
    ctx.beginPath(); smooth(bot, true); ctx.stroke();
    for (var gk = 0; gk < 4; gk++) {
      var gx = xs + (gk - 1.5) * depth * 0.35, gy = ys + depth * (0.18 + 0.15 * gk);
      var ga = Math.max(0, Math.sin(t / 900 + gk * 1.9)) * 0.9;
      if (ga < 0.05) continue;
      ctx.globalAlpha = ga; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(gx - 6, gy); ctx.lineTo(gx + 6, gy); ctx.moveTo(gx, gy - 6); ctx.lineTo(gx, gy + 6); ctx.stroke();
    }
    ctx.restore();
  }

  // — the drift along the bottom: three soft layers, the far one bluish and tall, the near one white and low —
  var capGround = 60, extra = 0;
  function driftH(x, k, lvl) {
    var u = x / Math.max(1, W);
    var w = 0.56 + 0.2 * Math.sin(u * 6.1 + k * 1.7) + 0.15 * Math.sin(u * 14.3 + k * 0.9 + 1.2) + 0.06 * Math.sin(u * 31 + k);
    return (capGround * lvl + extra) * w * (k === 0 ? 1 : k === 1 ? 0.78 : 0.56);
  }
  function drawDrift(t, lvl) {
    var cols = ['rgba(196,214,244,.95)', 'rgba(224,235,252,.97)', 'rgba(255,255,255,.99)'];
    var step = Math.max(6, W / 90), k, x, pts;
    ctx.save();
    for (k = 0; k < 3; k++) {
      pts = [];
      for (x = -step; x <= W + step * 2; x += step) pts.push([x, H - driftH(x, k, lvl)]);
      ctx.beginPath(); ctx.moveTo(-step, H + 2); ctx.lineTo(pts[0][0], pts[0][1]);
      smooth(pts, false); ctx.lineTo(W + step * 2, H + 2); ctx.closePath();
      ctx.fillStyle = cols[k]; ctx.fill();
      if (k === 2) {
        // the near layer has a lit upper edge
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); smooth(pts, true); ctx.stroke();
      } else if (k === 0) {
        ctx.strokeStyle = 'rgba(150,176,224,.45)'; ctx.lineWidth = 1; ctx.beginPath(); smooth(pts, true); ctx.stroke();
      }
    }
    // glints along the top of the drift
    for (k = 0; k < 7; k++) {
      var gx = ((k * 0.137 + 0.06) % 1) * W, a = Math.max(0, Math.sin(t / 1100 + k * 2.3)) * 0.85;
      if (a < 0.06) continue;
      var gy = H - driftH(gx, 2, lvl) - 2;
      ctx.globalAlpha = a; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(gx - 5, gy); ctx.lineTo(gx + 5, gy); ctx.moveTo(gx, gy - 5); ctx.lineTo(gx, gy + 5); ctx.stroke();
    }
    ctx.restore();
  }

  // — the particles —
  function make(initial) {
    var p = { x: rnd(0, W), y: initial ? rnd(-20, H) : rnd(-50, -4), ph: rnd(0, TAU), rot: rnd(0, TAU), vr: rnd(-1.4, 1.4), fl: rnd(0, TAU), vf: rnd(1.5, 4) };
    if (season === 'winter') {
      var q = Math.random();
      if (q < 0.5) { p.z = 0; p.r = rnd(1, 2.1); p.vy = rnd(15, 30); p.a = rnd(0.35, 0.6); p.sw = rnd(6, 14); }
      else if (q < 0.86) { p.z = 1; p.r = rnd(2.1, 3.7); p.vy = rnd(28, 50); p.a = rnd(0.6, 0.85); p.sw = rnd(10, 22); }
      else { p.z = 2; p.r = rnd(5, 8.5); p.vy = rnd(60, 96); p.a = rnd(0.18, 0.32); p.sw = rnd(16, 32); }
      p.sp = rnd(0.5, 1.3);
    } else if (season === 'autumn') {
      p.r = rnd(8, 15); p.vy = rnd(26, 54); p.sw = rnd(24, 56); p.sp = rnd(0.5, 1.1); p.c = LEAF[(Math.random() * LEAF.length) | 0]; p.k = (Math.random() * 3) | 0;
    } else if (season === 'spring') {
      p.r = rnd(3.5, 7); p.vy = rnd(20, 42); p.sw = rnd(18, 40); p.sp = rnd(0.6, 1.3); p.vx = rnd(8, 30); p.c = PETAL[(Math.random() * PETAL.length) | 0];
    } else {
      p.z = Math.random() < 0.35 ? 1 : 0;       // 1 = a firefly, 0 = a mote of pollen
      p.r = p.z ? rnd(2, 3.2) : rnd(0.9, 1.8); p.y = initial ? rnd(0, H) : rnd(H * 0.5, H + 10);
      p.vy = -rnd(5, 17); p.sw = rnd(10, 30); p.sp = rnd(0.25, 0.8); p.tw = rnd(0.7, 2);
    }
    return p;
  }

  function restOne() {
    return { x: rnd(0, W), y: H - rnd(1, 24), r: rnd(season === 'autumn' ? 8 : 3.5, season === 'autumn' ? 14 : 6), rot: rnd(0, TAU),
             c: season === 'autumn' ? LEAF[(Math.random() * LEAF.length) | 0] : PETAL[(Math.random() * PETAL.length) | 0], k: (Math.random() * 3) | 0, a: rnd(0.55, 0.9) };
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var n = Math.max(24, Math.min(season === 'summer' ? 44 : 100, Math.round(W * H / 16000)));
    parts = [];
    for (var i = 0; i < n; i++) parts.push(make(true));
    SK = W / LW; sky = null; lastRead = -1e9; summit.ok = false;
    capGround = Math.max(38, Math.min(100, H * 0.09)); extra = 0;
    rest = []; glints = [];
    if (season === 'autumn' || season === 'spring') {
      var m = Math.min(70, Math.round(secs() / 8) + 8);
      for (var k = 0; k < m; k++) rest.push(restOne());
    }
  }

  // — leaves and petals —
  function leaf(x, y, s, rot, c, a, kind, flip) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(flip, 1); ctx.globalAlpha = a; ctx.fillStyle = c;
    ctx.beginPath();
    if (kind === 1) {                                  // a lobed, maple-like leaf
      var P = [[0, -1], [0.26, -0.55], [0.8, -0.62], [0.5, -0.12], [0.96, 0.16], [0.4, 0.26], [0.34, 0.8], [0, 0.55], [-0.34, 0.8], [-0.4, 0.26], [-0.96, 0.16], [-0.5, -0.12], [-0.8, -0.62], [-0.26, -0.55]];
      ctx.moveTo(P[0][0] * s, P[0][1] * s);
      for (var i = 1; i < P.length; i++) ctx.lineTo(P[i][0] * s, P[i][1] * s);
      ctx.closePath();
    } else if (kind === 2) {                           // a small round one
      ctx.ellipse(0, 0, s * 0.68, s * 0.9, 0, 0, TAU);
    } else {                                           // a long oval
      ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.85, -s * 0.2, 0, s); ctx.quadraticCurveTo(-s * 0.85, -s * 0.2, 0, -s);
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,25,8,.42)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, -s * 0.85); ctx.lineTo(0, s * 1.1); ctx.stroke();
    ctx.restore();
  }
  function petal(x, y, r, rot, c, a, flip) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, flip); ctx.globalAlpha = a; ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.9, -r * 0.3, 0, r * 0.9); ctx.quadraticCurveTo(-r * 0.9, -r * 0.3, 0, -r); ctx.fill();
    ctx.restore();
  }

  function addGlint(x, y) { glints.push({ x: x, y: y, life: 1 }); if (glints.length > 24) glints.shift(); }

  function frame(t) {
    var dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
    last = t; now = t;
    ctx.clearRect(0, 0, W, H);
    var i, p, wd = wind();
    if (season === 'winter') {
      if (t - lastRead > 160) readSky(t);
      var dl = driftLevel(), sn = glow('snow', 255, 255, 255, 0.75);
      for (i = 0; i < parts.length; i++) {
        p = parts[i]; p.ph += p.sp * dt; p.y += p.vy * dt; p.x += (Math.sin(p.ph) * p.sw + wd * (0.5 + p.z * 0.35)) * dt;
        var gh = driftH(p.x, 2, dl);
        if (p.y > H - gh * 0.9) {
          if (p.z > 0 && Math.random() < 0.18) addGlint(p.x, H - gh);
          if (p.z === 1 && extra < capGround * 0.35) extra += 0.012;       // each one that lands adds a little
          parts[i] = make(false); continue;
        }
        if (p.x < -12) p.x = W + 12; else if (p.x > W + 12) p.x = -12;
        stamp(sn, p.x, p.y, p.r * 1.5, p.a);
      }
      for (i = glints.length - 1; i >= 0; i--) {
        var gl = glints[i]; gl.life -= dt * 2.2;
        if (gl.life <= 0) { glints.splice(i, 1); continue; }
        ctx.globalAlpha = gl.life * 0.8; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(gl.x, gl.y, 1.6 * gl.life + 0.4, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1; drawCap(t, summitLevel()); drawDrift(t, dl);
    } else if (season === 'autumn') {
      var lg = ctx.createLinearGradient(0, H - 90, 0, H);
      var depth = Math.min(1, 0.2 + secs() / 600);
      lg.addColorStop(0, 'rgba(150,72,22,0)'); lg.addColorStop(1, 'rgba(150,72,22,' + (0.3 * depth) + ')');
      ctx.fillStyle = lg; ctx.fillRect(0, H - 90, W, 90);
      for (i = 0; i < rest.length; i++) leaf(rest[i].x, rest[i].y, rest[i].r, rest[i].rot, rest[i].c, rest[i].a, rest[i].k, 0.8);
      for (i = 0; i < parts.length; i++) {
        p = parts[i]; p.ph += p.sp * dt; p.rot += p.vr * dt; p.fl += p.vf * dt; p.y += p.vy * dt; p.x += (Math.sin(p.ph) * p.sw + wd) * dt;
        if (p.y > H - rnd(2, 22)) {
          rest.push({ x: p.x, y: Math.min(H - 2, p.y), r: p.r, rot: p.rot, c: p.c, k: p.k, a: rnd(0.6, 0.92) });
          if (rest.length > 90) rest.shift();
          parts[i] = make(false); continue;
        }
        if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
        var fc = Math.cos(p.fl);
        leaf(p.x, p.y, p.r, p.rot, p.c, 0.94, p.k, fc * 0.85 + (fc < 0 ? -0.15 : 0.15));
      }
    } else if (season === 'spring') {
      var pg = glow('petal', 255, 205, 222, 0.35);
      for (i = 0; i < rest.length; i++) petal(rest[i].x, rest[i].y, rest[i].r, rest[i].rot, rest[i].c, rest[i].a * 0.8, 0.55);
      for (i = 0; i < parts.length; i++) {
        p = parts[i]; p.ph += p.sp * dt; p.rot += p.vr * dt; p.fl += p.vf * dt; p.y += p.vy * dt;
        p.x += p.vx * dt + (Math.sin(p.ph) * p.sw * 0.5 + wd) * dt;
        if (p.y > H - rnd(2, 20)) {
          rest.push({ x: p.x, y: Math.min(H - 2, p.y), r: p.r, rot: p.rot, c: p.c, a: rnd(0.55, 0.85) });
          if (rest.length > 60) rest.shift();
          parts[i] = make(false); parts[i].x = rnd(-60, W); continue;
        }
        if (p.x > W + 20) { parts[i] = make(false); parts[i].x = rnd(-60, W * 0.6); continue; }
        stamp(pg, p.x, p.y, p.r * 2.2, 0.35);
        petal(p.x, p.y, p.r, p.rot, p.c, 0.9, Math.cos(p.fl) * 0.8 + 0.2);
      }
    } else {
      var fg = glow('fly', 255, 218, 120, 0.4), pl = glow('pollen', 255, 240, 200, 0.5);
      for (i = 0; i < parts.length; i++) {
        p = parts[i]; p.ph += p.sp * dt; p.y += p.vy * dt; p.x += (Math.sin(p.ph) * p.sw + wd * 0.4) * dt;
        if (p.y < -12) { parts[i] = make(false); continue; }
        var a = 0.3 + 0.55 * Math.abs(Math.sin(p.ph * p.tw * 2));
        if (p.z) stamp(fg, p.x, p.y, p.r * 6, a); else stamp(pl, p.x, p.y, p.r * 3, a * 0.8);
      }
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }

  function still() {
    // one picture, nothing moves
    ctx.clearRect(0, 0, W, H);
    var i;
    if (season === 'winter') {
      readSky(0); drawCap(0, 0.8); drawDrift(0, 0.7);
    } else if (season === 'autumn') {
      for (i = 0; i < 40; i++) { var r = restOne(); leaf(r.x, r.y, r.r, r.rot, r.c, r.a, r.k, 0.8); }
    } else if (season === 'spring') {
      for (i = 0; i < 30; i++) { var q = restOne(); petal(q.x, q.y, q.r, q.rot, q.c, q.a, 0.55); }
    }
    ctx.globalAlpha = 1;
  }

  resize();
  window.addEventListener('resize', function () { resize(); if (reduce) still(); });
  if (reduce) {
    // the mountains are drawn a moment after load; look again a little later
    setTimeout(still, 600); setTimeout(still, 1800);
    return;
  }
  raf = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
  });
})();
