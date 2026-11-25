/* QG — navigation complète au clavier
   ← → ↑ ↓ : déplacement vers l'élément le plus proche dans la direction (comme une télé / un viseur)
   Dans la barre d'onglets : ← → change d'onglet directement.
   Entrée / Espace : activer · Échap : revenir à la barre d'onglets · Échap dans un champ texte : sortir du champ */
'use strict';
(function () {
  const SEL = 'a[href],button:not([disabled]),input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const isText = (x) => x && ((x.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|color|range|date|file)$/i.test(x.type)) || x.tagName === 'TEXTAREA' || x.isContentEditable);
  const visible = (x) => {
    if (!x.getClientRects().length) return false;
    const st = getComputedStyle(x); if (st.visibility === 'hidden' || st.display === 'none') return false;
    const r = x.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
    // masqué par un conteneur qui défile ?
    for (let p = x.parentElement; p && p !== document.body; p = p.parentElement) {
      const ps = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(ps.overflowY + ps.overflowX)) { const pr = p.getBoundingClientRect(); if (r.bottom < pr.top + 2 || r.top > pr.bottom - 2 || r.right < pr.left + 2 || r.left > pr.right - 2) return false; }
    }
    return true;
  };
  const scope = () => { const ob = document.getElementById('onboard'); return ob && !ob.hidden ? ob : document.body; };
  const items = () => [...scope().querySelectorAll(SEL)].filter(x => !x.closest('[hidden]') && visible(x));
  const navTabs = () => [...document.querySelectorAll('nav a')].filter(a => a.style.display !== 'none');
  const activeTab = () => navTabs().find(a => a.classList.contains('on')) || navTabs()[0];

  function pick(from, dir) {
    const a = from.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bs = Infinity;
    for (const x of items()) {
      if (x === from || x.contains(from) || from.contains(x)) continue;
      const b = x.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2;
      let main, cross, overlap;
      if (dir === 'ArrowRight') { main = b.left - a.right; cross = by - ay; overlap = b.top < a.bottom && b.bottom > a.top; if (bx <= ax + 1) continue; }
      else if (dir === 'ArrowLeft') { main = a.left - b.right; cross = by - ay; overlap = b.top < a.bottom && b.bottom > a.top; if (bx >= ax - 1) continue; }
      else if (dir === 'ArrowDown') { main = b.top - a.bottom; cross = bx - ax; overlap = b.left < a.right && b.right > a.left; if (by <= ay + 1) continue; }
      else { main = a.top - b.bottom; cross = bx - ax; overlap = b.left < a.right && b.right > a.left; if (by >= ay - 1) continue; }
      const score = Math.max(0, main) + Math.abs(cross) * (overlap ? 0.3 : 2.2) + (main < -4 ? 400 : 0);
      if (score < bs) { bs = score; best = x; }
    }
    return best;
  }
  function scrollerOf(x) {
    for (let p = x; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 2) return p; }
    const v = document.querySelector('.view:not([hidden]) .scroll'); return v;
  }
  function go(x) { if (!x) return false; x.focus({ preventScroll: true }); x.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return true; }

  document.addEventListener('keydown', (e) => {
    if (document.getElementById('splash')) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const k = e.key, cur = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    if (k === 'Escape') {
      if (cur && isText(cur)) { cur.blur(); cur.focus(); cur.dataset.kesc = '1'; e.preventDefault(); return; }
      const ob = document.getElementById('onboard'); if (ob && !ob.hidden && S.data.settings.profile) { ob.hidden = true; }
      go(activeTab()); e.preventDefault(); return;
    }
    if ((k === 'Enter' || k === ' ') && cur && cur.getAttribute('role') === 'button') { e.preventDefault(); cur.click(); return; }
    if (!/^Arrow(Up|Down|Left|Right)$/.test(k)) return;
    // champs : les flèches gardent leur rôle (curseur, liste) sauf cas utiles
    if (cur && isText(cur) && !cur.dataset.kesc) {
      if (cur.tagName === 'TEXTAREA') return;
      if (k === 'ArrowLeft' || k === 'ArrowRight') { const p = cur.selectionStart, n = (cur.value || '').length; if (p == null || (k === 'ArrowLeft' ? p > 0 : p < n)) return; }
    }
    if (cur && cur.tagName === 'SELECT' && (k === 'ArrowUp' || k === 'ArrowDown')) return;
    if (cur) delete cur.dataset.kesc;
    e.preventDefault();
    // barre d'onglets : ← → change d'onglet
    if (cur && cur.closest('nav') && (k === 'ArrowLeft' || k === 'ArrowRight')) {
      const T = navTabs(), i = T.indexOf(cur), n = T[(i + (k === 'ArrowRight' ? 1 : -1) + T.length) % T.length];
      n.focus(); location.hash = n.getAttribute('href'); return;
    }
    if (!cur) { go(activeTab()); return; }
    if (go(pick(cur, k))) return;
    // rien dans cette direction : on fait défiler la zone
    if (k === 'ArrowUp' || k === 'ArrowDown') { const sc = scrollerOf(cur); if (sc) sc.scrollBy({ top: k === 'ArrowDown' ? 160 : -160, behavior: 'smooth' }); }
  });
  // à l'entrée dans l'app : focus sur l'onglet actif
  document.addEventListener('qg-entered', () => setTimeout(() => { const t = activeTab(); if (t) t.focus(); }, 60));
  // changement d'onglet à la souris : on garde le focus cohérent
  addEventListener('hashchange', () => { const a = document.activeElement; if (!a || a === document.body) { const t = activeTab(); if (t) t.focus({ preventScroll: true }); } });
})();
