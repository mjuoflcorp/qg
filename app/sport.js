/* QG 1.0 — onglet SPORT : séances, objectifs personnalisés, progression */
'use strict';
(function () {
  const TYPES = { course: 'COURSE', marche: 'MARCHE / RANDO', velo: 'VÉLO', natation: 'NATATION', muscu: 'MUSCU / CIRCUIT', autre: 'AUTRE' };
  const DIST = ['course', 'marche', 'velo', 'natation', 'autre'];
  const T = () => S.data.training;
  let built = false;

  function build() {
    const v = $('#v-sport');
    v.replaceChildren(
      el('div', { class: 'col' },
        el('div', { class: 'panel' }, el('div', { class: 'ph' }, '[ OBJECTIFS ]', el('span', { class: 'ph-r', id: 'sp-week' })), el('div', { class: 'pb', id: 'sp-goals' })),
        el('div', { class: 'panel grow' }, el('div', { class: 'ph', text: '[ NOUVELLE SÉANCE ]' }), el('div', { class: 'pb scroll form', id: 'sp-form' }))),
      el('div', { class: 'panel' }, el('div', { class: 'ph', text: '[ PROGRESSION ]' }), el('div', { class: 'pb scroll', id: 'sp-charts' })),
      el('div', { class: 'panel' }, el('div', { class: 'ph' }, '[ HISTORIQUE ]', el('span', { class: 'ph-r', id: 'sp-count' })), el('div', { class: 'pb scroll', id: 'sp-hist' })));
    buildForm();
    built = true;
  }

  /* ---------- formulaire ---------- */
  function buildForm() {
    const box = $('#sp-form');
    const type = el('select', {}, ...Object.entries(TYPES).map(([k, v]) => el('option', { value: k, text: v })));
    const date = el('input', { type: 'date', value: todayLocal() });
    const dist = el('input', { placeholder: 'mètres' });
    const dur = el('input', { placeholder: 'mm:ss ou h:mm:ss' });
    const load = el('input', { placeholder: 'kg' });
    const notes = el('textarea', { rows: 3, placeholder: 'Ressenti, conditions, séries…' });
    const msg = el('span', { class: 'dim' });
    const rows = {
      dist: field('DISTANCE (m)', dist), dur: field('DURÉE', dur), load: field('CHARGE (kg)', load)
    };
    const show = () => {
      const k = type.value;
      rows.dist.style.display = DIST.includes(k) ? '' : 'none';
      rows.load.style.display = k === 'marche' ? '' : 'none';
    };
    type.onchange = show;
    const add = el('button', { class: 'btn amber', text: '+ ENREGISTRER LA SÉANCE', onclick: () => {
      const s = { id: uid(), date: new Date(date.value + 'T12:00:00').toISOString(), type: type.value, notes: notes.value.trim() };
      const d = parseFloat(dist.value); if (rows.dist.style.display !== 'none' && d) s.distance = d;
      const t = parseDur(dur.value); if (rows.dur.style.display !== 'none' && t) s.duration = t;
      const l = parseFloat(load.value); if (type.value === 'marche' && l) s.load = l;
      if (!s.duration && !s.distance && !s.notes) { msg.textContent = 'INDIQUE AU MOINS UNE DURÉE'; return; }
      T().sessions.push(s); save();
      dist.value = dur.value = load.value = notes.value = ''; msg.textContent = 'ENREGISTRÉ ✓'; setTimeout(() => msg.textContent = '', 2500);
      render();
    } });
    box.replaceChildren(el('div', { class: 'row3', style: 'grid-template-columns:1fr 1fr' }, field('TYPE', type), field('DATE', date)),
      rows.dist, rows.dur, rows.load, field('NOTES', notes), el('div', { class: 'row' }, add, msg));
    show();
  }

  /* ---------- objectifs (personnalisables) ---------- */
  const eq = (s, ref) => s.distance && s.duration ? s.duration * ref / s.distance : null;
  const G = () => T().goals;
  function goalSeries(g) {
    return T().sessions.filter(s => s.type === g.type && s.distance >= g.distance * 0.6 && s.distance <= g.distance * 1.6 && s.duration && (!g.load || (s.load || 0) >= g.load - 1))
      .map(s => ({ x: new Date(s.date), y: eq(s, g.distance) })).sort((a, b) => a.x - b.x);
  }
  const dname = (m) => m >= 1000 ? (m / 1000).toString().replace('.', ',') + ' km' : m + ' m';
  function goalCard(g) {
    const pts = goalSeries(g);
    const best = pts.length ? Math.min(...pts.map(p => p.y)) : null, last = pts.length ? pts[pts.length - 1].y : null;
    const gap = best != null ? best - g.target : null;
    const tIn = el('input', { value: mmss(g.target), style: 'width:70px;display:inline-block;margin:0 0 0 6px;padding:1px 4px' });
    tIn.onchange = () => { const v = parseDur(tIn.value); if (v) { g.target = v; save(); render(); } };
    return el('div', { class: 'goal' },
      el('div', { class: 'gt' }, el('span', { text: `${g.name} · ${TYPES[g.type] || ''} ${dname(g.distance)}${g.load ? ' · ' + g.load + ' kg' : ''}` }), el('span', { class: 'dim' }, 'OBJ', tIn, confirmBtn('×', () => { T().goals = G().filter(x => x.id !== g.id); save(); render(); }, 'rm'))),
      el('div', { class: 'bigs', style: 'grid-template-columns:repeat(3,1fr);margin:6px 0 0' },
        el('div', {}, el('div', { class: 'k', text: 'MEILLEUR' }), el('div', { class: 'v', text: mmss(best) })),
        el('div', {}, el('div', { class: 'k', text: 'DERNIER' }), el('div', { class: 'v', text: mmss(last) })),
        el('div', {}, el('div', { class: 'k', text: 'ÉCART' }), el('div', { class: 'v ' + (gap == null ? '' : gap <= 0 ? 'good' : gap < 30 ? 'mid' : 'badc'), text: gap == null ? '--' : (gap <= 0 ? '✓ ' : '+') + mmss(Math.abs(gap)) }))));
  }
  function renderGoals() {
    const wk = T().sessions.filter(s => Date.now() - new Date(s.date) < 7 * 864e5).length;
    $('#sp-week').textContent = wk + ' SÉANCE(S) / 7 J';
    const nm = el('input', { placeholder: 'Nom (ex : Test Cooper, 10 km…)' }), ty = el('select', {}, ...['course', 'marche', 'velo', 'natation'].map(k => el('option', { value: k, text: TYPES[k] })));
    const di = el('input', { placeholder: 'm' }), ti = el('input', { placeholder: 'mm:ss' }), lo = el('input', { placeholder: 'kg (marche)' });
    $('#sp-goals').replaceChildren(
      ...G().map(goalCard),
      G().length ? null : el('div', { class: 'dim', style: 'margin-bottom:10px', text: 'Aucun objectif : ajoute-en un ci-dessous.' }),
      el('details', {}, el('summary', { class: 'lnk', text: '+ AJOUTER UN OBJECTIF' }),
        el('div', { class: 'form', style: 'margin-top:8px' }, field('NOM', nm), el('div', { class: 'row3' }, field('TYPE', ty), field('DISTANCE (m)', di), field('TEMPS VISÉ', ti)), field('CHARGE (optionnel)', lo),
          el('button', { class: 'btn', text: 'AJOUTER', onclick: () => { const d = parseFloat(di.value), t = parseDur(ti.value); if (!d || !t) return; G().push({ id: uid(), name: nm.value.trim() || TYPES[ty.value], type: ty.value, distance: d, target: t, load: parseFloat(lo.value) || 0 }); save(); render(); } }))),
      el('div', { class: 'note', text: 'Les séances proches de la distance visée sont ramenées à l’équivalent (même allure).' }));
  }
  function renderCharts() {
    const box = $('#sp-charts');
    const chart = (title, pts, opts) => { const c = el('canvas', { style: 'width:100%;height:150px;display:block' }); box.append(el('div', { class: 'sect', text: title }), c); requestAnimationFrame(() => lineChart(c, pts, opts)); };
    box.replaceChildren();
    for (const g of G()) chart(`${g.name.toUpperCase()} — ÉQUIVALENT ${dname(g.distance).toUpperCase()}`, goalSeries(g), { target: g.target, yFmt: mmss, invert: true });
    const run = T().sessions.filter(s => s.type === 'course' && s.distance && s.duration).map(s => ({ x: new Date(s.date), y: s.duration * 1000 / s.distance })).sort((a, b) => a.x - b.x);
    if (run.length > 1) chart('COURSE — ALLURE (min/km)', run, { yFmt: mmss, invert: true, color: '#e4a83a' });
    const swim = T().sessions.filter(s => s.type === 'natation' && s.distance && s.duration).map(s => ({ x: new Date(s.date), y: s.duration * 100 / s.distance })).sort((a, b) => a.x - b.x);
    if (swim.length > 1) chart('NATATION — TEMPS AU 100 m', swim, { yFmt: mmss, invert: true, color: '#4fa8ff' });
    const wk = []; for (let i = 7; i >= 0; i--) { const end = Date.now() - i * 7 * 864e5; wk.push({ x: new Date(end), y: T().sessions.filter(s => { const t = +new Date(s.date); return t <= end && t > end - 7 * 864e5; }).length }); }
    if (T().sessions.length) chart('SÉANCES PAR SEMAINE (8 SEMAINES)', wk, { yFmt: (v) => String(Math.round(v)), color: '#7fd18b' });
    if (!box.children.length) box.append(el('div', { class: 'empty', text: 'AJOUTE UN OBJECTIF OU DES SÉANCES POUR VOIR TA PROGRESSION' }));
  }
  function renderHist() {
    const box = $('#sp-hist'), list = [...T().sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
    $('#sp-count').textContent = list.length + ' SÉANCES';
    if (!list.length) { box.replaceChildren(el('div', { class: 'empty', text: 'AUCUNE SÉANCE — ENREGISTRE LA PREMIÈRE À GAUCHE' })); return; }
    const item = (x) => {
      const parts = [x.distance ? x.distance + ' m' : '', x.duration ? mmss(x.duration) : '', x.load ? x.load + ' kg' : '', 
        x.distance && x.duration && ['course', 'marche', 'velo'].includes(x.type) ? '(' + mmss(x.duration * 1000 / x.distance) + '/km)' : ''].filter(Boolean).join(' · ');
      return el('li', {},
        el('div', { class: 'd' }, el('span', { text: fmtDate(x.date, false) + ' · ' + (TYPES[x.type] || 'AUTRE') }), confirmBtn('suppr', () => { T().sessions = T().sessions.filter(y => y.id !== x.id); save(); render(); }, 'rm')),
        el('div', { class: 'x', text: parts + (x.notes ? '\n' + x.notes : '') }));
    };
    box.replaceChildren(el('ul', { class: 'timeline' }, ...list.map(item)));
  }

  function render() { renderGoals(); renderCharts(); renderHist(); }
  QGViews.sport = { show() { if (!built) build(); render(); } };
})();
