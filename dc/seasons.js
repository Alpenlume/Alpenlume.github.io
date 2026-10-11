/* The four seasons of the page. The season is read from the visitor's own date (northern hemisphere):
   winter  — snow falls in three depths; a cap of snow settles on the summit of the mountain and a drift slowly
             gathers along the bottom of the window,
   spring  — cherry-blossom petals tumble in three depths and come to rest; a meadow of grass, daisies and tulips
             slowly comes up along the bottom, butterflies cross, a thin morning mist drifts,
   summer  — shafts of light fall from the sun; seeds and pollen rise, butterflies cross by day, fireflies come out
             as the page's own clock turns to dusk; a meadow with poppies, cornflowers and sunflowers grows,
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
  var parts = [], rest = [], glints = [], flies = [], last = 0, raf = 0, now = 0;
  var LEAF = ['#D9822B', '#C4501F', '#E8B23A', '#A63A1B', '#9A7424', '#CF6A2A'];
  var PETAL = ['#FFC9DC', '#FFB0CA', '#FFFFFF', '#F594B8'];
  var TAU = 6.2832;

  // how long this visit has lasted (kept in the tab, so the seasons do not start again on every page)
  var t0 = Date.now();
  try {
    var saved = parseInt(sessionStorage.getItem('alp-snow-t0') || '', 10);
    if (saved > 0 && saved < Date.now()) t0 = saved; else sessionStorage.setItem('alp-snow-t0', String(t0));
  } catch (e) {}
  function secs() { return (Date.now() - t0) / 1000; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function sstep(a, b, x) { var u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); }
  function wind() { return Math.sin(now / 5200) * 12 + Math.sin(now / 2300 + 1.3) * 5; }

  // the page's own clock (the "05:30" in the bar, which turns with the scroll): by day or in the dusk?
  var hrV = 12, hrT = -1e9;
  function hourNow(t) {
    if (t - hrT > 250) {
      hrT = t;
      var el = document.getElementById('clk'), m = el && /(\d{1,2}):(\d{2})/.exec(el.textContent || '');
      if (m) hrV = (+m[1]) + (+m[2]) / 60;
    }
    return hrV;
  }
  function nightness(h) {
    if (h >= 21 || h < 4.5) return 1;
    if (h >= 18) return (h - 18) / 3;
    if (h < 6.5) return 1 - (h - 4.5) / 2;
    return 0;
  }
  function sunPos() {
    var el = document.getElementById('sun');
    if (!el) return null;
    var r = el.getBoundingClientRect();
    if (!r.width) return null;
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    return (x < -3000 || y < -3000) ? null : { x: x, y: y };
  }

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

  // a smooth line through points, so an edge is soft and not a zig-zag of columns
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
  function bloomLevel() { return Math.min(1, 0.3 + 0.7 * (1 - Math.exp(-secs() / 160))); }

  // ───────────────────────── winter ─────────────────────────
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

  // the drift along the bottom: three soft layers, the far one bluish and tall, the near one white and low
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
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); smooth(pts, true); ctx.stroke();
      } else if (k === 0) {
        ctx.strokeStyle = 'rgba(150,176,224,.45)'; ctx.lineWidth = 1; ctx.beginPath(); smooth(pts, true); ctx.stroke();
      }
    }
    for (k = 0; k < 7; k++) {
      var gx = ((k * 0.137 + 0.06) % 1) * W, a = Math.max(0, Math.sin(t / 1100 + k * 2.3)) * 0.85;
      if (a < 0.06) continue;
      var gy = H - driftH(gx, 2, lvl) - 2;
      ctx.globalAlpha = a; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(gx - 5, gy); ctx.lineTo(gx + 5, gy); ctx.moveTo(gx, gy - 5); ctx.lineTo(gx, gy + 5); ctx.stroke();
    }
    ctx.restore();
  }

  // ───────────────────── spring and summer: the meadow ─────────────────────
  var meadow = null, MH = 60;
  var BUT_SPRING = ['#FFF1A8', '#FFFFFF', '#BDD6FF', '#FFD8E6'];
  var BUT_SUMMER = ['#F6A04D', '#F2C14E', '#9CC2FF', '#FFFFFF'];

  function flowerColor(k) {
    if (k === 'tulip') return ['#F58AA8', '#F2B33D', '#E9547A', '#FFD0DD'][(Math.random() * 4) | 0];
    if (k === 'poppy') return '#E4552F';
    if (k === 'corn') return '#6F93EA';
    if (k === 'blossom') return ['#FFC4D8', '#FFE3EC', '#F7A8C4'][(Math.random() * 3) | 0];
    return '#FFFFFF';
  }

  function buildMeadow() {
    var spring = season === 'spring', i;
    MH = clamp(H * 0.085, 38, 92);
    var blades = [], nb = Math.round(clamp(W / 5.5, 90, 260));
    for (i = 0; i < nb; i++) blades.push({ u: Math.random(), h: rnd(0.45, 1), lean: rnd(-0.32, 0.32), ph: rnd(0, TAU), layer: Math.random() < 0.42 ? 0 : 1, born: Math.random() });
    var flowers = [], nf = Math.round(clamp(W / 40, 12, 36)), sunN = 0;
    var kinds = spring ? ['daisy', 'daisy', 'tulip', 'blossom', 'blossom'] : ['poppy', 'poppy', 'corn', 'corn', 'daisy', 'sun'];
    for (i = 0; i < nf; i++) {
      var k = kinds[(Math.random() * kinds.length) | 0];
      if (k === 'sun') { if (sunN >= 4) k = 'poppy'; else sunN++; }
      flowers.push({ u: (i + rnd(0.1, 0.9)) / nf, k: k, h: rnd(0.8, 1.25), ph: rnd(0, TAU), born: Math.random(), c: flowerColor(k) });
    }
    meadow = { blades: blades, flowers: flowers };
  }

  function bloom(f, x, y, s) {
    var r, a, j;
    ctx.globalAlpha = 1;
    if (f.k === 'daisy') {
      r = 5.2 * s; ctx.fillStyle = '#FFFFFF';
      for (j = 0; j < 9; j++) { a = j / 9 * TAU; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, r * 0.62, r * 0.28, a, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#F4C542'; ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, TAU); ctx.fill();
    } else if (f.k === 'blossom') {
      r = 5 * s; ctx.fillStyle = f.c;
      for (j = 0; j < 5; j++) { a = j / 5 * TAU - 1.57; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, r * 0.62, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#F3C24F'; ctx.beginPath(); ctx.arc(x, y, r * 0.36, 0, TAU); ctx.fill();
    } else if (f.k === 'tulip') {
      r = 6 * s; ctx.fillStyle = f.c;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x - r * 1.0, y - r * 0.2, x - r * 0.8, y - r * 1.5); ctx.lineTo(x - r * 0.35, y - r * 1.05); ctx.lineTo(x, y - r * 1.7);
      ctx.lineTo(x + r * 0.35, y - r * 1.05); ctx.lineTo(x + r * 0.8, y - r * 1.5); ctx.quadraticCurveTo(x + r * 1.0, y - r * 0.2, x, y);
      ctx.closePath(); ctx.fill();
    } else if (f.k === 'poppy') {
      r = 6.5 * s; ctx.fillStyle = f.c;
      for (j = 0; j < 4; j++) { a = j / 4 * TAU + 0.4; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.85, r * 0.7, a, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#2B1A12'; ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, TAU); ctx.fill();
    } else if (f.k === 'corn') {
      r = 6 * s; ctx.fillStyle = f.c;
      for (j = 0; j < 9; j++) { a = j / 9 * TAU; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, r * 0.55, r * 0.16, a, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#3C4FA0'; ctx.beginPath(); ctx.arc(x, y, r * 0.28, 0, TAU); ctx.fill();
    } else {                                           // a sunflower
      r = 13 * s; ctx.fillStyle = '#F2C14E';
      for (j = 0; j < 14; j++) { a = j / 14 * TAU; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92, r * 0.5, r * 0.18, a, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#6B4423'; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#8A5A2B'; ctx.beginPath(); ctx.arc(x - r * 0.1, y - r * 0.1, r * 0.34, 0, TAU); ctx.fill();
    }
  }

  function drawMeadow(t, wd, g) {
    if (!meadow) return;
    var spring = season === 'spring', i, b, x, sw, grown, hgt, layer;
    var cols = spring ? ['rgba(96,160,104,.80)', 'rgba(150,200,130,.92)'] : ['rgba(70,128,78,.86)', 'rgba(118,170,92,.94)'];
    ctx.save(); ctx.lineCap = 'round'; ctx.globalAlpha = 1;
    for (layer = 0; layer < 2; layer++) {
      ctx.strokeStyle = cols[layer]; ctx.lineWidth = layer ? 2.2 : 2.8;
      ctx.beginPath();
      for (i = 0; i < meadow.blades.length; i++) {
        b = meadow.blades[i];
        if (b.layer !== layer) continue;
        grown = sstep(b.born * 0.6, b.born * 0.6 + 0.35, g);
        if (grown <= 0.01) continue;
        hgt = MH * b.h * grown * (spring ? 0.75 : 1.0) * (layer ? 0.8 : 1.15);
        x = b.u * W;
        sw = Math.sin(t / 1250 + b.ph + b.u * 6) * 3.2 + wd * 0.22;
        ctx.moveTo(x, H + 2);
        ctx.quadraticCurveTo(x + b.lean * hgt * 0.35 + sw * 0.3, H - hgt * 0.55, x + b.lean * hgt + sw, H - hgt);
      }
      ctx.stroke();
    }
    for (i = 0; i < meadow.flowers.length; i++) {
      var f = meadow.flowers[i];
      grown = sstep(f.born * 0.8, f.born * 0.8 + 0.3, g);
      if (grown <= 0.02) continue;
      var tall = f.k === 'sun' ? 1.9 : (spring ? 1.15 : 1.45), fh = MH * f.h * tall * grown;
      x = f.u * W; sw = Math.sin(t / 1500 + f.ph + f.u * 4) * 4 + wd * 0.3;
      var hx = x + sw, hy = H - fh;
      ctx.strokeStyle = spring ? 'rgba(104,170,110,.96)' : 'rgba(78,138,86,.96)'; ctx.lineWidth = f.k === 'sun' ? 3.2 : 1.8;
      ctx.beginPath(); ctx.moveTo(x, H + 2); ctx.quadraticCurveTo(x + sw * 0.2, H - fh * 0.55, hx, hy); ctx.stroke();
      bloom(f, hx, hy, grown);
    }
    ctx.restore();
  }

  // butterflies: two pairs of wings that flap, a body, a slow wandering flight
  function makeFly() {
    var pal = season === 'spring' ? BUT_SPRING : BUT_SUMMER;
    return { x: rnd(0, W), y: rnd(H * 0.3, H * 0.8), dir: Math.random() < 0.5 ? -1 : 1, sp: rnd(18, 34), ph: rnd(0, TAU), fl: rnd(0, TAU), s: rnd(8, 12), c: pal[(Math.random() * pal.length) | 0] };
  }
  function drawFly(f, dt, vis) {
    f.ph += dt * 1.1; f.fl += dt * (15 + Math.sin(f.ph * 2) * 4);
    f.x += (f.dir * f.sp + Math.sin(f.ph * 1.7) * 14) * dt;
    f.y += Math.sin(f.ph * 2.3) * 30 * dt + (H * 0.55 - f.y) * 0.05 * dt;
    if (f.x < -30) f.x = W + 30; else if (f.x > W + 30) f.x = -30;
    if (vis < 0.03) return;
    var flap = 0.25 + 0.75 * Math.abs(Math.sin(f.fl)), s = f.s;
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.dir * 0.25 + Math.sin(f.ph * 1.7) * 0.2); ctx.fillStyle = f.c;
    ctx.globalAlpha = 0.92 * vis;
    ctx.beginPath(); ctx.ellipse(-s * 0.5 * flap, -s * 0.28, s * 0.62 * flap, s * 0.85, -0.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.5 * flap, -s * 0.28, s * 0.62 * flap, s * 0.85, 0.5, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.8 * vis;
    ctx.beginPath(); ctx.ellipse(-s * 0.4 * flap, s * 0.5, s * 0.42 * flap, s * 0.55, 0.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.4 * flap, s * 0.5, s * 0.42 * flap, s * 0.55, -0.4, 0, TAU); ctx.fill();
    ctx.globalAlpha = vis; ctx.fillStyle = 'rgba(40,28,20,.85)'; ctx.fillRect(-0.7, -s * 0.8, 1.4, s * 1.7);
    ctx.restore();
  }

  // a cherry-blossom petal: heart-shaped, with the small notch at its tip
  function cherry(x, y, r, rot, c, a, flip) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, flip); ctx.globalAlpha = a; ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.95);
    ctx.bezierCurveTo(r * 1.15, r * 0.25, r * 0.8, -r * 1.05, r * 0.14, -r * 0.9);
    ctx.lineTo(0, -r * 0.62); ctx.lineTo(-r * 0.14, -r * 0.9);
    ctx.bezierCurveTo(-r * 0.8, -r * 1.05, -r * 1.15, r * 0.25, 0, r * 0.95);
    ctx.fill();
    if (r > 4.5) { ctx.strokeStyle = 'rgba(214,104,146,.38)'; ctx.lineWidth = 0.8; ctx.stroke(); }   // an edge, so a petal reads on a pale sky
    ctx.restore();
  }

  // a thin morning mist lying in the valley, drifting slowly
  function drawMist(t) {
    for (var k = 0; k < 3; k++) {
      var w = W * (0.55 + k * 0.12), x = ((t * 0.006 * (1 + k * 0.4) + k * W * 0.4) % (W * 1.5)) - W * 0.25;
      var y = H - 26 - k * 16;
      ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.1 + k * 0.02);
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.5);
      g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, w * 0.5, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  // shafts of warm light falling from the sun, behind everything
  function drawShafts(t, day) {
    var s = sunPos();
    if (!s || day < 0.05) return;
    var L = Math.max(W, H) * 1.5, k, ang, hw, al, g;
    for (k = 0; k < 7; k++) {
      ang = 0.35 + k * 0.42 + Math.sin(t / 7000 + k * 1.3) * 0.05;
      hw = 0.05 + 0.03 * Math.sin(k * 2.1 + 0.5);
      al = (0.1 + 0.05 * Math.sin(t / 3000 + k * 1.7)) * day;
      g = ctx.createLinearGradient(s.x, s.y, s.x + Math.cos(ang) * L * 0.8, s.y + Math.sin(ang) * L * 0.8);
      g.addColorStop(0, 'rgba(255,226,160,' + al + ')'); g.addColorStop(1, 'rgba(255,226,160,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + Math.cos(ang - hw) * L, s.y + Math.sin(ang - hw) * L);
      ctx.lineTo(s.x + Math.cos(ang + hw) * L, s.y + Math.sin(ang + hw) * L);
      ctx.closePath(); ctx.fill();
    }
  }

  // a dandelion seed: a small tuft of hairs on a thread
  function seed(x, y, r, rot, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (var j = 0; j < 9; j++) { var an = j / 9 * TAU; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
    ctx.moveTo(0, 0); ctx.lineTo(0, r * 1.9);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(0, 0, 1.1, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(90,70,50,.8)'; ctx.beginPath(); ctx.arc(0, r * 1.9, 0.9, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ───────────────────────── the particles ─────────────────────────
  function make(initial) {
    var p = { x: rnd(0, W), y: initial ? rnd(-20, H) : rnd(-50, -4), ph: rnd(0, TAU), rot: rnd(0, TAU), vr: rnd(-1.4, 1.4), fl: rnd(0, TAU), vf: rnd(1.5, 4) }, q;
    if (season === 'winter') {
      q = Math.random();
      if (q < 0.5) { p.z = 0; p.r = rnd(1, 2.1); p.vy = rnd(15, 30); p.a = rnd(0.35, 0.6); p.sw = rnd(6, 14); }
      else if (q < 0.86) { p.z = 1; p.r = rnd(2.1, 3.7); p.vy = rnd(28, 50); p.a = rnd(0.6, 0.85); p.sw = rnd(10, 22); }
      else { p.z = 2; p.r = rnd(5, 8.5); p.vy = rnd(60, 96); p.a = rnd(0.18, 0.32); p.sw = rnd(16, 32); }
      p.sp = rnd(0.5, 1.3);
    } else if (season === 'autumn') {
      p.r = rnd(8, 15); p.vy = rnd(26, 54); p.sw = rnd(24, 56); p.sp = rnd(0.5, 1.1); p.c = LEAF[(Math.random() * LEAF.length) | 0]; p.k = (Math.random() * 3) | 0;
    } else if (season === 'spring') {
      q = Math.random();
      if (q < 0.4) { p.z = 0; p.r = rnd(3, 4.6); p.vy = rnd(16, 28); p.a = rnd(0.5, 0.7); p.sw = rnd(10, 22); }
      else if (q < 0.82) { p.z = 1; p.r = rnd(6, 9); p.vy = rnd(24, 42); p.a = rnd(0.88, 0.97); p.sw = rnd(18, 36); }
      else { p.z = 2; p.r = rnd(10, 15); p.vy = rnd(50, 80); p.a = rnd(0.26, 0.4); p.sw = rnd(24, 44); }
      p.sp = rnd(0.5, 1.2); p.vx = rnd(6, 26); p.c = PETAL[(Math.random() * PETAL.length) | 0];
    } else {
      q = Math.random();
      p.z = q < 0.45 ? 0 : q < 0.75 ? 1 : 2;       // 0 = a mote of pollen, 1 = a firefly, 2 = a dandelion seed
      p.y = initial ? rnd(0, H) : rnd(H * 0.5, H + 10);
      if (p.z === 0) { p.r = rnd(0.9, 1.8); p.vy = -rnd(5, 17); p.sw = rnd(10, 30); }
      else if (p.z === 1) { p.r = rnd(2, 3.2); p.vy = 0; p.sw = 0; }
      else { p.r = rnd(5, 8); p.vy = -rnd(4, 11); p.sw = rnd(10, 22); }
      p.sp = rnd(0.25, 0.8); p.tw = rnd(0.7, 2);
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
    var n = season === 'summer' ? clamp(Math.round(W * H / 22000), 18, 48)
          : season === 'spring' ? clamp(Math.round(W * H / 21000), 20, 66)
          : clamp(Math.round(W * H / 16000), 24, 100), i, k;
    parts = [];
    for (i = 0; i < n; i++) parts.push(make(true));
    SK = W / LW; sky = null; lastRead = -1e9; summit.ok = false;
    capGround = Math.max(38, Math.min(100, H * 0.09)); extra = 0;
    rest = []; glints = []; flies = []; meadow = null;
    if (season === 'autumn' || season === 'spring') {
      var m = Math.min(season === 'spring' ? 40 : 70, Math.round(secs() / 8) + 8);
      for (k = 0; k < m; k++) rest.push(restOne());
    }
    if (season === 'spring' || season === 'summer') {
      buildMeadow();
      var nfl = season === 'spring' ? 3 : 4;
      for (k = 0; k < nfl; k++) flies.push(makeFly());
    }
  }

  // — leaves (autumn) —
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
      var pg = glow('petal', 255, 205, 222, 0.35), pb = glow('petalbig', 255, 186, 210, 0.55), g = bloomLevel();
      drawMist(t);
      drawMeadow(t, wd, g);
      for (i = 0; i < rest.length; i++) cherry(rest[i].x, rest[i].y, rest[i].r, rest[i].rot, rest[i].c, rest[i].a * 0.85, 0.5);
      for (i = 0; i < flies.length; i++) drawFly(flies[i], dt, 1);
      for (i = 0; i < parts.length; i++) {
        p = parts[i]; p.ph += p.sp * dt; p.rot += p.vr * dt * 0.7; p.fl += p.vf * dt; p.y += p.vy * dt;
        p.x += p.vx * dt + (Math.sin(p.ph) * p.sw * 0.5 + wd * (0.6 + p.z * 0.3)) * dt;
        if (p.y > H - rnd(2, 20)) {
          if (p.z === 1) {
            rest.push({ x: p.x, y: Math.min(H - 2, p.y), r: p.r * 0.7, rot: p.rot, c: p.c, a: rnd(0.55, 0.85) });
            if (rest.length > 50) rest.shift();
          }
          parts[i] = make(false); parts[i].x = rnd(-60, W); continue;
        }
        if (p.x > W + 24) { parts[i] = make(false); parts[i].x = rnd(-80, W * 0.6); continue; }
        if (p.z === 2) { stamp(pb, p.x, p.y, p.r * 1.7, p.a); continue; }          // near: a soft pink bokeh
        if (p.z === 1) stamp(pg, p.x, p.y, p.r * 2.4, 0.3);
        cherry(p.x, p.y, p.r, p.rot, p.c, p.a, Math.cos(p.fl) * 0.8 + 0.2);
      }
    } else if (season === 'summer') {
      var h = hourNow(t), ni = nightness(h), day = 1 - ni, g2 = bloomLevel();
      var fg = glow('fly', 255, 222, 128, 0.45), pl = glow('pollen', 255, 240, 200, 0.5);
      drawShafts(t, day);
      drawMeadow(t, wd, g2);
      for (i = 0; i < flies.length; i++) drawFly(flies[i], dt, day);
      for (i = 0; i < parts.length; i++) {
        p = parts[i]; p.ph += p.sp * dt;
        if (p.z === 1) {                                 // a firefly wanders, and shows only in the dusk
          p.x += (Math.sin(p.ph * 0.9 + p.rot) * 22 + wd * 0.2) * dt; p.y += Math.cos(p.ph * 0.7 + p.rot) * 16 * dt;
          if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
          if (p.y < H * 0.25) p.y += 30 * dt; else if (p.y > H - 8) p.y -= 30 * dt;
          if (ni > 0.03) stamp(fg, p.x, p.y, p.r * 6.5, (0.25 + 0.7 * Math.pow(0.5 + 0.5 * Math.sin(p.ph * p.tw * 3), 2)) * ni);
          continue;
        }
        p.y += p.vy * dt; p.x += (Math.sin(p.ph) * p.sw + wd * 0.5) * dt;
        if (p.y < -14) { parts[i] = make(false); continue; }
        if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
        if (day < 0.03) continue;
        if (p.z === 2) { p.rot += p.vr * 0.15 * dt; seed(p.x, p.y, p.r, p.rot, 0.8 * day); }
        else stamp(pl, p.x, p.y, p.r * 3, (0.3 + 0.5 * Math.abs(Math.sin(p.ph * p.tw * 2))) * 0.8 * day);
      }
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }

  function still() {
    // one picture, nothing moves
    ctx.clearRect(0, 0, W, H);
    var i, r;
    if (season === 'winter') {
      readSky(0); drawCap(0, 0.8); drawDrift(0, 0.7);
    } else if (season === 'autumn') {
      for (i = 0; i < 40; i++) { r = restOne(); leaf(r.x, r.y, r.r, r.rot, r.c, r.a, r.k, 0.8); }
    } else if (season === 'spring') {
      drawMeadow(0, 0, 0.85);
      for (i = 0; i < 26; i++) { r = restOne(); cherry(r.x, r.y, r.r, r.rot, r.c, r.a, 0.5); }
    } else {
      drawShafts(0, 0.8); drawMeadow(0, 0, 0.85);
    }
    ctx.globalAlpha = 1;
  }

  resize();
  window.addEventListener('resize', function () { resize(); if (reduce) still(); });
  if (reduce) {
    // the mountains and the sun are drawn a moment after load; look again a little later
    setTimeout(still, 600); setTimeout(still, 1800);
    return;
  }
  raf = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
  });
})();
