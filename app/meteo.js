/* QG — onglet MÉTÉO : deux positions en parallèle (ICI = position détectée, CIBLE = zone de mission), météo détaillée + GO/NO-GO drone + mer */
'use strict';
(function () {
  const ST = () => S.data.settings;
  const WMO_ICON = (c) => c == null ? '·' : c === 0 ? '☀' : c <= 2 ? '◐' : c === 3 ? '☁' : c <= 48 ? '≡' : c <= 57 ? '░' : c <= 67 ? '☂' : c <= 77 ? '❄' : c <= 82 ? '☂' : '⚡';
  const DIR8 = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const dir8 = (d) => d == null ? '' : DIR8[Math.round(d / 45) % 8];
  const r0 = (v) => v == null || isNaN(v) ? '--' : Math.round(v);
  const arrow = (d) => el('span', { class: 'warr', style: `transform:rotate(${(d || 0) + 180}deg)`, text: '↑' });
  const LV = [['GO', 'good'], ['PRUDENCE', 'mid'], ['NO-GO', 'badc']];
  let built = false;

  let sub = 'wx';
  function build() {
    $('#wx-pane').replaceChildren(col('ici'), col('cible'));
    $$('#mx-bar .sb').forEach(b => b.onclick = () => setSub(b.dataset.p));
    built = true;
  }
  function setSub(p) {
    sub = p; $$('#mx-bar .sb').forEach(b => b.classList.toggle('on', b.dataset.p === p));
    $('#wx-pane').hidden = p !== 'wx'; $('#v-drones').hidden = p !== 'dr';
    if (p === 'dr' && QGViews.drones) QGViews.drones.show(); else render(false);
  }
  function col(which) {
    return el('div', { class: 'panel wxcol', id: 'wx-' + which },
      el('div', { class: 'ph' }, el('span', { id: 'wx-' + which + '-t' }), el('span', { class: 'ph-r', id: 'wx-' + which + '-a' })),
      el('div', { class: 'wxbar', id: 'wx-' + which + '-bar' }),
      el('div', { class: 'pb scroll', id: 'wx-' + which + '-b', text: 'CHARGEMENT…' }));
  }

  /* ---------- barres de commande ---------- */
  function barIci() {
    const l = ST().location, msg = el('span', { class: 'dim' });
    const src = locSource(l), acc = '', bad = l.mode === 'auto' && !(l.accuracy <= 300);
    $('#wx-ici-t').textContent = '[ ICI // ' + (l.name || '').toUpperCase() + ' ]';
    $('#wx-ici-a').textContent = l.at ? 'POSITION ' + ago(l.at) : '';
    $('#wx-ici-bar').replaceChildren(
      el('span', { class: 'wxsrc' + (bad ? ' warn' : ''), text: src + acc }),
      el('button', { class: 'btn small amber', text: '⌖ ME LOCALISER', onclick: async () => {
        msg.textContent = 'LOCALISATION…';
        try { await locateMe(true); msg.textContent = ''; loadWeather().catch(() => {}); render(true); }
        catch (e) { msg.textContent = 'ÉCHEC : ' + errMsg(e); }
      } }),
      el('button', { class: 'btn small', text: '📍 ÉPINGLER', title: 'Placer ma position exacte sur la carte satellite', onclick: () => openMap('ici') }),
      bad ? el('button', { class: 'btn small', text: 'PRÉCISION ?', onclick: () => { window.setSection && window.setSection('position'); location.hash = '#reglages'; } }) : null,
      el('button', { class: 'btn small', text: '★ FAVORI', title: 'Ajouter cette position aux favoris', onclick: () => addFav(l) }),
      el('button', { class: 'btn small', text: '→ CIBLE', title: 'Copier ma position comme cible', onclick: () => { ST().target = { name: l.name, lat: l.lat, lon: l.lon }; save(); render(false); } }),
      msg);
  }
  function addFav(p) {
    const F = ST().favs; if (F.some(f => Math.abs(f.lat - p.lat) < 0.01 && Math.abs(f.lon - p.lon) < 0.01)) return;
    F.push({ name: p.name || 'Point', lat: +p.lat, lon: +p.lon }); save(); render(false);
  }
  function barCible() {
    const t = ST().target, F = ST().favs, msg = el('span', { class: 'dim' });
    $('#wx-cible-t').textContent = '[ CIBLE // ' + (t.name || '').toUpperCase() + ' ]';
    $('#wx-cible-a').textContent = (+t.lat).toFixed(3) + ', ' + (+t.lon).toFixed(3);
    const sel = el('select', { class: 'mini' }, el('option', { value: '', text: 'FAVORIS…' }), ...F.map((f, i) => el('option', { value: i, text: f.name })));
    sel.onchange = () => { const f = F[+sel.value]; if (f) { ST().target = { ...f }; save(); render(false); } };
    const q = el('input', { class: 'mini', placeholder: 'Ville, camp, lieu…' });
    const go = async () => {
      const s = q.value.trim(); if (!s) return; msg.textContent = 'RECHERCHE…';
      const ll = parseCoords(s);
      if (ll) { ST().target = { name: s, ...ll }; save(); render(false); return; }
      try { const r = await window.qg.geoSearch(s, ''); const p = Array.isArray(r) ? r[0] : r; if (!p) { msg.textContent = 'INTROUVABLE'; return; } ST().target = { name: p.name || s, lat: p.lat, lon: p.lon }; save(); render(false); }
      catch (e) { msg.textContent = 'ÉCHEC : ' + errMsg(e); }
    };
    q.onkeydown = (e) => { if (e.key === 'Enter') go(); };
    $('#wx-cible-bar').replaceChildren(sel, q, el('button', { class: 'btn small', text: 'CHERCHER', onclick: go }),
      el('button', { class: 'btn small', text: '🗺 CARTE', onclick: () => openMap('cible') }),
      el('button', { class: 'btn small', text: '★', title: 'Ajouter la cible aux favoris', onclick: () => addFav(t) }),
      el('button', { class: 'btn small', text: '✎ FAVORIS', onclick: editFavs }), msg);
  }
  function openMap(which) {
    const box = $('#onboard'); let pick = null, ici = which === 'ici';
    box.hidden = false;
    box.replaceChildren(el('div', { class: 'ob form' }, el('h1', { text: ici ? '> ÉPINGLER MA POSITION EXACTE' : '> CHOISIR LA CIBLE' }),
      ici ? el('p', { class: 'dim', text: 'Passe en SATELLITE, zoome et clique sur l’endroit exact où tu es. La position restera épinglée (précision ±10 m) jusqu’à ce que tu cliques ⌖ ME LOCALISER. Elle est aussi mémorisée : quand la détection automatique est imprécise près d’ici, l’app reprendra ce point.' }) : null,
      mapPicker(ici ? ST().location : ST().target, (p) => { pick = p; }, { height: 430 }),
      el('div', { class: 'foot' }, el('button', { class: 'btn', text: 'ANNULER', onclick: () => { box.hidden = true; } }),
        el('button', { class: 'btn amber', text: 'VALIDER →', onclick: () => {
          if (pick) {
            if (ici) { setLocation({ ...pick, mode: 'manual', source: 'carte', accuracy: 10 }); const P = ST().pins = (ST().pins || []).filter(x => distKm(x, pick) > 0.3); P.push({ name: pick.name, lat: pick.lat, lon: pick.lon }); ST().pins = P.slice(-20); save(); }
            else { ST().target = { name: pick.name, lat: pick.lat, lon: pick.lon }; save(); }
          }
          box.hidden = true; render(false); } }))));
  }
  function editFavs() {
    const box = $('#onboard'), F = ST().favs;
    const ta = el('textarea', { rows: 12 }); ta.value = F.map(f => `${f.name} | ${(+f.lat).toFixed(4)}, ${(+f.lon).toFixed(4)}`).join('\n');
    box.hidden = false;
    box.replaceChildren(el('div', { class: 'ob form' }, el('h1', { text: '> FAVORIS' }),
      el('p', { class: 'dim', text: 'Un lieu par ligne : Nom | latitude, longitude. Astuce : dans Google Maps, clic droit sur un point → les coordonnées s’affichent, clique pour les copier.' }), ta,
      el('div', { class: 'foot' }, el('button', { class: 'btn', text: 'ANNULER', onclick: () => { box.hidden = true; } }),
        el('button', { class: 'btn amber', text: 'ENREGISTRER', onclick: () => {
          const out = []; for (const line of ta.value.split('\n')) { const [n, c] = line.split('|'); const ll = c && parseCoords(c); if (n && n.trim() && ll) out.push({ name: n.trim().slice(0, 50), ...ll }); }
          ST().favs = out.slice(0, 40); save(); box.hidden = true; render(false);
        } }))));
  }

  /* ---------- rendu d'une colonne ---------- */
  async function fill(which, loc, force) {
    const box = $('#wx-' + which + '-b');
    try {
      const w = await getFlightWx(force, loc);
      box.replaceChildren(...view(w));
      const cv = box.querySelector('canvas.wxc'); if (cv) requestAnimationFrame(() => chart(cv, w));
    } catch (e) { box.replaceChildren(el('div', { class: 'empty', text: 'MÉTÉO INDISPONIBLE : ' + errMsg(e) })); }
  }
  function view(w) {
    const c = w.fx.current || {}, h = w.fx.hourly, d = w.fx.daily, m = w.marine;
    let i0 = h.time.findIndex(t => new Date(t) > Date.now() - 3600e3); if (i0 < 0) i0 = 0;
    const day = (t) => { const k = d.time.indexOf(t.slice(0, 10)); return k < 0 || (t >= d.sunrise[k] && t <= d.sunset[k]); };
    const kpNow = kpAt(w.kp, new Date());
    // verdicts drone (profils de l'onglet DRONES)
    const P = window.QGDR ? QGDR.PROFILES : {};
    const verd = Object.entries(P).map(([k, p]) => { const v = QGDR.hourVerdict(h, i0, p, kpAt(w.kp, new Date(h.time[i0])), day(h.time[i0]));
      return el('div', { class: 'vchip ' + LV[v.lvl][1], title: v.reasons.join(', ') || 'Rien à signaler' }, el('small', { text: p.label }), el('b', { text: LV[v.lvl][0] })); });
    // prochaine fenêtre GO FPV 5" (jour)
    let win = null; if (P.fpv5) for (let i = i0; i < Math.min(h.time.length, i0 + 48); i++) { if (QGDR.hourVerdict(h, i, P.fpv5, kpAt(w.kp, new Date(h.time[i])), day(h.time[i])).lvl === 0) { win = h.time[i]; break; } }
    let sea = null;
    if (m && m.hourly) { const mh = m.hourly; let j = mh.time.findIndex(t => new Date(t) >= Date.now() - 3600e3); if (j < 0) j = 0; const wv = mh.wave_height[j], ws = h.wind_speed_10m[i0];
      sea = { wv, per: mh.wave_period && mh.wave_period[j], sst: mh.sea_surface_temperature && mh.sea_surface_temperature[j], v: wv == null ? ['--', ''] : wv <= 0.5 && ws <= 20 ? ['BON', 'good'] : wv <= 1 && ws <= 30 ? ['MOYEN', 'mid'] : ['NON', 'badc'] }; }
    const k0 = d.time.indexOf(h.time[i0].slice(0, 10));
    const now = el('div', { class: 'wxnow' },
      el('div', { class: 'wxbig' }, el('span', { class: 't', text: r0(c.temperature_2m) + '°' }), el('div', {}, el('div', { class: 's', text: (WMO_ICON(c.weather_code) + ' ' + (WMO[c.weather_code] || '')).trim() }), el('div', { class: 'dim', text: 'ressenti ' + r0(c.apparent_temperature) + '° · humidité ' + r0(c.relative_humidity_2m) + ' %' }))),
      el('table', { class: 'kv wxkv' },
        el('tr', {}, el('th', { text: 'VENT 10 m' }), el('td', {}, arrow(c.wind_direction_10m), ` ${dir8(c.wind_direction_10m)} ${r0(c.wind_speed_10m)} km/h · raf. ${r0(c.wind_gusts_10m)}`)),
        el('tr', {}, el('th', { text: 'VENT 80 / 120 m' }), el('td', { text: `${r0(h.wind_speed_80m[i0])} / ${r0(h.wind_speed_120m[i0])} km/h` })),
        el('tr', {}, el('th', { text: 'VISIBILITÉ' }), el('td', { text: c.visibility != null ? (c.visibility >= 10000 ? '> 10 km' : (c.visibility / 1000).toFixed(1) + ' km') : '--' })),
        el('tr', {}, el('th', { text: 'NUAGES / BAS' }), el('td', { text: `${r0(c.cloud_cover)} % / ${r0(h.cloud_cover_low[i0])} %` })),
        el('tr', {}, el('th', { text: 'PRESSION' }), el('td', { text: r0(c.pressure_msl) + ' hPa' })),
        el('tr', {}, el('th', { text: 'SOLEIL' }), el('td', { text: k0 >= 0 ? d.sunrise[k0].slice(11) + ' → ' + d.sunset[k0].slice(11) : '--' })),
        el('tr', {}, el('th', { text: 'KP (GPS)' }), el('td', { class: kpNow >= 5 ? 'mid' : null, text: kpNow != null ? String(kpNow) : '--' }))));
    const verdicts = el('div', { class: 'vrow' }, ...verd,
      sea ? el('div', { class: 'vchip ' + sea.v[1], title: 'Houle ' + (sea.wv != null ? sea.wv.toFixed(1) : '--') + ' m' }, el('small', { text: 'PLONGÉE' }), el('b', { text: sea.v[0] })) : null);
    const info = el('div', { class: 'note', style: 'margin:4px 0 8px' }, win ? (win === h.time[i0] ? 'FPV 5" : GO maintenant. ' : 'Prochaine fenêtre GO FPV 5" : ' + fmtDay(win) + ' ' + win.slice(11, 16) + '. ') : 'Pas de fenêtre GO FPV 5" dans les 48 h. ',
      sea ? `Mer : houle ${sea.wv != null ? sea.wv.toFixed(1) : '--'} m${sea.per ? ' / ' + Math.round(sea.per) + ' s' : ''}, eau ${sea.sst != null ? Math.round(sea.sst) + '°' : '--'}.` : '');
    // tableau horaire : 24 h, pas de 2 h
    const H = []; for (let i = i0; i < Math.min(h.time.length, i0 + 24); i += 2) H.push(i);
    const vl = (i) => P.fpv5 ? QGDR.hourVerdict(h, i, P.fpv5, kpAt(w.kp, new Date(h.time[i])), day(h.time[i])).lvl : 0;
    const row = (lab, f) => el('tr', {}, el('th', { text: lab }), ...H.map(i => el('td', {}, f(i))));
    const hourly = el('table', { class: 'wxh' },
      row('HEURE', i => el('b', { text: h.time[i].slice(11, 13) + 'h' })),
      row('CIEL', i => el('span', { class: 'ico', title: WMO[h.weather_code[i]] || '', text: WMO_ICON(h.weather_code[i]) })),
      row('T°', i => r0(h.temperature_2m[i]) + '°'),
      row('PLUIE', i => el('span', { class: h.precipitation_probability[i] >= 50 ? 'rain' : 'dim', text: r0(h.precipitation_probability[i]) + '%' })),
      row('mm', i => el('span', { class: 'dim', text: h.precipitation[i] ? h.precipitation[i].toFixed(1) : '0' })),
      row('VENT', i => el('span', {}, arrow(h.wind_direction_10m[i]), r0(h.wind_speed_10m[i]))),
      row('RAF.', i => el('span', { class: h.wind_gusts_10m[i] > 50 ? 'badc' : h.wind_gusts_10m[i] > 35 ? 'mid' : null, text: r0(h.wind_gusts_10m[i]) })),
      row('120 m', i => el('span', { class: 'dim', text: r0(h.wind_speed_120m[i]) })),
      row('VISI', i => el('span', { class: 'dim', text: h.visibility[i] == null ? '--' : h.visibility[i] >= 10000 ? '10+' : (h.visibility[i] / 1000).toFixed(0) })),
      row('FPV', i => el('i', { class: 'dot ' + LV[vl(i)][1], title: LV[vl(i)][0] })));
    // 7 jours
    const days = el('table', { class: 'wxd' }, el('tr', {}, ...['JOUR', '', 'MIN / MAX', 'PLUIE', 'VENT / RAF.', 'SOLEIL', 'UV'].map(x => el('th', { text: x }))),
      ...d.time.map((t, k) => el('tr', {},
        el('td', { text: k === 0 ? "AUJ." : JOURS[new Date(t + 'T12:00').getDay()] + ' ' + t.slice(8, 10) }),
        el('td', { class: 'ico', title: WMO[d.weather_code[k]] || '', text: WMO_ICON(d.weather_code[k]) }),
        el('td', { text: `${r0(d.temperature_2m_min[k])}° / ${r0(d.temperature_2m_max[k])}°` }),
        el('td', { class: d.precipitation_probability_max[k] >= 50 ? 'rain' : null, text: `${r0(d.precipitation_probability_max[k])} % · ${(d.precipitation_sum[k] || 0).toFixed(1)} mm` }),
        el('td', {}, arrow(d.wind_direction_10m_dominant[k]), ` ${r0(d.wind_speed_10m_max[k])} / ${r0(d.wind_gusts_10m_max[k])}`),
        el('td', { class: 'dim', text: d.sunrise[k].slice(11) + '–' + d.sunset[k].slice(11) }),
        el('td', { class: 'dim', text: r0(d.uv_index_max && d.uv_index_max[k]) }))));
    return [now, verdicts, info, el('div', { class: 'sect', text: '48 H — TEMPÉRATURE · RAFALES · PLUIE' }), el('canvas', { class: 'wxc' }),
      el('div', { class: 'sect', text: '24 H DÉTAILLÉES' }), hourly, el('div', { class: 'sect', text: '7 JOURS' }), days,
      el('div', { class: 'note', text: 'Open-Meteo (modèles Météo-France / ECMWF), NOAA pour le Kp. GO/NO-GO indicatif : vérifie toujours zones, NOTAM et consignes.' })];
  }
  const fmtDay = (t) => { const d = new Date(t); return new Date().toDateString() === d.toDateString() ? "aujourd'hui" : JOURS[d.getDay()].toLowerCase(); };

  // graphique 48 h : température (ambre), rafales (rouge), pluie (barres bleues)
  function chart(cv, w) {
    const h = w.fx.hourly; let i0 = h.time.findIndex(t => new Date(t) > Date.now() - 3600e3); if (i0 < 0) i0 = 0;
    const N = Math.min(48, h.time.length - i0), W = cv.clientWidth, Hh = cv.clientHeight; if (!W || !Hh) return;
    cv.width = W * devicePixelRatio; cv.height = Hh * devicePixelRatio; const g = cv.getContext('2d'); g.scale(devicePixelRatio, devicePixelRatio);
    const L = 30, R = 30, T = 8, B = 16, X = (k) => L + k / (N - 1) * (W - L - R);
    const tt = [], gu = [], pr = []; for (let k = 0; k < N; k++) { tt.push(h.temperature_2m[i0 + k]); gu.push(h.wind_gusts_10m[i0 + k]); pr.push(h.precipitation_probability[i0 + k] || 0); }
    const t0 = Math.min(...tt) - 2, t1 = Math.max(...tt) + 2, g1 = Math.max(40, ...gu) * 1.1;
    g.font = '10px "Cascadia Mono", Consolas, monospace';
    // nuit
    for (let k = 0; k < N; k++) if (h.is_day && h.is_day[i0 + k] === 0) { g.fillStyle = 'rgba(255,255,255,0.03)'; g.fillRect(X(k) - (W - L - R) / (N - 1) / 2, T, (W - L - R) / (N - 1), Hh - T - B); }
    g.fillStyle = 'rgba(79,168,255,0.35)'; for (let k = 0; k < N; k++) { const bh = pr[k] / 100 * (Hh - T - B); g.fillRect(X(k) - 2, Hh - B - bh, 4, bh); }
    const line = (arr, lo, hi, col) => { g.strokeStyle = col; g.lineWidth = 1.6; g.beginPath(); arr.forEach((v, k) => { const y = Hh - B - (v - lo) / (hi - lo) * (Hh - T - B); k ? g.lineTo(X(k), y) : g.moveTo(X(k), y); }); g.stroke(); };
    line(gu, 0, g1, '#d0574a'); line(tt, t0, t1, '#e4a83a');
    g.fillStyle = '#e4a83a'; g.fillText(Math.round(t1) + '°', 2, T + 8); g.fillText(Math.round(t0) + '°', 2, Hh - B);
    g.fillStyle = '#d0574a'; g.fillText(Math.round(g1), W - R + 4, T + 8); g.fillText('km/h', W - R + 2, T + 20);
    g.fillStyle = '#666359'; for (let k = 0; k < N; k += 6) g.fillText(h.time[i0 + k].slice(11, 13) + 'h', X(k) - 8, Hh - 3);
    g.strokeStyle = '#1d2128'; g.beginPath(); g.moveTo(L, Hh - B); g.lineTo(W - R, Hh - B); g.stroke();
  }

  function render(force) {
    if (!built) build();
    barIci(); barCible();
    fill('ici', ST().location, force); fill('cible', ST().target, force); window.updateTargetStrip(force);
  }
  window.updateTargetStrip = async (force) => {
    const t = ST().target, x = $('#s-tg'); if (!t || !x) return;
    try { const w = await getFlightWx(force, t), c = w.fx.current || {};
      x.textContent = `${(t.name || '').split(/[—(,]/)[0].trim().toUpperCase()} ${r0(c.temperature_2m)}° · ${dir8(c.wind_direction_10m)} ${r0(c.wind_speed_10m)}/${r0(c.wind_gusts_10m)} KM/H`;
      const tb = $('#tg-box'); if (tb) {
        $('#tg-name').textContent = (t.name || '').toUpperCase();
        const h = w.fx.hourly; let i0 = h.time.findIndex(s => new Date(s) > Date.now() - 3600e3); if (i0 < 0) i0 = 0;
        const d = w.fx.daily, day = (s) => { const k = d.time.indexOf(s.slice(0, 10)); return k < 0 || (s >= d.sunrise[k] && s <= d.sunset[k]); };
        const P = window.QGDR ? QGDR.PROFILES : {};
        tb.replaceChildren(el('div', { class: 'wxbig' }, el('span', { class: 't', style: 'font-size:30px', text: r0(c.temperature_2m) + '°' }), el('div', {}, el('div', { text: (WMO_ICON(c.weather_code) + ' ' + (WMO[c.weather_code] || '')) }), el('div', { class: 'dim' }, arrow(c.wind_direction_10m), ` ${dir8(c.wind_direction_10m)} ${r0(c.wind_speed_10m)} km/h · raf. ${r0(c.wind_gusts_10m)}`))),
          el('div', { class: 'vrow', style: 'margin:8px 0 0' }, ...['fpv5', 'stab'].filter(k => P[k]).map(k => { const v = QGDR.hourVerdict(h, i0, P[k], kpAt(w.kp, new Date(h.time[i0])), day(h.time[i0])); return el('div', { class: 'vchip ' + LV[v.lvl][1], title: v.reasons.join(', ') }, el('small', { text: P[k].label }), el('b', { text: LV[v.lvl][0] })); })));
      } }
    catch (e) { x.textContent = '--'; }
  };
  QGViews.meteo = { show() { if (!built) build(); setSub(sub); }, refresh() { if (!$('#v-meteo').hidden) render(false); } };
})();
