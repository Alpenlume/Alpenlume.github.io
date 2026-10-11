/* The four seasons of the page. The season is read from the visitor's own date (northern hemisphere):
   winter  — snow falls and settles on the mountains (and on the ground where there is no mountain),
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

  // — winter: the snow lies on the skyline of the mountains the page itself draws (#world), read from that canvas —
  var LW = 200, LH = 100, SK = 0;          // columns of the skyline, rows read, px per column
  var sky = null;                          // y of the first mountain pixel in each column (H where there is none)
  var snow = null;                         // thickness of snow in each column, px
  var ground = null, capGround = 40;       // the valley floor in front of the mountains: snow lying along the bottom
  var capSnow = 22;                        // the most snow a flat place keeps
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
    for (var x = 0; x < LW; x++) {
      var found = H;
      for (var y = 0; y < LH - 5; y++) {
        // a mountain is solid for several rows; a star, a bird or a cloud is not
        var ok = true;
        for (var k = 0; k < 5; k++) { if (d[((y + k) * LW + x) * 4 + 3] < 200) { ok = false; break; } }
        if (ok) { found = y / LH * H; break; }
      }
      s[x] = found;
    }
    sky = s; lastRead = now;
  }

  function skyAt(i) { return sky ? sky[Math.max(0, Math.min(LW - 1, i))] : H; }

  // snow keeps best on flat ground and slides off the steep parts
  function room(i) {
    var slope = Math.abs(skyAt(i + 1) - skyAt(i - 1)) / (2 * SK);
    // lower than both sides = a valley, where the snow gathers
    var valley = Math.max(0, skyAt(i) - (skyAt(i - 7) + skyAt(i + 7)) * 0.5) / H;
    return capSnow * (1 + Math.min(1.1, valley * 9)) / (1 + slope * 1.1);
  }

  function make(initial) {
    var p = { x: rnd(0, W), y: initial ? rnd(-20, H) : rnd(-40, -4), ph: rnd(0, 6.28), rot: rnd(0, 6.28), vr: rnd(-1.2, 1.2) };
    if (season === 'winter') {
      p.r = rnd(1.7, 4.6); p.vy = rnd(24, 54) * (0.55 + p.r / 6); p.sw = rnd(10, 26); p.sp = rnd(0.5, 1.4);
      p.near = Math.random() < 0.34;           // in front of the mountains: bigger, quicker, lands in the valley floor
      if (p.near) { p.r *= 1.4; p.vy *= 1.3; }
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
    capSnow = Math.max(14, Math.min(30, H * 0.034));
    capGround = Math.max(40, Math.min(112, H * 0.1));
    sky = null; lastRead = -1e9;
    // snow that fell earlier in this visit (this tab) is already lying there
    var already = Math.min(capSnow * 0.7, 3 + (Date.now() - t0) / 1000 * 0.12);
    snow = new Float32Array(LW);
    ground = new Float32Array(LW);
    for (var j = 0; j < LW; j++) {
      snow[j] = season === 'winter' ? already * (0.75 + 0.25 * Math.sin(j * 0.5)) : 0;
      ground[j] = season === 'winter' ? Math.min(capGround * 0.85, 12 + already * 2.2) * (0.8 + 0.2 * Math.sin(j * 0.31)) : 0;
    }
    rest = [];
    if (season === 'autumn') for (var k = 0; k < 14; k++) rest.push({ x: rnd(0, W), y: H - rnd(2, 20), r: rnd(9, 15), rot: rnd(0, 6.28), c: LEAF[(Math.random() * LEAF.length) | 0] });
  }

  function drawLeaf(x, y, s, rot, c, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a; ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.85, -s * 0.2, 0, s); ctx.quadraticCurveTo(-s * 0.85, -s * 0.2, 0, -s); ctx.fill();
    ctx.strokeStyle = 'rgba(60,25,8,.45)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, -s * 0.9); ctx.lineTo(0, s * 1.15); ctx.stroke();
    ctx.restore();
  }

  // the snow cover: a white band that follows the skyline, as thick as the snow in each column
  function drawSnow() {
    if (!snow) return;
    var i, x, yTop;
    ctx.save();
    ctx.globalAlpha = 1;
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(255,255,255,.98)'); g.addColorStop(1, 'rgba(214,228,250,.98)');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (i = 0; i < LW; i++) {
      x = (i + 0.5) * SK; yTop = skyAt(i) - snow[i] - 0.5;
      if (i === 0) ctx.moveTo(0, yTop); ctx.lineTo(x, yTop);
    }
    ctx.lineTo(W, skyAt(LW - 1) - snow[LW - 1]);
    for (i = LW - 1; i >= 0; i--) { x = (i + 0.5) * SK; ctx.lineTo(x, Math.min(H, skyAt(i) + 2.5 + snow[i] * 0.35)); }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // the valley floor: a drift along the bottom of the window, in front of the mountains and their pines
  function drawGround() {
    if (!ground) return;
    var i;
    ctx.save();
    var g = ctx.createLinearGradient(0, H - capGround, 0, H);
    g.addColorStop(0, 'rgba(255,255,255,.97)'); g.addColorStop(1, 'rgba(205,221,248,.98)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, H);
    for (i = 0; i < LW; i++) ctx.lineTo((i + 0.5) * SK, H - ground[i]);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function landGround(p) {
    var i = Math.max(0, Math.min(LW - 1, (p.x / SK) | 0));
    var add = p.r * 0.3;
    for (var d = -3; d <= 3; d++) {
      var j = i + d;
      if (j >= 0 && j < LW && ground[j] < capGround) ground[j] = Math.min(capGround, ground[j] + add * (1 - Math.abs(d) / 4));
    }
  }

  function land(p) {
    var i = Math.max(0, Math.min(LW - 1, (p.x / SK) | 0));
    var add = p.r * 0.34;
    for (var d = -2; d <= 2; d++) {
      var j = i + d;
      if (j < 0 || j >= LW) continue;
      var lim = room(j);
      if (snow[j] < lim) snow[j] = Math.min(lim, snow[j] + add * (1 - Math.abs(d) / 3));
    }
  }

  function settle() {
    for (var i = 1; i < LW - 1; i++) {
      var avg = (snow[i - 1] + snow[i + 1]) * 0.5;
      snow[i] += (avg - snow[i]) * 0.03;
      var lim = room(i);
      if (snow[i] > lim) snow[i] += (lim - snow[i]) * 0.05;     // what the slope cannot hold slips off
      ground[i] += ((ground[i - 1] + ground[i + 1]) * 0.5 - ground[i]) * 0.04;
    }
  }

  function frame(t) {
    var dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
    last = t;
    ctx.clearRect(0, 0, W, H);
    var i, p;
    if (season === 'winter') {
      if (t - lastRead > 140) readSky(t);
      settle();
      for (i = 0; i < parts.length; i++) {
        p = parts[i]; p.ph += p.sp * dt; p.y += p.vy * dt; p.x += Math.sin(p.ph) * p.sw * dt;
        var col = Math.max(0, Math.min(LW - 1, (p.x / SK) | 0));
        if (p.near) {
          if (p.y > H - ground[col] - 1) { landGround(p); parts[i] = make(false); continue; }
        } else if (p.y > skyAt(col) - snow[col] - 1) {
          if (skyAt(col) >= H - 2) landGround(p); else land(p);
          parts[i] = make(false); continue;
        }
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        ctx.globalAlpha = 0.7 + p.r / 16; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1; drawSnow(); drawGround();
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
      for (i = 0; i < LW; i++) { snow[i] = room(i) * 0.8; ground[i] = capGround * 0.7 * (0.85 + 0.15 * Math.sin(i * 0.31)); }
      drawSnow(); drawGround();
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
