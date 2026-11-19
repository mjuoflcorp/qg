/* QG 1.0 — onglet TOPICS : une page configurable par sujet (actus + modules : bourse, lancements, séismes, air…) */
'use strict';
(function () {
  /* ---------- pays et places boursières ---------- */
  const COUNTRIES = {
    FR: { n: 'France', idx: [['^FCHI', 'CAC 40'], ['^STOXX50E', 'EURO STOXX 50']], sug: [['MC.PA', 'LVMH'], ['TTE.PA', 'TotalEnergies'], ['AIR.PA', 'Airbus'], ['OR.PA', 'L’Oréal'], ['SAN.PA', 'Sanofi'], ['CW8.PA', 'ETF Amundi MSCI World'], ['ESE.PA', 'ETF BNP S&P 500']] },
    US: { n: 'États-Unis', idx: [['^GSPC', 'S&P 500'], ['^IXIC', 'NASDAQ'], ['^DJI', 'DOW JONES']], sug: [['AAPL', 'Apple'], ['MSFT', 'Microsoft'], ['NVDA', 'Nvidia'], ['AMZN', 'Amazon'], ['TSLA', 'Tesla'], ['SPY', 'ETF S&P 500'], ['QQQ', 'ETF Nasdaq 100'], ['VT', 'ETF Monde']] },
    DE: { n: 'Allemagne', idx: [['^GDAXI', 'DAX']], sug: [['SAP.DE', 'SAP'], ['SIE.DE', 'Siemens'], ['ALV.DE', 'Allianz'], ['RHM.DE', 'Rheinmetall'], ['EXS1.DE', 'ETF DAX']] },
    GB: { n: 'Royaume-Uni', idx: [['^FTSE', 'FTSE 100']], sug: [['SHEL.L', 'Shell'], ['AZN.L', 'AstraZeneca'], ['HSBA.L', 'HSBC'], ['BA.L', 'BAE Systems'], ['VUSA.L', 'ETF S&P 500']] },
    ES: { n: 'Espagne', idx: [['^IBEX', 'IBEX 35']], sug: [['ITX.MC', 'Inditex'], ['SAN.MC', 'Santander'], ['IBE.MC', 'Iberdrola']] },
    IT: { n: 'Italie', idx: [['FTSEMIB.MI', 'FTSE MIB']], sug: [['ENI.MI', 'Eni'], ['ISP.MI', 'Intesa Sanpaolo'], ['RACE.MI', 'Ferrari']] },
    BE: { n: 'Belgique', idx: [['^BFX', 'BEL 20']], sug: [['ABI.BR', 'AB InBev'], ['UCB.BR', 'UCB']] },
    CH: { n: 'Suisse', idx: [['^SSMI', 'SMI']], sug: [['NESN.SW', 'Nestlé'], ['NOVN.SW', 'Novartis'], ['ROG.SW', 'Roche']] },
    NL: { n: 'Pays-Bas', idx: [['^AEX', 'AEX']], sug: [['ASML.AS', 'ASML'], ['IWDA.AS', 'ETF iShares MSCI World']] },
    CA: { n: 'Canada', idx: [['^GSPTSE', 'S&P/TSX']], sug: [['RY.TO', 'Banque Royale'], ['SHOP.TO', 'Shopify']] },
    JP: { n: 'Japon', idx: [['^N225', 'NIKKEI 225']], sug: [['7203.T', 'Toyota'], ['6758.T', 'Sony'], ['7974.T', 'Nintendo']] },
    CN: { n: 'Chine / Hong Kong', idx: [['^HSI', 'HANG SENG'], ['000001.SS', 'SHANGHAI']], sug: [['0700.HK', 'Tencent'], ['9988.HK', 'Alibaba']] },
    IN: { n: 'Inde', idx: [['^NSEI', 'NIFTY 50']], sug: [['RELIANCE.NS', 'Reliance'], ['TCS.NS', 'TCS']] },
    BR: { n: 'Brésil', idx: [['^BVSP', 'IBOVESPA']], sug: [['PETR4.SA', 'Petrobras'], ['VALE3.SA', 'Vale']] }
  };
  const WORLD = [['^GSPC', 'S&P 500'], ['^STOXX50E', 'EURO STOXX 50'], ['^N225', 'NIKKEI'], ['EURUSD=X', 'EUR / USD'], ['GC=F', 'OR'], ['BZ=F', 'PÉTROLE BRENT'], ['BTC-EUR', 'BITCOIN']];
  const RANGES = { '1J': ['1d', '5m'], '5J': ['5d', '30m'], '1M': ['1mo', '1d'], '6M': ['6mo', '1d'], '1A': ['1y', '1d'], '5A': ['5y', '1wk'] };

  /* ---------- données (cache mémoire) ---------- */
  const cache = new Map();
  async function getJSON(url, ttl, force) {
    const c = cache.get(url);
    if (!force && c && Date.now() - c.at < ttl) return c.v;
    const v = JSON.parse(await window.qg.fetchText(url)); cache.set(url, { at: Date.now(), v }); return v;
  }
  const okSym = (s) => /^[\^A-Za-z0-9.=\-]{1,20}$/.test(s);
  async function quote(sym, range = '1M', force) {
    if (!okSym(sym)) throw new Error('symbole invalide');
    const [r, iv] = RANGES[range];
    const j = await getJSON(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${r}&interval=${iv}`, range === '1J' ? 120e3 : 600e3, force);
    const res = j && j.chart && j.chart.result && j.chart.result[0]; if (!res) throw new Error('introuvable');
    const m = res.meta || {}, cl = ((res.indicators || {}).quote || [{}])[0].close || [];
    const pts = (res.timestamp || []).map((t, i) => ({ x: new Date(t * 1000), y: cl[i] })).filter(p => p.y != null);
    const price = m.regularMarketPrice != null ? m.regularMarketPrice : (pts.length ? pts[pts.length - 1].y : null);
    const prev = range === '1J' ? m.chartPreviousClose : (pts.length > 1 ? pts[pts.length - 2].y : m.chartPreviousClose);
    return { sym, name: m.longName || m.shortName || sym, cur: m.currency || '', price, prev, chg: price != null && prev ? (price / prev - 1) * 100 : null, first: pts.length ? pts[0].y : null, pts, intraday: range === '1J' || range === '5J' };
  }
  const nf = (v, d = 2) => v == null || !isFinite(v) ? '--' : v.toLocaleString(QG_LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d });
  const curS = (c) => ({ EUR: '€', USD: '$', GBP: '£', JPY: '¥', CHF: 'CHF', GBp: 'p' })[c] || c || '';
  const chgEl = (c) => el('span', { class: c == null ? 'dim' : c >= 0 ? 'good' : 'badc', text: c == null ? '--' : (c >= 0 ? '+' : '') + nf(c) + ' %' });
  const spark = (pts, up) => { const c = el('canvas', { class: 'spark-c' }); requestAnimationFrame(() => lineChart(c, pts, { color: up ? '#6cc47f' : '#d0574a', noX: true, noDots: true, yFmt: () => '' })); return c; };

  /* ---------- état de la page ---------- */
  let sel = null, cfgOpen = false, detail = null, detailRange = '1M';
  const topics = () => (S.data.settings.topics || []).filter(t => t.enabled !== false);
  const cur = () => topics().find(t => t.id === sel) || topics()[0];
  window.openTopic = (id) => { sel = id; cfgOpen = false; detail = null; if (location.hash !== '#topics') location.hash = '#topics'; else render(); };

  function render() {
    const v = $('#v-topics'), T = topics(), t = cur();
    const nb = (id) => S.news.filter(n => n.cat === id).length;
    const list = el('aside', { class: 'panel tlist' }, el('div', { class: 'ph', text: '[ MES TOPICS ]' }),
      el('div', { class: 'pb scroll' },
        ...T.map(x => el('button', { class: 'tbtn' + (t && x.id === t.id ? ' on' : ''), style: '--tc:' + x.color, onclick: () => { sel = x.id; cfgOpen = false; detail = null; render(); } },
          el('i', { text: '■' }), el('span', { text: x.name.toUpperCase() }), el('small', { text: String(nb(x.id)) }))),
        el('button', { class: 'lnk', style: 'margin-top:12px', text: '+ AJOUTER / GÉRER LES TOPICS', onclick: () => { window.setSection && window.setSection('actus'); location.hash = '#reglages'; } })));
    if (!t) { v.replaceChildren(list, el('div', { class: 'panel' }, el('div', { class: 'empty', text: 'AUCUN TOPIC ACTIF — AJOUTES-EN DANS RÉGLAGES' }))); return; }
    sel = t.id; ensureTopic(t);
    const head = el('div', { class: 'ph', style: 'color:' + t.color }, '[ ' + t.name.toUpperCase() + ' ]',
      el('span', { class: 'ph-r' },
        el('button', { class: 'lnk', text: '↻ ACTUALISER', onclick: () => { loadWidgets(t, true); loadNews().then(() => renderNewsCol(t)).catch(() => {}); } }),
        el('button', { class: 'lnk' + (cfgOpen ? ' on' : ''), text: cfgOpen ? '✕ FERMER' : '⚙ CONFIGURER LA PAGE', onclick: () => { cfgOpen = !cfgOpen; render(); } })));
    const main = el('div', { class: 'panel tmain' }, head,
      el('div', { class: 'tgrid' },
        el('div', { class: 'tcol' }, el('div', { class: 'sect', text: 'ACTUALITÉS (48 H)' }), el('div', { id: 'tp-news' })),
        el('div', { class: 'tcol', id: 'tp-w' })));
    v.replaceChildren(list, main);
    renderNewsCol(t);
    if (cfgOpen) renderConfig(t); else loadWidgets(t, false);
  }

  /* ---------- colonne actus ---------- */
  function renderNewsCol(t) {
    const box = $('#tp-news'); if (!box) return;
    const L = S.news.filter(n => n.cat === t.id);
    if (!L.length) { box.replaceChildren(el('div', { class: 'empty', text: S.newsAt ? 'AUCUNE ACTU RÉCENTE — AJOUTE DES MOTS-CLÉS OU DES FLUX (⚙ CONFIGURER)' : 'CHARGEMENT…' })); return; }
    box.replaceChildren(...L.map(n => {
      const more = el('div', { class: 'tn-more', hidden: true },
        n.desc ? el('div', { text: n.desc }) : null,
        el('div', { class: 'row', style: 'margin-top:6px' },
          n.link ? el('button', { class: 'btn small', text: 'LIRE L’ARTICLE ↗', onclick: (e) => { e.stopPropagation(); window.qg.open(n.link); } }) : null,
          n.lat != null ? el('button', { class: 'btn small', text: '⌖ VOIR SUR LE GLOBE', onclick: (e) => { e.stopPropagation(); location.hash = '#qg'; setTimeout(() => selectNews(n), 150); } }) : null));
      return el('div', { class: 'tnews', onclick: () => { more.hidden = !more.hidden; } },
        el('div', { class: 'meta' }, el('span', { text: n.source }), n.place ? el('span', { text: '⌖ ' + n.place }) : null, el('span', { style: 'margin-left:auto', text: shortTime(n.date) })),
        el('div', { class: 'title', text: n.title }), more);
    }));
  }

  /* ---------- modules ---------- */
  function card(title, body, extra) { return el('div', { class: 'wcard' }, el('div', { class: 'wh' }, el('span', { text: title }), extra || null), body); }
  const loading = () => el('div', { class: 'dim', text: 'CHARGEMENT…' });
  const fail = (box, e) => box.replaceChildren(el('div', { class: 'dim', text: 'INDISPONIBLE : ' + errMsg(e) }));

  function loadWidgets(t, force) {
    const box = $('#tp-w'); if (!box) return;
    const w = t.w, parts = [];
    if (detail) parts.push(detailCard(t, force));
    if (w.markets) parts.push(marketsCard(t, force));
    if (w.watch.length || w.markets || w.watchOn) parts.push(watchCard(t, force));
    if (w.launches) parts.push(asyncCard('PROCHAINS LANCEMENTS SPATIAUX', (b) => launches(b, force)));
    if (w.quakes) parts.push(asyncCard('SÉISMES MAGNITUDE 4,5+ (24 H)', (b) => quakes(b, force)));
    if (w.air) parts.push(asyncCard('QUALITÉ DE L’AIR & POLLENS // ' + (S.data.settings.location.name || '').toUpperCase(), (b) => air(b, force)));
    if (w.hn) parts.push(asyncCard('TOP HACKER NEWS', (b) => hn(b, force)));
    if (w.show.links !== false) parts.push(linksCard(t));
    if (w.show.notes !== false) parts.push(notesCard(t));
    box.replaceChildren(...parts);
  }
  function asyncCard(title, fn) { const b = el('div', {}, loading()); fn(b).catch(e => fail(b, e)); return card(title, b); }

  // graphique détaillé d'un cours
  function detailCard(t, force) {
    const b = el('div', {}, loading());
    const btns = el('span', { class: 'rng' }, ...Object.keys(RANGES).map(k => el('button', { class: k === detailRange ? 'on' : null, text: QG_LANG === 'en' ? k.replace('J', 'D').replace('A', 'Y') : k, onclick: () => { detailRange = k; loadWidgets(t, false); } })),
      el('button', { text: '✕', title: 'Fermer', onclick: () => { detail = null; loadWidgets(t, false); } }));
    quote(detail, detailRange, force).then(q => {
      const up = q.first != null && q.price >= q.first, c = el('canvas', { style: 'width:100%;height:190px;display:block' });
      b.replaceChildren(el('div', { class: 'qhead' }, el('b', { text: q.name }), el('span', { class: 'dim', text: q.sym })),
        el('div', { class: 'qprice' }, el('span', { text: nf(q.price) + ' ' + curS(q.cur) }), chgEl(q.chg), el('span', { class: 'dim', text: 'sur la période : ' }), chgEl(q.first ? (q.price / q.first - 1) * 100 : null)), c,
        el('div', { class: 'note' }, 'Données Yahoo Finance, en différé (souvent 15 min). ', el('button', { class: 'lnk', text: 'OUVRIR LA FICHE ↗', onclick: () => window.qg.open('https://fr.finance.yahoo.com/quote/' + encodeURIComponent(q.sym)) })));
      requestAnimationFrame(() => lineChart(c, q.pts, { color: up ? '#6cc47f' : '#d0574a', noDots: true, yFmt: (v) => nf(v, v > 1000 ? 0 : 2), xFmt: q.intraday ? (x) => { const d = new Date(x); return pad(d.getHours()) + ':' + pad(d.getMinutes()); } : undefined }));
    }).catch(e => fail(b, e));
    return card('GRAPHIQUE', b, btns);
  }
  const showDetail = (t, sym) => { detail = sym; loadWidgets(t, false); $('#tp-w').scrollTop = 0; };

  function marketsCard(t, force) {
    const sel_ = el('select', { class: 'mini' }, ...Object.entries(COUNTRIES).map(([k, c]) => el('option', { value: k, text: c.n, selected: k === t.country })));
    sel_.onchange = () => { t.country = sel_.value; save(); loadWidgets(t, false); };
    const C = COUNTRIES[t.country] || COUNTRIES.FR;
    const tile = (sym, label) => { const x = el('button', { class: 'tile', onclick: () => showDetail(t, sym) }, el('div', { class: 'k', text: label }), el('div', { class: 'v', text: '…' }), el('div', { class: 'c' }));
      quote(sym, '1J', force).then(q => { x.children[1].textContent = nf(q.price, q.price > 1000 ? 0 : 2); x.children[2].replaceChildren(chgEl(q.chg)); }).catch(() => { x.children[1].textContent = '--'; }); return x; };
    const seen = new Set(C.idx.map(i => i[0]));
    return card('BOURSE', el('div', {},
      el('div', { class: 'sect', text: 'PAYS : ' + C.n.toUpperCase() }), el('div', { class: 'tiles' }, ...C.idx.map(([s, l]) => tile(s, l))),
      el('div', { class: 'sect', text: 'MONDE' }), el('div', { class: 'tiles' }, ...WORLD.filter(([s]) => !seen.has(s)).map(([s, l]) => tile(s, l))),
      el('div', { class: 'note', text: 'Clique sur un indice pour voir son graphique.' })), el('span', {}, 'PAYS ', sel_));
  }

  function watchCard(t, force) {
    const w = t.w, rows = el('div', { class: 'wlist' });
    const draw = () => {
      rows.replaceChildren(...w.watch.map(sym => {
        const r = el('div', { class: 'wrow', onclick: () => showDetail(t, sym) }, el('div', { class: 'wn' }, el('b', { text: sym }), el('small', { text: '…' })), el('span', { class: 'wp', text: '' }), el('span', { class: 'wc' }), el('span', { class: 'ws' }),
          el('button', { class: 'rm', text: '×', title: 'Retirer', onclick: (e) => { e.stopPropagation(); w.watch = w.watch.filter(x => x !== sym); save(); draw(); } }));
        quote(sym, '1M', force).then(q => { r.children[0].children[1].textContent = q.name; r.children[1].textContent = nf(q.price) + ' ' + curS(q.cur); r.children[2].replaceChildren(chgEl(q.chg)); r.children[3].replaceChildren(spark(q.pts, q.first == null || q.price >= q.first)); })
          .catch(() => { r.children[0].children[1].textContent = 'introuvable'; });
        return r;
      }));
      if (!w.watch.length) rows.append(el('div', { class: 'dim', text: 'Aucun cours suivi. Cherche une action, un ETF ou une crypto ci-dessous.' }));
    };
    draw();
    // recherche de symbole
    const q = el('input', { placeholder: 'Rechercher : nom ou symbole (ex : Airbus, MSCI World, bitcoin…)' }), res = el('div', { class: 'sres' });
    const add = (sym) => { if (!okSym(sym)) return; if (!w.watch.includes(sym)) { if (w.watch.length >= 20) return; w.watch.push(sym); save(); } q.value = ''; res.replaceChildren(); draw(); };
    const search = async () => {
      const s = q.value.trim(); if (!s) return; res.replaceChildren(el('div', { class: 'dim', text: 'RECHERCHE…' }));
      try {
        const j = await getJSON('https://query2.finance.yahoo.com/v1/finance/search?q=' + encodeURIComponent(s) + '&quotesCount=8&newsCount=0&lang=' + QG_LOCALE, 600e3);
        const L = (j.quotes || []).filter(x => x.symbol && okSym(x.symbol));
        res.replaceChildren(...(L.length ? L.map(x => el('button', { class: 'sr', onclick: () => add(x.symbol) }, el('b', { text: x.symbol }), ' ' + (x.shortname || x.longname || ''), el('small', { text: ' · ' + [x.typeDisp || x.quoteType, x.exchDisp].filter(Boolean).join(' · ') }))) : [el('div', { class: 'dim', text: 'AUCUN RÉSULTAT' })]));
      } catch (e) { res.replaceChildren(el('div', { class: 'dim', text: 'RECHERCHE INDISPONIBLE : ' + errMsg(e) })); }
    };
    q.onkeydown = (e) => { if (e.key === 'Enter') search(); };
    const C = COUNTRIES[t.country] || COUNTRIES.FR;
    const sugg = t.w.markets ? el('div', { class: 'chips' }, ...C.sug.filter(([s]) => !w.watch.includes(s)).map(([s, n]) => el('button', { class: 'chipb', style: '--tc:' + t.color, text: '+ ' + n, onclick: () => add(s) }))) : null;
    return card('COURS SUIVIS', el('div', {}, rows,
      el('div', { class: 'mp-row', style: 'margin-top:10px' }, q, el('button', { class: 'btn', text: 'CHERCHER', onclick: search })), res,
      sugg ? el('div', { class: 'sect', text: 'IDÉES — ' + C.n.toUpperCase() }) : null, sugg), el('span', { class: 'dim', text: w.watch.length + ' / 20' }));
  }

  async function launches(b, force) {
    const j = await getJSON('https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=6', 3600e3, force);
    const L = (j.results || []).filter(x => new Date(x.net) > Date.now() - 3600e3);
    b.replaceChildren(el('ul', { class: 'timeline' }, ...L.map(x => {
      const t = new Date(x.net), d = Math.floor((t - Date.now()) / 864e5), prov = (x.launch_service_provider || {}).name || x.lsp_name || '', loc = ((x.pad || {}).location || {}).name || x.location || '';
      return el('li', {}, el('div', { class: 'd' }, el('span', { text: fmtDate(x.net) + (t > Date.now() ? '  ·  J-' + d : '') }), el('span', { class: 'dim', text: ((x.status || {}).abbrev || '') })),
        el('div', { class: 'x', text: x.name + '\n' + [prov, loc].filter(Boolean).join(' · ') }));
    })), el('div', { class: 'note', text: 'Source : The Space Devs (Launch Library 2). Dates susceptibles de changer.' }));
  }
  async function quakes(b, force) {
    const j = await getJSON('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson', 900e3, force);
    const L = (j.features || []).sort((a, c) => c.properties.mag - a.properties.mag).slice(0, 8);
    b.replaceChildren(L.length ? el('div', { class: 'wlist' }, ...L.map(f => { const p = f.properties;
      return el('div', { class: 'wrow', onclick: () => /^https:/.test(p.url || '') && window.qg.open(p.url) }, el('b', { class: p.mag >= 6 ? 'badc' : p.mag >= 5 ? 'mid' : null, style: 'width:44px', text: 'M' + nf(p.mag, 1) }), el('span', { style: 'flex:1', text: p.place || '' }), el('span', { class: 'dim', text: ago(new Date(p.time).toISOString()) })); }))
      : el('div', { class: 'dim', text: 'Aucun séisme de magnitude 4,5+ ces dernières 24 h.' }),
      el('div', { class: 'note', text: 'Source : USGS. Clique pour la fiche détaillée.' }));
  }
  async function air(b, force) {
    const l = S.data.settings.location;
    const j = await getJSON(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${(+l.lat).toFixed(3)}&longitude=${(+l.lon).toFixed(3)}&current=european_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,alder_pollen,birch_pollen,grass_pollen,ragweed_pollen&timezone=auto`, 1800e3, force);
    const c = j.current || {}, a = c.european_aqi;
    const lab = a == null ? ['--', ''] : a <= 20 ? ['BON', 'good'] : a <= 40 ? ['CORRECT', 'good'] : a <= 60 ? ['MOYEN', 'mid'] : a <= 80 ? ['MÉDIOCRE', 'badc'] : ['MAUVAIS', 'badc'];
    const pol = (v) => v == null ? '--' : v < 10 ? 'faible' : v < 50 ? 'modéré' : 'élevé';
    b.replaceChildren(el('div', { class: 'bigs', style: 'grid-template-columns:repeat(3,1fr)' },
      el('div', {}, el('div', { class: 'k', text: 'INDICE EUROPÉEN' }), el('div', { class: 'v ' + lab[1], text: (a == null ? '--' : Math.round(a)) + ' · ' + lab[0] })),
      el('div', {}, el('div', { class: 'k', text: 'PM2,5 / PM10' }), el('div', { class: 'v', text: nf(c.pm2_5, 0) + ' / ' + nf(c.pm10, 0) })),
      el('div', {}, el('div', { class: 'k', text: 'OZONE / NO₂' }), el('div', { class: 'v', text: nf(c.ozone, 0) + ' / ' + nf(c.nitrogen_dioxide, 0) }))),
      el('div', { class: 'x', text: `Pollens — graminées : ${pol(c.grass_pollen)} · bouleau : ${pol(c.birch_pollen)} · aulne : ${pol(c.alder_pollen)} · ambroisie : ${pol(c.ragweed_pollen)}` }),
      el('div', { class: 'note', text: 'Source : Open-Meteo / Copernicus (µg/m³). Pollens disponibles en Europe uniquement.' }));
  }
  async function hn(b, force) {
    const j = await getJSON('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=10', 900e3, force);
    b.replaceChildren(el('div', { class: 'wlist' }, ...(j.hits || []).map(h => {
      const url = /^https:\/\//.test(h.url || '') ? h.url : 'https://news.ycombinator.com/item?id=' + encodeURIComponent(h.objectID);
      return el('div', { class: 'wrow', onclick: () => window.qg.open(url) }, el('span', { style: 'flex:1', text: h.title }), el('span', { class: 'dim', text: (h.points || 0) + ' pts · ' + (h.num_comments || 0) + ' com.' }));
    })));
  }
  function linksCard(t) {
    const L = t.w.links;
    return card('LIENS UTILES', L.length ? el('div', { class: 'chips' }, ...L.map(l => el('button', { class: 'chipb', style: '--tc:' + t.color, text: l.name + ' ↗', onclick: () => window.qg.open(l.url) })))
      : el('div', { class: 'dim', text: 'Aucun lien — ajoute tes sites favoris dans ⚙ CONFIGURER LA PAGE.' }));
  }
  function notesCard(t) {
    const ta = el('textarea', { rows: 5, placeholder: 'Tes notes sur ce sujet…' }); ta.value = t.w.notes || '';
    ta.oninput = () => { t.w.notes = ta.value.slice(0, 20000); save(); };
    return card('NOTES', ta);
  }

  /* ---------- configuration de la page ---------- */
  function renderConfig(t) {
    const box = $('#tp-w'), msg = el('span', { class: 'dim' });
    const nm = el('input', { value: t.name, maxlength: 30 }), col = el('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(t.color) ? t.color : '#d8d4c8', class: 'tcol' });
    const kw = el('input', { value: t.keywords || '', placeholder: 'mots-clés Google News, séparés par OR' });
    const fd = el('textarea', { rows: 3, placeholder: 'Une source par ligne — Nom | https://…/rss' }); fd.value = (t.feeds || []).map(f => f.name + ' | ' + f.url).join('\n');
    const lk = el('textarea', { rows: 4, placeholder: 'Un lien par ligne — Nom | https://…' }); lk.value = t.w.links.map(l => l.name + ' | ' + l.url).join('\n');
    const country = el('select', {}, ...Object.entries(COUNTRIES).map(([k, c]) => el('option', { value: k, text: c.n, selected: k === t.country })));
    const checks = Object.entries(WIDGETS).map(([k, label]) => {
      const on = k === 'links' || k === 'notes' ? t.w.show[k] !== false : k === 'watch' ? t.w.watch.length > 0 || !!t.w.watchOn : !!t.w[k];
      return el('label', { class: 'chk' }, el('input', { type: 'checkbox', 'data-w': k, checked: on }), label);
    });
    const parse = (txt) => txt.split('\n').map(x => x.trim()).filter(Boolean).map(x => { const i = x.indexOf('|'); const a = i < 0 ? x : x.slice(0, i), u = i < 0 ? x : x.slice(i + 1); return { name: a.trim().slice(0, 60), url: u.trim() }; }).filter(f => /^https:\/\/[^\s]+$/.test(f.url));
    box.replaceChildren(card('CONFIGURER « ' + t.name.toUpperCase() + ' »', el('div', { class: 'form' },
      el('div', { class: 'row' }, col, nm),
      el('label', {}, 'MOTS-CLÉS DES ACTUS', kw), el('label', {}, 'FLUX RSS', fd),
      el('div', { class: 'sect', text: 'MODULES DE LA PAGE' }), ...checks,
      el('label', { style: 'margin-top:10px' }, 'PAYS POUR LA BOURSE', country),
      el('label', {}, 'LIENS UTILES', lk),
      el('div', { class: 'row', style: 'margin-top:12px' }, el('button', { class: 'btn amber', text: 'ENREGISTRER', onclick: async () => {
        const kwChanged = kw.value.trim() !== (t.keywords || '') || fd.value !== (t.feeds || []).map(f => f.name + ' | ' + f.url).join('\n');
        t.name = nm.value.trim().slice(0, 30) || t.name; t.color = col.value; t.keywords = kw.value.trim().slice(0, 200); t.feeds = parse(fd.value).slice(0, 10);
        t.w.links = parse(lk.value).slice(0, 20); t.country = country.value;
        $$('input[data-w]', box).forEach(c => { const k = c.dataset.w; if (k === 'links' || k === 'notes') t.w.show[k] = c.checked; else if (k === 'watch') { t.w.watchOn = c.checked; if (!c.checked) t.w.watch = []; } else t.w[k] = c.checked; });
        save(); buildCats(); cfgOpen = false; render();
        if (kwChanged) { await loadNews().catch(() => {}); render(); }
      } }), el('button', { class: 'btn', text: 'ANNULER', onclick: () => { cfgOpen = false; render(); } }), msg))));
  }

  QGViews.topics = { show() { render(); }, refresh() { if (!$('#v-topics').hidden && !cfgOpen) { const t = cur(); if (t) renderNewsCol(t); } } };
})();
