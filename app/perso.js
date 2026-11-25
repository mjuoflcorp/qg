/* QG — onglet PERSO : échéances, études (TOEFL + LAPL), notes */
'use strict';
(function () {
  let built = false, studyTab = 'vocab';

  function build() {
    $('#v-perso').replaceChildren(
      el('div', { class: 'panel' }, el('div', { class: 'ph' }, '[ ÉCHÉANCES ]', el('span', { class: 'ph-r', id: 'pe-dlc' })), el('div', { class: 'pb scroll', id: 'pe-dl' })),
      el('div', { class: 'panel' }, el('div', { class: 'ph' }, '[ ÉTUDES ]', el('span', { class: 'ph-r', id: 'pe-sscore' })),
        el('div', { class: 'tabs', id: 'pe-stabs' },
          el('button', { class: 'on', 'data-t': 'vocab', text: 'VOCABULAIRE TOEFL' }), el('button', { 'data-t': 'quiz', text: 'QUIZ LAPL' })),
        el('div', { class: 'pb scroll', id: 'pe-study' })),
      el('div', { class: 'panel' }, el('div', { class: 'ph' }, '[ NOTES RAPIDES ]', el('span', { class: 'ph-r', id: 'pe-saved' })), el('div', { class: 'pb', style: 'flex:1;display:flex;min-height:0' }, el('textarea', { id: 'pe-notes', class: 'notes-big', placeholder: 'Idées, matériel à prévoir, numéros utiles…' }))));
    const ta = $('#pe-notes'); ta.value = S.data.notes || ''; let tt = null;
    ta.oninput = () => { S.data.notes = ta.value.slice(0, 50000); clearTimeout(tt); tt = setTimeout(() => { save(); $('#pe-saved').textContent = 'ENREGISTRÉ'; setTimeout(() => $('#pe-saved').textContent = '', 1500); }, 600); };
    $$('#pe-stabs button').forEach(b => b.onclick = () => { studyTab = b.dataset.t; $$('#pe-stabs button').forEach(x => x.classList.toggle('on', x === b)); renderStudy(); });
    built = true;
  }

  /* ---------- échéances ---------- */
  const daysTo = (iso) => Math.ceil((new Date(iso + 'T23:59:59') - Date.now()) / 864e5);
  function renderDeadlines() {
    const L = S.data.deadlines, box = $('#pe-dl');
    const list = [...L].sort((a, b) => a.date.localeCompare(b.date));
    const up = list.filter(x => daysTo(x.date) >= 0), past = list.filter(x => daysTo(x.date) < 0);
    $('#pe-dlc').textContent = up.length + ' À VENIR';
    const t = el('input', { placeholder: 'ex : TOEFL, fin de contrat, sélection PAT…' }), d = el('input', { type: 'date' }), n = el('input', { placeholder: 'note (optionnel)' });
    const row = (x) => { const j = daysTo(x.date); return el('li', {},
      el('div', { class: 'd' }, el('span', { text: fmtDate(x.date + 'T12:00', false) + (j >= 0 ? `  ·  J-${j}` : '  ·  passée') }), confirmBtn('suppr', () => { S.data.deadlines = L.filter(y => y.id !== x.id); save(); renderDeadlines(); updateStrip(); }, 'rm')),
      el('div', { class: 'x' }, el('b', { class: j <= 7 && j >= 0 ? 'badc' : j <= 30 && j >= 0 ? 'mid' : null, text: x.title }), x.note ? '\n' + x.note : '')); };
    box.replaceChildren(
      el('div', { class: 'form' }, field('INTITULÉ', t), el('div', { class: 'row3', style: 'grid-template-columns:1fr 1fr' }, field('DATE', d), field('NOTE', n)),
        el('button', { class: 'btn amber', text: '+ AJOUTER', onclick: () => { if (!t.value.trim() || !d.value) return; L.push({ id: uid(), title: t.value.trim(), date: d.value, note: n.value.trim() }); save(); renderDeadlines(); updateStrip(); } })),
      el('div', { class: 'sect', text: 'À VENIR' }),
      up.length ? el('ul', { class: 'timeline' }, ...up.map(row)) : el('div', { class: 'empty', text: 'AUCUNE ÉCHÉANCE' }),
      past.length ? el('div', { class: 'sect', text: 'PASSÉES' }) : null, past.length ? el('ul', { class: 'timeline', style: 'opacity:.55' }, ...past.slice(-5).reverse().map(row)) : null);
  }

  /* ---------- études ---------- */
  const ST = () => S.data.study;
  // Boîtes de Leitner : 1 (chaque jour) → 5 (tous les 16 jours)
  const INTERVAL = [0, 1, 2, 4, 8, 16];
  function dueWords() {
    const now = Date.now();
    return (window.TOEFL_WORDS || []).filter(([w]) => { const s = ST().vocab[w]; return !s || now - new Date(s.last).getTime() >= INTERVAL[s.box] * 864e5 * 0.9; });
  }
  let card = null, revealed = false, quizQ = null, answered = null;
  function renderStudy() {
    const box = $('#pe-study'), total = (window.TOEFL_WORDS || []).length;
    const learned = Object.values(ST().vocab).filter(s => s.box >= 4).length;
    const qs = ST().quiz; $('#pe-sscore').textContent = studyTab === 'vocab' ? `${learned}/${total} MAÎTRISÉS` : `${qs.right}/${qs.total} BONNES RÉPONSES`;
    if (studyTab === 'vocab') {
      const due = dueWords();
      if (!card || !due.find(x => x[0] === card[0])) { card = due.length ? due[Math.floor(Math.random() * Math.min(due.length, 12))] : null; revealed = false; }
      if (!card) { box.replaceChildren(el('div', { class: 'empty', text: 'RIEN À RÉVISER AUJOURD’HUI ✓ — REVIENS DEMAIN' })); return; }
      const s = ST().vocab[card[0]] || { box: 0 };
      const grade = (ok) => { const cur = ST().vocab[card[0]] || { box: 0 }; ST().vocab[card[0]] = { box: ok ? Math.min(5, cur.box + 1) : 1, last: new Date().toISOString() }; save(); card = null; renderStudy(); };
      box.replaceChildren(
        el('div', { class: 'note', text: `${due.length} MOT(S) À RÉVISER · BOÎTE ${s.box || 0}/5` }),
        el('div', { class: 'flash' }, el('div', { class: 'fw', text: card[0] }),
          revealed ? el('div', {}, el('div', { class: 'ft', text: card[1] }), el('div', { class: 'fe', text: '« ' + card[2] + ' »' })) : el('div', { class: 'dim', text: 'Traduis mentalement, puis révèle.' })),
        revealed ? el('div', { class: 'row', style: 'justify-content:center' }, el('button', { class: 'btn', text: '✗ À REVOIR', onclick: () => grade(false) }), el('button', { class: 'btn amber', text: '✓ JE SAVAIS', onclick: () => grade(true) }))
          : el('div', { class: 'row', style: 'justify-content:center' }, el('button', { class: 'btn amber', text: 'RÉVÉLER (Espace)', onclick: () => { revealed = true; renderStudy(); } })));
    } else {
      const Q = window.LAPL_QUIZ || [];
      if (!quizQ) { const q = Q[Math.floor(Math.random() * Q.length)]; const order = q[1].map((c, i) => i).sort(() => Math.random() - .5); quizQ = { q, order }; answered = null; }
      const [text, choices, good, expl] = quizQ.q;
      box.replaceChildren(
        el('div', { class: 'qq', text }),
        ...quizQ.order.map(i => el('button', { class: 'qa' + (answered != null ? (i === good ? ' ok' : i === answered ? ' ko' : '') : ''), text: choices[i], disabled: answered != null, onclick: () => {
          answered = i; ST().quiz.total++; if (i === good) ST().quiz.right++; save(); renderStudy(); } })),
        answered != null ? el('div', { class: 'note', style: 'color:var(--ink2)', text: (answered === good ? '✓ BONNE RÉPONSE — ' : '✗ RÉPONSE : ' + choices[good] + ' — ') + expl }) : null,
        answered != null ? el('div', { class: 'row', style: 'margin-top:10px' }, el('button', { class: 'btn amber', text: 'QUESTION SUIVANTE →', onclick: () => { quizQ = null; renderStudy(); } })) : null,
        el('div', { class: 'note', text: 'Révision de base (réglementation, météo, mécanique du vol, navigation, facteurs humains). Pour l’examen, suis le programme de ton aéroclub / la DGAC.' }));
    }
  }
  document.addEventListener('keydown', (e) => { if (location.hash === '#perso' && studyTab === 'vocab' && e.code === 'Space' && card && !revealed && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); revealed = true; renderStudy(); } });

  /* ---------- ETF ---------- */
  async function renderEtf() {
    const F = S.data.finance, box = $('#pe-etf');
    const tk = el('input', { value: F.ticker, placeholder: 'ex : CW8.PA' }), units = el('input', { value: F.units || '', placeholder: 'nb de parts' }), pru = el('input', { value: F.pru || '', placeholder: 'prix moyen d’achat €' });
    const saveBtn = el('button', { class: 'btn', text: 'ENREGISTRER', onclick: () => { F.ticker = tk.value.trim().toUpperCase(); F.units = parseFloat(String(units.value).replace(',', '.')) || 0; F.pru = parseFloat(String(pru.value).replace(',', '.')) || 0; save(); renderEtf(); } });
    const form = el('div', { class: 'form' }, el('div', { class: 'row3' }, field('SYMBOLE', tk), field('PARTS', units), field('PRU (€)', pru)), saveBtn,
      el('div', { class: 'note', text: 'Symbole Yahoo Finance de ton ETF (ex. CW8.PA pour Amundi MSCI World). Vérifie le code ISIN sur ton relevé Crédit Agricole.' }));
    box.replaceChildren(el('div', { class: 'dim', text: 'CHARGEMENT DU COURS…' }), form);
    try {
      const r = await window.qg.quote(F.ticker);
      const res = r && r.chart && r.chart.result && r.chart.result[0]; if (!res) throw new Error('symbole introuvable');
      const meta = res.meta, ts = res.timestamp || [], cl = (res.indicators.quote[0].close || []);
      const pts = ts.map((t, i) => ({ x: new Date(t * 1000), y: cl[i] })).filter(p => p.y != null);
      const last = meta.regularMarketPrice ?? pts[pts.length - 1].y, cur = meta.currency || '';
      const ago_ = (days) => { const t = Date.now() - days * 864e5; const p = pts.filter(x => +x.x <= t).pop(); return p ? (last / p.y - 1) * 100 : null; };
      const prev = meta.chartPreviousClose && pts.length > 1 ? (last / pts[pts.length - 2].y - 1) * 100 : null;
      const pct = (v) => v == null ? '--' : (v >= 0 ? '+' : '') + v.toFixed(2) + ' %';
      const cls = (v) => v == null ? '' : v >= 0 ? 'good' : 'badc';
      const val = F.units ? F.units * last : null, gain = F.units && F.pru ? (last - F.pru) * F.units : null;
      const c = el('canvas', { style: 'width:100%;height:150px;display:block' });
      box.replaceChildren(
        el('div', { class: 'wx-now' }, el('span', { class: 't', text: last.toFixed(2) }), el('span', { class: 's', text: cur + ' · ' + (meta.longName || meta.shortName || F.ticker) })),
        el('div', { class: 'bigs', style: 'grid-template-columns:repeat(4,1fr)' },
          ...[['1 JOUR', prev], ['1 MOIS', ago_(30)], ['6 MOIS', ago_(182)], ['1 AN', ago_(365)]].map(([k, v]) => el('div', {}, el('div', { class: 'k', text: k }), el('div', { class: 'v ' + cls(v), style: 'font-size:14px', text: pct(v) })))),
        c,
        val != null ? el('table', { class: 'kv', style: 'margin-top:8px' }, el('tr', {}, el('th', { text: 'VALEUR' }), el('td', { text: val.toFixed(2) + ' ' + cur })), gain != null ? el('tr', {}, el('th', { text: '+/- VALUE LATENTE' }), el('td', {}, el('span', { class: cls(gain), text: (gain >= 0 ? '+' : '') + gain.toFixed(2) + ' ' + cur + ' (' + pct((last / F.pru - 1) * 100) + ')' }))) : null) : null,
        el('div', { class: 'sect', text: 'RÉGLAGES' }), form,
        el('div', { class: 'note', text: 'Cours Yahoo Finance (peut être différé). Simple suivi : pas un conseil en investissement.' }));
      requestAnimationFrame(() => lineChart(c, pts, { yFmt: (y) => y.toFixed(0), color: '#4fa8ff' }));
    } catch (e) { box.replaceChildren(el('div', { class: 'msg', text: 'COURS INDISPONIBLE : ' + errMsg(e) }), form); }
  }

  QGViews.perso = { show() { if (!built) build(); renderDeadlines(); renderStudy(); } };
})();
