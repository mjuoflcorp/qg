// QG — processus principal Electron (version perso, durcie)
const { app, BrowserWindow, ipcMain, safeStorage, shell, Menu, dialog, session } = require('electron');
const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');
const tls = require('tls');
const { execFile } = require('child_process');
const sys = require('./sys');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) QG/1.0';
const DEBUG = process.env.QG_DEBUG === '1';
const APP_URL = pathToFileURL(__dirname).href;

/* ---------------- sécurité ---------------- */
app.enableSandbox();
if (!app.requestSingleInstanceLock()) app.quit();
// Chiffrement au repos des données (DPAPI Windows via safeStorage)
const ENC_PREFIX = 'QGENC1:';
function encodeStore(obj) {
  const json = JSON.stringify(obj);
  if (safeStorage.isEncryptionAvailable()) return ENC_PREFIX + safeStorage.encryptString(json).toString('base64');
  return json;
}
function decodeStore(txt) {
  txt = String(txt || '');
  if (txt.startsWith(ENC_PREFIX)) return JSON.parse(safeStorage.decryptString(Buffer.from(txt.slice(ENC_PREFIX.length), 'base64')));
  return JSON.parse(txt);
}
function validData(d) {
  return d && typeof d === 'object' && !Array.isArray(d) && d.settings && typeof d.settings === 'object' && Array.isArray(d.projects);
}
// Hôtes locaux / privés interdits pour les requêtes sortantes (sources RSS saisies par l'utilisateur)
function safeHost(u) {
  let h; try { h = new URL(u).hostname.toLowerCase(); } catch (e) { return false; }
  if (!h || h === 'localhost' || h.endsWith('.local') || h.endsWith('.localhost') || h.endsWith('.internal')) return false;
  if (/^\[?(::1|::|fe80:|fc|fd)/.test(h)) return false;
  if (/^(0|10|127)\./.test(h) || /^169\.254\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)) return false;
  return true;
}
// Seule l'interface de l'app (fichiers locaux) peut appeler le processus principal
function handle(channel, fn) {
  ipcMain.handle(channel, (e, ...args) => {
    const url = e.senderFrame && e.senderFrame.url;
    if (!url || !url.startsWith(APP_URL)) throw new Error('Appel refusé');
    return fn(e, ...args);
  });
}
const dataFile = () => path.join(app.getPath('userData'), 'qg-data.json');
const mailFile = () => path.join(app.getPath('userData'), 'qg-mail.json');

