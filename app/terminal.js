/* QG — onglet TERMINAL : poste de marché au clavier (CAC 40, valeurs, lecture des actus, monde, liste de suivi)
   Design propre au QG (ambre sur noir), données gratuites Yahoo Finance (différé ~15 min). */
'use strict';
(function () {
  const T = () => { const s = S.data.settings; s.term = s.term || { watch: ['CW8.PA', 'ESE.PA', 'AIR.PA', 'SAF.PA', 'HO.PA', 'MC.PA', 'TTE.PA'], sel: '^FCHI', range: '1M' }; return s.term; };
  let built = false, newsFilter = '', heat = [];
  const NAMES = { '^FCHI': 'CAC 40' };
  const label = (sym) => ((window.MARCHE && MARCHE.CAC40.find(c => c.t === sym)) || {}).n || NAMES[sym] || sym;

  function build() {
    const q = el('input', { id: 'tm-cmd', placeholder: 'commande : CAC · LVMH · AIR · 1J 5J 1M 6M 1A 5A · W+ CW8 · W- CW8 · NEWS taux · MAJ · AIDE', autocomplete: 'off', spellcheck: 'false' });
    q.onkeydown = (e) => { if (e.key === 'Enter') { run(q.value); q.value = ''; } };
    $('#v-terminal').replaceChildren(
      el('div', { class: 'tm-bar' }, el('span', { class: 'tm-p', text: 'QG ▸' }), q, el('span', { id: 'tm-out', class: 'tm-out' })),
      el('div', { class: 'tm-grid' },
        pane('a', 'CAC 40'), pane('b', 'VALEUR'), pane('c', 'FIL ÉCO — IMPACT'),
        pane('d', 'LES 40 VALEURS'), pane('e', 'LECTURE DU MARCHÉ'), pane('f', 'MONDE · MA LISTE')));
    built = true;
  }
  const pane = (k, title) => el('div', { class: 'panel tm-pane', id: 'tm-' + k }, el('div', { class: 'ph' }, el('span', { class: 'tm-k', text: k.toUpperCase() }), ' ', el('span', { id: 'tm-' + k + '-t', text: title }), el('span', { class: 'ph-r', id: 'tm-' + k + '-r' })), el('div', { class: 'pb scroll', id: 'tm-' + k + '-b', text: 'CHARGEMENT…' }));
  const out = (t, cls) => { const o = $('#tm-out'); o.textContent = t; o.className = 'tm-out ' + (cls || ''); };
  const pick = (sym) => { T().sel = sym; save(); renderB(false); $('#tm-b').scrollIntoView({ block: 'nearest' }); };

  /* ---------- commandes ---------- */
  async function run(raw) {
    const c = String(raw || '').trim(); if (!c) return;
    const U = c.toUpperCase(), [cmd, ...rest] = U.split(/\s+/), arg = rest.join(' ');
    const Q = window.QGT;
    if (['AIDE', 'HELP', '?'].includes(cmd)) return out('CAC = indice · NOM ou TICKER (LVMH, AIR, MC.PA, AAPL) = fiche · 1J 5J 1M 6M 1A 5A = période · W+ X / W- X = liste · NEWS mot = filtrer le fil · MAJ = actualiser · Échap = onglets');
    if (cmd === 'MAJ' || cmd === 'R') { render(true); return out('ACTUALISÉ', 'good'); }
    if (Q.RANGES[cmd]) { T().range = cmd; save(); renderB(false); return out('PÉRIODE ' + cmd, 'good'); }
    if (cmd === 'CAC' || cmd === 'PX1') return pick('^FCHI'), out('CAC 40', 'good');
    if (cmd === 'NEWS') { newsFilter = MARCHE.norm(arg); renderC(); return out(arg ? 'FIL FILTRÉ : ' + arg : 'FIL COMPLET', 'good'); }
    if (cmd === 'W+' || cmd === 'W-') {
      const sym = await resolve(arg); if (!sym) return out('INTROUVABLE : ' + arg, 'badc');
      const W = T().watch; if (cmd === 'W+') { if (!W.includes(sym)) W.push(sym); } else T().watch = W.filter(x => x !== sym);
      save(); renderF(false); return out((cmd === 'W+' ? 'AJOUTÉ : ' : 'RETIRÉ : ') + label(sym), 'good');
    }
    const sym = await resolve(c);
    if (!sym) return out('INCONNU : ' + c + ' — tape AIDE', 'badc');
    pick(sym); out(label(sym) + ' (' + sym + ')', 'good');
  }
  async function resolve(txt) {
    const s = String(txt || '').trim(); if (!s) return null;
    const n = MARCHE.norm(s), U = s.toUpperCase();
    const c = MARCHE.CAC40.find(x => x.t === U || x.t.split('.')[0] === U || MARCHE.norm(x.n) === n) || MARCHE.CAC40.find(x => MARCHE.norm(x.n).startsWith(n) && n.length >= 3);
    if (c) return c.t;
    if (QGT.okSym(U)) { try { await QGT.quote(U, '1J'); return U; } catch (e) {} }
    try {
      const j = await QGT.getJSON('https://query2.finance.yahoo.com/v1/finance/search?q=' + encodeURIComponent(s) + '&quotesCount=5&newsCount=0&lang=fr-FR', 600e3);
      const r = (j.quotes || []).find(x => x.symbol && QGT.okSym(x.symbol)); if (r) { NAMES[r.symbol] = r.shortname || r.longname || r.symbol; return r.symbol; }
    } catch (e) {}
    return null;
  }

  /* ---------- panneaux ---------- */
  async function renderA(force) { const b = $('#tm-a-b'); try { await QGT.cacLive(b, force); $('#tm-a-r').textContent = QGT.isOpen() ? '● OUVERT' : '○ FERMÉ'; } catch (e) { b.textContent = 'INDISPONIBLE : ' + errMsg(e); } }

  async function renderB(force) {
    const b = $('#tm-b-b'), sym = T().sel, rg = T().range, Q = QGT;
    $('#tm-b-t').textContent = 'VALEUR · ' + label(sym).toUpperCase();
    $('#tm-b-r').replaceChildren(...Object.keys(Q.RANGES).map(k => el('button', { class: 'tm-rg' + (k === rg ? ' on' : ''), text: k, onclick: () => { T().range = k; save(); renderB(false); } })));
    try {
      const q = await Q.quote(sym, rg, force), ys = q.pts.map(p => p.y), hi = Math.max(...ys), lo = Math.min(...ys);
      if (q.name && !NAMES[sym]) NAMES[sym] = q.name;
      const c = el('canvas', { style: 'width:100%;height:150px;display:block' });
      const perf = q.first ? (q.price / q.first - 1) * 100 : null;
      const cc = window.MARCHE && MARCHE.CAC40.find(x => x.t === sym);
      const related = cc ? (S.news || []).filter(n => cc.re.test(MARCHE.norm(n.title))).slice(0, 4) : [];
      b.replaceChildren(
        el('div', { class: 'qprice' }, el('span', { text: Q.nf(q.price) + ' ' + Q.curS(q.cur) }), Q.chgEl(q.chg), el('span', { class: 'dim', text: rg + ' :' }), Q.chgEl(perf)),
        c,
        el('table', { class: 'kv tm-kv' },
          el('tr', {}, el('th', { text: 'PLUS HAUT / BAS ' + rg }), el('td', { text: Q.nf(hi) + ' / ' + Q.nf(lo) })),
          el('tr', {}, el('th', { text: 'CLÔTURE VEILLE' }), el('td', { text: Q.nf(q.prev) })),
          el('tr', {}, el('th', { text: 'SECTEUR' }), el('td', { text: cc ? MARCHE.SECT[cc.s] : '—' }))),
        related.length ? el('div', { class: 'sect', text: 'ACTUS LIÉES' }) : null,
        ...related.map(n => el('div', { class: 'tm-rel', onclick: () => n.link && window.qg.open(n.link), text: '› ' + n.title })),
        el('div', { class: 'row' }, el('button', { class: 'btn small', text: T().watch.includes(sym) ? '★ DANS MA LISTE' : '☆ AJOUTER À MA LISTE', onclick: () => { const W = T().watch; if (!W.includes(sym)) W.push(sym); else T().watch = W.filter(x => x !== sym); save(); renderB(false); renderF(false); } }),
          el('button', { class: 'btn small', text: 'FICHE COMPLÈTE ↗', onclick: () => window.qg.open('https://fr.finance.yahoo.com/quote/' + encodeURIComponent(sym)) })));
      requestAnimationFrame(() => lineChart(c, q.pts, { color: (perf == null || perf >= 0) ? '#6cc47f' : '#d0574a', noDots: true, yFmt: (v) => Q.nf(v, v > 1000 ? 0 : 2), xFmt: q.intraday ? (x) => { const d = new Date(x); return pad(d.getHours()) + ':' + pad(d.getMinutes()); } : undefined }));
    } catch (e) { b.replaceChildren(el('div', { class: 'empty', text: 'INDISPONIBLE : ' + errMsg(e) })); }
  }

  function renderC() {
    const b = $('#tm-c-b'), eco = (S.data.settings.topics || []).filter(t => t.scope === 'eco').map(t => t.id);
    let L = (S.news || []).map(n => ({ n, fx: MARCHE.analyze(n) })).filter(x => eco.includes(x.n.cat) || x.fx.length);
    if (newsFilter) L = L.filter(x => MARCHE.norm(x.n.title).includes(newsFilter));
    L.sort((a, c) => new Date(c.n.date) - new Date(a.n.date));
    $('#tm-c-r').textContent = L.length + ' ACTUS' + (newsFilter ? ' · FILTRE' : '');
    b.replaceChildren(...(L.length ? L.slice(0, 60).map(({ n, fx }) => QGT.newsItem(n, QGT.fxChips(fx))) : [el('div', { class: 'empty', text: S.newsAt ? 'AUCUNE ACTU' : 'CHARGEMENT…' })]));
  }

  async function renderD(force) {
    const b = $('#tm-d-b');
    const res = await Promise.all(MARCHE.CAC40.map(c => QGT.quote(c.t, '1J', force).then(q => ({ c, q })).catch(() => ({ c, q: null }))));
    heat = res.sort((a, c) => ((c.q && c.q.chg) ?? -99) - ((a.q && a.q.chg) ?? -99));
    const up = heat.filter(x => x.q && x.q.chg > 0).length, dn = heat.filter(x => x.q && x.q.chg < 0).length;
    $('#tm-d-r').replaceChildren(el('span', { class: 'good', text: up + '▲ ' }), el('span', { class: 'badc', text: dn + '▼' }));
    b.replaceChildren(el('div', { class: 'heat' }, ...heat.map(({ c, q }) => {
      const v = q && q.chg != null ? q.chg : 0, a = Math.min(1, Math.abs(v) / 3) * 0.7 + 0.08;
      return el('button', { class: 'hcell', title: c.n + ' · ' + MARCHE.SECT[c.s] + (q ? ' · ' + QGT.nf(q.price) + ' €' : ''), style: `background:${v >= 0 ? `rgba(76,175,96,${a})` : `rgba(208,87,74,${a})`}`, onclick: () => pick(c.t) },
        el('b', { text: c.t.split('.')[0] }), el('span', { text: q && q.chg != null ? (v >= 0 ? '+' : '') + QGT.nf(v, 1) + '%' : '--' }));
    })));
  }

  function renderE() { const b = $('#tm-e-b'); try { QGT.impactCard(b, pick); } catch (e) { b.textContent = 'INDISPONIBLE : ' + errMsg(e); } }

  async function renderF(force) {
    const b = $('#tm-f-b'), Q = QGT;
    const row = (sym, name) => {
      const r = el('div', { class: 'wrow', onclick: () => pick(sym) }, el('span', { class: 'wn' }, el('b', { text: name || label(sym) }), el('small', { text: sym })), el('span', { class: 'wp' }), el('span', { class: 'wc' }), el('span', { class: 'ws' }));
      Q.quote(sym, '1M', force).then(q => { if (!name && q.name) { NAMES[sym] = q.name; r.children[0].children[0].textContent = q.name; } r.children[1].textContent = Q.nf(q.price) + ' ' + Q.curS(q.cur); r.children[2].replaceChildren(Q.chgEl(q.chg)); r.children[3].replaceChildren(Q.spark(q.pts, q.first == null || q.price >= q.first)); }).catch(() => { r.children[1].textContent = '--'; });
      return r;
    };
    b.replaceChildren(
      el('div', { class: 'sect', text: 'MONDE' }), el('div', { class: 'wlist' }, ...Q.WORLD.map(([s, n]) => row(s, n))),
      el('div', { class: 'sect', text: 'MA LISTE (W+ / W- pour modifier)' }), el('div', { class: 'wlist' }, ...T().watch.map(s => row(s))));
  }

  function render(force) { if (!built) build(); renderA(force); renderB(force); renderC(); renderD(force).catch(() => {}); renderE(); renderF(force); }
  setInterval(() => { const v = $('#v-terminal'); if (v && !v.hidden) { renderA(true); renderD(true).catch(() => {}); if (QGT.RANGES[T().range] && ['1J', '5J'].includes(T().range)) renderB(true); } }, 60e3);
  QGViews.terminal = {
    show() { render(false); setTimeout(() => { const q = $('#tm-cmd'); if (q && document.activeElement && document.activeElement.closest('nav')) {} }, 0); },
    refresh() { const v = $('#v-terminal'); if (built && v && !v.hidden) { renderC(); renderE(); } }
  };
  // « / » ou « : » : aller à la ligne de commande
  document.addEventListener('keydown', (e) => { const v = $('#v-terminal'); if (!v || v.hidden || document.getElementById('splash')) return; if ((e.key === '/' || e.key === ':') && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) { e.preventDefault(); $('#tm-cmd').focus(); } });
})();
