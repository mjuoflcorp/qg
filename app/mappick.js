/* QG 1.0 — choix de la position sur une carte (fonds Esri), recherche, lien Google Maps */
'use strict';

// Extrait des coordonnées d'un lien Google Maps (ou d'un texte « 48.85, 2.35 »)
function parseCoords(txt) {
  const s = String(txt || '').trim(); let m;
  if ((m = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/))) return [+m[1], +m[2]];
  if ((m = s.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/))) return [+m[1], +m[2]];
  if ((m = s.match(/[?&](?:q|ll|query|center|destination|daddr)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i))) return [+m[1], +m[2]];
  if ((m = s.match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/))) return [+m[1], +m[2]];
  return null;
}
const validLL = (c) => c && isFinite(c[0]) && isFinite(c[1]) && Math.abs(c[0]) <= 90 && Math.abs(c[1]) <= 180;

/**
 * Sélecteur de position. initial = {name, lat, lon}. onChange({name, lat, lon, mode, source, accuracy}).
 * Retourne l'élément à insérer dans la page.
 */
function mapPicker(initial, onChange, opts = {}) {
  let cur = { ...initial };
  const info = el('div', { class: 'mp-info' }), msg = el('span', { class: 'dim' });
  const q = el('input', { placeholder: 'Adresse, ville, lieu… (ex : Tour Eiffel, 12 rue de la Paix Lyon)' });
  const link = el('input', { placeholder: 'Ou colle un lien Google Maps / des coordonnées (48.8584, 2.2945)' });
  const mapDiv = el('div', { class: 'mp-map', style: `height:${opts.height || 340}px` });
  const errTxt = (e) => String((e && e.message) || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
  let map = null, marker = null;

  function showInfo() {
    info.replaceChildren(
      el('b', { text: cur.name || 'Position' }), ' ',
      el('span', { class: 'dim', text: `${(+cur.lat).toFixed(5)}, ${(+cur.lon).toFixed(5)}` + (cur.source ? ' · ' + ({ windows: 'localisation Windows', ip: 'adresse IP (approximatif)', carte: 'choisi sur la carte', recherche: 'recherche', lien: 'lien / coordonnées' })[cur.source] : '') }), ' ',
      el('button', { class: 'lnk', text: '[ VOIR DANS GOOGLE MAPS ]', onclick: () => window.qg.open(`https://www.google.com/maps?q=${cur.lat},${cur.lon}`) }));
  }
  async function setPos(lat, lon, source, name, extra = {}) {
    cur = { name: name || cur.name, lat, lon, mode: source === 'windows' || source === 'ip' ? 'auto' : 'manual', source, ...extra };
    if (marker) { marker.setLatLng([lat, lon]); map.setView([lat, lon], Math.max(map.getZoom(), source === 'ip' ? 10 : 13)); }
    showInfo();
    if (!name) { try { const n = await window.qg.reverse(lat, lon); if (n) cur.name = n; } catch (e) {} showInfo(); }
    onChange({ ...cur });
  }

  const doSearch = async () => {
    const t = q.value.trim(); if (!t) return;
    msg.textContent = 'RECHERCHE…';
    try { const r = await window.qg.geoSearch(t, ''); if (!r) { msg.textContent = 'INTROUVABLE — essaie avec la ville'; return; } msg.textContent = ''; setPos(r.lat, r.lon, 'recherche', r.name); }
    catch (e) { msg.textContent = 'ÉCHEC : ' + errTxt(e); }
  };
  q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });
  const doLink = async () => {
    let t = link.value.trim(); if (!t) return;
    let c = parseCoords(t);
    if (!c && /^https:\/\//i.test(t)) { msg.textContent = 'LECTURE DU LIEN…'; const u = await window.qg.resolveLink(t).catch(() => null); c = u ? parseCoords(u) : null; }
    if (!validLL(c)) { msg.textContent = 'AUCUNE COORDONNÉE TROUVÉE DANS CE LIEN'; return; }
    msg.textContent = ''; setPos(c[0], c[1], 'lien');
  };
  link.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doLink(); } });
  const auto = el('button', { class: 'btn amber', text: '⌖ ME LOCALISER', onclick: async () => {
    msg.textContent = 'LOCALISATION…';
    try { const p = await window.qg.locate(); msg.textContent = p.source === 'ip' ? 'Position approximative (adresse IP) : affine-la sur la carte si besoin.' : ''; setPos(p.lat, p.lon, p.source, p.name, { accuracy: p.accuracy, at: p.at }); }
    catch (e) { msg.textContent = 'ÉCHEC : ' + errTxt(e); }
  } });

  const root = el('div', { class: 'mp' },
    el('div', { class: 'mp-row' }, q, el('button', { class: 'btn', text: 'CHERCHER', onclick: doSearch }), auto),
    el('div', { class: 'mp-row' }, link, el('button', { class: 'btn', text: 'OK', onclick: doLink })),
    mapDiv, info, msg,
    el('div', { class: 'note', text: 'Clique sur la carte ou fais glisser le repère pour placer ta position exacte.' }));
  showInfo();

  // la carte se crée une fois l'élément affiché
  const init = () => {
    if (map) return;
    if (!document.body.contains(mapDiv) || !mapDiv.clientWidth) { requestAnimationFrame(init); return; }
    if (!window.L) { mapDiv.replaceChildren(el('div', { class: 'empty', text: 'CARTE INDISPONIBLE (bibliothèque absente) — utilise la recherche ou un lien.' })); return; }
    map = L.map(mapDiv, { zoomControl: true, worldCopyJump: true }).setView([cur.lat, cur.lon], 11);
    map.attributionControl.setPrefix(false);
    // fonds Esri (gratuits, sans clé) : plan sombre + étiquettes, ou satellite
    const E = (s) => `https://server.arcgisonline.com/ArcGIS/rest/services/${s}/MapServer/tile/{z}/{y}/{x}`;
    const plan = L.layerGroup([L.tileLayer(E('Canvas/World_Dark_Gray_Base'), { maxZoom: 16, attribution: 'Fond © Esri, HERE, Garmin, OpenStreetMap' }), L.tileLayer(E('Canvas/World_Dark_Gray_Reference'), { maxZoom: 16 })]);
    const sat = L.layerGroup([L.tileLayer(E('World_Imagery'), { maxZoom: 19, attribution: 'Imagerie © Esri, Maxar, Earthstar Geographics' }), L.tileLayer(E('Reference/World_Boundaries_and_Places'), { maxZoom: 19 })]);
    plan.addTo(map);
    L.control.layers({ 'Plan': plan, 'Satellite': sat }, null, { position: 'topright', collapsed: false }).addTo(map);
    marker = L.marker([cur.lat, cur.lon], { draggable: true, icon: L.divIcon({ className: 'qg-pin', html: '<i></i>', iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(map);
    marker.on('dragend', () => { const p = marker.getLatLng(); setPos(p.lat, p.lng, 'carte'); });
    map.on('click', (e) => setPos(e.latlng.lat, e.latlng.lng, 'carte'));
    new ResizeObserver(() => map.invalidateSize()).observe(mapDiv);
  };
  requestAnimationFrame(init);
  return root;
}
