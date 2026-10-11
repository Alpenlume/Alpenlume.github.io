/* The four seasons of the page. The season is read from the visitor's own date (northern hemisphere):
   winter  — snow falls and settles on the ground behind the page,
   spring  — blossom petals drift across,
   summer  — warm pollen and fireflies rise in the dusk,
   autumn  — leaves fall and gather at the bottom.
   Nothing is fetched and nothing is stored. ?season=winter|spring|summer|autumn shows one on purpose, ?season=off
   shows none. With "reduce motion" set, one still picture of the season is drawn and nothing moves.
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
  var parts = [], rest = [], pile = null, COL = 4, cap = 60, last = 0, raf = 0;
  var LEAF = ['#D9822B', '#C4501F', '#E8B23A', '#A63A1B', '#8C6A24', '#CF6A2A'];
  var PETAL = ['#FFD3E0', '#FFFFFF', '#FFC1D5', '#F8E1EC'];

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function make(initial) {
    var p = { x: rnd(0, W), y: initial ? rnd(-20, H) : rnd(-40, -4), ph: rnd(0, 6.28), rot: rnd(0, 6.28), vr: rnd(-1.2, 1.2) };
    if (season === 'winter') {
      p.r = rnd(1.7, 4.6); p.vy = rnd(24, 54) * (0.55 + p.r / 6); p.sw = rnd(10, 26); p.sp = rnd(0.5, 1.4);
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
    cap = Math.max(40, Math.min(96, H * 0.1));
    pile = new Float32Array(Math.ceil(W / COL) + 2);
    for (var j = 0; j < pile.length; j++) pile[j] = season === 'winter' ? 13 + 5 * Math.sin(j * 0.21) : 0;
    rest = [];
    if (season === 'autumn') for (var k = 0; k < 14; k++) rest.push({ x: rnd(0, W), y: H - rnd(2, 20), r: rnd(9, 15), rot: rnd(0, 6.28), c: LEAF[(Math.random() * LEAF.length) | 0] });
  }

  function drawLeaf(x, y, s, rot, c, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a; ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.85, -s * 0.2, 0, s); ctx.quadraticCurveTo(-s * 0.85, -s * 0.2, 0, -s); ctx.fill();
    ctx.strokeStyle = 'rgba(60,25,8,.45)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, -s * 0.9); ctx.lineTo(0, s * 1.15); ctx.stroke();
    ctx.restore();
  }

  function drawPile() {
    ctx.save();
    var g = ctx.createLinearGradient(0, H - cap, 0, H);
    g.addColorStop(0, 'rgba(255,255,255,.96)'); g.addColorStop(1, 'rgba(206,222,246,.96)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, H);
    for (var i = 0; i < pile.length; i++) ctx.lineTo(i * COL, H - pile[i]);
    ctx.lineTo(W + COL, H); ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function land(p) {
    var i = Math.max(0, Math.min(pile.length - 1, (p.x / COL) | 0));
    var add = p.r * 0.9;
    for (var d = -3; d <= 3; d++) {
      var j = i + d;
      if (j >= 0 && j < pile.length && pile[j] < cap) pile[j] = Math.min(cap, pile[j] + add * (1 - Math.abs(d) / 4));
    }
  }

  function settle() {
    for (var i = 1; i < pile.length - 1; i++) {
      var avg = (pile[i - 1] + pile[i + 1]) * 0.5;
      pile[i] += (avg - pile[i]) * 0.04;
    }
  }

  function frame(t) {
    var dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
    last = t;
    ctx.clearRect(0, 0, W, H);
    var i, p;
    if (season === 'winter') {
      settle();
      for (i = 0; i < parts.length; i++) {
        p = parts[i]; p.ph += p.sp * dt; p.y += p.vy * dt; p.x += Math.sin(p.ph) * p.sw * dt;
        var col = Math.max(0, Math.min(pile.length - 1, (p.x / COL) | 0));
        if (p.y > H - pile[col] - 1) { land(p); parts[i] = make(false); continue; }
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        ctx.globalAlpha = 0.7 + p.r / 16; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1; drawPile();
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
    // one picture, nothing moves: what lies on the ground, and a few of what would be falling
    ctx.clearRect(0, 0, W, H);
    var i, p;
    if (season === 'winter') {
      for (i = 0; i < pile.length; i++) pile[i] = Math.min(cap, 14 + 6 * Math.sin(i * 0.17));
      drawPile();
    } else if (season === 'autumn') {
      for (i = 0; i < 40; i++) drawLeaf(rnd(0, W), H - rnd(2, 28), rnd(9, 15), rnd(0, 6.28), LEAF[(Math.random() * LEAF.length) | 0], 0.9);
    }
  }

  resize();
  window.addEventListener('resize', function () { resize(); if (reduce) still(); });
  if (reduce) { still(); return; }
  raf = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
  });
})();
