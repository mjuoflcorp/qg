/* QG 1.0 — profil, modules, premier lancement et RÉGLAGES (groupés par section) */
'use strict';

const MODS = [
  ['meteo', 'MÉTÉO / DRONE', 'Météo ici + cible, GO/NO-GO, carnet de vol, batteries'],
  ['actus', 'ACTU MILITAIRE', 'Actu militaire française sur le globe, par branche'],
  ['terminal', 'TERMINAL', 'CAC 40, valeurs, lecture du marché, ma liste']
];
const cleanCall = (s) => String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9_-]/g, '_').slice(0, 16);
const errText = (e) => String((e && e.message) || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

function applyProfile() {
  const st = S.data.settings, md = st.modules, p = st.profile || {};
  $('#callsign').textContent = cleanCall(p.callsign) || '1.0';
  for (const [k] of MODS) { const a = $(`nav a[data-v="${k}"]`); if (a) a.style.display = md[k] ? '' : 'none'; }
  { const a = $('nav a[data-v="topics"]'); if (a) a.style.display = md.actus ? '' : 'none'; }
  { const a = $('nav a[data-v="qg"]'); if (a) a.style.display = md.actus === false ? 'none' : ''; }
  $('#p-mail').style.display = md.mails ? '' : 'none';
  $('#news').closest('.panel').style.display = md.actus ? '' : 'none';
  $('#v-qg').style.gridTemplateColumns = md.actus ? '' : '330px minmax(0,1fr)';
  for (const [id, on] of [['s-mail', md.mails], ['s-news', md.actus], ['s-proj', md.projets], ['s-dl', md.perso]]) { const x = $('#' + id); if (x) x.parentElement.style.display = on ? '' : 'none'; }
  const v = location.hash.slice(1); if (v && (md[v] === false || (v === 'topics' && !md.actus))) location.hash = '#qg';
}
// sélecteur de langue (recharge l'interface)
function langPicker() { return null;
  const b = (l, t) => el('button', { class: 'chipb' + (QG_LANG === l ? ' on' : ''), style: '--tc:var(--amber)', 'data-notr': '1', text: t, onclick: () => { if (QG_LANG === l) return; setLang(l); S.data.settings.lang = l; window.qg.setData(S.data).finally(() => location.reload()); } });
  return el('div', { class: 'chips', style: 'margin:0 0 6px' }, el('span', { class: 'dim', style: 'margin-right:6px', text: 'LANGUE / LANGUAGE' }), b('fr', 'FRANÇAIS'), b('en', 'ENGLISH'));
}
function setLocation(l) {
  S.data.settings.location = { name: l.name || 'Ma position', lat: +l.lat, lon: +l.lon, mode: l.mode || 'manual', source: l.source || '', accuracy: l.accuracy || null, at: l.at || new Date().toISOString() };
  save();
  if (globe) globe.setHome(+l.lat, +l.lon);
  $('#legend-home').textContent = (l.name || 'MA POSITION').toUpperCase();
  clearTimeout(setLocation.t); setLocation.t = setTimeout(() => loadWeather().catch(() => {}), 800);
}
const modCheck = (md, k, t, d) => el('label', { class: 'modc' }, el('input', { type: 'checkbox', 'data-m': k, checked: md[k] !== false }), el('span', {}, el('b', { text: t }), el('small', { text: d })));
const readMods = (box) => { const md = {}; $$('input[data-m]', box).forEach(c => md[c.dataset.m] = c.checked); return md; };

/* ---------------- premier lancement ---------------- */
function showOnboarding() {
  const box = $('#onboard'); box.hidden = false;
  const st = S.data.settings; let loc = null;
  const call = el('input', { placeholder: 'ex : ALPHA, MAX, LUCIE…', maxlength: 16 });
  const mods = el('div', { class: 'mods' }, ...MODS.map(([k, t, d]) => modCheck(st.modules, k, t, d)));
  const picked = new Set(['Monde', 'Économie', 'Tech']);
  const chips = el('div', { class: 'chips' }, ...TOPIC_PRESETS.map(p => { const b = el('button', { class: 'chipb' + (picked.has(p.name) ? ' on' : ''), style: '--tc:' + p.color, text: PN(p) });
    b.onclick = () => { picked.has(p.name) ? picked.delete(p.name) : picked.add(p.name); b.classList.toggle('on'); }; return b; }));
  const err = el('span', { class: 'dim' });
  box.replaceChildren(el('div', { class: 'ob form' },
    el('h1', { text: '> BIENVENUE DANS QG 1.0' }), el('div', { class: 'step', text: 'CONFIGURATION — 1 MINUTE. TOUT RESTE MODIFIABLE DANS [ RÉGLAGES ].' }),
    langPicker(),
    el('div', { class: 'sect', text: '1 · TON NOM / INDICATIF' }), call,
    el('div', { class: 'sect', text: '2 · TA POSITION (météo + repère sur le globe)' }),
    mapPicker(st.location, (l) => { loc = l; }, { height: 230 }),
    el('div', { class: 'sect', text: '3 · TES TOPICS D’ACTU (tu pourras en créer d’autres sur n’importe quel sujet)' }), chips,
    el('div', { class: 'sect', text: '4 · MODULES À AFFICHER' }), mods,
    el('p', { class: 'dim', text: 'Confidentialité : tes données restent sur ce PC, chiffrées avec ton compte Windows. L’app contacte seulement les services nécessaires (météo Open-Meteo, cartes Esri, actus Google News et flux RSS choisis, Gmail si tu le configures).' }),
    el('div', { class: 'foot' }, err, el('button', { class: 'btn amber', text: 'TERMINER →', onclick: async () => {
      if (!cleanCall(call.value)) { err.textContent = 'INDIQUE UN NOM OU INDICATIF'; call.focus(); return; }
      st.profile = { callsign: call.value.trim().slice(0, 16), created: new Date().toISOString() };
      st.modules = readMods(mods);
      st.topics = TOPIC_PRESETS.filter(p => picked.has(p.name)).map(mkTopic);
      if (!st.topics.length) st.topics = defaultTopics();
      if (loc) setLocation(loc); else save();
      await window.qg.setData(S.data);
      box.hidden = true; buildCats(); applyProfile(); refreshAll();
    } }))));
  setTimeout(() => call.focus(), 50);
}

/* ---------------- RÉGLAGES ---------------- */
const SECTIONS = [
  ['profil', 'PROFIL & MODULES', 'Nom, langue, modules affichés'],
  ['position', 'POSITION', 'Carte, recherche, lien Google Maps'],
  ['actus', 'ACTUALITÉS & TOPICS', 'Tes sujets, mots-clés, sources'],
  ['mails', 'MAILS', 'Compte Gmail, filtres'],
  ['donnees', 'DONNÉES', 'Sauvegardes, export, téléphone'],
  ['securite', 'SÉCURITÉ & À PROPOS', 'Protection, version, réinitialiser']
];
let curSec = 'profil';
window.setSection = (k) => { curSec = k; };
function fillSettings() {
  $('#setnav').replaceChildren(el('div', { class: 'ph', text: '[ RÉGLAGES ]' }),
    ...SECTIONS.map(([k, t, d]) => el('button', { class: 'setb' + (k === curSec ? ' on' : ''), onclick: () => { curSec = k; fillSettings(); } }, el('b', { text: t }), el('small', { text: d }))));
  const [, title] = SECTIONS.find(s => s[0] === curSec);
  $('#settitle').textContent = '[ ' + title + ' ]';
  const body = $('#setbody'); body.replaceChildren(); body.scrollTop = 0;
  ({ profil: secProfil, position: secPosition, actus: secActus, mails: secMails, donnees: secDonnees, securite: secSecurite })[curSec](body);
}
const msgSpan = () => el('span', { class: 'dim' });
const flash = (m, t) => { m.textContent = t; clearTimeout(m._t); m._t = setTimeout(() => m.textContent = '', 3000); };

function secProfil(b) {
  const st = S.data.settings, call = el('input', { value: (st.profile || {}).callsign || '', maxlength: 16 }), msg = msgSpan();
  const mods = el('div', { class: 'mods' }, ...MODS.map(([k, t, d]) => modCheck(st.modules, k, t, d)));
  b.append(langPicker(), el('label', {}, 'NOM / INDICATIF (affiché en haut : > QG_…)', call),
    el('div', { class: 'sect', text: 'MODULES AFFICHÉS' }), mods,
    el('div', { class: 'row' }, el('button', { class: 'btn amber', text: 'ENREGISTRER', onclick: () => { st.profile = { ...(st.profile || {}), callsign: call.value.trim().slice(0, 16) }; st.modules = readMods(mods); save(); applyProfile(); flash(msg, 'ENREGISTRÉ ✓'); } }), msg));
}
async function secPosition(b) {
  const st = S.data.settings, l = st.location, msg = msgSpan();
  const auto = el('input', { type: 'checkbox' }); auto.checked = l.mode === 'auto';
  auto.onchange = () => { st.location.mode = auto.checked ? 'auto' : 'manual'; save(); if (auto.checked) locateMe(true).then(() => fillSettings()).catch(() => {}); };
  const ok = (c, t) => el('span', { class: c ? 'good' : 'badc', text: (c ? '✓ ' : '✗ ') + t });
  const diag = el('div', { class: 'diag' });
  const drawDiag = () => {
    const L = st.location, k = window._geoKey || {};
    diag.replaceChildren(
      el('div', {}, el('b', { text: 'ACTUELLE : ' }), (L.name || '').toUpperCase() + ' — ' + locSource(L) + (L.at ? ' · ' + ago(L.at).toLowerCase() : '')),
      el('div', {}, L.winStatus === 'ok' ? ok(1, 'Localisation Windows autorisée') : L.winStatus === 'denied' ? ok(0, 'Localisation Windows REFUSÉE — c’est la cause n°1 d’une mauvaise position') : el('span', { class: 'mid', text: '? Localisation Windows non disponible' })),
      el('div', {}, L.wifiCount > 1 ? ok(1, L.wifiCount + ' réseaux Wi-Fi visibles (servent à trianguler)') : el('span', { class: 'mid', text: '? Pas de scan Wi-Fi (Wi-Fi éteint ou localisation Windows refusée)' })),
      el('div', {}, k.hasKey ? ok(1, 'Clé Google Geolocation enregistrée (précision ±20–50 m)') : el('span', { class: 'dim', text: '– Pas de clé Google : la triangulation Wi-Fi utilise BeaconDB (gratuit, moins de couverture)' })));
  };
  try { window._geoKey = await window.qg.geoKey(); } catch (e) {}
  drawDiag();
  const key = el('input', { type: 'password', placeholder: (window._geoKey || {}).hasKey ? '•••••••• (enregistrée — laisser vide pour garder)' : 'AIza…' });
  b.append(
    el('div', { class: 'sect', text: 'DIAGNOSTIC' }), diag,
    el('div', { class: 'row', style: 'margin:8px 0 14px' },
      el('button', { class: 'btn amber', text: '⌖ RELOCALISER MAINTENANT', onclick: async () => { msg.textContent = 'LOCALISATION (≈15 s)…'; try { await locateMe(true); msg.textContent = 'OK'; drawDiag(); loadWeather().catch(() => {}); } catch (e) { msg.textContent = 'ÉCHEC : ' + errText(e); } } }),
      el('button', { class: 'btn', text: 'OUVRIR LA LOCALISATION WINDOWS', onclick: () => window.qg.openLocSettings() }), msg),
    el('div', { class: 'sect', text: 'POUR ÊTRE À ±100 m' }),
    el('ol', { class: 'seclist' },
      el('li', { text: 'Windows : Paramètres › Confidentialité et sécurité › Localisation → activer « Services de localisation » ET « Autoriser les applications de bureau à accéder à votre localisation ».' }),
      el('li', { text: 'Laisser le Wi-Fi activé (même sans être connecté) : Windows et l’app triangulent avec les bornes autour.' }),
      el('li', { text: 'Le plus précis, partout : épingle ta position sur la carte satellite ci-dessous (±10 m). Le point est mémorisé : quand la détection est floue près de là, l’app le reprend.' }),
      el('li', { text: 'Option : clé « Geolocation API » Google (console.cloud.google.com › API › Geolocation API › Identifiants). Utilisation perso largement dans le quota gratuit ; Google demande quand même une carte bancaire pour activer le compte.' })),
    el('label', {}, 'CLÉ GOOGLE GEOLOCATION (optionnel, stockée chiffrée)', key),
    el('div', { class: 'row', style: 'margin-bottom:14px' }, el('button', { class: 'btn', text: 'ENREGISTRER LA CLÉ', onclick: async () => { try { await window.qg.setGeoKey(key.value); window._geoKey = await window.qg.geoKey(); key.value = ''; drawDiag(); msg.textContent = 'CLÉ ENREGISTRÉE'; } catch (e) { msg.textContent = 'ÉCHEC : ' + errText(e); } } }),
      el('button', { class: 'btn', text: 'PAGE GOOGLE CLOUD', onclick: () => window.qg.open('https://console.cloud.google.com/apis/library/geolocation.googleapis.com') })),
    el('div', { class: 'sect', text: 'ÉPINGLER À LA MAIN (CARTE SATELLITE)' }),
    mapPicker(l, (p) => { setLocation({ ...p, mode: 'manual', accuracy: 10 }); const P = (st.pins || []).filter(x => distKm(x, p) > 0.3); P.push({ name: p.name, lat: p.lat, lon: p.lon }); st.pins = P.slice(-20); save(); drawDiag(); auto.checked = false; }, { height: 380 }),
    el('div', { class: 'sect', text: 'MISE À JOUR AUTOMATIQUE' }),
    el('label', { class: 'chk' }, auto, 'SUIVRE MA POSITION AUTOMATIQUEMENT (toutes les 30 min et au lancement)'));
}
function secActus(b) {
  const st = S.data.settings, T = st.topics, msg = msgSpan();
  const list = el('div', { class: 'topiclist' });
  const draw = () => {
    list.replaceChildren(...T.map((t, i) => {
      const col = el('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(t.color) ? t.color : '#d8d4c8', class: 'tcol' }); col.oninput = () => t.color = col.value;
      const nm = el('input', { value: t.name, maxlength: 30, class: 'tname' }); nm.oninput = () => t.name = nm.value;
      const on = el('input', { type: 'checkbox' }); on.checked = t.enabled !== false; on.onchange = () => t.enabled = on.checked;
      const kw = el('input', { value: t.keywords || '', placeholder: 'mots-clés (ex : rugby OR XV de France) — laisser vide si tu n’utilises que des flux RSS' }); kw.oninput = () => t.keywords = kw.value;
      const fd = el('textarea', { rows: 2, placeholder: 'Flux RSS (optionnel) : une source par ligne — Nom | https://…' }); fd.value = (t.feeds || []).map(f => f.name + ' | ' + f.url).join('\n');
      fd.oninput = () => t.feeds = fd.value.split('\n').map(x => x.trim()).filter(Boolean).map(x => { const [a, c] = x.includes('|') ? x.split('|') : [x, x]; return { name: a.trim().slice(0, 60), url: c.trim() }; }).filter(f => /^https:\/\//.test(f.url));
      const mv = (d) => { const j = i + d; if (j < 0 || j >= T.length) return; [T[i], T[j]] = [T[j], T[i]]; draw(); };
      return el('div', { class: 'topic', style: '--tc:' + t.color },
        el('div', { class: 'row' }, col, nm, el('label', { class: 'chk', style: 'margin:0!important' }, on, 'ACTIF'),
          el('span', { style: 'margin-left:auto' }), el('button', { class: 'rm', text: '▲', title: 'Monter', onclick: () => mv(-1) }), el('button', { class: 'rm', text: '▼', title: 'Descendre', onclick: () => mv(1) }),
          el('button', { class: 'rm', text: 'PAGE →', title: 'Ouvrir la page de ce topic', onclick: () => { st.topics = T; save(); buildCats(); openTopic(t.id); } }),
          confirmBtn('SUPPRIMER', () => { T.splice(i, 1); draw(); }, 'rm')),
        kw, fd);
    }));
  };
  draw();
  const have = () => new Set(T.map(t => t.name.toLowerCase()));
  const presets = el('div', { class: 'chips' }, ...TOPIC_PRESETS.map(p => el('button', { class: 'chipb', style: '--tc:' + p.color, text: '+ ' + PN(p), onclick: () => { if (have().has(PN(p).toLowerCase())) { flash(msg, 'DÉJÀ PRÉSENT'); return; } if (T.length >= 12) { flash(msg, '12 TOPICS MAXIMUM'); return; } T.push(mkTopic(p)); draw(); } })));
  b.append(
    el('p', { class: 'dim', text: 'Un topic = un sujet qui t’intéresse, avec sa couleur sur le globe et sa propre page (onglet TOPICS) : actus, bourse, liens, notes… Mets des mots-clés (recherche Google News, mots séparés par OR) et/ou des flux RSS. Les idées ci-dessous arrivent déjà configurées. Jusqu’à 12 topics.' }),
    el('div', { class: 'sect', text: 'MES TOPICS' }), list,
    el('div', { class: 'row', style: 'margin:10px 0 4px' }, el('button', { class: 'btn', text: '+ CRÉER UN TOPIC VIDE', onclick: () => { if (T.length >= 12) { flash(msg, '12 TOPICS MAXIMUM'); return; } T.push(mkTopic({ name: 'Nouveau topic', color: '#e4a83a', keywords: '' })); draw(); } })),
    el('div', { class: 'sect', text: 'IDÉES DE TOPICS (UN CLIC POUR AJOUTER)' }), presets,
    el('div', { class: 'row', style: 'margin-top:16px' }, el('button', { class: 'btn amber', text: 'ENREGISTRER ET RECHARGER LES ACTUS', onclick: async () => {
      st.topics = T.filter(t => (t.name || '').trim()).map(t => ({ ...t, name: t.name.trim().slice(0, 30), keywords: (t.keywords || '').trim().slice(0, 200) }));
      save(); buildCats(); flash(msg, 'CHARGEMENT…'); await loadNews().catch(() => {}); flash(msg, 'ENREGISTRÉ ✓ — ' + S.news.length + ' ACTUS');
    } }), msg));
}
async function secMails(b) {
  const st = S.data.settings, cfg = await window.qg.mailConfig(), msg = msgSpan();
  const em = el('input', { type: 'email', value: cfg.email || '', placeholder: 'toi@gmail.com' });
  const pw = el('input', { type: 'password', placeholder: cfg.hasPassword ? '•••••••• (enregistré — laisser vide pour garder)' : 'xxxx xxxx xxxx xxxx' });
  const qy = el('input', { value: st.mailQuery || 'in:inbox is:unread category:primary newer_than:14d' });
  const imp = el('input', { value: (st.importantSenders || []).join(', '), placeholder: 'ex : universite.fr, banque, rh@' });
  b.append(
    el('p', { class: 'dim' }, 'Les mails passent par un ', el('b', { text: 'mot de passe d’application' }), ' Google (16 lettres), stocké chiffré sur ce PC. Création : compte Google → Sécurité → Validation en deux étapes (activée) → Mots de passe des applications → nom « QG » → copier le code ici.'),
    el('label', {}, 'ADRESSE GMAIL', em), el('label', {}, 'MOT DE PASSE D’APPLICATION', pw),
    el('div', { class: 'sect', text: 'AFFICHAGE' }),
    el('label', {}, 'FILTRE (syntaxe de recherche Gmail)', qy), el('label', {}, 'EXPÉDITEURS IMPORTANTS (mots-clés séparés par des virgules, surlignés en doré)', imp),
    el('div', { class: 'row' },
      el('button', { class: 'btn amber', text: 'ENREGISTRER + TESTER', onclick: async () => {
        msg.textContent = 'TEST EN COURS…';
        try { await window.qg.setMailConfig({ email: em.value, password: pw.value }); } catch (e) { msg.textContent = 'ÉCHEC : ' + errText(e); return; }
        st.mailQuery = qy.value.trim() || 'in:inbox is:unread category:primary newer_than:14d';
        st.importantSenders = imp.value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 30); save();
        try { const r = await window.qg.mail(st.mailQuery); if (r.notConfigured) msg.textContent = 'ADRESSE OU MOT DE PASSE MANQUANT'; else { msg.textContent = `OK — ${r.total} NON LU(S)`; S.mail = r; renderMail(); updateStrip(); } }
        catch (e) { msg.textContent = 'ÉCHEC : ' + errText(e); }
      } }),
      el('button', { class: 'btn', text: 'OUVRIR LA PAGE GOOGLE', onclick: () => window.qg.open('https://myaccount.google.com/apppasswords') }), msg));
}
async function secDonnees(b) {
  const info = await window.qg.backupInfo(), msg = msgSpan();
  const od = el('input', { type: 'checkbox' }); od.checked = !!S.data.settings.oneDrive;
  od.onchange = async () => { S.data.settings.oneDrive = od.checked; await window.qg.setData(S.data); if (od.checked) { const d = await window.qg.backupMirror(); msg.textContent = d ? 'COPIÉ DANS ' + d : 'ONEDRIVE INTROUVABLE'; } };
  const sel = el('select', {}, ...info.files.map(f => el('option', { value: f, text: f.replace(/^qg-|\.json$/g, '') })));
  b.append(
    el('div', { class: 'sect', text: 'SAUVEGARDES AUTOMATIQUES' }),
    el('p', { class: 'dim', text: `Une copie chiffrée par jour, 30 jours gardés, dans ${info.dir}.` }),
    info.files.length ? el('label', {}, 'RESTAURER LA SAUVEGARDE DU', sel) : el('p', { class: 'dim', text: 'Aucune sauvegarde pour l’instant.' }),
    el('div', { class: 'row' }, info.files.length ? confirmBtn('RESTAURER', async () => { await window.qg.backupRestore(sel.value); location.reload(); }, 'btn') : null, el('button', { class: 'btn', text: 'OUVRIR LE DOSSIER', onclick: () => window.qg.openPath(info.dir) })),
    el('div', { class: 'sect', text: 'EXPORT / IMPORT' }),
    el('p', { class: 'dim', text: 'L’export crée un fichier lisible (non chiffré) pour changer de PC : garde-le en lieu sûr.' }),
    el('div', { class: 'row' },
      el('button', { class: 'btn amber', text: 'EXPORTER…', onclick: async () => { const f = await window.qg.backupExport(); if (f) msg.textContent = 'EXPORTÉ : ' + f; } }),
      el('button', { class: 'btn', text: 'IMPORTER…', onclick: async () => { try { if (await window.qg.backupImport()) location.reload(); } catch (e) { msg.textContent = 'ÉCHEC : ' + errText(e); } } })),
    el('div', { class: 'sect', text: 'ACCÈS DEPUIS LE TÉLÉPHONE' }),
    info.oneDrive ? el('label', { class: 'chk' }, od, 'COPIER DANS ONEDRIVE\\QG (copie NON chiffrée)') : el('p', { class: 'dim', text: 'OneDrive non détecté sur ce PC.' }),
    el('p', { class: 'dim', text: 'Ouvre ensuite QG-resume.html dans l’appli OneDrive de ton téléphone (lecture seule).' }),
    el('p', { class: 'dim', text: 'Données : ' + await window.qg.dataPath() }), msg);
}
function secSecurite(b) {
  const L = (t) => el('li', { text: t });
  b.append(
    el('div', { class: 'sect', text: 'QG' }),
    el('p', {}, 'QG · météo ici + cible, drones, actu militaire, terminal de marché.'),
    el('div', { class: 'sect', text: 'CE QUI PROTÈGE TES DONNÉES' }),
    el('ul', { class: 'seclist' },
      L('Données et mot de passe Gmail chiffrés avec ton compte Windows (DPAPI) : illisibles sur un autre PC ou par un autre utilisateur.'),
      L('Aucun compte, aucun serveur QG : rien n’est envoyé ailleurs que vers les services que tu utilises (météo, cartes, actus, Gmail).'),
      L('Interface isolée : aucun script distant, aucun accès au système depuis la page.'),
      L('Connexions HTTPS uniquement, adresses du réseau local refusées pour les flux.'),
      L('Caméra, micro, notifications et pop-ups bloqués.')),
    el('div', { class: 'sect', text: 'ZONE DANGEREUSE' }),
    el('p', { class: 'dim', text: 'Réinitialiser efface tes projets, séances, échéances, topics et réglages de cette app (une sauvegarde du jour est conservée).' }),
    confirmBtn('RÉINITIALISER L’APPLICATION', async () => {
      await window.qg.setData({ version: 1, settings: { location: { name: 'Paris', lat: 48.8566, lon: 2.3522, mode: 'manual' } }, projects: [] });
      try { localStorage.clear(); } catch (e) {}
      location.reload();
    }, 'btn danger'));
}
