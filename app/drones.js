/* QG — onglet DRONES : GO / NO-GO météo, carnet de vol, batteries */
'use strict';
(function () {
  const D = () => S.data.drones;
  // Seuils indicatifs par profil (km/h, %, m). Réglables plus tard si besoin.
  const PROFILES = {
    fpv5: { label: 'FPV 5"', gust: [35, 50], alt: 'wind_speed_80m', altLabel: 'VENT 80 m', altW: [40, 55], rain: [30, 60], vis: [5000, 2000] },
    fpv10: { label: 'FPV 10" LONG RANGE', gust: [30, 45], alt: 'wind_speed_120m', altLabel: 'VENT 120 m', altW: [35, 50], rain: [30, 60], vis: [8000, 3000] },
    wing: { label: 'AILE FIXE', gust: [25, 40], alt: 'wind_speed_120m', altLabel: 'VENT 120 m', altW: [30, 45], rain: [20, 50], vis: [8000, 3000] },
    stab: { label: 'DRONE STABILISÉ', gust: [30, 43], alt: 'wind_speed_120m', altLabel: 'VENT 120 m', altW: [35, 43], rain: [20, 50], vis: [5000, 2000] }
  };
  let built = false, prof = 'fpv5';

  function build() {
    $('#v-drones').replaceChildren(
      el('div', { class: 'panel' }, el('div', { class: 'ph' }, '[ GO / NO-GO VOL // ', el('span', { id: 'dr-loc' }), ' ]', el('span', { class: 'ph-r' }, el('button', { class: 'lnk', text: 'ACTUALISER', onclick: () => renderGo(true) }))),
        el('div', { class: 'tabs', id: 'dr-prof' }, ...Object.entries(PROFILES).map(([k, p]) => el('button', { class: k === prof ? 'on' : null, 'data-p': k, text: p.label, onclick: () => { prof = k; $$('#dr-prof button').forEach(b => b.classList.toggle('on', b.dataset.p === k)); renderGo(false); } }))),
        el('div', { class: 'pb scroll', id: 'dr-go', text: 'CHARGEMENT…' })),
      el('div', { class: 'col' },
        el('div', { class: 'panel' }, el('div', { class: 'ph' }, '[ NOUVEAU VOL ]'), el('div', { class: 'pb form', id: 'dr-form' })),
        el('div', { class: 'panel grow' }, el('div', { class: 'ph' }, '[ CARNET DE VOL ]', el('span', { class: 'ph-r', id: 'dr-stats' })), el('div', { class: 'pb scroll', id: 'dr-log' }))),
      el('div', { class: 'col' },
        el('div', { class: 'panel grow' }, el('div', { class: 'ph' }, '[ BATTERIES ]', el('span', { class: 'ph-r', id: 'dr-bcount' })), el('div', { class: 'pb scroll', id: 'dr-bat' })),
        el('div', { class: 'panel' }, el('div', { class: 'ph', text: '[ MES DRONES ]' }), el('div', { class: 'pb scroll', id: 'dr-craft', style: 'max-height:210px' }))));
    built = true;
  }

  /* ---------- GO / NO-GO ---------- */
  function hourVerdict(h, i, p, kp, daylight) {
    const reasons = []; let lvl = 0;
    const chk = (v, [ok, warn], label, unit, higherIsBad = true) => {
      if (v == null) return;
      const bad = higherIsBad ? v > warn : v < warn, mid = higherIsBad ? v > ok : v < ok;
      if (bad) { lvl = Math.max(lvl, 2); reasons.push(`${label} ${Math.round(v)}${unit}`); } else if (mid) { lvl = Math.max(lvl, 1); reasons.push(`${label} ${Math.round(v)}${unit}`); }
    };
    chk(h.wind_gusts_10m[i], p.gust, 'rafales', ' km/h');
    chk(h[p.alt] && h[p.alt][i], p.altW, p.altLabel.toLowerCase(), ' km/h');
    chk(h.precipitation_probability[i], p.rain, 'pluie', ' %');
    chk(h.visibility[i], p.vis, 'visibilité', ' m', false);
    if ([95, 96, 99].includes(h.weather_code[i])) { lvl = 2; reasons.push('orage'); }
    if (kp != null && kp >= 5) { lvl = Math.max(lvl, 1); reasons.push('Kp ' + kp + ' (GPS dégradé)'); }
    if (!daylight) { lvl = 2; reasons.unshift('nuit'); }
    return { lvl, reasons };
  }
  window.QGDR = { PROFILES, hourVerdict: (...a) => hourVerdict(...a) };
  async function renderGo(force) {
    const box = $('#dr-go'); $('#dr-loc').textContent = S.data.settings.location.name.toUpperCase();
    try {
      const w = await getFlightWx(force), h = w.fx.hourly, d = w.fx.daily, p = PROFILES[prof];
      const now = new Date(); let i0 = h.time.findIndex(t => new Date(t) > new Date(now.getTime() - 3600e3)); if (i0 < 0) i0 = 0;
      const dayl = (t) => { const day = t.slice(0, 10), k = d.time.indexOf(day); if (k < 0) return true; return t >= d.sunrise[k] && t <= d.sunset[k]; };
      const hours = [];
      for (let i = i0; i < Math.min(h.time.length, i0 + 24); i++) hours.push({ i, t: h.time[i], ...hourVerdict(h, i, p, kpAt(w.kp, new Date(h.time[i])), dayl(h.time[i])) });
      const cur = hours[0], LV = [['GO', 'good', 'Conditions favorables'], ['PRUDENCE', 'mid', 'Vol possible, avec marge'], ['NO-GO', 'badc', 'Conditions défavorables']];
      const kpN = kpMaxNext(w.kp, 24), k0 = d.time.indexOf(todayLocal());
      box.replaceChildren(
        el('div', { class: 'go ' + LV[cur.lvl][1] }, el('div', { class: 'gv', text: LV[cur.lvl][0] }), el('div', {}, el('div', { text: LV[cur.lvl][2] + ' — ' + p.label }), el('div', { class: 'dim', text: cur.reasons.length ? cur.reasons.join(' · ') : 'Rien à signaler' }))),
        el('div', { class: 'hours' }, ...hours.map(x => el('div', { class: 'hr ' + LV[x.lvl][1], title: x.t.slice(11) + ' — ' + (x.reasons.join(', ') || 'OK') }, el('i'), el('span', { text: x.t.slice(11, 13) })))),
        el('table', { class: 'kv', style: 'margin-top:10px' },
          ...[['VENT 10 m', `${dirTxt(h.wind_direction_10m[cur.i])} ${Math.round(h.wind_speed_10m[cur.i])} km/h · raf. ${Math.round(h.wind_gusts_10m[cur.i])}`],
            ['VENT 80 m / 120 m', `${Math.round(h.wind_speed_80m[cur.i])} / ${Math.round(h.wind_speed_120m[cur.i])} km/h`],
            ['PLUIE', `${h.precipitation_probability[cur.i] ?? '--'} % · ${(h.precipitation[cur.i] || 0).toFixed(1)} mm`],
            ['VISIBILITÉ', h.visibility[cur.i] != null ? (h.visibility[cur.i] / 1000).toFixed(1) + ' km' : '--'],
            ['NUAGES BAS', (h.cloud_cover_low[cur.i] ?? '--') + ' %'], ['TEMPÉRATURE', Math.round(h.temperature_2m[cur.i]) + '° (batteries LiPo : préchauffer sous 10°)'],
            ['INDICE Kp (24 h)', kpN == null ? '--' : kpN + (kpN >= 5 ? ' — tempête géomagnétique, GPS moins fiable' : ' — GPS normal')],
            ['JOUR', k0 >= 0 ? `${d.sunrise[k0].slice(11)} → ${d.sunset[k0].slice(11)}` : '--']].map(([k, v]) => el('tr', {}, el('th', { text: k }), el('td', { text: v })))),
        el('div', { class: 'row', style: 'margin-top:10px' },
          el('button', { class: 'btn', text: 'ZONES DE VOL (GÉOPORTAIL)', onclick: () => window.qg.open('https://www.geoportail.gouv.fr/donnees/restrictions-pour-drones-de-loisir') }),
          el('button', { class: 'btn', text: 'NOTAM / SUP AIP (SIA)', onclick: () => window.qg.open('https://www.sia.aviation-civile.gouv.fr/') })),
        el('div', { class: 'note', text: 'Aide à la décision basée sur les prévisions Open-Meteo et le Kp de la NOAA. Seuils indicatifs : vérifie toujours sur place, la réglementation et les restrictions du jour. Vol de loisir interdit de nuit.' }));
    } catch (e) { box.textContent = 'INDISPONIBLE : ' + errMsg(e); }
  }
  const dirTxt = (x) => x == null ? '' : ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(x / 45) % 8];

  /* ---------- vols ---------- */
  function renderForm() {
    const box = $('#dr-form');
    const date = el('input', { type: 'date', value: todayLocal() });
    const craft = el('select', {}, ...D().craft.map(c => el('option', { value: c.id, text: c.name })));
    const dur = el('input', { placeholder: 'min', style: 'width:100%' });
    const place = el('input', { placeholder: 'Lieu / spot' });
    const notes = el('input', { placeholder: 'Notes (réglages, comportement, vidéo…)' });
    const crash = el('input', { type: 'checkbox', style: 'width:auto;display:inline;margin:0 6px 0 0' });
    const bats = el('div', { class: 'batpick' }, ...D().batteries.filter(b => b.status !== 'hs').map(b => el('label', { class: 'chk' }, el('input', { type: 'checkbox', value: b.id }), b.name)));
    const msg = el('span', { class: 'dim' });
    box.replaceChildren(
      el('div', { class: 'row3' }, field('DATE', date), field('DRONE', craft), field('DURÉE (min)', dur)),
      field('LIEU', place), field('NOTES', notes),
      D().batteries.length ? el('label', {}, 'BATTERIES UTILISÉES (+1 cycle chacune)', bats) : el('div', { class: 'dim', style: 'margin-bottom:10px', text: 'Ajoute tes batteries à droite pour suivre leurs cycles.' }),
      el('div', { class: 'row' }, el('label', { class: 'chk' }, crash, 'CRASH / CASSE'),
        el('button', { class: 'btn amber', text: '+ AJOUTER LE VOL', onclick: () => {
          if (!craft.value) { msg.textContent = 'AJOUTE D’ABORD UN DRONE'; return; }
          const used = $$('input:checked', bats).map(x => x.value);
          D().flights.push({ id: uid(), date: new Date(date.value + 'T' + new Date().toTimeString().slice(0, 5)).toISOString(), craftId: craft.value, duration: parseFloat(dur.value) || null, place: place.value.trim(), notes: notes.value.trim(), crash: crash.checked, batteries: used });
          for (const id of used) { const b = D().batteries.find(x => x.id === id); if (b) b.cycles = (b.cycles || 0) + 1; }
          save(); render();
        } }), msg));
  }
  function renderLog() {
    const fl = [...D().flights].sort((a, b) => new Date(b.date) - new Date(a.date));
    const tot = fl.reduce((s, f) => s + (f.duration || 0), 0);
    $('#dr-stats').textContent = `${fl.length} VOLS · ${Math.floor(tot / 60)} h ${pad(Math.round(tot % 60))}`;
    const name = (id) => (D().craft.find(c => c.id === id) || {}).name || '?';
    const bname = (id) => (D().batteries.find(c => c.id === id) || {}).name || '?';
    $('#dr-log').replaceChildren(fl.length ? el('ul', { class: 'timeline' }, ...fl.map(f => el('li', {},
      el('div', { class: 'd' }, el('span', { text: fmtDate(f.date) + ' · ' + name(f.craftId) + (f.crash ? ' · ⚠ CRASH' : '') }), confirmBtn('suppr', () => { D().flights = D().flights.filter(x => x.id !== f.id); for (const id of f.batteries || []) { const b = D().batteries.find(x => x.id === id); if (b && b.cycles > 0) b.cycles--; } save(); render(); }, 'rm')),
      el('div', { class: 'x', text: [f.duration ? f.duration + ' min' : '', f.place, (f.batteries || []).length ? 'batt. ' + f.batteries.map(bname).join(', ') : ''].filter(Boolean).join(' · ') + (f.notes ? '\n' + f.notes : '') })))) : el('div', { class: 'empty', text: 'AUCUN VOL ENREGISTRÉ' }));
  }

  /* ---------- batteries ---------- */
  const BST = { ok: 'OK', surveiller: 'À SURVEILLER', hs: 'HS' };
  function renderBats() {
    const box = $('#dr-bat');
    $('#dr-bcount').textContent = D().batteries.length + ' PACKS';
    const name = el('input', { placeholder: 'Nom (ex : 6S 1300 #1)' }), cells = el('input', { placeholder: 'S', value: '6' }), cap = el('input', { placeholder: 'mAh' });
    box.replaceChildren(
      D().batteries.length ? el('table', { class: 'tbl' }, el('tr', {}, ...['PACK', 'CYCLES', 'ÉTAT', 'NOTES', ''].map(x => el('th', { text: x }))),
        ...D().batteries.map(b => {
          const st = el('select', { style: 'padding:1px 4px' }, ...Object.entries(BST).map(([k, v]) => el('option', { value: k, selected: b.status === k, text: v }))); st.onchange = () => { b.status = st.value; save(); render(); };
          const nt = el('input', { value: b.notes || '', placeholder: 'gonflement, RI…', style: 'padding:1px 4px;width:100%' }); nt.onchange = () => { b.notes = nt.value; save(); };
          const cy = el('input', { value: b.cycles || 0, style: 'padding:1px 4px;width:52px;text-align:right' }); cy.onchange = () => { b.cycles = parseInt(cy.value) || 0; save(); render(); };
          return el('tr', {}, el('td', { title: `${b.cells || '?'}S ${b.capacity || '?'} mAh`, text: b.name }), el('td', { class: 'r' }, cy, (b.cycles || 0) >= 150 ? el('span', { class: 'mid', text: ' ⚠' }) : null), el('td', {}, st), el('td', {}, nt), el('td', {}, confirmBtn('×', () => { D().batteries = D().batteries.filter(x => x.id !== b.id); save(); render(); }, 'rm')));
        })) : el('div', { class: 'empty', text: 'AUCUNE BATTERIE' }),
      el('div', { class: 'sect', text: 'AJOUTER UN PACK' }),
      el('div', { class: 'form' }, el('div', { class: 'row3', style: 'grid-template-columns:2fr 1fr 1fr' }, field('NOM', name), field('CELLULES', cells), field('CAPACITÉ', cap)),
        el('button', { class: 'btn', text: '+ AJOUTER', onclick: () => { if (!name.value.trim()) return; D().batteries.push({ id: uid(), name: name.value.trim(), cells: parseInt(cells.value) || null, capacity: parseInt(cap.value) || null, cycles: 0, status: 'ok', notes: '', added: new Date().toISOString() }); save(); render(); } })),
      el('div', { class: 'note', text: 'Repère : une LiPo perd en performance après ~150–300 cycles. Mets HS tout pack gonflé ou qui chauffe.' }));
  }
  function renderCraft() {
    const box = $('#dr-craft'), n = el('input', { placeholder: 'Nom du drone' });
    const time = (id) => D().flights.filter(f => f.craftId === id).reduce((s, f) => s + (f.duration || 0), 0);
    box.replaceChildren(
      el('table', { class: 'tbl' }, el('tr', {}, ...['DRONE', 'VOLS', 'TEMPS', ''].map(x => el('th', { text: x }))),
        ...D().craft.map(c => el('tr', {}, el('td', { text: c.name }), el('td', { class: 'r', text: String(D().flights.filter(f => f.craftId === c.id).length) }), el('td', { class: 'r', text: Math.round(time(c.id)) + ' min' }), el('td', {}, confirmBtn('×', () => { D().craft = D().craft.filter(x => x.id !== c.id); save(); render(); }, 'rm'))))),
      el('div', { class: 'row form', style: 'margin-top:8px' }, n, el('button', { class: 'btn', text: '+', onclick: () => { if (!n.value.trim()) return; D().craft.push({ id: uid(), name: n.value.trim() }); save(); render(); } })));
  }

  function render() { renderForm(); renderLog(); renderBats(); renderCraft(); }
  QGViews.drones = { show() { if (!built) build(); render(); renderGo(false); } };
})();