/* ---------------- données locales ---------------- */
function saveData(d) {
  const f = dataFile();
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f + '.tmp', encodeStore(d), 'utf8');
  if (fs.existsSync(f)) fs.copyFileSync(f, f + '.bak');
  fs.renameSync(f + '.tmp', f);
}
/* ---------------- sauvegardes ---------------- */
const backupDir = () => path.join(app.getPath('userData'), 'sauvegardes');
function dailyBackup(d) {
  try {
    fs.mkdirSync(backupDir(), { recursive: true });
    const day = new Date().toISOString().slice(0, 10);
    const f = path.join(backupDir(), `qg-${day}.json`);
    fs.writeFileSync(f, encodeStore(d), 'utf8');
    const all = fs.readdirSync(backupDir()).filter(x => /^qg-\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort();
    for (const old of all.slice(0, Math.max(0, all.length - 30))) fs.unlinkSync(path.join(backupDir(), old));
  } catch (e) {}
}
function oneDriveDir() {
  const cands = [process.env.OneDrive, process.env.OneDriveConsumer, path.join(app.getPath('home'), 'OneDrive')].filter(Boolean);
  return cands.find(p => { try { return fs.statSync(p).isDirectory(); } catch (e) { return false; } }) || null;
}
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function summaryHtml(d) {
  // Résumé lisible sur téléphone (OneDrive) : projets, échéances, entraînement, batteries
  const st = { encours: 'En cours', idee: 'Idée', pause: 'En pause', termine: 'Terminé' };
  const fmt = (iso) => { const x = new Date(iso); return isNaN(x) ? '' : x.toLocaleDateString('fr-FR'); };
  const proj = (d.projects || []).map(p => `<h3>${esc(p.name)} <small>${esc(st[p.status] || '')} · ${p.progress || 0}%</small></h3>
    ${p.next ? `<p>→ ${esc(p.next)}</p>` : ''}
    ${(p.tasks || []).length ? '<ul>' + p.tasks.map(t => `<li>${t.done ? '☑' : '☐'} ${esc(t.text)}</li>`).join('') + '</ul>' : ''}
    ${(p.shopping || []).filter(s => s.status !== 'recu').length ? '<p><b>À acheter :</b> ' + p.shopping.filter(s => s.status !== 'recu').map(s => esc(s.item) + (s.price ? ` (${s.price} €)` : '')).join(', ') + '</p>' : ''}
    ${(p.logs || []).slice(-3).reverse().map(l => `<p class="log">${fmt(l.date)} — ${esc(l.text)}</p>`).join('')}`).join('');
  const dl = (d.deadlines || []).filter(x => new Date(x.date) >= new Date(Date.now() - 864e5)).sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(x => `<li>${fmt(x.date)} — ${esc(x.title)} (J-${Math.max(0, Math.ceil((new Date(x.date) - Date.now()) / 864e5))})</li>`).join('');
  const tr = ((d.training || {}).sessions || []).slice(-8).reverse().map(s => `<li>${fmt(s.date)} — ${esc(s.type)} ${s.distance ? s.distance + ' m' : ''} ${s.duration ? Math.floor(s.duration / 60) + ':' + String(s.duration % 60).padStart(2, '0') : ''} ${s.load ? s.load + ' kg' : ''}</li>`).join('');
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QG — résumé</title>
<style>body{background:#07080a;color:#d8d4c8;font:15px/1.5 Consolas,monospace;padding:14px;max-width:720px;margin:auto}h1,h2{color:#e4a83a}h2{border-bottom:1px solid #2a2f38;padding-bottom:4px;margin-top:28px}h3{margin:16px 0 4px}small{color:#9a968b;font-weight:400}.log{color:#9a968b;font-size:13px;margin:2px 0}ul{padding-left:18px}</style></head>
<body><h1>&gt; QG_${esc(((d.settings || {}).profile || {}).callsign || '')}</h1><p>Sauvegarde du ${new Date().toLocaleString('fr-FR')} — lecture seule.</p>
<h2>ÉCHÉANCES</h2><ul>${dl || '<li>Aucune</li>'}</ul><h2>PROJETS</h2>${proj}<h2>ENTRAÎNEMENT (récent)</h2><ul>${tr || '<li>—</li>'}</ul></body></html>`;
}
function mirrorOneDrive(d) {
  if (!d.settings || !d.settings.oneDrive) return null;
  const od = oneDriveDir(); if (!od) return null;
  const dir = path.join(od, 'QG');
  try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'qg-donnees.json'), JSON.stringify(d, null, 2), 'utf8'); fs.writeFileSync(path.join(dir, 'QG-resume.html'), summaryHtml(d), 'utf8'); return dir; } catch (e) { return null; }
}
let mirrorT = null;
function afterSave(d) { dailyBackup(d); clearTimeout(mirrorT); mirrorT = setTimeout(() => mirrorOneDrive(d), 4000); }

function loadData() {
  try { return decodeStore(fs.readFileSync(dataFile(), 'utf8')); }
  catch (e) {
    try { return decodeStore(fs.readFileSync(dataFile() + '.bak', 'utf8')); } catch (_) {}
    const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed.json'), 'utf8'));
    saveData(seed);
    return seed;
  }
}

/* ---------------- réseau ---------------- */
async function getText(url) {
  if (!/^https:\/\//i.test(url) || !safeHost(url)) throw new Error('URL refusée');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' }, signal: ctrl.signal, redirect: 'follow' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    if (r.url && !safeHost(r.url)) throw new Error('Redirection refusée');
    const len = Number(r.headers.get('content-length') || 0); if (len > 15e6) throw new Error('Réponse trop volumineuse');
    const txt = await r.text(); if (txt.length > 15e6) throw new Error('Réponse trop volumineuse');
    return txt;
  } finally { clearTimeout(t); }
}

async function getWeather(lat, lon) {
  const q = `latitude=${lat}&longitude=${lon}&timezone=Europe%2FParis&forecast_days=3`;
  const fx = JSON.parse(await getText(`https://api.open-meteo.com/v1/forecast?${q}&current=temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,sunrise,sunset`));
  let marine = null;
  try { marine = JSON.parse(await getText(`https://marine-api.open-meteo.com/v1/marine?${q}&daily=wave_height_max,wave_direction_dominant&current=sea_surface_temperature,wave_height`)); } catch (e) {}
  return { fx, marine, at: new Date().toISOString() };
}


/* ---------------- position + géocodage (OpenStreetMap / Nominatim) ---------------- */
const geoCacheFile = () => path.join(app.getPath('userData'), 'qg-geocache.json');
let geoCache = null;
function gc() { if (!geoCache) { try { geoCache = JSON.parse(fs.readFileSync(geoCacheFile(), 'utf8')); } catch (e) { geoCache = {}; } } return geoCache; }
let gcSaveT = null;
function gcSave() { clearTimeout(gcSaveT); gcSaveT = setTimeout(() => { try { fs.writeFileSync(geoCacheFile(), JSON.stringify(geoCache), 'utf8'); } catch (e) {} }, 1500); }
// Nominatim : 1 requête / seconde maximum -> file d'attente
let nomChain = Promise.resolve();
function nominatim(url) {
  const run = nomChain.then(async () => {
    try { return JSON.parse(await getText(url)); }
    finally { await new Promise(r => setTimeout(r, 1100)); }
  });
  nomChain = run.catch(() => {});
  return run;
}
const PLACE_TYPES = new Set(['city', 'town', 'village', 'hamlet', 'suburb', 'municipality', 'administrative', 'state', 'region', 'province', 'county', 'island', 'archipelago', 'strait', 'sea', 'bay', 'peninsula', 'mountain', 'valley', 'military', 'aerodrome', 'airport', 'naval_base', 'port', 'river', 'locality', 'district', 'borough', 'quarter', 'neighbourhood']);
async function geoSearch(q, cc) {
  const key = (cc || '*') + '|' + q.toLowerCase();
  const c = gc();
  if (key in c) return c[key];
  let res = null;
  try {
    const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&accept-language=' + UI_LANG + '&q=' + encodeURIComponent(q) + (cc ? '&countrycodes=' + cc : '');
    const arr = await nominatim(url);
    const hit = (arr || []).find(r => PLACE_TYPES.has(r.type) || PLACE_TYPES.has(r.addresstype) || r.category === 'place' || r.category === 'boundary');
    if (hit && (cc || Number(hit.importance) >= 0.45)) res = { lat: Number(hit.lat), lon: Number(hit.lon), name: hit.name || q, country: String(hit.display_name || '').split(',').pop().trim(), type: hit.addresstype || hit.type };
  } catch (e) { return null; } // erreur réseau : on ne met pas en cache
  c[key] = res; gcSave();
  return res;
}
async function reverseName(lat, lon) {
  try {
    const r = await nominatim(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=${UI_LANG}&lat=${lat}&lon=${lon}`);
    const a = r.address || {};
    return a.city || a.town || a.village || a.municipality || a.county || r.name || '';
  } catch (e) { return ''; }
}
let winStatus = 'unknown';
function locateWindows() {
  // Service de localisation de Windows (GPS / Wi-Fi). Doit être activé : Paramètres > Confidentialité > Localisation.
  const ps = "Add-Type -AssemblyName System.Device; $w = New-Object System.Device.Location.GeoCoordinateWatcher([System.Device.Location.GeoPositionAccuracy]::High); $w.Start(); $t=0; while(($w.Status -ne 'Ready') -and ($w.Permission -ne 'Denied') -and ($t -lt 120)){ Start-Sleep -Milliseconds 100; $t++ }; $l=$w.Position.Location; if($w.Permission -eq 'Denied'){ 'DENIED' } elseif($l.IsUnknown){ 'NONE' } else { $ci=[cultureinfo]::InvariantCulture; $l.Latitude.ToString($ci)+';'+$l.Longitude.ToString($ci)+';'+$l.HorizontalAccuracy.ToString($ci) }; $w.Stop()";
  return new Promise(resolve => {
    if (process.platform !== 'win32') return resolve(null);
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', ps], { timeout: 20000, windowsHide: true }, (err, out) => {
      const s = String(out || '').trim().split(/\r?\n/).pop();
      const m = s && s.match(/^(-?[\d.]+);(-?[\d.]+);([\d.]+|NaN)$/);
      if (s === 'DENIED') winStatus = 'denied'; else if (!m) winStatus = 'unavailable'; else winStatus = 'ok';
      resolve(m ? { lat: Number(m[1]), lon: Number(m[2]), accuracy: Number(m[3]) || null, source: 'windows' } : null);
    });
  });
}
async function locateIP() {
  try { const j = JSON.parse(await getText('https://ipwho.is/?lang=fr')); if (j.success !== false && j.latitude != null) return { lat: j.latitude, lon: j.longitude, name: j.city || '', accuracy: 5000, source: 'ip' }; } catch (e) {}
  try { const j = JSON.parse(await getText('https://ipapi.co/json/')); if (j.latitude != null) return { lat: j.latitude, lon: j.longitude, name: j.city || '', accuracy: 5000, source: 'ip' }; } catch (e) {}
  return null;
}
/* --- Localisation précise ---
   1) Windows (API Geolocator : GPS / Wi-Fi Microsoft, ±10–100 m si la localisation Windows est activée)
   2) Wi-Fi environnant → Google Geolocation (si clé API) ou BeaconDB (libre)
   3) adresse IP (secours, plusieurs km) */
const WINRT_PS = [
  "$ErrorActionPreference='Stop'",
  'try {',
  'Add-Type -AssemblyName System.Runtime.WindowsRuntime',
  "$m=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1",
  'function Await($op,$t){ $task=$m.MakeGenericMethod($t).Invoke($null,@($op)); if(-not $task.Wait(16000)){ throw "TIMEOUT" }; $task.Result }',
  '$null=[Windows.Devices.Geolocation.Geolocator,Windows.Devices.Geolocation,ContentType=WindowsRuntime]',
  '$acc=Await ([Windows.Devices.Geolocation.Geolocator]::RequestAccessAsync()) ([Windows.Devices.Geolocation.GeolocationAccessStatus])',
  "if([string]$acc -ne 'Allowed'){ 'DENIED'; exit }",
  '$g=New-Object Windows.Devices.Geolocation.Geolocator',
  '$g.DesiredAccuracyInMeters=5',
  '$p=Await ($g.GetGeopositionAsync([TimeSpan]::FromSeconds(20),[TimeSpan]::FromSeconds(14))) ([Windows.Devices.Geolocation.Geoposition])',
  '$c=$p.Coordinate; $ci=[cultureinfo]::InvariantCulture',
  "'OK;'+$c.Point.Position.Latitude.ToString($ci)+';'+$c.Point.Position.Longitude.ToString($ci)+';'+$c.Accuracy.ToString($ci)+';'+$c.PositionSource",
  "} catch { 'ERR;'+$_.Exception.Message }"].join('\n');
function locateWinRT() {
  return new Promise(resolve => {
    if (process.platform !== 'win32') return resolve(null);
    const enc = Buffer.from(WINRT_PS, 'utf16le').toString('base64');
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', enc], { timeout: 25000, windowsHide: true }, (err, out) => {
      const s = String(out || '').trim().split(/\r?\n/).pop() || '';
      if (s === 'DENIED') { winStatus = 'denied'; return resolve(null); }
      const m = s.match(/^OK;(-?[\d.]+);(-?[\d.]+);([\d.]+);(\w+)/);
      if (!m) { if (winStatus !== 'denied') winStatus = 'unavailable'; return resolve(null); }
      winStatus = 'ok';
      resolve({ lat: Number(m[1]), lon: Number(m[2]), accuracy: Number(m[3]) || null, source: 'windows', via: m[4] });
    });
  });
}
async function postJSON(url, body) {
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': UA }, body: JSON.stringify(body), signal: ctrl.signal });
    const txt = await r.text(); if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + txt.slice(0, 120));
    return JSON.parse(txt);
  } finally { clearTimeout(t); }
}
const keyFile = () => path.join(app.getPath('userData'), 'qg-keys.json');
function readGeoKey() { try { const c = JSON.parse(fs.readFileSync(keyFile(), 'utf8')); return c.gkey && safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(Buffer.from(c.gkey, 'base64')) : ''; } catch (e) { return ''; } }
function writeGeoKey(k) {
  k = String(k || '').trim(); if (k && !/^[A-Za-z0-9_\-]{20,60}$/.test(k)) throw new Error('Clé API invalide');
  if (k && !safeStorage.isEncryptionAvailable()) throw new Error('Chiffrement Windows indisponible.');
  fs.mkdirSync(path.dirname(keyFile()), { recursive: true });
  fs.writeFileSync(keyFile(), JSON.stringify(k ? { gkey: safeStorage.encryptString(k).toString('base64') } : {}), 'utf8');
}
let lastWifi = null;
async function locateWifi() {
  let scan; try { scan = await sys.wifiScan(); } catch (e) { return null; }
  const aps = (scan.nets || []).filter(n => /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(n.bssid)).slice(0, 20)
    .map(n => ({ macAddress: n.bssid.toLowerCase(), signalStrength: Math.round(n.signal / 2 - 100) }));
  lastWifi = aps.length;
  if (aps.length < 2) return null;
  const key = readGeoKey();
  try {
    if (key) { const j = await postJSON('https://www.googleapis.com/geolocation/v1/geolocate?key=' + encodeURIComponent(key), { considerIp: false, wifiAccessPoints: aps });
      if (j.location) return { lat: j.location.lat, lon: j.location.lng, accuracy: j.accuracy, source: 'wifi', via: 'Google' }; }
  } catch (e) {}
  try { const j = await postJSON('https://api.beacondb.net/v1/geolocate', { considerIp: false, wifiAccessPoints: aps });
    if (j.location) return { lat: j.location.lat, lon: j.location.lng, accuracy: j.accuracy, source: 'wifi', via: 'BeaconDB' }; } catch (e) {}
  return null;
}
async function locate() {
  const [win, ip] = await Promise.all([locateWinRT().then(r => r || locateWindows()), locateIP()]);
  let best = win && win.via !== 'IPAddress' ? win : null;
  if (!best || !(best.accuracy <= 150)) {
    const wf = await locateWifi();
    if (wf && (!best || wf.accuracy < best.accuracy)) best = wf;
  }
  if (!best) best = win || ip;
  if (!best) throw new Error('Position introuvable : active la localisation Windows (Paramètres › Confidentialité › Localisation).');
  best.winStatus = winStatus; best.wifiCount = lastWifi;
  if (!best.name) best.name = await reverseName(best.lat, best.lon);
  best.at = new Date().toISOString();
  return best;
}

/* ---------------- Gmail (IMAP minimal, mot de passe d'application) ---------------- */
function readMailCfg() {
  try {
    const c = JSON.parse(fs.readFileSync(mailFile(), 'utf8'));
    let password = '';
    if (c.enc && safeStorage.isEncryptionAvailable()) password = safeStorage.decryptString(Buffer.from(c.enc, 'base64'));
    else if (c.plain) password = Buffer.from(c.plain, 'base64').toString('utf8');
    return { email: c.email || '', password };
  } catch (e) { return { email: '', password: '' }; }
}
function writeMailCfg({ email, password }) {
  const old = readMailCfg();
  const pw = password ? password.replace(/\s+/g, '') : old.password;
  const out = { email: (email || '').trim() };
  if (pw) {
    if (safeStorage.isEncryptionAvailable()) out.enc = safeStorage.encryptString(pw).toString('base64');
    else throw new Error('Chiffrement Windows indisponible : mot de passe non enregistré.');
  }
  fs.mkdirSync(path.dirname(mailFile()), { recursive: true });
  fs.writeFileSync(mailFile(), JSON.stringify(out), 'utf8');
}

function decodeWords(s) {
  // Les en-têtes bruts arrivent en latin1 : on les repasse en UTF-8, puis on décode =?charset?B/Q?...?=
  s = Buffer.from(s, 'latin1').toString('utf8');
  s = s.replace(/\r\n[ \t]+/g, ' ');
  s = s.replace(/(=\?[^?]+\?[BbQq]\?[^?]*\?=)\s+(?==\?)/g, '$1');
  return s.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (m, cs, enc, txt) => {
    try {
      let bytes;
      if (enc.toUpperCase() === 'B') bytes = Buffer.from(txt, 'base64');
      else bytes = Buffer.from(txt.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1');
      return new TextDecoder(cs.toLowerCase().replace('utf8', 'utf-8')).decode(bytes);
    } catch (e) { return m; }
  }).trim();
}

function imapFetch(user, pass, rawQuery) {
  return new Promise((resolve, reject) => {
    const sock = tls.connect({ host: 'imap.gmail.com', port: 993, servername: 'imap.gmail.com' });
    sock.setEncoding('latin1');
    let buf = '', n = 0, pending = null, greeted = false, done = false;
    const finish = (err, val) => { if (done) return; done = true; clearTimeout(timer); try { sock.end(); } catch (e) {} err ? reject(err) : resolve(val); };
    const timer = setTimeout(() => { finish(new Error('Gmail ne répond pas (délai dépassé).')); sock.destroy(); }, 25000);
    const check = () => {
      if (!greeted) { if (/^\* (OK|PREAUTH)/m.test(buf)) { greeted = true; buf = ''; step(); } return; }
      if (!pending) return;
      const re = new RegExp('(?:^|\\r\\n)' + pending.tag + ' (OK|NO|BAD)([^\\r\\n]*)\\r\\n');
      const m = buf.match(re);
      if (m) { const out = buf; buf = ''; const p = pending; pending = null; m[1] === 'OK' ? p.res(out) : p.rej(new Error(m[1] + m[2])); }
    };
    const cmd = (c) => new Promise((res, rej) => { const tag = 'Q' + (++n); pending = { tag, res, rej }; sock.write(tag + ' ' + c + '\r\n'); });
    const q = (s) => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    sock.on('data', (d) => { buf += d; check(); });
    sock.on('error', (e) => finish(new Error('Connexion Gmail impossible : ' + e.message)));
    async function step() {
      try {
        try { await cmd('LOGIN ' + q(user) + ' ' + q(pass)); }
        catch (e) {
          const why = String(e.message || '');
          let hint = 'vérifie l\'adresse et le mot de passe d\'application.';
          if (/Application-specific password required/i.test(why)) hint = 'tu as mis ton mot de passe Gmail normal : il faut un MOT DE PASSE D\'APPLICATION (16 lettres).';
          else if (/AUTHENTICATIONFAILED|Invalid credentials/i.test(why)) hint = 'adresse ou mot de passe d\'application incorrect (ou révoqué) : recrée-en un et colle-le.';
          else if (/WEBALERT|web login required/i.test(why)) hint = 'Google bloque la connexion par sécurité : ouvre gmail.com dans ton navigateur, valide l\'alerte de sécurité, puis réessaie.';
          throw new Error('Gmail refuse la connexion — ' + hint + ' [réponse Gmail : ' + why.replace(/^NO\s*/, '').slice(0, 140) + ']');
        }
        await cmd('EXAMINE INBOX');
        const s = await cmd('UID SEARCH X-GM-RAW ' + q(rawQuery));
        const line = (s.match(/^\* SEARCH([^\r\n]*)/m) || [, ''])[1].trim();
        const uids = line ? line.split(/\s+/).map(Number).filter(Boolean) : [];
        const total = uids.length;
        const last = uids.slice(-20);
        let mails = [];
        if (last.length) {
          const f = await cmd('UID FETCH ' + last.join(',') + ' (UID X-GM-THRID BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])');
          const chunks = f.split(/\r\n(?=\* \d+ FETCH)/);
          for (const ch of chunks) {
            if (!/FETCH/.test(ch)) continue;
            const uid = (ch.match(/UID (\d+)/) || [])[1];
            const thr = (ch.match(/X-GM-THRID (\d+)/) || [])[1];
            const hdr = (name) => { const m = ch.match(new RegExp('^' + name + ':[ \\t]*((?:.*)(?:\\r\\n[ \\t].*)*)', 'mi')); return m ? decodeWords(m[1]) : ''; };
            const from = hdr('From');
            const fm = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/);
            mails.push({
              uid: Number(uid), fromName: fm ? (fm[1].trim() || fm[2]) : from, fromEmail: fm ? fm[2] : from,
              subject: hdr('Subject'), date: hdr('Date'),
              url: thr ? 'https://mail.google.com/mail/u/0/#all/' + BigInt(thr).toString(16) : 'https://mail.google.com/mail/u/0/#inbox'
            });
          }
          mails.sort((a, b) => b.uid - a.uid);
        }
        try { await cmd('LOGOUT'); } catch (e) {}
        finish(null, { total, mails, at: new Date().toISOString() });
      } catch (e) { finish(e); }
    }
  });
}

/* ---------------- fenêtre ---------------- */
function createWindow() {
  const win = new BrowserWindow({
    width: 1600, height: 960, minWidth: 1200, minHeight: 760,
    backgroundColor: '#07080a', title: 'QG', autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, devTools: DEBUG, spellcheck: false }
  });
  win.maximize();
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) { e.preventDefault(); if (/^https:\/\//i.test(url)) shell.openExternal(url); } });
  win.webContents.on('before-input-event', (e, input) => {
    if (DEBUG && input.type === 'keyDown' && input.key === 'F12') win.webContents.toggleDevTools();
  });
}

app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
app.on('web-contents-created', (e, wc) => {
  wc.on('will-attach-webview', (ev) => ev.preventDefault());
  wc.setWindowOpenHandler(({ url }) => { if (/^https:\/\//i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  wc.on('will-navigate', (ev, url) => { if (!url.startsWith(APP_URL)) ev.preventDefault(); });
});
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  // aucune permission navigateur (caméra, micro, géoloc web, notifications…) : tout est refusé
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.webRequest.onHeadersReceived((d, cb) => cb({ responseHeaders: { ...d.responseHeaders, 'X-Content-Type-Options': ['nosniff'] } }));
  handle('data:get', () => loadData());
  handle('data:set', (e, d) => { if (!validData(d) || JSON.stringify(d).length > 20e6) throw new Error('Données invalides'); saveData(d); afterSave(d); return true; });
  handle('data:path', () => dataFile());
  handle('net:text', (e, url) => getText(url));
  handle('net:weather', (e, lat, lon) => getWeather(Number(lat), Number(lon)));
  handle('net:flightwx', async (e, lat, lon) => {
    lat = Number(lat); lon = Number(lon); if (!isFinite(lat) || !isFinite(lon)) throw new Error('Coordonnées invalides');
    const q = `latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&timezone=auto`;
    const fx = JSON.parse(await getText(`https://api.open-meteo.com/v1/forecast?${q}&forecast_days=7&wind_speed_unit=kmh`
      + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,pressure_msl,cloud_cover,visibility,is_day,precipitation'
      + '&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,weather_code,visibility,cloud_cover,cloud_cover_low,wind_speed_10m,wind_gusts_10m,wind_direction_10m,wind_speed_80m,wind_speed_120m,pressure_msl,is_day'
      + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,sunrise,sunset,uv_index_max'));
    let marine = null; try { marine = JSON.parse(await getText(`https://marine-api.open-meteo.com/v1/marine?${q}&forecast_days=3&current=wave_height,sea_surface_temperature&hourly=wave_height,wave_period,wave_direction,swell_wave_height,sea_surface_temperature,sea_level_height_msl`)); } catch (err) {}
    if (marine && marine.hourly && !(marine.hourly.wave_height || []).some(v => v != null)) marine = null;
    let kp = null; try { kp = JSON.parse(await getText('https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json')); } catch (err) {}
    return { fx, marine, kp, lat, lon, at: new Date().toISOString() };
  });
  handle('mail:config:get', () => { const c = readMailCfg(); return { email: c.email, hasPassword: !!c.password }; });
  handle('mail:config:set', (e, cfg) => { writeMailCfg(cfg || {}); return true; });
  handle('mail:fetch', async (e, query) => {
    const c = readMailCfg();
    if (!c.email || !c.password) return { notConfigured: true };
    return imapFetch(c.email, c.password, query || 'in:inbox is:unread category:primary newer_than:14d');
  });
  handle('world', async () => {
    try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'vendor', 'countries-110m.json'), 'utf8')); } catch (e) {}
    try { return JSON.parse(await getText('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')); } catch (e) { return null; }
  });
  handle('geo:locate', () => locate());
  let UI_LANG = 'fr';
