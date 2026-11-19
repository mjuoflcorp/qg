/* QG — interface */
'use strict';
// replaceChildren ignore les valeurs null/false (contenus conditionnels)
{ const rc = Element.prototype.replaceChildren; Element.prototype.replaceChildren = function (...k) { return rc.apply(this, k.flat().filter(x => x != null && x !== false)); }; }
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
const pad = (n) => String(n).padStart(2, '0');
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const uid = () => Math.random().toString(36).slice(2, 10);
const strip = (html) => { const d = new DOMParser().parseFromString('<div>' + (html || '') + '</div>', 'text/html'); return (d.body.textContent || '').replace(/\s+/g, ' ').trim(); };
function ago(iso) {
  const t = new Date(iso).getTime(); if (!t) return '';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "À L'INSTANT"; if (m < 60) return `IL Y A ${m} MIN`;
  const h = Math.round(m / 60); if (h < 24) return `IL Y A ${h} H`;
  return `IL Y A ${Math.round(h / 24)} J`;
}
function fmtDate(iso, withTime = true) {
  const d = new Date(iso); if (isNaN(d)) return '';
  const s = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  return withTime ? `${s} ${pad(d.getHours())}:${pad(d.getMinutes())}` : s;
}
function shortTime(iso) {
  const d = new Date(iso); if (isNaN(d)) return '';
  return new Date().toDateString() === d.toDateString() ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
}
/* ---------------- topics d'actualité (définis par l'utilisateur) ---------------- */
const F = (name, url) => ({ name, url }), Lk = F;
const TOPIC_PRESETS = [
  { en: { name: 'World', keywords: '', feeds: [F('BBC World', 'https://feeds.bbci.co.uk/news/world/rss.xml'), F('Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml'), F('NPR World', 'https://feeds.npr.org/1004/rss.xml')], links: [Lk('BBC World', 'https://www.bbc.com/news/world'), Lk('AP News', 'https://apnews.com/world-news'), Lk('Al Jazeera', 'https://www.aljazeera.com/')] }, kind: 'monde', name: 'Monde', color: '#d8d4c8', keywords: '', w: { quakes: true },
    feeds: [F('France 24', 'https://www.france24.com/fr/rss'), F('Le Monde International', 'https://www.lemonde.fr/international/rss_full.xml'), F('BBC World', 'https://feeds.bbci.co.uk/news/world/rss.xml')],
    links: [Lk('Le Monde International', 'https://www.lemonde.fr/international/'), Lk('Courrier international', 'https://www.courrierinternational.com/'), Lk('Reuters', 'https://www.reuters.com/world/')] },
  { en: { name: 'France', keywords: 'France', feeds: [F('France 24 English', 'https://www.france24.com/en/rss')], links: [Lk('France 24', 'https://www.france24.com/en/'), Lk('The Local France', 'https://www.thelocal.fr/')] }, kind: 'france', name: 'France', color: '#4fa8ff', keywords: 'France actualité',
    feeds: [F('franceinfo', 'https://www.francetvinfo.fr/titres.rss'), F('Le Monde — À la une', 'https://www.lemonde.fr/rss/une.xml')],
    links: [Lk('franceinfo', 'https://www.francetvinfo.fr/'), Lk('Vie publique', 'https://www.vie-publique.fr/'), Lk('Service-Public.fr', 'https://www.service-public.fr/')] },
  { en: { name: 'Economy', keywords: 'economy OR stock market OR business', w: { markets: true, watch: ['VT', 'SPY', 'AAPL', 'MSFT'] }, feeds: [F('BBC Business', 'https://feeds.bbci.co.uk/news/business/rss.xml'), F('CNBC', 'https://www.cnbc.com/id/100003114/device/rss/rss.html')], links: [Lk('Yahoo Finance', 'https://finance.yahoo.com/'), Lk('Investing.com', 'https://www.investing.com/'), Lk('Bloomberg', 'https://www.bloomberg.com/markets')] }, kind: 'eco', name: 'Économie', color: '#6cc47f', keywords: 'économie OR bourse OR entreprises', w: { markets: true, watch: ['CW8.PA', 'MC.PA', 'TTE.PA', 'AIR.PA'] },
    feeds: [F('Le Monde Économie', 'https://www.lemonde.fr/economie/rss_full.xml'), F('BBC Business', 'https://feeds.bbci.co.uk/news/business/rss.xml')],
    links: [Lk('Boursorama', 'https://www.boursorama.com/'), Lk('Les Echos', 'https://www.lesechos.fr/'), Lk('Investing.com', 'https://fr.investing.com/'), Lk('AMF', 'https://www.amf-france.org/')] },
  { en: { name: 'Tech', keywords: 'technology OR artificial intelligence OR smartphone', feeds: [F('Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index'), F('The Verge', 'https://www.theverge.com/rss/index.xml')], links: [Lk('The Verge', 'https://www.theverge.com/'), Lk('Ars Technica', 'https://arstechnica.com/'), Lk('TechCrunch', 'https://techcrunch.com/')] }, kind: 'tech', name: 'Tech', color: '#b07cff', keywords: 'technologie OR intelligence artificielle OR smartphone', w: { hn: true, watch: ['NVDA', 'AAPL', 'MSFT', 'ASML.AS'] },
    feeds: [F('Le Monde Pixels', 'https://www.lemonde.fr/pixels/rss_full.xml'), F('Numerama', 'https://www.numerama.com/feed/'), F('Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index')],
    links: [Lk('Numerama', 'https://www.numerama.com/'), Lk('Frandroid', 'https://www.frandroid.com/'), Lk('The Verge', 'https://www.theverge.com/')] },
  { en: { name: 'Science', keywords: 'science OR discovery OR research', feeds: [F('ScienceDaily', 'https://www.sciencedaily.com/rss/all.xml'), F('BBC Science', 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml')], links: [Lk('Nature', 'https://www.nature.com/'), Lk('New Scientist', 'https://www.newscientist.com/'), Lk('ScienceDaily', 'https://www.sciencedaily.com/')] }, kind: 'science', name: 'Science', color: '#38d6c4', keywords: 'science OR découverte OR recherche scientifique', w: { quakes: true },
    feeds: [F('Le Monde Sciences', 'https://www.lemonde.fr/sciences/rss_full.xml'), F('ScienceDaily', 'https://www.sciencedaily.com/rss/all.xml')],
    links: [Lk('Futura', 'https://www.futura-sciences.com/'), Lk('CNRS Le journal', 'https://lejournal.cnrs.fr/'), Lk('Nature', 'https://www.nature.com/')] },
  { en: { name: 'Space', keywords: 'space OR NASA OR rocket OR satellite', links: [Lk('NASA', 'https://www.nasa.gov/'), Lk('ESA', 'https://www.esa.int/'), Lk('Next Spaceflight', 'https://nextspaceflight.com/')] }, kind: 'espace', name: 'Espace', color: '#8fb3ff', keywords: 'espace OR NASA OR fusée OR satellite', w: { launches: true },
    feeds: [F('Space.com', 'https://www.space.com/feeds/all'), F('SpaceNews', 'https://spacenews.com/feed/')],
    links: [Lk('NASA', 'https://www.nasa.gov/'), Lk('ESA', 'https://www.esa.int/'), Lk('CNES', 'https://cnes.fr/'), Lk('Next Spaceflight', 'https://nextspaceflight.com/')] },
  { en: { name: 'Sports', keywords: 'sports OR football OR soccer OR tennis', feeds: [F('BBC Sport', 'https://feeds.bbci.co.uk/sport/rss.xml'), F('ESPN', 'https://www.espn.com/espn/rss/news')], links: [Lk('ESPN', 'https://www.espn.com/'), Lk('BBC Sport', 'https://www.bbc.com/sport'), Lk('Flashscore (live scores)', 'https://www.flashscore.com/')] }, kind: 'sport', name: 'Sport', color: '#ff8a3d', keywords: 'sport OR football OR rugby OR tennis',
    feeds: [F('L’Équipe', 'https://www.lequipe.fr/rss/actu_rss.xml'), F('BBC Sport', 'https://feeds.bbci.co.uk/sport/rss.xml')],
    links: [Lk('L’Équipe', 'https://www.lequipe.fr/'), Lk('Flashscore (scores en direct)', 'https://www.flashscore.fr/'), Lk('Eurosport', 'https://www.eurosport.fr/')] },
  { en: { name: 'Video games', keywords: 'video games OR gaming OR PlayStation OR Nintendo', feeds: [F('Polygon', 'https://www.polygon.com/rss/index.xml'), F('GameSpot', 'https://www.gamespot.com/feeds/mashup/')], links: [Lk('IGN', 'https://www.ign.com/'), Lk('Steam', 'https://store.steampowered.com/'), Lk('Polygon', 'https://www.polygon.com/')] }, kind: 'jeux', name: 'Jeux vidéo', color: '#ff5fa2', keywords: 'jeux vidéo OR gaming OR PlayStation OR Nintendo', w: { watch: ['UBI.PA', 'SONY', '7974.T'] },
    feeds: [F('jeuxvideo.com', 'https://www.jeuxvideo.com/rss/rss.xml'), F('Polygon', 'https://www.polygon.com/rss/index.xml')],
    links: [Lk('jeuxvideo.com', 'https://www.jeuxvideo.com/'), Lk('Gamekult', 'https://www.gamekult.com/'), Lk('Steam', 'https://store.steampowered.com/')] },
  { en: { name: 'Movies & TV', keywords: 'movie OR TV series OR film', feeds: [F('Variety', 'https://variety.com/feed/'), F('The Hollywood Reporter', 'https://www.hollywoodreporter.com/feed/')], links: [Lk('IMDb', 'https://www.imdb.com/'), Lk('JustWatch', 'https://www.justwatch.com/'), Lk('Rotten Tomatoes', 'https://www.rottentomatoes.com/')] }, kind: 'cinema', name: 'Cinéma & séries', color: '#f2d15c', keywords: 'cinéma OR série OR film', w: { watch: ['NFLX', 'DIS'] },
    feeds: [F('Le Monde Cinéma', 'https://www.lemonde.fr/cinema/rss_full.xml'), F('Variety', 'https://variety.com/feed/')],
    links: [Lk('AlloCiné', 'https://www.allocine.fr/'), Lk('JustWatch', 'https://www.justwatch.com/fr'), Lk('IMDb', 'https://www.imdb.com/')] },
  { en: { name: 'Health', keywords: 'health OR medicine', feeds: [F('BBC Health', 'https://feeds.bbci.co.uk/news/health/rss.xml'), F('ScienceDaily Health', 'https://www.sciencedaily.com/rss/health_medicine.xml')], links: [Lk('WHO', 'https://www.who.int/'), Lk('CDC', 'https://www.cdc.gov/'), Lk('NHS', 'https://www.nhs.uk/')] }, kind: 'sante', name: 'Santé', color: '#7fe08a', keywords: 'santé OR médecine', w: { air: true },
    feeds: [F('Le Monde Santé', 'https://www.lemonde.fr/sante/rss_full.xml'), F('BBC Health', 'https://feeds.bbci.co.uk/news/health/rss.xml')],
    links: [Lk('Ameli', 'https://www.ameli.fr/'), Lk('Santé publique France', 'https://www.santepubliquefrance.fr/'), Lk('OMS', 'https://www.who.int/fr')] },
  { en: { name: 'Cars', keywords: 'cars OR electric vehicle', links: [Lk('Motor1', 'https://www.motor1.com/'), Lk('Electrek', 'https://electrek.co/'), Lk('Car and Driver', 'https://www.caranddriver.com/')] }, kind: 'auto', name: 'Automobile', color: '#ff6b6b', keywords: 'automobile OR voiture électrique', w: { watch: ['TSLA', 'RNO.PA', 'STLAP.PA', 'VOW3.DE'] },
    feeds: [F('Motor1', 'https://www.motor1.com/rss/news/all/'), F('Electrek', 'https://electrek.co/feed/')],
    links: [Lk('Caradisiac', 'https://www.caradisiac.com/'), Lk('L’argus', 'https://www.largus.fr/'), Lk('Automobile Propre', 'https://www.automobile-propre.com/')] },
  { en: { name: 'Crypto', keywords: 'bitcoin OR crypto OR ethereum', links: [Lk('CoinGecko', 'https://www.coingecko.com/'), Lk('CoinMarketCap', 'https://coinmarketcap.com/'), Lk('Cointelegraph', 'https://cointelegraph.com/')] }, kind: 'crypto', name: 'Crypto', color: '#f7a531', keywords: 'bitcoin OR crypto OR ethereum', w: { watch: ['BTC-EUR', 'ETH-EUR', 'SOL-EUR'] },
    feeds: [F('Cointelegraph', 'https://cointelegraph.com/rss'), F('CoinDesk', 'https://www.coindesk.com/arc/outboundfeeds/rss/')],
    links: [Lk('CoinGecko', 'https://www.coingecko.com/fr'), Lk('CoinMarketCap', 'https://coinmarketcap.com/fr/'), Lk('Cointelegraph FR', 'https://fr.cointelegraph.com/')] },
  { en: { name: 'Defense', keywords: 'defense OR military OR armed forces', feeds: [F('Breaking Defense', 'https://breakingdefense.com/feed/'), F('Defense News', 'https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml')], links: [Lk('Defense News', 'https://www.defensenews.com/'), Lk('Breaking Defense', 'https://breakingdefense.com/'), Lk('NATO', 'https://www.nato.int/')] }, kind: 'defense', name: 'Défense', color: '#ff5a3c', keywords: 'défense OR armée OR militaire', w: { watch: ['AIR.PA', 'HO.PA', 'SAF.PA', 'RHM.DE', 'LMT'] },
    feeds: [F('OPEX360', 'https://www.opex360.com/feed/'), F('Breaking Defense', 'https://breakingdefense.com/feed/')],
    links: [Lk('Ministère des Armées', 'https://www.defense.gouv.fr/'), Lk('OPEX360', 'https://www.opex360.com/'), Lk('Defense News', 'https://www.defensenews.com/')] },
  { en: { name: 'Geopolitics', keywords: 'geopolitics OR diplomacy OR conflict', feeds: [F('Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml'), F('Foreign Policy', 'https://foreignpolicy.com/feed/')], links: [Lk('Foreign Affairs', 'https://www.foreignaffairs.com/'), Lk('Foreign Policy', 'https://foreignpolicy.com/'), Lk('Council on Foreign Relations', 'https://www.cfr.org/')] }, kind: 'geopo', name: 'Géopolitique', color: '#5aa0ff', keywords: 'géopolitique OR diplomatie OR conflit', w: { quakes: false, watch: ['GC=F', 'BZ=F', 'EURUSD=X'] },
    feeds: [F('Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml'), F('Le Monde International', 'https://www.lemonde.fr/international/rss_full.xml')],
    links: [Lk('IFRI', 'https://www.ifri.org/'), Lk('Le Grand Continent', 'https://legrandcontinent.eu/fr/'), Lk('Foreign Affairs', 'https://www.foreignaffairs.com/')] },
  { en: { name: 'Environment', keywords: 'climate OR environment OR energy', feeds: [F('The Guardian Environment', 'https://www.theguardian.com/environment/rss'), F('BBC Science & Environment', 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml')], links: [Lk('Copernicus Climate', 'https://climate.copernicus.eu/'), Lk('NASA Climate', 'https://climate.nasa.gov/'), Lk('Carbon Brief', 'https://www.carbonbrief.org/')] }, kind: 'env', name: 'Environnement', color: '#5fd38a', keywords: 'climat OR environnement OR énergie', w: { air: true },
    feeds: [F('Le Monde Planète', 'https://www.lemonde.fr/planete/rss_full.xml'), F('The Guardian Environment', 'https://www.theguardian.com/environment/rss')],
    links: [Lk('Reporterre', 'https://reporterre.net/'), Lk('Copernicus Climat', 'https://climate.copernicus.eu/'), Lk('Météo-France', 'https://meteofrance.com/')] }
];
const WIDGETS = { markets: 'INDICES BOURSIERS DU PAYS', watch: 'COURS SUIVIS (actions, ETF, crypto, matières premières)', launches: 'PROCHAINS LANCEMENTS SPATIAUX', quakes: 'SÉISMES (24 H)', air: 'QUALITÉ DE L’AIR & POLLENS (ta position)', hn: 'TOP HACKER NEWS (tech, en anglais)', links: 'LIENS UTILES', notes: 'NOTES' };
const mkW = (p) => ({ markets: false, watch: [], launches: false, quakes: false, air: false, hn: false, notes: '', ...(p.w || {}), links: (p.links || []).map(l => ({ ...l })), show: { links: true, notes: true } });
// version de la langue choisie (noms, mots-clés, sources et liens en anglais si l'interface est en anglais)
const LP = (p) => QG_LANG === 'en' && p.en ? { ...p, ...p.en, feeds: p.en.feeds || p.feeds, links: p.en.links || p.links } : p;
const PN = (p) => LP(p).name;
const mkTopic = (p0) => { const p = LP(p0); return { id: 't' + Math.random().toString(36).slice(2, 8), kind: p.kind || 'perso', name: p.name, color: p.color, keywords: p.keywords || '', feeds: (p.feeds || []).map(f => ({ ...f })), enabled: true, country: QG_LANG === 'en' ? 'US' : 'FR', w: mkW(p) }; };
// complète un topic ancien / incomplet
function ensureTopic(t) {
  const p = TOPIC_PRESETS.find(x => x.kind === t.kind) || TOPIC_PRESETS.find(x => x.name.toLowerCase() === String(t.name || '').toLowerCase()) || {};
  if (!t.kind) t.kind = p.kind || 'perso';
  if (!t.country) t.country = 'FR';
  if (!t.w || typeof t.w !== 'object') { t.w = mkW(LP(p)); if (!(t.feeds || []).length && p.feeds) t.feeds = p.feeds.map(f => ({ ...f })); }
  t.w.watch = Array.isArray(t.w.watch) ? t.w.watch : []; t.w.links = Array.isArray(t.w.links) ? t.w.links : []; t.w.show = t.w.show || { links: true, notes: true };
  return t;
}
const defaultTopics = () => [mkTopic(TOPIC_PRESETS[0]), mkTopic(TOPIC_PRESETS[2]), mkTopic(TOPIC_PRESETS[3])];
const gnewsUrl = (q) => 'https://news.google.com/rss/search?q=' + encodeURIComponent(q + ' when:2d') + (QG_LANG === 'en' ? '&hl=en-US&gl=US&ceid=US:en' : '&hl=fr&gl=FR&ceid=FR:fr');
let CAT = {};
function buildCats() {
  CAT = {};
  for (const t of (S.data.settings.topics || [])) if (t.enabled !== false) CAT[t.id] = { label: (t.name || 'TOPIC').toUpperCase(), css: /^#[0-9a-f]{6}$/i.test(t.color) ? t.color : '#d8d4c8', color: parseInt((/^#[0-9a-f]{6}$/i.test(t.color) ? t.color : '#d8d4c8').slice(1), 16) };
  // onglets + légende
  const tabs = $('#news-tabs'); if (!CAT[S.newsCat]) S.newsCat = 'all';
  tabs.replaceChildren(el('button', { class: S.newsCat === 'all' ? 'on' : null, 'data-c': 'all', text: 'TOUT' }), ...Object.entries(CAT).map(([id, c]) => el('button', { class: S.newsCat === id ? 'on' : null, 'data-c': id, text: c.label, style: '--tc:' + c.css })));
    $('#legend').replaceChildren(...Object.values(CAT).map(c => el('span', {}, el('i', { style: 'color:' + c.css, text: '■' }), ' ' + c.label + ' ')));
}
const STATUS = { encours: 'EN COURS', idee: 'IDÉE', pause: 'EN PAUSE', termine: 'TERMINÉ' };

/* ---------------- état ---------------- */
const S = { data: null, news: [], newsCat: 'all', sel: null, pFilter: 'all', pSel: null, mailMode: 'primary', weather: null, mail: null };
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(() => window.qg.setData(S.data).catch(() => {}), 300); }

/* ---------------- horloge + navigation ---------------- */
const JOURS = QG_LANG === 'en' ? ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] : ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
function tick() { const d = new Date(); $('#clock').textContent = `${JOURS[d.getDay()]} ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
setInterval(tick, 1000); tick();
function route() {
  const views = $$('nav a').map(a => a.dataset.v);
  const v = views.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'qg';
  for (const id of views) $('#v-' + id).hidden = id !== v;
  $$('nav a').forEach(a => a.classList.toggle('on', a.dataset.v === v));
  if (v === 'qg' && globe) setTimeout(() => globe.resize(), 0);
  if (v === 'projets') renderProjects();
  if (v === 'reglages') fillSettings();
  if (window.QGViews && QGViews[v]) { try { QGViews[v].show(); } catch (e) { console.error(e); } }
  if (window.sysView) window.sysView.active(v === 'systeme');
}
window.addEventListener('hashchange', route);
document.addEventListener('keydown', e => { if (e.key === 'F5') { e.preventDefault(); refreshAll(); } });
$('#refresh').onclick = () => refreshAll();
function setNet(ok, txt) { const n = $('#net'); n.textContent = '● ' + txt; n.style.color = ok ? 'var(--ok)' : 'var(--bad)'; }

/* =========================================================
   GLOBE
   ========================================================= */
let globe = null;
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); }); }
async function ensureLibs() { /* bibliothèques embarquées dans l'app (vendor/), aucun script distant */ }
async function loadWorld() { try { return await window.qg.world(); } catch (e) { return null; } }
function initGlobe() {
  const host = $('#globe'), msg = $('#globe-msg');
  if (!window.THREE || !THREE.OrbitControls) { msg.textContent = 'GLOBE INDISPONIBLE (bibliothèque 3D absente)'; return null; }
  const R = 100;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 3000);
  camera.position.set(60, 140, 320);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  host.append(renderer.domElement);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enablePan: false, enableDamping: true, dampingFactor: 0.08, minDistance: 150, maxDistance: 520, rotateSpeed: 0.5, autoRotate: true, autoRotateSpeed: 0.3 });

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffe2b0, 0.6); sun.position.set(-300, 200, 300); scene.add(sun);
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 72, 72), new THREE.MeshPhongMaterial({ color: 0x0b0e13, emissive: 0x040507, shininess: 4 }));
  scene.add(earth);
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.12, 64, 64), new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec3 vN; void main(){ float i = pow(0.64 - dot(vN, vec3(0.0,0.0,1.0)), 3.0); gl_FragColor = vec4(0.89,0.66,0.23,1.0)*i*0.9; }',
    side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })));

  const ll = (lat, lon, r = R) => { const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180; return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); };
  const segs = (lines, r, color, opacity) => {
    const pos = [];
    for (const line of lines) for (let i = 0; i < line.length - 1; i++) { const a = ll(line[i][1], line[i][0], r), b = ll(line[i + 1][1], line[i + 1][0], r); pos.push(a.x, a.y, a.z, b.x, b.y, b.z); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  };
  // grille
  const grat = [];
  for (let lat = -60; lat <= 60; lat += 30) { const l = []; for (let lon = -180; lon <= 180; lon += 3) l.push([lon, lat]); grat.push(l); }
  for (let lon = -180; lon < 180; lon += 30) { const l = []; for (let lat = -88; lat <= 88; lat += 3) l.push([lon, lat]); grat.push(l); }
  scene.add(segs(grat, R + 0.1, 0xffffff, 0.045));
  // pays
  loadWorld().then(w => {
    if (!w || !window.topojson) { msg.textContent = ''; return; }
    const land = topojson.mesh(w, w.objects.countries, (a, b) => a === b);
    const borders = topojson.mesh(w, w.objects.countries, (a, b) => a !== b);
    scene.add(segs(land.coordinates, R + 0.3, 0xe4a83a, 0.75));
    scene.add(segs(borders.coordinates, R + 0.25, 0xe4a83a, 0.28));
    msg.textContent = '';
  });
  // Calvi
  // Ma position : balise dorée (hexagone + faisceau + onde) — survol = infos, clic = zoom
  const home = new THREE.Group(); scene.add(home);
  const hHex = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.6, 6), new THREE.MeshBasicMaterial({ color: 0xffc35a, side: THREE.DoubleSide }));
  hHex.rotation.x = -Math.PI / 2; hHex.position.y = 0.4; home.add(hHex);
  const hBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 16, 8), new THREE.MeshBasicMaterial({ color: 0xffc35a, transparent: true, opacity: 0.55 }));
  hBeam.position.y = 8; home.add(hBeam);
  const hTop = new THREE.Mesh(new THREE.OctahedronGeometry(2.2), new THREE.MeshBasicMaterial({ color: 0xffc35a })); hTop.position.y = 16.5; home.add(hTop);
  const hWave = new THREE.Mesh(new THREE.RingGeometry(2.4, 3.0, 48), new THREE.MeshBasicMaterial({ color: 0xffc35a, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
  hWave.rotation.x = -Math.PI / 2; hWave.position.y = 0.3; home.add(hWave);
  const hHit = new THREE.Mesh(new THREE.SphereGeometry(5, 8, 8), new THREE.MeshBasicMaterial({ visible: false })); hHit.position.y = 12; home.add(hHit);
  hHit.userData.home = true;
  let homeLL = null;
  function setHome(lat, lon) { homeLL = { lat, lon }; const n = ll(lat, lon, 1).normalize(); home.position.copy(n.clone().multiplyScalar(R)); home.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); }
  function focusHome() { if (homeLL) focus(homeLL); }
  setHome(S.data.settings.location.lat, S.data.settings.location.lon);

  const pinG = new THREE.Group(); scene.add(pinG);
  let pins = [];
  const UP = new THREE.Vector3(0, 1, 0);
  function setPins(items) {
    for (const p of pins) pinG.remove(p.obj);
    pins = [];
    // décale légèrement les épingles au même endroit
    const seen = {};
    for (const it of items) {
      if (typeof it.lat !== 'number' || !CAT[it.cat]) continue;
      const key = it.lat.toFixed(1) + ',' + it.lon.toFixed(1); const k = (seen[key] = (seen[key] || 0) + 1) - 1;
      const lat = it.lat + (k ? Math.sin(k * 2.1) * 1.4 * Math.ceil(k / 3) : 0), lon = it.lon + (k ? Math.cos(k * 2.1) * 1.4 * Math.ceil(k / 3) : 0);
      const col = (CAT[it.cat] || { color: 0xd8d4c8 }).color, n = ll(lat, lon, 1).normalize();
      const obj = new THREE.Group(); obj.position.copy(n.clone().multiplyScalar(R)); obj.quaternion.setFromUnitVectors(UP, n);
      const len = 8;
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, len, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7 })); stick.position.y = len / 2; obj.add(stick);
      const head = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), new THREE.MeshBasicMaterial({ color: col })); head.position.y = len; obj.add(head);
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 2.1, 4), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.3; obj.add(ring);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(4.5, 8, 8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = len; obj.add(hit);
      const p = { obj, head, ring, hit, it, phase: Math.random() * 2 }; hit.userData.ref = p;
      pinG.add(obj); pins.push(p);
    }
    vis();
  }
  function vis() { for (const p of pins) { p.obj.visible = S.newsCat === 'all' || p.it.cat === S.newsCat; p.head.scale.setScalar(S.sel && S.sel.id === p.it.id ? 1.9 : 1); } }

  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), tip = $('#tip');
  let down = null;
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects([earth, hHit, ...pins.filter(p => p.obj.visible).map(p => p.hit)], false);
    const ph = hits.find(h => h.object.userData.ref || h.object.userData.home), eh = hits.find(h => h.object === earth);
    if (!(ph && (!eh || ph.distance < eh.distance + 3))) return null;
    return ph.object.userData.home ? { home: true } : ph.object.userData.ref;
  }
  renderer.domElement.addEventListener('pointermove', ev => {
    const p = pick(ev); renderer.domElement.style.cursor = p ? 'pointer' : '';
    if (!p) { tip.style.display = 'none'; return; }
    const hr = host.parentElement.getBoundingClientRect();
    if (p.home) { const l = S.data.settings.location; tip.replaceChildren(el('div', { class: 'c-home', text: '⌖ MA POSITION' }), el('div', { text: l.name || '' }), el('div', { class: 'loc', text: `${(+l.lat).toFixed(4)}, ${(+l.lon).toFixed(4)}` + (l.source ? ' · ' + (l.source === 'windows' ? 'localisation Windows' : l.source === 'ip' ? 'adresse IP' : '') : '') })); }
    else tip.replaceChildren(el('div', { style: 'color:' + (CAT[p.it.cat] || {}).css, text: (CAT[p.it.cat] || {}).label + ' // ' + (p.it.place || '') }), el('div', { text: p.it.title }), el('div', { class: 'loc', text: p.it.source + ' · ' + ago(p.it.date) }));
    tip.style.left = (ev.clientX - hr.left) + 'px'; tip.style.top = (ev.clientY - hr.top) + 'px'; tip.style.display = 'block';
  });
  renderer.domElement.addEventListener('pointerleave', () => tip.style.display = 'none');
  renderer.domElement.addEventListener('pointerdown', ev => { down = [ev.clientX, ev.clientY]; controls.autoRotate = false; });
  renderer.domElement.addEventListener('pointerup', ev => { if (!down) return; const mv = Math.hypot(ev.clientX - down[0], ev.clientY - down[1]); down = null; if (mv < 5) { const p = pick(ev); if (p && p.home) focusHome(); else if (p) selectNews(p.it, true); } });

  let fly = null;
  function focus(it) {
    if (typeof it.lat !== 'number') return;
    controls.autoRotate = false;
    const dist = Math.max(240, Math.min(camera.position.length(), 320));
    const to = ll(it.lat, it.lon, 1).normalize().multiplyScalar(dist); to.y -= dist * 0.12; to.setLength(dist);
    fly = { from: camera.position.clone(), to, t0: performance.now(), dur: 1100 };
  }
  function resize() { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(host); resize();
  const clk = new THREE.Clock();
  (function loop() {
    requestAnimationFrame(loop);
    const t = clk.getElapsedTime();
    if (fly) { const k = Math.min(1, (performance.now() - fly.t0) / fly.dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const len = fly.from.length() + (fly.to.length() - fly.from.length()) * e;
      camera.position.copy(fly.from.clone().normalize().lerp(fly.to.clone().normalize(), e).normalize().multiplyScalar(len)); if (k >= 1) fly = null; }
    { const ph = (t * 0.5) % 1; hWave.scale.setScalar(1 + ph * 3); hWave.material.opacity = 0.7 * (1 - ph); hTop.rotation.y = t * 1.5; }
    for (const p of pins) { const ph = ((t * 0.7 + p.phase) % 1.6) / 1.6; p.ring.scale.setScalar(1 + ph * 2.4); p.ring.material.opacity = 0.8 * (1 - ph); p.head.rotation.y = t; }
    controls.update(); renderer.render(scene, camera);
  })();
  msg.textContent = 'CHARGEMENT DES CONTOURS…';
  return { setPins, vis, focus, resize, setHome, focusHome };
}

/* =========================================================
   ACTUS (RSS)
   ========================================================= */
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mkRes = (names) => names.map(n => new RegExp('(^|[^a-z0-9])' + escRe(norm(n)) + '($|[^a-z0-9])'));
const GEO_P = (window.GEO_PLACES || []).map(([lat, lon, label, ...names]) => ({ lat, lon, label, kind: 'lieu', names, res: mkRes(names) }));
const GEO_C = (window.GEO_COUNTRIES || []).map(([lat, lon, label, cc, ...names]) => ({ lat, lon, label, cc, kind: 'pays', names, res: mkRes(names) }));
const KNOWN = new Set([...GEO_P, ...GEO_C].flatMap(g => g.names.map(norm)));
function firstMatch(list, t) {
  let best = null, pos = Infinity;
  for (const g of list) for (const re of g.res) { const m = re.exec(t); if (m && m.index < pos) { best = g; pos = m.index; } }
  return best;
}
// Lieu précis (ville, zone) prioritaire sur le pays ; sinon pays (affiné ensuite en ligne).
function geocodeItem(title, desc) {
  const t = norm(title), d = norm(desc);
  const place = firstMatch(GEO_P, t) || firstMatch(GEO_P, d);
  const all = (t + ' ' + d);
  const countries = GEO_C.map(g => { let pos = Infinity; for (const re of g.res) { const m = re.exec(all); if (m && m.index < pos) pos = m.index; } return [pos, g]; }).filter(x => x[0] < Infinity).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const cc = countries.map(c => c.cc).filter(Boolean).slice(0, 4).join(',');
  const placeT = firstMatch(GEO_P, t), countryT = firstMatch(GEO_C, t);
  // ordre : lieu dans le titre > pays dans le titre (affiné en ligne) > lieu dans le résumé > pays dans le résumé
  if (placeT) return { ...placeT, cc };
  if (countryT) return { ...countryT, cc };
  if (place) return { ...place, cc };
  if (countries.length) return { ...countries[0], cc };
  return null;
}
// Noms propres candidats (pour trouver une ville précise via OpenStreetMap)
const STOP = new Set(('le la les un une des du de au aux en et ou the a an in on at of for and to from with by after before over under '
  + 'selon apres avant comment pourquoi quand ou qui quoi ce cette ces son sa ses leur nouveau nouvelle nouvelles new live direct video photo exclusif exclusive breaking update analyse analysis opinion edito tribune '
  + 'trump donald poutine putin vladimir zelensky zelenski volodymyr macron emmanuel xi jinping biden netanyahou netanyahu erdogan musk elon starlink starshield spacex '
  + 'otan nato onu un ue eu union europeenne european armee army ministere ministry defense defence president presidente premier ministre minister gouvernement government conseil council '
  + 'forces force air navy marine pentagone pentagon maison blanche white house kremlin hamas hezbollah houthis houthi etat islamique state department us usa uk afp reuters ap bbc cnn france24 '
  + 'lundi mardi mercredi jeudi vendredi samedi dimanche monday tuesday wednesday thursday friday saturday sunday janvier fevrier mars avril mai juin juillet aout septembre octobre novembre decembre january february march april may june july august september october november december '
  + 'heure heures verite interview entretien suivez regardez replay week end weekend semaine jour journee annee mois match finale coupe championnat ligue grand prix saison episode serie film emission podcast '
  + 'nord sud est ouest north south east west occidental western oriental eastern central centre center guerre war paix peace sommet summit drone drones missile missiles').split(' '));
function candidates(title, desc) {
  const out = [], seen = new Set();
  const scan = (text, isTitle) => {
    const sentences = String(text || '').split(/(?<=[.!?…])\s+/).slice(0, 2);
    for (const s of sentences) {
      const words = s.replace(/[«»"“”()\[\]]/g, ' ').split(/\s+/).filter(Boolean);
      let run = [], startIdx = -1;
      const flush = () => {
        if (!run.length) return;
        const cand = run.join(' ').replace(/[,:;.!?]+$/, '');
        const n = norm(cand);
        const okFirst = startIdx > 0 || run.length > 1 || /[:,]$/.test(run[run.length - 1]);
        if (okFirst && cand.length > 2 && !STOP.has(n) && !KNOWN.has(n) && !seen.has(n) && !n.split(' ').every(w => STOP.has(w))) { seen.add(n); out.push(cand); }
        run = []; startIdx = -1;
      };
      words.forEach((w0, i) => {
        let w = w0.replace(/^[dlDL]['’]/, '').replace(/['’]s$/, '');
        const cap = /^[A-ZÀ-ÖØ-Þ][\p{L}\-’'.]*[\p{L}][,:;.!?]*$/u.test(w) && !/^[A-Z]{2,}[,:;.]*$/.test(w.replace(/[,:;.!?]+$/, '') ) || /^[A-Z]{2,}[a-z]/.test(w);
        const conn = run.length && /^(de|du|des|la|le|al|el|sur|on|upon|of)$/i.test(w);
        if (cap) { if (!run.length) startIdx = i; run.push(w); if (/[,:;.!?]$/.test(w)) flush(); }
        else if (conn) run.push(w);
        else { while (run.length && /^(de|du|des|la|le|al|el|sur|on|upon|of)$/i.test(run[run.length - 1])) run.pop(); flush(); }
      });
      while (run.length && /^(de|du|des|la|le|al|el|sur|on|upon|of)$/i.test(run[run.length - 1])) run.pop();
      flush();
    }
  };
  scan(title, true); scan(desc, false);
  return out.slice(0, 4);
}
// Affinage en ligne : pour les actus localisées seulement au niveau du pays (ou pas du tout)
let refineRun = 0;
async function refineNews() {
  const run = ++refineRun; let budget = 45, changed = 0, lastPins = Date.now();
  for (const n of S.news) {
    if (run !== refineRun || budget <= 0) break;
    if (n.kind === 'lieu' || n.kind === 'osm' || n.refined) continue;
    n.refined = true;
    for (const c of candidates(n.title, n.desc)) {
      if (budget-- <= 0) break;
      let res = null;
      try { res = await window.qg.geoSearch(c, n.cc || ''); } catch (e) { res = null; }
      if (run !== refineRun) return;
      if (res) { n.lat = res.lat; n.lon = res.lon; n.place = res.name + (res.country && res.country !== res.name ? ' · ' + res.country : ''); n.kind = 'osm'; changed++; break; }
    }
    if (changed && Date.now() - lastPins > 2500) { lastPins = Date.now(); renderNews(); globe && globe.setPins(S.news); }
  }
  if (changed) { renderNews(); globe && globe.setPins(S.news); }
  try { localStorage.setItem('qg-news', JSON.stringify({ news: S.news, at: S.newsAt })); } catch (e) {}
}
function parseFeed(xml, src, cat) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('flux illisible');
  const nodes = [...doc.querySelectorAll('item'), ...doc.querySelectorAll('entry')];
  return nodes.slice(0, 25).map(n => {
    const g = (sel) => { const x = n.getElementsByTagName(sel)[0]; return x ? x.textContent : ''; };
    let link = g('link'); if (!link) { const l = n.querySelector('link[href]'); link = l ? l.getAttribute('href') : ''; }
    const title = strip(g('title')), desc = strip(g('description') || g('summary') || g('content')).slice(0, 400);
    const date = new Date(g('pubDate') || g('published') || g('updated') || g('dc:date') || Date.now()).toISOString();
    let ttl = title, source = src.name;
    if (src.gnews) { const m = title.match(/^(.*)\s+-\s+([^-]{2,60})$/); if (m) { ttl = m[1]; source = m[2].trim(); } }
    const geo = geocodeItem(ttl, src.gnews ? '' : desc);
    return { id: cat + ':' + (link || title), cat, title: ttl, desc: src.gnews ? '' : desc, link: /^https:\/\//.test(link.trim()) ? link.trim() : '', date, source,
      place: geo ? geo.label : '', lat: geo ? geo.lat : null, lon: geo ? geo.lon : null, kind: geo ? geo.kind : null, cc: geo ? geo.cc : '' };
  }).filter(x => x.title);
}
async function loadNews() {
  const topics = (S.data.settings.topics || []).filter(t => t.enabled !== false), errors = [], jobs = [];
  for (const t of topics) {
    const srcs = [...(t.feeds || [])];
    if ((t.keywords || '').trim()) srcs.push({ name: 'Google News', url: gnewsUrl(t.keywords.trim()), gnews: true });
    for (const src of srcs) jobs.push(window.qg.fetchText(src.url).then(x => parseFeed(x, src, t.id)).catch(() => { errors.push(t.name + ' / ' + src.name); return []; }));
  }
  const res = (await Promise.all(jobs)).flat();
  const cutoff = Date.now() - 48 * 3600e3, seen = new Set(), out = [], per = {};
  res.sort((a, b) => new Date(b.date) - new Date(a.date));
  for (const n of res) {
    if (new Date(n.date) < cutoff) continue;
    const k = norm(n.title).slice(0, 60); if (seen.has(k)) continue; seen.add(k);
    per[n.cat] = (per[n.cat] || 0) + 1; if (per[n.cat] > 25) continue;
    out.push(n);
  }
  S.news = out; S.newsErrors = errors; S.newsAt = new Date().toISOString();
  try { localStorage.setItem('qg-news', JSON.stringify({ news: out, at: S.newsAt })); } catch (e) {}
  renderNews(); if (globe) globe.setPins(out); updateStrip();
  if (window.QGViews && QGViews.topics) QGViews.topics.refresh();
  refineNews();
  return !!out.length;
}
function renderNews() {
  const box = $('#news'); box.replaceChildren();
  const cnt = {}, list = S.news.filter(n => CAT[n.cat] && (S.newsCat === 'all' ? (cnt[n.cat] = (cnt[n.cat] || 0) + 1) <= 12 : n.cat === S.newsCat));
  $('#news-count').textContent = list.length + ' INFOS';
  $('#news-age').textContent = S.newsAt ? 'MAJ ' + ago(S.newsAt) : '';
  if (!list.length) box.append(el('div', { class: 'empty', text: S.newsAt ? 'AUCUNE ACTU (48 H) DANS CETTE CATÉGORIE' : 'CHARGEMENT…' }));
  for (const n of list) {
    const c = CAT[n.cat];
    box.append(el('div', { class: 'news' + (S.sel && S.sel.id === n.id ? ' sel' : ''), 'data-id': n.id, onclick: () => selectNews(n) },
      el('div', { class: 'meta' }, el('span', { class: 'cat', style: 'color:' + c.css, text: c.label }), el('span', { text: n.place ? (n.kind === 'pays' ? '◌ ' : '⌖ ') + n.place : '', title: n.kind === 'pays' ? 'Position approximative (pays)' : 'Position précise' }), el('span', { style: 'margin-left:auto', text: shortTime(n.date) })),
      el('div', { class: 'title', text: n.title }),
      el('div', { class: 'meta', style: 'margin:3px 0 0' }, el('span', { text: n.source }), n.lat == null ? el('span', { class: 'nopin', text: '(non localisée)' }) : null)));
  }
  if (S.newsErrors && S.newsErrors.length) box.append(el('div', { class: 'src-err', text: 'Sources injoignables : ' + S.newsErrors.join(', ') }));
}
function selectNews(n, fromGlobe) {
  S.sel = n;
  $$('.news').forEach(x => x.classList.toggle('sel', x.dataset.id === n.id));
  if (fromGlobe) { const x = $$('.news').find(x => x.dataset.id === n.id); if (x) x.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  if (globe) { globe.focus(n); globe.vis(); }
  const c = CAT[n.cat];
  $('#focus-in').replaceChildren(
    el('div', { style: 'font-size:11px;color:' + c.css, text: c.label + (n.place ? ' // ' + n.place.toUpperCase() : '') }),
    el('h3', { text: n.title }), n.desc ? el('p', { text: n.desc }) : null,
    el('div', { class: 'meta' }, n.source + ' · ' + fmtDate(n.date) + '  ', n.link ? el('button', { class: 'lnk', text: '[ LIRE L’ARTICLE → ]', onclick: () => window.qg.open(n.link) }) : null));
  $('#focus').style.display = 'block';
}
$('#go-home').onclick = () => { if (globe) globe.focusHome(); };
$('#focus-x').onclick = () => { $('#focus').style.display = 'none'; S.sel = null; $$('.news').forEach(x => x.classList.remove('sel')); globe && globe.vis(); };
// onglets du fil (délégation : marche aussi pour les onglets recréés quand les topics changent)
$('#news-tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-c]'); if (!b) return;
  S.newsCat = b.dataset.c; $$('#news-tabs button').forEach(x => x.classList.toggle('on', x === b));
  S.sel = null; renderNews(); if (globe) globe.vis(); $('#news').scrollTop = 0;
});

/* =========================================================
   MÉTÉO (Open-Meteo)
   ========================================================= */
const WMO = { 0: 'ciel clair', 1: 'peu nuageux', 2: 'partiellement nuageux', 3: 'couvert', 45: 'brouillard', 48: 'brouillard givrant', 51: 'bruine légère', 53: 'bruine', 55: 'bruine forte', 61: 'pluie faible', 63: 'pluie', 65: 'pluie forte', 66: 'pluie verglaçante', 67: 'pluie verglaçante', 71: 'neige faible', 73: 'neige', 75: 'neige forte', 80: 'averses', 81: 'averses', 82: 'fortes averses', 95: 'orage', 96: 'orage + grêle', 99: 'orage + grêle' };
const DIRS = QG_LANG === 'en' ? ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] : ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
const dir = (d) => d == null ? '' : DIRS[Math.round(d / 45) % 8];
const r0 = (x) => x == null ? '--' : Math.round(x);
async function loadWeather() {
  const loc = S.data.settings.location;
  const w = await window.qg.weather(loc.lat, loc.lon);
  S.weather = w; try { localStorage.setItem('qg-wx', JSON.stringify(w)); } catch (e) {}
  renderWeather(); updateStrip();
}
function rainVerdict(d, i) {
  const p = d.precipitation_probability_max[i], mm = d.precipitation_sum[i], code = d.weather_code[i];
  if ((p != null && p >= 60) || mm >= 2 || [61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) return { txt: QG_LANG === 'en' ? 'YES' : 'OUI', cls: 'yes' };
  if ((p != null && p >= 30) || mm >= 0.3) return { txt: 'POSSIBLE', cls: 'yes' };
  return { txt: QG_LANG === 'en' ? 'NO' : 'NON', cls: 'no' };
}
function renderWeather() {
  const box = $('#wx'), w = S.weather; $('#wx-loc').textContent = S.data.settings.location.name.toUpperCase();
  if (!w || !w.fx) { box.textContent = 'MÉTÉO INDISPONIBLE'; return; }
  const c = w.fx.current, d = w.fx.daily, m = w.marine;
  const rv = rainVerdict(d, 1);
  $('#wx-age').textContent = ago(w.at);
  box.replaceChildren(
    el('div', { class: 'wx-now' }, el('span', { class: 't', text: r0(c.temperature_2m) + '°' }), el('span', { class: 's', text: WMO[c.weather_code] || '' })),
    el('div', { class: 'wx-rain' }, el('span', { class: 'k', text: 'PLUIE DEMAIN ?' }), el('span', { class: 'v ' + rv.cls, text: `${rv.txt} · ${r0(d.precipitation_probability_max[1])} % · ${(d.precipitation_sum[1] || 0).toFixed(1)} mm` })),
    el('table', { class: 'kv' },
      el('tr', {}, el('th', { text: 'VENT' }), el('td', { text: `${dir(c.wind_direction_10m)} ${r0(c.wind_speed_10m)} km/h · ${QG_LANG === 'en' ? 'gusts' : 'raf.'} ${r0(c.wind_gusts_10m)}` })),
      m && m.current && m.current.sea_surface_temperature != null ? el('tr', {}, el('th', { text: 'MER' }), el('td', { text: `${r0(m.current.sea_surface_temperature)}° · ${QG_LANG === 'en' ? 'waves' : 'houle'} ${m.current.wave_height != null ? m.current.wave_height.toFixed(1) : '--'} m` })) : null,
      el('tr', {}, el('th', { text: 'SOLEIL' }), el('td', { text: `${(d.sunrise[0] || '').slice(11)} → ${(d.sunset[0] || '').slice(11)}` }))),
    el('div', { class: 'days' }, ...[0, 1, 2].map(i => el('div', { class: 'day' },
      el('div', { class: 'd', text: i === 0 ? "AUJ." : i === 1 ? 'DEMAIN' : JOURS[new Date(d.time[i]).getDay()] }),
      el('div', { class: 'tt', text: `${r0(d.temperature_2m_min[i])}°/${r0(d.temperature_2m_max[i])}°` }),
      el('div', { class: 'r', text: WMO[d.weather_code[i]] || '' }),
      el('div', { class: 'r', text: `☂ ${r0(d.precipitation_probability_max[i])}% · ${dir(d.wind_direction_10m_dominant[i])} ${r0(d.wind_gusts_10m_max[i])}` })))));
}

/* =========================================================
   POSITION
   ========================================================= */
function distKm(a, b) { const R = 6371, t = Math.PI / 180, dl = (b.lat - a.lat) * t, dn = (b.lon - a.lon) * t; const x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }
async function locateMe(force) {
  const loc = S.data.settings.location;
  if (loc.mode === 'manual' && !force) return false;
  const p = await window.qg.locate();
  const moved = !loc.lat || distKm(loc, p) > 1;
  S.data.settings.location = { ...loc, name: p.name || loc.name, lat: p.lat, lon: p.lon, mode: 'auto', source: p.source, accuracy: p.accuracy, at: p.at };
  save();
  if (globe) globe.setHome(p.lat, p.lon);
  $('#legend-home').textContent = (p.name || 'MA POSITION').toUpperCase();
  return moved;
}
function locLabel() {
  const l = S.data.settings.location;
  if (l.mode !== 'auto') return 'MANUELLE';
  const src = l.source === 'windows' ? 'WINDOWS' : l.source === 'ip' ? 'ADRESSE IP' : '—';
  return `AUTO · ${src}${l.accuracy ? ' · ±' + (l.accuracy >= 1000 ? Math.round(l.accuracy / 1000) + ' km' : Math.round(l.accuracy) + ' m') : ''}`;
}

/* =========================================================
   MAILS (Gmail IMAP — mot de passe d'application)
   ========================================================= */
const MAILQ = () => S.mailMode === 'primary' ? (S.data.settings.mailQuery || 'in:inbox is:unread category:primary newer_than:14d') : 'in:inbox is:unread newer_than:7d';
$('#mail-mode').onclick = () => { S.mailMode = S.mailMode === 'primary' ? 'all' : 'primary'; $('#mail-mode').textContent = S.mailMode === 'primary' ? 'PRINCIPALE' : 'TOUS NON LUS'; loadMail(); };
async function loadMail() {
  const box = $('#mail');
  try {
    const r = await window.qg.mail(MAILQ());
    if (r.notConfigured) { S.mail = null; box.replaceChildren(el('div', { class: 'msg' }, 'Gmail non configuré.', el('br'), el('button', { class: 'btn amber', text: 'CONFIGURER', onclick: () => location.hash = '#reglages' }))); updateStrip(); return; }
    S.mail = r; renderMail();
  } catch (e) {
    box.replaceChildren(el('div', { class: 'msg' }, 'ERREUR : ' + String(e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''), el('br'), el('button', { class: 'btn', text: 'RÉGLAGES', onclick: () => location.hash = '#reglages' })));
  }
  updateStrip();
}
function renderMail() {
  const box = $('#mail'), r = S.mail; box.replaceChildren();
  if (!r.mails.length) { box.append(el('div', { class: 'empty', text: 'AUCUN MAIL NON LU' })); return; }
  for (const m of r.mails) {
    const keys = (S.data.settings.importantSenders || []).map(k => k.toLowerCase()).filter(Boolean);
    const imp = keys.some(k => (m.fromEmail + ' ' + m.fromName).toLowerCase().includes(k));
    box.append(el('a', { class: 'mail' + (imp ? ' imp' : ''), onclick: () => window.qg.open(m.url), title: m.fromEmail },
      el('div', { class: 'l1' }, el('span', { class: 'from', text: m.fromName || m.fromEmail }), el('span', { class: 'time', text: shortTime(m.date) })),
      el('div', { class: 'sub', text: m.subject || '(sans objet)' })));
  }
  if (r.total > r.mails.length) box.append(el('div', { class: 'dim', style: 'padding:6px 8px;font-size:11px', text: `+ ${r.total - r.mails.length} autres` }));
}

/* =========================================================
   BANDEAU D'ÉTAT
   ========================================================= */
function updateStrip() {
  const w = S.weather;
  if (w && w.fx) {
    const c = w.fx.current, d = w.fx.daily, rv = rainVerdict(d, 1);
    $('#s-wx').textContent = `${S.data.settings.location.name.toUpperCase()} ${r0(c.temperature_2m)}°C · ${QG_LANG === 'en' ? 'WIND' : 'VENT'} ${dir(c.wind_direction_10m)} ${r0(c.wind_speed_10m)} KM/H`;
    $('#s-rain').textContent = rv.txt; $('#s-rain').className = rv.cls === 'no' ? 'ok' : 'warn';
  }
  $('#s-mail').textContent = S.mail ? String(S.mail.total) : '--';
  $('#s-news').textContent = S.news.length ? String(S.news.length) : '--';
  const act = (S.data.projects || []).filter(p => p.status === 'encours').length;
  $('#s-proj').textContent = pad(act);
  const nd = (S.data.deadlines || []).map(x => ({ ...x, j: Math.ceil((new Date(x.date + 'T23:59:59') - Date.now()) / 864e5) })).filter(x => x.j >= 0).sort((a, b) => a.j - b.j)[0];
  $('#s-dl').textContent = nd ? `${nd.title.toUpperCase()} · J-${nd.j}` : '--'; $('#s-dl').className = nd && nd.j <= 7 ? 'warn' : '';
}

/* =========================================================
   PROJETS + JOURNAL DE BORD
   ========================================================= */
const P = () => S.data.projects;
const gauge = (p) => { const n = Math.round((p || 0) / 10); return el('span', { class: 'gauge' }, '[', '█'.repeat(n), el('span', { class: 'e', text: '·'.repeat(10 - n) }), ']'); };
function renderProjects() {
  const list = $('#plist'); list.replaceChildren();
  const ps = P().filter(p => S.pFilter === 'all' || p.status === S.pFilter);
  $('#pcount').textContent = pad(P().length);
  if (!S.pSel || !P().find(p => p.id === S.pSel)) S.pSel = (ps[0] || P()[0] || {}).id;
  if (!ps.length) list.append(el('div', { class: 'empty', text: 'AUCUN PROJET' }));
  for (const p of ps) list.append(el('div', { class: 'pitem' + (p.id === S.pSel ? ' on' : ''), onclick: () => { S.pSel = p.id; renderProjects(); } },
    el('div', { class: 'n', text: p.name }),
    el('div', { class: 'm' }, el('span', { class: 'st-' + p.status, text: STATUS[p.status] }), gauge(p.progress), el('span', { text: (p.logs || []).length + ' LOGS' }))));
  renderDetail();
  updateStrip();
}
$$('#pfilter button').forEach(b => b.onclick = () => { S.pFilter = b.dataset.s; $$('#pfilter button').forEach(x => x.classList.toggle('on', x === b)); renderProjects(); });
$('#padd').onclick = () => {
  const p = { id: uid(), name: 'Nouveau projet', status: 'encours', progress: 0, next: '', notes: '', tasks: [], logs: [], shopping: [], created: new Date().toISOString() };
  P().unshift(p); S.pSel = p.id; S.pFilter = 'all'; $$('#pfilter button').forEach(x => x.classList.toggle('on', x.dataset.s === 'all'));
  save(); renderProjects(); setTimeout(() => { const t = $('.title-in'); if (t) { t.focus(); t.select(); } }, 30);
};
function renderDetail() {
  const box = $('#pdetail'); box.replaceChildren();
  const p = P().find(x => x.id === S.pSel);
  if (!p) { box.append(el('div', { class: 'panel' }, el('div', { class: 'pb empty', text: 'SÉLECTIONNE OU CRÉE UN PROJET' }))); return; }
  const touch = () => { p.updated = new Date().toISOString(); save(); };
  // --- colonne infos
  const name = el('input', { class: 'title-in', value: p.name });
  name.onchange = () => { p.name = name.value.trim() || 'Sans nom'; touch(); renderProjects(); };
  const st = el('select', {}, ...Object.entries(STATUS).map(([k, v]) => el('option', { value: k, selected: p.status === k, text: v })));
  st.onchange = () => { p.status = st.value; touch(); renderProjects(); };
  const pct = el('span', { class: 'pct', text: (p.progress || 0) + ' %' });
  const rg = el('input', { type: 'range', min: 0, max: 100, step: 5, value: p.progress || 0 });
  rg.oninput = () => pct.textContent = rg.value + ' %'; rg.onchange = () => { p.progress = Number(rg.value); touch(); renderProjects(); };
  const nx = el('input', { value: p.next || '', placeholder: 'Prochaine étape…' }); nx.onchange = () => { p.next = nx.value.trim(); touch(); };
  const tl = el('ul', { class: 'tasks' });
  (p.tasks || []).forEach((t, i) => tl.append(el('li', { class: t.done ? 'done' : null },
    el('span', { class: 'box', text: t.done ? '[x]' : '[ ]', onclick: () => { t.done = !t.done; touch(); renderDetail(); } }),
    el('span', { class: 't', text: t.text }),
    el('button', { class: 'del', text: 'suppr', onclick: () => { p.tasks.splice(i, 1); touch(); renderDetail(); } }))));
  const addT = el('input', { placeholder: '+ nouvelle tâche (Entrée)' });
  addT.onkeydown = (e) => { if (e.key === 'Enter' && addT.value.trim()) { (p.tasks = p.tasks || []).push({ id: uid(), text: addT.value.trim(), done: false }); touch(); renderDetail(); setTimeout(() => $('#pdetail input[placeholder^="+ nouvelle"]').focus(), 0); } };
  const notes = el('textarea', { rows: 6, placeholder: 'Notes, composants, liens…' }); notes.value = p.notes || ''; notes.onchange = () => { p.notes = notes.value; touch(); };
  let armed = false;
  const del = el('button', { class: 'btn small', text: 'SUPPRIMER LE PROJET' });
  del.onclick = () => { if (!armed) { armed = true; del.textContent = 'CONFIRMER ?'; del.style.color = 'var(--bad)'; setTimeout(() => { armed = false; del.textContent = 'SUPPRIMER LE PROJET'; del.style.color = ''; }, 4000); return; }
    S.data.projects = P().filter(x => x.id !== p.id); S.pSel = null; save(); renderProjects(); };
  const done = (p.tasks || []).filter(t => t.done).length;
  box.append(el('div', { class: 'panel' },
    el('div', { class: 'ph', text: '[ FICHE PROJET ]' }),
    el('div', { class: 'pb scroll form' },
      name,
      el('div', { class: 'row3', style: 'grid-template-columns:1fr 2fr' }, el('label', {}, 'STATUT', st), el('label', {}, 'AVANCÉE', el('div', { class: 'prog', style: 'margin-top:4px' }, rg, pct))),
      el('label', {}, 'PROCHAINE ÉTAPE', nx),
      el('div', { class: 'sect', text: `TÂCHES ${done}/${(p.tasks || []).length}` }), tl, addT,
      el('div', { class: 'sect', text: 'NOTES' }), notes,
      el('div', { class: 'row', style: 'margin-top:14px;justify-content:space-between' }, el('span', { class: 'dim', style: 'font-size:11px', text: p.updated ? 'MODIFIÉ LE ' + fmtDate(p.updated) : '' }), del))));
  // --- colonne droite : JOURNAL / ACHATS
  const tabs = el('span', { class: 'rtabs' }, ...[['journal', 'JOURNAL'], ['achats', 'ACHATS']].map(([k, t]) => el('button', { class: (S.pRight || 'journal') === k ? 'on' : null, text: t, onclick: () => { S.pRight = k; renderDetail(); } })));
  if ((S.pRight || 'journal') === 'journal') {
    const now = new Date(); const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const ld = el('input', { type: 'datetime-local', value: local });
    const lt = el('textarea', { placeholder: 'Ce que j’ai fait, essais, pannes, réglages, résultats… (Ctrl+Entrée pour ajouter)' });
    const addLog = () => { const txt = lt.value.trim(); if (!txt) return; (p.logs = p.logs || []).push({ id: uid(), date: new Date(ld.value || Date.now()).toISOString(), text: txt }); touch(); renderProjects(); };
    lt.onkeydown = (e) => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); addLog(); } };
    const logs = [...(p.logs || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    const tline = el('ul', { class: 'timeline' });
    for (const l of logs) tline.append(el('li', {},
      el('div', { class: 'd' }, el('span', { text: fmtDate(l.date) }), el('button', { class: 'rm', text: 'suppr', onclick: () => { p.logs = p.logs.filter(x => x.id !== l.id); touch(); renderProjects(); } })),
      el('div', { class: 'x', text: l.text })));
    box.append(el('div', { class: 'panel' },
      el('div', { class: 'ph' }, '[ JOURNAL DE BORD ]', tabs, el('span', { style: 'color:var(--dim)', text: logs.length + ' ENTRÉES' })),
      el('div', { class: 'pb form logform', style: 'border-bottom:1px solid var(--line)' }, el('label', {}, 'DATE', ld), el('label', {}, 'ENTRÉE', lt), el('button', { class: 'btn amber', text: '+ AJOUTER AU JOURNAL', onclick: addLog })),
      el('div', { class: 'pb scroll' }, logs.length ? tline : el('div', { class: 'empty', text: 'JOURNAL VIDE' }))));
  } else {
    const SH = { acheter: 'À ACHETER', commande: 'COMMANDÉ', recu: 'REÇU' };
    const items = p.shopping;
    const tot = (f) => items.filter(f).reduce((s, x) => s + (parseFloat(x.price) || 0) * (x.qty || 1), 0);
    const it = el('input', { placeholder: 'Article (ex : moteurs 2207 1950KV ×4)' }), pr = el('input', { placeholder: '€' }), qt = el('input', { placeholder: '1', value: '1' }), sh = el('input', { placeholder: 'Boutique' }), url = el('input', { placeholder: 'Lien https://…' });
    const add = () => { if (!it.value.trim()) return; items.push({ id: uid(), item: it.value.trim(), price: parseFloat(String(pr.value).replace(',', '.')) || 0, qty: parseInt(qt.value) || 1, shop: sh.value.trim(), url: /^https:\/\//.test(url.value.trim()) ? url.value.trim() : '', status: 'acheter' }); touch(); renderDetail(); };
    box.append(el('div', { class: 'panel' },
      el('div', { class: 'ph' }, '[ LISTE D’ACHATS ]', tabs, el('span', { style: 'color:var(--dim)', text: `TOTAL ${tot(() => true).toFixed(2)} €` })),
      el('div', { class: 'pb form', style: 'border-bottom:1px solid var(--line)' },
        el('div', { class: 'row3', style: 'grid-template-columns:3fr 1fr 1fr' }, el('label', {}, 'ARTICLE', it), el('label', {}, 'PRIX UNIT.', pr), el('label', {}, 'QTÉ', qt)),
        el('div', { class: 'row3', style: 'grid-template-columns:1fr 2fr' }, el('label', {}, 'BOUTIQUE', sh), el('label', {}, 'LIEN', url)),
        el('button', { class: 'btn amber', text: '+ AJOUTER À LA LISTE', onclick: add })),
      el('div', { class: 'pb scroll' },
        items.length ? el('table', { class: 'tbl shop' }, el('tr', {}, ...['ARTICLE', 'QTÉ', 'PRIX', 'BOUTIQUE', 'ÉTAT', ''].map(x => el('th', { text: x }))),
          ...items.map(x => { const st = el('select', { style: 'padding:1px 4px;background:var(--panel2);border:1px solid var(--line2)' }, ...Object.entries(SH).map(([k, v]) => el('option', { value: k, selected: x.status === k, text: v }))); st.onchange = () => { x.status = st.value; touch(); renderDetail(); };
            return el('tr', { style: x.status === 'recu' ? 'opacity:.5' : null },
              el('td', {}, x.url ? el('button', { class: 'lnk', text: x.item, title: x.url, onclick: () => window.qg.open(x.url) }) : x.item),
              el('td', { class: 'r', text: String(x.qty || 1) }), el('td', { class: 'r', text: ((parseFloat(x.price) || 0) * (x.qty || 1)).toFixed(2) + ' €' }), el('td', { text: x.shop || '' }), el('td', {}, st),
              el('td', {}, el('button', { class: 'rm', style: 'visibility:visible', text: '×', onclick: () => { p.shopping = items.filter(y => y.id !== x.id); touch(); renderDetail(); } }))); })) : el('div', { class: 'empty', text: 'LISTE VIDE' }),
        el('table', { class: 'kv', style: 'margin-top:12px' },
          el('tr', {}, el('th', { text: 'À ACHETER' }), el('td', { text: tot(x => x.status === 'acheter').toFixed(2) + ' €' })),
          el('tr', {}, el('th', { text: 'COMMANDÉ' }), el('td', { text: tot(x => x.status === 'commande').toFixed(2) + ' €' })),
          el('tr', {}, el('th', { text: 'REÇU / DÉPENSÉ' }), el('td', { text: tot(x => x.status === 'recu').toFixed(2) + ' €' }))))));
  }
}

/* =========================================================
   DÉMARRAGE
   ========================================================= */
async function refreshAll() {
  $('#refresh').disabled = true;
  const r = await Promise.allSettled([loadWeather(), loadNews(), loadMail()]);
  const ok = r[0].status === 'fulfilled' || (r[1].status === 'fulfilled' && r[1].value);
  setNet(ok, ok ? 'EN LIGNE' : 'HORS LIGNE');
  if (r[0].status === 'rejected' && !S.weather) $('#wx').textContent = 'MÉTÉO INDISPONIBLE (réseau)';
  $('#refresh').disabled = false;
}
(async function boot() {
  if (document.readyState === 'loading') await new Promise(res => document.addEventListener('DOMContentLoaded', res));
  try { window.qg.setLang && window.qg.setLang(QG_LANG); } catch (e) {}
  S.data = await window.qg.getData();
  { const l = (S.data.settings || {}).lang; if ((l === 'en' || l === 'fr') && l !== QG_LANG) { setLang(l); location.reload(); return; } }
  S.data.settings = S.data.settings || {};
  if (!S.data.settings.location) S.data.settings.location = { name: 'Paris', lat: 48.8566, lon: 2.3522, mode: 'manual' };
  if (!S.data.settings.location.mode) S.data.settings.location.mode = 'manual';
  S.data.training = S.data.training || { goals: [{ id: 'g1', name: 'Course 5 km', type: 'course', distance: 5000, target: 1500 }], sessions: [] };
  if (!S.data.training.goals) S.data.training.goals = [];
  S.data.deadlines = S.data.deadlines || [];
  S.data.settings.modules = Object.assign({ mails: true, actus: true, projets: true, sport: true, agenda: true, systeme: true }, S.data.settings.modules || {});
  if (!Array.isArray(S.data.settings.topics)) S.data.settings.topics = defaultTopics();
  S.data.settings.topics.forEach(ensureTopic);
  delete S.data.settings.feeds;
  S.data.settings.importantSenders = S.data.settings.importantSenders || [];
  S.data.projects = S.data.projects || []; S.data.projects.forEach(p => { p.tasks = p.tasks || []; p.logs = p.logs || []; p.shopping = p.shopping || []; });
  // cache local pour un démarrage instantané
  try { const c = JSON.parse(localStorage.getItem('qg-news') || 'null'); if (c) { S.news = c.news; S.newsAt = c.at; } } catch (e) {}
  try { S.weather = JSON.parse(localStorage.getItem('qg-wx') || 'null'); } catch (e) {}
  await ensureLibs();
  try { globe = initGlobe(); } catch (e) { $('#globe-msg').textContent = 'GLOBE INDISPONIBLE : ' + e.message; }
  $('#legend-home').textContent = S.data.settings.location.name.toUpperCase();
  buildCats();
  applyProfile();
  route(); renderNews(); renderWeather(); updateStrip();
  if (!S.data.settings.profile) showOnboarding();
  if (globe && S.news.length) globe.setPins(S.news);
  refreshAll();
  locateMe(false).then(moved => { if (moved) loadWeather().catch(() => {}); }).catch(() => {});
  setInterval(() => loadMail(), 5 * 60e3);
  setInterval(() => locateMe(false).then(m => { if (m) loadWeather().catch(() => {}); }).catch(() => {}), 30 * 60e3);
  setInterval(() => { loadNews().catch(() => {}); loadWeather().catch(() => {}); }, 30 * 60e3);
  setInterval(() => { renderNews(); if (S.weather) $('#wx-age').textContent = ago(S.weather.at); }, 60e3);
})();
