/* QG — animation de démarrage : des lignes de code tombent et s'empilent en triangle inversé, puis « QG » apparaît */
'use strict';
(function () {
  const box = document.getElementById('splash'); if (!box) return;
  const cv = document.createElement('canvas'); box.appendChild(cv);
  const g = cv.getContext('2d');
  let W = 0, H = 0;
  function size() { const d = window.devicePixelRatio || 1; W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; cv.style.width = W + 'px'; cv.style.height = H + 'px'; g.setTransform(d, 0, 0, d, 0, 0); }
  size(); addEventListener('resize', size);

  const SNIP = ['const qg = boot(base);', 'gps.fix() && locate();', 'await meteo(ici, cible);', 'link.status = "OK";', 'for (const t of topics) pin(t);', 'fpv.preflight(); // GO',
    'sync(cac40, etf, world);', 'globe.render(news);', 'if (gust > 35) nogo();', 'drone.rth = true;', 'mission.prepare();', 'sea.check(houle, eau);', 'mail.fetch(unread);',
    'kp < 5 ? gnss_ok : warn;', 'base -> terrain;', 'return ready;'];
  const FONT = 13, LH = 16, N = 24;
  const STEP = 62, FALL = 420, T_STACK = (N - 1) * STEP + FALL, T_TRI = T_STACK + 260, T_TXT = T_TRI + 320, T_HOLD = T_TXT + 900, T_END = T_HOLD + 450;
  const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  let rows = null, cw = 7.8, top = 0, maxW = 0;

  function layout() {
    g.font = `${FONT}px "Cascadia Mono", Consolas, monospace`; cw = g.measureText('M').width || 7.8;
    maxW = Math.min(W * 0.46, 640); top = Math.max(40, (H - N * LH) / 2 - 20);
    rows = [];
    let s = '', k = 0;
    for (let r = 0; r < N; r++) {
      const wpx = Math.max(cw, maxW * (1 - r / (N - 1)) + cw * 0.5), n = Math.max(1, Math.round(wpx / cw));
      while (s.length < n + 2) s += SNIP[(k++) % SNIP.length] + ' ';
      rows.push({ r, n, text: s.slice(0, n), y: top + r * LH, order: N - 1 - r }); // la pointe tombe en premier
      s = s.slice(n);
    }
  }
  layout(); addEventListener('resize', layout);

  // pluie de code en fond
  const rain = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), v: 0.15 + Math.random() * 0.35, t: SNIP[Math.floor(Math.random() * SNIP.length)] }));
  let t0 = performance.now(), done = false, leaving = 0;

  function frame(now) {
    if (done) return;
    const t = now - t0;
    g.fillStyle = '#05060a'; g.fillRect(0, 0, W, H);
    g.font = `${FONT}px "Cascadia Mono", Consolas, monospace`; g.textBaseline = 'top';
    // fond
    g.textAlign = 'left'; g.fillStyle = 'rgba(228,168,58,0.06)';
    for (const d of rain) { d.y += d.v / 400; if (d.y > 1.05) { d.y = -0.05; d.x = Math.random(); } g.fillText(d.t, d.x * W, d.y * H); }
    // empilement
    g.textAlign = 'center';
    const cx = W / 2;
    for (const row of rows) {
      const p = ease((t - row.order * STEP) / FALL); if (p <= 0) continue;
      const y = -LH + (row.y + LH) * p, landed = p >= 1;
      g.fillStyle = landed ? `rgba(228,168,58,${t > T_TXT ? 0.32 : 0.62})` : '#ffd27a';
      g.fillText(row.text, cx, y);
    }
    // contour du triangle
    if (t > T_STACK) {
      const q = ease((t - T_STACK) / (T_TRI - T_STACK)), yb = top + N * LH;
      g.strokeStyle = `rgba(228,168,58,${0.9 * q})`; g.lineWidth = 2;
      g.beginPath(); g.moveTo(cx - maxW / 2 - 10, top - 8); g.lineTo(cx + maxW / 2 + 10, top - 8); g.lineTo(cx, yb + 10); g.closePath(); g.stroke();
    }
    // QG
    if (t > T_TRI) {
      const q = ease((t - T_TRI) / (T_TXT - T_TRI)), fs = Math.round(Math.min(150, maxW * 0.28));
      g.font = `bold ${fs}px "Cascadia Mono", Consolas, monospace`; g.textBaseline = 'middle';
      const y = top + N * LH * 0.36;
      g.globalAlpha = q; g.lineWidth = 10; g.strokeStyle = '#05060a'; g.strokeText('QG', cx, y);
      g.shadowColor = 'rgba(228,168,58,0.8)'; g.shadowBlur = 24; g.fillStyle = '#ffcf6b'; g.fillText('QG', cx, y); g.shadowBlur = 0;
      g.font = `${FONT}px "Cascadia Mono", Consolas, monospace`; g.fillStyle = 'rgba(216,212,200,0.75)';
      g.fillText('// BASE OPÉRATIONNELLE', cx, top + N * LH + 34); g.globalAlpha = 1;
    }
    // fin : on attend un clic ou une touche
    if (t > T_HOLD) {
      const a = 0.62 + 0.36 * Math.sin((t - T_HOLD) / 260);
      g.globalAlpha = a; g.font = `${FONT}px "Cascadia Mono", Consolas, monospace`; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillStyle = '#e4a83a';
      g.fillText('[ CLIQUE OU APPUIE SUR UNE TOUCHE POUR ENTRER ]', W / 2, Math.min(H - 30, top + N * LH + 74)); g.globalAlpha = 1;
    }
    if (leaving) { const q = (now - leaving) / 380; box.style.opacity = String(Math.max(0, 1 - q)); if (q >= 1) return finish(); }
    requestAnimationFrame(frame);
  }
  function finish() { if (done) return; done = true; box.remove(); removeEventListener('keydown', onKey, true); document.dispatchEvent(new Event('qg-entered')); }
  // pendant l'animation : une action la termine ; ensuite : une action fait entrer
  const act = () => { const t = performance.now() - t0; if (t < T_HOLD) t0 = performance.now() - T_HOLD; else if (!leaving) leaving = performance.now(); };
  const onKey = (e) => { e.preventDefault(); e.stopImmediatePropagation(); act(); };
  box.addEventListener('click', act); addEventListener('keydown', onKey, true);
  requestAnimationFrame(frame);
})();
