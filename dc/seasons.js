/* The four seasons of the page. The season is read from the visitor's own date (northern hemisphere):
   winter  — snow falls, and a cap of snow settles on the summit of the mountain and slowly grows down it,
   spring  — blossom petals drift across,
   summer  — warm pollen and fireflies rise in the dusk,
   autumn  — leaves fall and gather at the bottom.
   Nothing is fetched. ?season=winter|spring|summer|autumn shows one on purpose, ?season=off shows none. With
   "reduce motion" set, one still picture of the season is drawn and nothing moves.
   © 2026 Alpenlume. All rights reserved. */
(function () {
  'use strict';
  var NAMES = ['winter', 'spring', 'summer', 'autumn'];
  var asked = '';
  try { asked = new URLSearchParams(location.search).get('season') || ''; } catch (e) {}
  if (asked === 'off') return;
  var month = new Date().getMonth();
  var season = NAMES.indexOf(asked) >= 0 ? asked : (month === 11 || month < 2 ? 'winter' : month < 5 ? 'spring' : month < 8 ? 'summer' : 'autumn');
  var root = document.documentElement;
  root.setAttribute('data-season', season);

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
  var parts = [], rest = [], last = 0, raf = 0;
  var LEAF = ['#D9822B', '#C4501F', '#E8B23A', '#A63A1B', '#8C6A24', '#CF6A2A'];
  var PETAL = ['#FFD3E0', '#FFFFFF', '#FFC1D5', '#F8E1EC'];

  // — winter: the summit of the mountain the page itself draws (#world) is found in that canvas, and a cap of snow
  //   lies on it down to a snow line that creeps lower the longer the visitor stays —
  var LW = 200, LH = 100, SK = 0;          // columns of the skyline, rows read, px per column
  var sky = null;                          // y of the first mountain pixel in each column (H where there is none)
  var summit = { x: 0, y: 0, ok: false, seen: 0 };
  var probe = document.createElement('canvas');
  var pctx = probe.getContext('2d', { willReadFrequently: true });
  var lastRead = -1e9;
  var t0 = Date.now();
  try {
    var saved = parseInt(sessionStorage.getItem('alp-snow-t0') || '', 10);
    if (saved > 0 && saved < Date.now()) t0 = saved; else sessionStorage.setItem('alp-snow-t0', String(t0));
  } catch (e) {}

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function readSky(now) {
    var world = document.getElementById('world');
    if (!world || !world.width || !pctx) return;
    LH = Math.max(40, Math.round(LW * H / W));
    if (probe.width !== LW || probe.height !== LH) { probe.width = LW; probe.height = LH; }
    pctx.clearRect(0, 0, LW, LH);
    try { pctx.drawImage(world, 0, 0, world.width, world.height, 0, 0, LW, LH); } catch (e) { return; }
    var d;
    try { d = pctx.getImageData(0, 0, LW, LH).data; } catch (e) { return; }
    var s = sky || new Float32Array(LW);
    var best = -1;
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
    sky = s; lastRead = now;
    // a summit is a real peak: clearly lower on both sides, not the edge of the window
    var ok2 = false;
    if (best > 0) {
      var span = Math.round(LW * 0.12);
      var l = s[Math.max(0, best - span)], r = s[Math.min(LW - 1, best + span)];
      ok2 = best > 2 && best < LW - 3 && l > s[best] + H * 0.05 && r > s[best] + H * 0.05;
    }
    if (ok2) {
      var nx = (best + 0.5) * SK, ny = s[best];
      if (summit.ok) { summit.x += (nx - summit.x) * 0.4; summit.y += (ny - summit.y) * 0.4; }
      else { summit.x = nx; summit.y = ny; }
      summit.ok = true;
    } else summit.ok = false;
  }

  function skyAt(i) { return sky ? sky[Math.max(0, Math.min(LW - 1, i))] : H; }

  // how far the snow has come down: 0 → 1, quickly at first, then slowly; remembered for the visit
  function level() {
    var secs = (Date.now() - t0) / 1000;
    return Math.min(1, 0.16 + 0.84 * (1 - Math.exp(-secs / 70)));
  }

  function make(initial) {
    var p = { x: rnd(0, W), y: initial ? rnd(-20, H) : rnd(-40, -4), ph: rnd(0, 6.28), rot: rnd(0, 6.28), vr: rnd(-1.2, 1.2) };
    if (season === 'winter') {
      p.r = rnd(1.5, 4.2); p.vy = rnd(24, 54) * (0.55 + p.r / 6); p.sw = rnd(10, 26); p.sp = rnd(0.5, 1.4);
    } else if (season === 'autumn') {
      p.r = rnd(9, 17); p.vy = rnd(28, 58); p.sw = rnd(26, 60); p.sp = rnd(0.5, 1.2); p.c = LEAF[(Math.random() * LEAF.length) | 0];
    } else if (season === 'spring') {
      p.r = rnd(3, 6.5); p.vy = rnd(20, 42); p.sw = rnd(18, 44); p.sp = rnd(0.6, 1.3); p.vx = rnd(10, 34); p.c = PETAL[(Math.random() * PETAL.length) | 0];
    } else {
      p.r = rnd(1.1, 2.6); p.y = initial ? rnd(0, H) : rnd(H * 0.55, H + 10); p.vy = -rnd(6, 20); p.sw = rnd(8, 24); p.sp = rnd(0.3, 0.9); p.tw = rnd(0.8, 2.2);
    }
    return p;
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var n = Math.max(22, Math.min(season === 'summer' ? 46 : 96, Math.round(W * H / 17000)));
    parts = [];
    for (var i = 0; i < n; i++) parts.push(make(true));
    SK = W / LW;
    sky = null; lastRead = -1e9; summit.ok = false;
    rest = [];
    if (season === 'autumn') for (var k = 0; k < 14; k++) rest.push({ x: rnd(0, W), y: H - rnd(2, 20), r: rnd(9, 15), rot: rnd(0, 6.28), c: LEAF[(Math.random() * LEAF.length) | 0] });
  }

  function drawLeaf(x, y, s, rot, c, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a; ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.85, -s * 0.2, 0, s); ctx.quadraticCurveTo(-s * 0.85, -s * 0.2, 0, -s); ctx.fill();
    ctx.strokeStyle = 'rgba(60,25,8,.45)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, -s * 0.9); ctx.lineTo(0, s * 1.15); ctx.stroke();
    ctx.restore();
  }

  // The snow cap: everything of the summit that lies above a snow line. The line is not straight — it wanders, and
  // it lies a little lower on the shaded side — and it comes down as the visit goes on.
  function drawCap(t, lvl) {
    if (!sky || !summit.ok) return;
    var depth = Math.max(60, Math.min(170, H * 0.2)) * lvl;
    var amp = Math.max(3, depth * 0.1);
    var xs = summit.x, ys = summit.y;
    function line(x) {
      var w = Math.sin(x * 0.045) * 1.0 + Math.sin(x * 0.113 + 1.3) * 0.65 + Math.sin(x * 0.27 + 0.4) * 0.35;
      return ys + depth + w * amp + (x > xs ? depth * 0.12 : 0);
    }
    var ci = Math.max(0, Math.min(LW - 1, (xs / SK) | 0)), lo = ci, hi = ci, i;
    while (lo > 0 && skyAt(lo - 1) < line((lo - 0.5) * SK)) lo--;
    while (hi < LW - 1 && skyAt(hi + 1) < line((hi + 1.5) * SK)) hi++;
    if (hi - lo < 1) return;
    var top = [], bot = [];
    for (i = lo; i <= hi; i++) {
      var x = (i + 0.5) * SK, y0 = skyAt(i);
      top.push([x, y0 - 0.5]);
      bot.push([x, Math.max(y0 + 1, line(x))]);
    }
    function path() {
      ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]);
      for (i = 1; i < top.length; i++) ctx.lineTo(top[i][0], top[i][1]);
      for (i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
      ctx.closePath();
    }
    ctx.save();
    // the lit face is white, falling to a pale blue towards the snow line
    var g = ctx.createLinearGradient(0, ys, 0, ys + depth * 1.2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(250,252,255,1)'); g.addColorStop(1, 'rgba(214,228,250,0.96)');
    ctx.fillStyle = g; ctx.shadowColor = 'rgba(255,255,255,.7)'; ctx.shadowBlur = 10;
    path(); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    // the shaded face, to the right of the summit, takes a cool blue-grey
    ctx.save(); path(); ctx.clip();
    ctx.fillStyle = 'rgba(150,172,214,.42)';
    ctx.beginPath(); ctx.moveTo(xs, ys - 4); ctx.lineTo(xs + depth * 0.1, ys + depth * 0.5); ctx.lineTo(xs + depth * 0.38, ys + depth * 1.6);
    ctx.lineTo(W + 10, ys + depth * 1.6); ctx.lineTo(W + 10, ys - 4); ctx.closePath(); ctx.fill();
    ctx.restore();
    // a fine blue edge where the snow stops, and a few glints
    ctx.strokeStyle = 'rgba(112,140,196,.38)'; ctx.lineWidth = 1.2; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(bot[0][0], bot[0][1]);
    for (i = 1; i < bot.length; i++) ctx.lineTo(bot[i][0], bot[i][1]);
    ctx.stroke();
    for (var gk = 0; gk < 4; gk++) {
      var gx = xs + (gk - 1.5) * depth * 0.35, gy = ys + depth * (0.18 + 0.16 * gk);
      var ga = Math.max(0, Math.sin(t / 900 + gk * 1.9)) * 0.9;
      if (ga < 0.05) continue;
      ctx.globalAlpha = ga; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(gx - 6, gy); ctx.lineTo(gx + 6, gy); ctx.moveTo(gx, gy - 6); ctx.lineTo(gx, gy + 6); ctx.stroke();
    }
    ctx.restore();
  }

  function frame(t) {
    var dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
    last = t;
    ctx.clearRect(0, 0, W, H);
    var i, p;
    if (season === 'winter') {
      if (t - lastRead > 160) readSky(t);
      for (i = 0; i < parts.length; i++) {
        p = parts[i]; p.ph += p.sp * dt; p.y += p.vy * dt; p.x += Math.sin(p.ph) * p.sw * dt;
        if (p.y > H + 8) { parts[i] = make(false); continue; }
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        ctx.globalAlpha = 0.62 + p.r / 14; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1; drawCap(t, level());
    } else if (season === 'autumn') {
      for (i = 0; i < rest.length; i++) drawLeaf(rest[i].x, rest[i].y, rest[i].r, rest[i].rot, rest[i].c, 0.9);
      for (i = 0; i < parts.length; i++) {
        p = parts[i]; p.ph += p.sp * dt; p.rot += p.vr * dt; p.y += p.vy * dt; p.x += Math.sin(p.ph) * p.sw * dt;
        if (p.y > H - rnd(4, 26)) {
          rest.push({ x: p.x, y: Math.min(H - 3, p.y), r: p.r, rot: p.rot, c: p.c });
          if (rest.length > 90) rest.shift();
          parts[i] = make(false); continue;
        }
        if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
        drawLeaf(p.x, p.y, p.r, p.rot, p.c, 0.92);
      }
    } else if (season === 'spring') {
      for (i = 0; i < parts.length; i++) {
        p = parts[i]; p.ph += p.sp * dt; p.rot += p.vr * dt; p.y += p.vy * dt; p.x += p.vx * dt + Math.sin(p.ph) * p.sw * dt * 0.5;
        if (p.y > H + 12 || p.x > W + 20) { parts[i] = make(false); parts[i].x = rnd(-60, W); continue; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = 0.85; ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.58, 0, 0, 6.2832); ctx.fill(); ctx.restore();
      }
    } else {
      for (i = 0; i < parts.length; i++) {
        p = parts[i]; p.ph += p.sp * dt; p.y += p.vy * dt; p.x += Math.sin(p.ph) * p.sw * dt;
        if (p.y < -10) { parts[i] = make(false); continue; }
        var a = 0.35 + 0.45 * Math.abs(Math.sin(p.ph * p.tw * 2));
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4.2);
        g.addColorStop(0, 'rgba(255,224,140,' + a + ')'); g.addColorStop(1, 'rgba(255,200,90,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4.2, 0, 6.2832); ctx.fill();
      }
    }
    raf = requestAnimationFrame(frame);
  }

  function still() {
    // one picture, nothing moves: what lies on the ground
    ctx.clearRect(0, 0, W, H);
    var i;
    if (season === 'winter') {
      readSky(0);
      drawCap(0, 0.8);
    } else if (season === 'autumn') {
      for (i = 0; i < 40; i++) drawLeaf(rnd(0, W), H - rnd(2, 28), rnd(9, 15), rnd(0, 6.28), LEAF[(Math.random() * LEAF.length) | 0], 0.9);
    }
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
