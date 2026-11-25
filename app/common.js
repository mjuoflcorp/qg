/* QG — outils partagés par les onglets SPORT / DRONES / PERSO */
'use strict';
window.QGViews = window.QGViews || {};

const mmss = (s) => { if (s == null || isNaN(s)) return '--'; s = Math.round(s); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
function parseDur(txt) {
  // "8:35" -> 515 s ; "1:02:10" -> 3730 s ; "45" -> 45 min
  const t = String(txt || '').trim(); if (!t) return null;
  const p = t.split(':').map(Number); if (p.some(isNaN)) return null;
  if (p.length === 1) return p[0] * 60;
  if (p.length === 2) return p[0] * 60 + p[1];
  return p[0] * 3600 + p[1] * 60 + p[2];
}
const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const errMsg = (e) => String((e && e.message) || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/* météo horaire (vol + mer), partagée, cache 30 min */
// Kp max prévu dans les prochaines heures (NOAA SWPC)
/* météo détaillée (vol, mer, 7 jours) pour un point, cache 20 min par position */
const fwxCache = {}, fwxPending = {};
async function getFlightWx(force, loc) {
  loc = loc || S.data.settings.location;
  const k = (+loc.lat).toFixed(2) + ',' + (+loc.lon).toFixed(2), c = fwxCache[k];
  if (!force && c && Date.now() - new Date(c.at).getTime() < 20 * 60e3) return c;
  if (fwxPending[k]) return fwxPending[k];
  fwxPending[k] = window.qg.flightWx(loc.lat, loc.lon).then(r => { fwxCache[k] = r; return r; }).finally(() => { delete fwxPending[k]; });
  return fwxPending[k];
}
function kpAt(kp, date) {
  if (!Array.isArray(kp)) return null;
  let best = null;
  for (const row of kp.slice(1)) {
    const t = new Date(String(row[0]).replace(' ', 'T') + 'Z');
    if (isNaN(t)) continue;
    if (t <= date && date - t < 3 * 3600e3) best = Number(row[1]);
  }
  return best;
}
function kpMaxNext(kp, hours) {
  if (!Array.isArray(kp)) return null;
  const now = Date.now(); let m = null;
  for (const row of kp.slice(1)) { const t = new Date(String(row[0]).replace(' ', 'T') + 'Z').getTime(); if (t >= now - 3 * 3600e3 && t <= now + hours * 3600e3) m = Math.max(m || 0, Number(row[1])); }
  return m;
}

/* graphique ligne simple sur canvas */
function lineChart(canvas, pts, opts = {}) {
  const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
  canvas.width = w * devicePixelRatio; canvas.height = h * devicePixelRatio;
  const g = canvas.getContext('2d'); g.scale(devicePixelRatio, devicePixelRatio);
  g.font = '11px "Cascadia Mono", Consolas, monospace';
  const L = 46, R = 8, T = 8, B = 18;
  g.fillStyle = '#666359';
  if (pts.length < 1) { g.fillText('Pas encore de données', L, h / 2); return; }
  const xs = pts.map(p => +p.x), ys = pts.map(p => p.y).concat(opts.target != null ? [opts.target] : []);
  let x0 = Math.min(...xs), x1 = Math.max(...xs); if (x0 === x1) { x0 -= 864e5; x1 += 864e5; }
  let y0 = Math.min(...ys), y1 = Math.max(...ys); const pad_ = (y1 - y0) * 0.15 || Math.abs(y1) * 0.1 || 1; y0 -= pad_; y1 += pad_;
  const X = (x) => L + (x - x0) / (x1 - x0) * (w - L - R);
  const Y = (y) => opts.invert ? T + (y - y0) / (y1 - y0) * (h - T - B) : h - B - (y - y0) / (y1 - y0) * (h - T - B);
  g.strokeStyle = '#1d2128'; g.lineWidth = 1;
  for (let i = 0; i <= 3; i++) { const y = y0 + (y1 - y0) * i / 3, py = Y(y); g.beginPath(); g.moveTo(L, py); g.lineTo(w - R, py); g.stroke(); g.fillText((opts.yFmt || String)(y), 2, py + 4); }
  const xf = opts.xFmt || ((x) => fmtDate(new Date(x).toISOString(), false).slice(0, 5));
  if (!opts.noX) g.fillText(xf(x0), L, h - 4);
  const lbl = opts.noX ? '' : xf(x1); g.fillText(lbl, w - R - g.measureText(lbl).width, h - 4);
  if (opts.target != null) { g.strokeStyle = '#6cc47f'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(L, Y(opts.target)); g.lineTo(w - R, Y(opts.target)); g.stroke(); g.setLineDash([]); g.fillStyle = '#6cc47f'; g.fillText(opts.targetLabel || 'OBJ', w - R - g.measureText(opts.targetLabel || 'OBJ').width - 2, Y(opts.target) - 4); }
  g.strokeStyle = opts.color || '#e4a83a'; g.lineWidth = 1.6; g.beginPath();
  pts.forEach((p, i) => { const x = X(+p.x), y = Y(p.y); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
  if (!opts.noDots) { g.fillStyle = opts.color || '#e4a83a'; pts.forEach(p => { g.fillRect(X(+p.x) - 2, Y(p.y) - 2, 4, 4); }); }
}

/* champ de formulaire étiqueté */
const field = (label, input) => el('label', {}, label, input);
function confirmBtn(text, onOk, cls = 'btn small') {
  let armed = false; const b = el('button', { class: cls, text });
  b.onclick = () => { if (!armed) { armed = true; b.textContent = 'CONFIRMER ?'; b.style.color = 'var(--bad)'; setTimeout(() => { armed = false; b.textContent = text; b.style.color = ''; }, 3500); return; } onOk(); };
  return b;
}
