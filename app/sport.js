/* QG — onglet SPORT : préparation sélection plongeur + conditions mer/plongée */
'use strict';
(function () {
  const TYPES = { course: 'COURSE', marche: 'MARCHE SAC', natation: 'NATATION', palmage: 'PALMAGE', apnee: 'APNÉE', muscu: 'MUSCU / CIRCUIT', autre: 'AUTRE' };
  const T = () => S.data.training;
  let built = false;

  function build() {
    const v = $('#v-sport');
    v.replaceChildren(
      el('div', { class: 'col' },
        el('div', { class: 'panel' }, el('div', { class: 'ph' }, '[ OBJECTIFS ]', el('span', { class: 'ph-r', id: 'sp-week' })), el('div', { class: 'pb', id: 'sp-goals' })),
        el('div', { class: 'panel grow' }, el('div', { class: 'ph', text: '[ NOUVELLE SÉANCE ]' }), el('div', { class: 'pb scroll form', id: 'sp-form' }))),
      el('div', { class: 'panel' }, el('div', { class: 'ph', text: '[ PROGRESSION ]' }), el('div', { class: 'pb scroll', id: 'sp-charts' })),
      el('div', { class: 'col' },
        el('div', { class: 'panel' }, el('div', { class: 'ph' }, '[ MER & PLONGÉE // ', el('span', { id: 'sp-loc' }), ' ]', el('span', { class: 'ph-r' }, el('button', { class: 'lnk', text: 'ACTUALISER', onclick: () => renderSea(true) }))), el('div', { class: 'pb', id: 'sp-sea', text: 'CHARGEMENT…' })),
        el('div', { class: 'panel grow' }, el('div', { class: 'ph' }, '[ HISTORIQUE ]', el('span', { class: 'ph-r', id: 'sp-count' })), el('div', { class: 'pb scroll', id: 'sp-hist' }))));
    buildForm();
    built = true;
  }

  /* ---------- formulaire ---------- */
  function buildForm() {
    const box = $('#sp-form');
    const type = el('select', {}, ...Object.entries(TYPES).map(([k, v]) => el('option', { value: k, text: v })));
    const date = el('input', { type: 'date', value: todayLocal() });
    const dist = el('input', { placeholder: 'ex : 2400' });
    const dur = el('input', { placeholder: 'mm:ss ou h:mm:ss' });
    const load = el('input', { placeholder: 'kg' });
    const apS = el('input', { placeholder: 'statique, mm:ss' });
    const apD = el('input', { placeholder: 'dynamique, m' });
    const notes = el('textarea', { rows: 3, placeholder: 'Ressenti, conditions, séries…' });
    const msg = el('span', { class: 'dim' });
    const rows = {
      dist: field('DISTANCE (m)', dist), dur: field('DURÉE', dur), load: field('CHARGE (kg)', load),
      apS: field('APNÉE STATIQUE', apS), apD: field('APNÉE DYNAMIQUE (m)', apD)
    };
    const show = () => {
      const k = type.value;
      rows.dist.style.display = ['course', 'marche', 'natation', 'palmage', 'autre'].includes(k) ? '' : 'none';
      rows.dur.style.display = k === 'apnee' ? 'none' : '';
      rows.load.style.display = k === 'marche' ? '' : 'none';
      rows.apS.style.display = rows.apD.style.display = k === 'apnee' ? '' : 'none';
      if (k === 'course' && !dist.value) dist.placeholder = '2400'; if (k === 'marche' && !dist.value) { dist.placeholder = '8000'; load.placeholder = '11'; }
    };
    type.onchange = show;
    const add = el('button', { class: 'btn amber', text: '+ ENREGISTRER LA SÉANCE', onclick: () => {
      const s = { id: uid(), date: new Date(date.value + 'T12:00:00').toISOString(), type: type.value, notes: notes.value.trim() };
      const d = parseFloat(dist.value || dist.placeholder.replace(/\D/g, '')); if (rows.dist.style.display !== 'none' && d) s.distance = d;
      const t = parseDur(dur.value); if (rows.dur.style.display !== 'none' && t) s.duration = t;
      const l = parseFloat(load.value || (type.value === 'marche' ? load.placeholder : '')); if (type.value === 'marche' && l) s.load = l;
      if (type.value === 'apnee') { const a = parseDur(apS.value); if (a) s.apStatic = a; const b = parseFloat(apD.value); if (b) s.apDyn = b; }
      if (['course', 'marche', 'natation', 'palmage'].includes(s.type) && !s.duration) { msg.textContent = 'INDIQUE LA DURÉE'; return; }
      T().sessions.push(s); save();
      dist.value = dur.value = load.value = apS.value = apD.value = notes.value = ''; msg.textContent = 'ENREGISTRÉ ✓'; setTimeout(() => msg.textContent = '', 2500);
      render();
    } });
    box.replaceChildren(el('div', { class: 'row3', style: 'grid-template-columns:1fr 1fr' }, field('TYPE', type), field('DATE', date)),
      rows.dist, rows.dur, rows.load, rows.apS, rows.apD, field('NOTES', notes), el('div', { class: 'row' }, add, msg));
    show();
  }

  /* ---------- objectifs ---------- */
  const eq = (s, ref) => s.distance && s.duration ? s.duration * ref / s.distance : null;
  function series(type, ref, minDist, maxDist, minLoad) {
    return T().sessions.filter(s => s.type === type && s.distance >= minDist && s.distance <= maxDist && s.duration && (!minLoad || (s.load || 0) >= minLoad))
      .map(s => ({ x: new Date(s.date), y: eq(s, ref) })).sort((a, b) => a.x - b.x);
  }
  function goalCard(title, pts, target, onTarget) {
    const best = pts.length ? Math.min(...pts.map(p => p.y)) : null, last = pts.length ? pts[pts.length - 1].y : null;
    const gap = best != null ? best - target : null;
    const tIn = el('input', { value: mmss(target), style: 'width:70px;display:inline-block;margin:0 0 0 6px;padding:1px 4px' });
    tIn.onchange = () => { const v = parseDur(tIn.value); if (v) { onTarget(v); save(); render(); } };
    return el('div', { class: 'goal' },
      el('div', { class: 'gt' }, el('span', { text: title }), el('span', { class: 'dim' }, 'OBJ', tIn)),
      el('div', { class: 'bigs', style: 'grid-template-columns:repeat(3,1fr);margin:6px 0 0' },
        el('div', {}, el('div', { class: 'k', text: 'MEILLEUR' }), el('div', { class: 'v', text: mmss(best) })),
        el('div', {}, el('div', { class: 'k', text: 'DERNIER' }), el('div', { class: 'v', text: mmss(last) })),
        el('div', {}, el('div', { class: 'k', text: 'ÉCART' }), el('div', { class: 'v ' + (gap == null ? '' : gap <= 0 ? 'good' : gap < 30 ? 'mid' : 'badc'), text: gap == null ? '--' : (gap <= 0 ? '✓ ' : '+') + mmss(Math.abs(gap)) }))));
  }
  function renderGoals() {
    const tg = T().targets;
    const wk = T().sessions.filter(s => Date.now() - new Date(s.date) < 7 * 864e5).length;
    $('#sp-week').textContent = wk + ' SÉANCE(S) / 7 J';
    $('#sp-goals').replaceChildren(
      goalCard('COURSE 2 400 m', series('course', 2400, 1500, 5000), tg.run2400, v => tg.run2400 = v),
      goalCard('MARCHE 8 km SAC ' + (tg.marchLoad || 11) + ' kg', series('marche', 8000, 4000, 12000, (tg.marchLoad || 11) - 1), tg.march8k, v => tg.march8k = v),
      el('div', { class: 'note', text: 'Les séances à une autre distance sont ramenées à l’équivalent 2 400 m / 8 km (même allure).' }));
  }
  function renderCharts() {
    const box = $('#sp-charts'), tg = T().targets;
    const chart = (title, pts, opts) => { const c = el('canvas', { style: 'width:100%;height:150px;display:block' }); box.append(el('div', { class: 'sect', text: title }), c); requestAnimationFrame(() => lineChart(c, pts, opts)); };
    box.replaceChildren();
    chart('COURSE — ÉQUIVALENT 2 400 m', series('course', 2400, 1500, 5000), { target: tg.run2400, yFmt: mmss, invert: true });
    chart('MARCHE SAC — ÉQUIVALENT 8 km', series('marche', 8000, 4000, 12000, (tg.marchLoad || 11) - 1), { target: tg.march8k, yFmt: mmss, invert: true });
    const swim = T().sessions.filter(s => (s.type === 'natation' || s.type === 'palmage') && s.distance && s.duration).map(s => ({ x: new Date(s.date), y: s.duration * 100 / s.distance })).sort((a, b) => a.x - b.x);
    chart('NATATION / PALMAGE — TEMPS AU 100 m', swim, { yFmt: mmss, invert: true, color: '#4fa8ff' });
    const ap = T().sessions.filter(s => s.type === 'apnee' && s.apStatic).map(s => ({ x: new Date(s.date), y: s.apStatic })).sort((a, b) => a.x - b.x);
    chart('APNÉE STATIQUE', ap, { yFmt: mmss, color: '#4fa8ff' });
  }
  function renderHist() {
    const box = $('#sp-hist'), list = [...T().sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
    $('#sp-count').textContent = list.length + ' SÉANCES';
    if (!list.length) { box.replaceChildren(el('div', { class: 'empty', text: 'AUCUNE SÉANCE — ENREGISTRE LA PREMIÈRE À GAUCHE' })); return; }
    const item = (x) => {
      const parts = [x.distance ? x.distance + ' m' : '', x.duration ? mmss(x.duration) : '', x.load ? x.load + ' kg' : '', x.apStatic ? 'statique ' + mmss(x.apStatic) : '', x.apDyn ? 'dynamique ' + x.apDyn + ' m' : '',
        x.distance && x.duration && ['course', 'marche'].includes(x.type) ? '(' + mmss(x.duration * 1000 / x.distance) + '/km)' : ''].filter(Boolean).join(' · ');
      return el('li', {},
        el('div', { class: 'd' }, el('span', { text: fmtDate(x.date, false) + ' · ' + TYPES[x.type] }), confirmBtn('suppr', () => { T().sessions = T().sessions.filter(y => y.id !== x.id); save(); render(); }, 'rm')),
        el('div', { class: 'x', text: parts + (x.notes ? '\n' + x.notes : '') }));
    };
    box.replaceChildren(el('ul', { class: 'timeline' }, ...list.map(item)));
  }

  /* ---------- mer & plongée ---------- */
  async function renderSea(force) {
    const box = $('#sp-sea'); $('#sp-loc').textContent = S.data.settings.location.name.toUpperCase();
    try {
      const w = await getFlightWx(force), h = w.fx.hourly, m = w.marine && w.marine.hourly;
      if (!m) { box.textContent = 'DONNÉES MARINES INDISPONIBLES POUR CE LIEU (trop loin de la mer ?)'; return; }
      const idx = (t) => h.time.indexOf(t);
      const days = [...new Set(m.time.map(t => t.slice(0, 10)))].slice(0, 3);
      const slot = (day, a, b) => {
        let wave = 0, wind = 0, gust = 0, sst = null, per = null, lvl = [], n = 0;
        for (let i = 0; i < m.time.length; i++) { const t = m.time[i]; if (t.slice(0, 10) !== day) continue; const hr = +t.slice(11, 13); if (hr < a || hr > b) continue; if (new Date(t) < Date.now() - 3600e3) continue; n++;
          wave = Math.max(wave, m.wave_height[i] || 0); if (m.sea_surface_temperature) sst = m.sea_surface_temperature[i]; if (m.wave_period) per = m.wave_period[i];
          if (m.sea_level_height_msl) lvl.push(m.sea_level_height_msl[i]);
          const j = idx(t); if (j >= 0) { wind = Math.max(wind, h.wind_speed_10m[j] || 0); gust = Math.max(gust, h.wind_gusts_10m[j] || 0); } }
        const verdict = wave <= 0.5 && wind <= 20 && gust <= 30 ? ['BON', 'good'] : wave <= 1 && wind <= 30 && gust <= 45 ? ['MOYEN', 'mid'] : ['NON', 'badc'];
        return n ? { wave, wind, gust, sst, per, lvl, verdict } : null;
      };
      const rows = days.map(d => [d, slot(d, 8, 12), slot(d, 13, 18)]);
      const lv = (m.sea_level_height_msl || []).filter(x => x != null);
      box.replaceChildren(
        el('table', { class: 'tbl' }, el('tr', {}, ...['JOUR', 'CRÉNEAU', 'VERDICT', 'HOULE', 'VENT / RAF.', 'EAU'].map(x => el('th', { text: x }))),
          ...rows.flatMap(([d, am, pm]) => [['MATIN', am], ['APRÈS-MIDI', pm]].filter(x => x[1]).map(([lab, s], k) => el('tr', {},
            el('td', { text: k ? '' : (d === todayLocal() ? "AUJ." : JOURS[new Date(d + 'T12:00').getDay()]) }), el('td', { text: lab }),
            el('td', {}, el('b', { class: s.verdict[1], text: s.verdict[0] })), el('td', { text: s.wave.toFixed(1) + ' m' + (s.per ? ' / ' + Math.round(s.per) + ' s' : '') }),
            el('td', { text: Math.round(s.wind) + ' / ' + Math.round(s.gust) + ' km/h' }), el('td', { text: s.sst != null ? Math.round(s.sst) + '°' : '--' }))))),
        el('div', { class: 'note', text: (lv.length ? `Marée (niveau de la mer) : ${Math.round(Math.min(...lv) * 100)} à ${Math.round(Math.max(...lv) * 100)} cm sur 3 jours. ` : '') + 'BON = houle ≤ 0,5 m et vent ≤ 20 km/h. Toujours avec un binôme et une bouée de signalisation.' }));
    } catch (e) { box.textContent = 'INDISPONIBLE : ' + errMsg(e); }
  }

  function render() { renderGoals(); renderCharts(); renderHist(); }
  QGViews.sport = { show() { if (!built) build(); render(); renderSea(false); } };
})();
