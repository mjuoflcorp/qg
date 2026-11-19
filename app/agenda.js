/* QG 1.0 — onglet AGENDA : échéances avec compte à rebours + notes rapides */
'use strict';
(function () {
  let built = false;
  const daysTo = (iso) => Math.ceil((new Date(iso + 'T23:59:59') - Date.now()) / 864e5);

  function build() {
    $('#v-agenda').replaceChildren(
      el('div', { class: 'panel' }, el('div', { class: 'ph' }, '[ ÉCHÉANCES ]', el('span', { class: 'ph-r', id: 'ag-c' })), el('div', { class: 'pb scroll', id: 'ag-dl' })),
      el('div', { class: 'panel' }, el('div', { class: 'ph' }, '[ NOTES RAPIDES ]', el('span', { class: 'ph-r', id: 'ag-saved' })), el('div', { class: 'pb', style: 'flex:1;display:flex;min-height:0' }, el('textarea', { id: 'ag-notes', class: 'notes-big', placeholder: 'Idées, choses à ne pas oublier, numéros utiles…' }))));
    const ta = $('#ag-notes'); ta.value = S.data.notes || '';
    let t = null; ta.addEventListener('input', () => { clearTimeout(t); $('#ag-saved').textContent = '…'; t = setTimeout(() => { S.data.notes = ta.value; save(); $('#ag-saved').textContent = 'ENREGISTRÉ'; }, 600); });
    built = true;
  }
  function render() {
    const L = S.data.deadlines, box = $('#ag-dl');
    const list = [...L].sort((a, b) => a.date.localeCompare(b.date));
    const up = list.filter(x => daysTo(x.date) >= 0), past = list.filter(x => daysTo(x.date) < 0);
    $('#ag-c').textContent = up.length + ' À VENIR';
    const t = el('input', { placeholder: 'ex : examen, rendez-vous, paiement, anniversaire…' }), d = el('input', { type: 'date' }), n = el('input', { placeholder: 'note (optionnel)' });
    const row = (x) => { const j = daysTo(x.date); return el('li', {},
      el('div', { class: 'd' }, el('span', { text: fmtDate(x.date + 'T12:00', false) + (j >= 0 ? (j === 0 ? '  ·  AUJOURD’HUI' : `  ·  J-${j}`) : '  ·  passée') }), confirmBtn('suppr', () => { S.data.deadlines = L.filter(y => y.id !== x.id); save(); render(); updateStrip(); }, 'rm')),
      el('div', { class: 'x' }, el('b', { class: j <= 7 && j >= 0 ? 'badc' : j <= 30 && j >= 0 ? 'mid' : null, text: x.title }), x.note ? '\n' + x.note : '')); };
    box.replaceChildren(
      el('div', { class: 'form' }, field('INTITULÉ', t), el('div', { class: 'row3', style: 'grid-template-columns:1fr 1fr' }, field('DATE', d), field('NOTE', n)),
        el('button', { class: 'btn amber', text: '+ AJOUTER', onclick: () => { if (!t.value.trim() || !d.value) return; L.push({ id: uid(), title: t.value.trim().slice(0, 120), date: d.value, note: n.value.trim().slice(0, 300) }); save(); render(); updateStrip(); } })),
      el('div', { class: 'sect', text: 'À VENIR' }),
      up.length ? el('ul', { class: 'timeline' }, ...up.map(row)) : el('div', { class: 'empty', text: 'AUCUNE ÉCHÉANCE' }),
      past.length ? el('div', { class: 'sect', text: 'PASSÉES' }) : null, past.length ? el('ul', { class: 'timeline', style: 'opacity:.55' }, ...past.slice(-5).reverse().map(row)) : null);
  }
  QGViews.agenda = { show() { if (!built) build(); render(); } };
})();