handle('app:lang', (e, l) => { UI_LANG = l === 'en' ? 'en' : 'fr'; return true; });
handle('geo:reverse', (e, lat, lon) => { lat = Number(lat); lon = Number(lon); if (!isFinite(lat) || !isFinite(lon)) return ''; return reverseName(lat, lon); });
  handle('geo:resolve', async (e, url) => {
    // liens courts Google Maps (maps.app.goo.gl) -> URL finale contenant les coordonnées
    let u; try { u = new URL(String(url)); } catch (err) { return null; }
    if (u.protocol !== 'https:' || !/^(maps\.app\.goo\.gl|goo\.gl|(www\.)?google\.[a-z.]+|maps\.google\.[a-z.]+)$/.test(u.hostname)) return null;
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 10000);
    try { const r = await fetch(u.href, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: ctrl.signal }); return r.url; } catch (err) { return null; } finally { clearTimeout(t); }
  });
  handle('geo:search', (e, q, cc) => geoSearch(String(q || '').slice(0, 120), /^[a-z]{2}(,[a-z]{2}){0,5}$/.test(String(cc || '')) ? String(cc) : ''));
  for (const k of ['info', 'live', 'procs', 'net', 'wifiScan', 'ports', 'ping', 'speed']) handle('sys:' + k, (e, a) => sys[k](a));
  handle('sys:lan', (e, scan) => sys.lan(!!scan));
  handle('net:public', async () => { try { return JSON.parse(await getText('https://ipwho.is/?lang=fr')); } catch (e) { return null; } });
  handle('backup:info', () => {
    let files = []; try { files = fs.readdirSync(backupDir()).filter(x => /\.json$/.test(x)).sort().reverse(); } catch (err) {}
    return { dir: backupDir(), files, oneDrive: oneDriveDir() };
  });
  handle('backup:export', async () => {
    const r = await dialog.showSaveDialog({ title: 'Exporter les données QG', defaultPath: path.join(app.getPath('documents'), `QG-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`), filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (r.canceled || !r.filePath) return null;
    fs.writeFileSync(r.filePath, JSON.stringify(loadData(), null, 2), 'utf8'); return r.filePath;
  });
  handle('backup:import', async () => {
    const r = await dialog.showOpenDialog({ title: 'Importer une sauvegarde QG', filters: [{ name: 'JSON', extensions: ['json'] }], properties: ['openFile'] });
    if (r.canceled || !r.filePaths[0]) return null;
    let d; try { d = decodeStore(fs.readFileSync(r.filePaths[0], 'utf8')); } catch (err) { throw new Error('Fichier illisible.'); }
    if (!validData(d)) throw new Error('Ce fichier n\'est pas une sauvegarde QG.');
    dailyBackup(loadData()); saveData(d); return true;
  });
  handle('backup:restore', (e, name) => {
    if (!/^qg-\d{4}-\d{2}-\d{2}\.json$/.test(name)) throw new Error('Nom invalide');
    const d = decodeStore(fs.readFileSync(path.join(backupDir(), name), 'utf8')); if (!validData(d)) throw new Error('Sauvegarde invalide'); saveData(d); return true;
  });
  handle('backup:mirror', () => mirrorOneDrive(loadData()));
  handle('open-path', (e, p) => { if (p && (p.startsWith(app.getPath('userData')) || (oneDriveDir() && p.startsWith(oneDriveDir())))) shell.openPath(p); });
  handle('open', (e, url) => { if (/^https:\/\//i.test(url)) shell.openExternal(url); });
  handle('open-locsettings', () => shell.openExternal('ms-settings:privacy-location'));
  handle('geo:key', () => ({ hasKey: !!readGeoKey() }));
  handle('geo:key:set', (e, k) => { writeGeoKey(k); return true; });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => app.quit());
