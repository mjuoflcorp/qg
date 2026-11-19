/* QG — onglet SYSTÈME : analyse du PC et du réseau */
'use strict';
(function () {
  const Q = window.qg;
  const fmtB = (b, d = 1) => { b = Number(b) || 0; const u = ['o', 'Ko', 'Mo', 'Go', 'To']; let i = 0; while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; } return b.toFixed(i ? d : 0) + ' ' + u[i]; };
  const fmtRate = (bps) => { const bits = (Number(bps) || 0) * 8; return bits >= 1e6 ? (bits / 1e6).toFixed(1) + ' Mb/s' : (bits / 1e3).toFixed(0) + ' kb/s'; };
  const errTxt = (e) => String((e && e.message) || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
  const fail = (box, e) => box.replaceChildren(el('div', { class: 'msg', text: 'ERREUR : ' + errTxt(e) }));
  const kv = (rows) => el('table', { class: 'kv' }, ...rows.filter(Boolean).map(([k, v]) => el('tr', {}, el('th', { text: k }), el('td', { text: v == null || v === '' ? '—' : String(v) }))));
  const tbl = (head, rows, opts = {}) => el('table', { class: 'tbl' },
    el('tr', {}, ...head.map((h, i) => el('th', { class: (opts.right || []).includes(i) ? 'r' : null, text: h }))),
    ...rows.map(r => el('tr', { class: r.cls || null }, ...r.cells.map((c, i) => el('td', { class: (opts.right || []).includes(i) ? 'r' : null, title: typeof c === 'string' ? c : null }, c)))));
  const qual = (v, good, mid) => v == null ? '' : v <= good ? 'good' : v <= mid ? 'mid' : 'badc';
  const dur = (s) => { s = Math.floor(s); const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return (d ? d + ' j ' : '') + h + ' h ' + pad(m) + ' min'; };

  let isActive = false, loadedOnce = false, liveBusy = false, procBusy = false, timers = [], cores = 1, gwIP = null, myBssid = '';

  /* ---------- machine + stockage ---------- */
  async function loadInfo() {
    const box = $('#sy-info'), dbox = $('#sy-disk');
    try {
      const r = await Q.sys('info');
      cores = (r.cpu && r.cpu.threads) || 1;
      $('#sy-host').textContent = (r.hostname || '') + ' · ' + (r.user || '');
      const bat = r.battery[0];
      box.replaceChildren(kv([
        ['SYSTÈME', `${r.os.name || ''} ${r.os.arch || ''}`.trim()], ['VERSION', `${r.os.version || ''} (build ${r.os.build || '?'})`],
        ['PC', `${r.pc.maker || ''} ${r.pc.model || ''}`.trim()], r.board ? ['CARTE MÈRE', `${r.board.Manufacturer || ''} ${r.board.Product || ''}`.trim()] : null,
        ['PROCESSEUR', r.cpu.name], ['CŒURS', `${r.cpu.cores} cœurs / ${r.cpu.threads} threads · ${r.cpu.mhz} MHz`],
        ['MÉMOIRE', fmtB(r.pc.ram)],
        ...r.gpu.map((g, i) => ['CARTE GRAPHIQUE' + (r.gpu.length > 1 ? ' ' + (i + 1) : ''), `${g.Name}${g.CurrentHorizontalResolution ? ` · ${g.CurrentHorizontalResolution}×${g.CurrentVerticalResolution} @ ${g.CurrentRefreshRate} Hz` : ''}`]),
        bat ? ['BATTERIE', `${bat.EstimatedChargeRemaining} %${bat.BatteryStatus === 2 ? ' · sur secteur' : bat.EstimatedRunTime && bat.EstimatedRunTime < 71582788 ? ' · ' + Math.round(bat.EstimatedRunTime) + ' min restantes' : ''}`] : null,
        ['ALLUMÉ DEPUIS', dur(r.uptime)], r.bios ? ['BIOS', r.bios.SMBIOSBIOSVersion] : null
      ]));
      dbox.replaceChildren(
        ...r.disks.map(d => { const used = d.Size - d.FreeSpace, p = d.Size ? used / d.Size * 100 : 0;
          return el('div', { style: 'margin-bottom:10px' },
            el('div', { style: 'display:flex;justify-content:space-between' }, el('span', { text: `${d.DeviceID} ${d.VolumeName || ''}` }), el('span', { class: 'dim', text: `${fmtB(d.FreeSpace)} libres / ${fmtB(d.Size)}` })),
            el('div', { class: 'bar2' }, el('i', { class: p > 90 ? 'hot' : null, style: `width:${p.toFixed(1)}%` })),
            el('div', { class: 'dim', style: 'font-size:11px', text: `${p.toFixed(0)} % utilisé · ${d.FileSystem || ''}` })); }),
        r.phys.length ? el('div', { class: 'sect', text: 'DISQUES PHYSIQUES' }) : null,
        r.phys.length ? tbl(['MODÈLE', 'TYPE', 'BUS', 'TAILLE', 'SANTÉ'], r.phys.map(p => ({ cells: [p.FriendlyName, p.Media === 'Unspecified' ? '—' : p.Media, p.Bus, fmtB(p.Size, 0), el('span', { class: p.Health === 'Healthy' ? 'good' : 'badc', text: p.Health === 'Healthy' ? 'OK' : p.Health }) ] }))) : null);
    } catch (e) { fail(box, e); fail(dbox, e); }
  }

  /* ---------- charge en direct ---------- */
  const series = { cpu: [], ram: [], down: [], up: [], disk: [] };
  const SPARKS = [['cpu', 'CPU', '#e4a83a', 100], ['ram', 'MÉMOIRE', '#e4a83a', 100], ['down', '↓ RÉSEAU', '#4fa8ff', null], ['up', '↑ RÉSEAU', '#ff5a3c', null], ['disk', 'DISQUE', '#d8d4c8', 100]];
  function buildLive() {
    const box = $('#sy-live'); box.replaceChildren();
    for (const [k, label] of SPARKS) box.append(el('div', { class: 'spark' }, el('span', { class: 'k', text: label }), el('canvas', { id: 'sp-' + k }), el('span', { class: 'v', id: 'sv-' + k, text: '--' })));
    box.append(el('div', { class: 'note', id: 'sy-memtxt' }));
  }
  function draw(k, color, max) {
    const c = $('#sp-' + k); if (!c) return;
    const w = c.clientWidth, h = c.clientHeight; if (!w) return;
    c.width = w * devicePixelRatio; c.height = h * devicePixelRatio;
    const g = c.getContext('2d'); g.scale(devicePixelRatio, devicePixelRatio);
    const s = series[k], m = max || Math.max(1, ...s) * 1.15, n = 60;
    g.strokeStyle = '#1d2128'; g.lineWidth = 1; for (const y of [0.5, h / 2]) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    if (s.length < 2) return;
    g.beginPath();
    s.forEach((v, i) => { const x = w - (s.length - 1 - i) * (w / (n - 1)), y = h - 1 - (v / m) * (h - 3); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.strokeStyle = color; g.lineWidth = 1.5; g.stroke();
    g.lineTo(w, h); g.lineTo(w - (s.length - 1) * (w / (n - 1)), h); g.closePath(); g.fillStyle = color + '22'; g.fill();
  }
  async function pollLive() {
    if (!isActive || liveBusy) return; liveBusy = true;
    try {
      const r = await Q.sys('live');
      const ram = (1 - r.memFree / r.memTotal) * 100;
      const push = (k, v) => { series[k].push(Math.max(0, Number(v) || 0)); if (series[k].length > 60) series[k].shift(); };
      push('cpu', r.cpu); push('ram', ram); push('down', r.rx); push('up', r.tx); push('disk', Math.min(100, r.diskBusy || 0));
      $('#sv-cpu').textContent = Math.round(r.cpu) + ' %'; $('#sv-ram').textContent = Math.round(ram) + ' %';
      $('#sv-down').textContent = fmtRate(r.rx); $('#sv-up').textContent = fmtRate(r.tx); $('#sv-disk').textContent = Math.round(Math.min(100, r.diskBusy || 0)) + ' %';
      $('#sy-memtxt').textContent = `MÉMOIRE ${fmtB(r.memTotal - r.memFree)} / ${fmtB(r.memTotal)} · DISQUE lecture ${fmtB(r.diskRead)}/s, écriture ${fmtB(r.diskWrite)}/s`;
      for (const [k, , color, max] of SPARKS) draw(k, color, max);
    } catch (e) { $('#sy-memtxt').textContent = 'Mesure impossible : ' + errTxt(e); }
    liveBusy = false;
  }

  /* ---------- processus ---------- */
  let procData = null, procKey = 'cpu';
  $$('#sy-ptabs button').forEach(b => b.onclick = () => { procKey = b.dataset.k; $$('#sy-ptabs button').forEach(x => x.classList.toggle('on', x === b)); renderProcs(); });
  function renderProcs() {
    const box = $('#sy-procs'); if (!procData) return;
    $('#sy-pcount').textContent = procData.count + ' PROCESSUS';
    box.replaceChildren(tbl(['NOM', 'PID', 'CPU', 'MÉMOIRE'], procData[procKey].map(p => ({ cells: [p.name, String(p.pid), el('span', { class: qual(p.cpu, 10, 40), text: p.cpu + ' %' }), fmtB(p.mem)] })), { right: [1, 2, 3] }));
  }
  async function pollProcs() {
    if (!isActive || procBusy) return; procBusy = true;
    try { procData = await Q.sys('procs'); renderProcs(); } catch (e) { fail($('#sy-procs'), e); }
    procBusy = false;
  }

  /* ---------- réseau ---------- */
  async function loadNet() {
    const box = $('#sy-net'); box.textContent = 'ANALYSE…';
    try {
      const [r, pub] = await Promise.all([Q.sys('net'), Q.publicIP().catch(() => null)]);
      const w = r.wifi; myBssid = w && w.bssid ? w.bssid.toLowerCase() : '';
      gwIP = (r.ifaces.find(i => i.gw.length) || {}).gw?.[0] || null;
      const sig = w && parseInt(w.signal);
      box.replaceChildren(
        pub && pub.ip ? kv([['IP PUBLIQUE', pub.ip], ['OPÉRATEUR', (pub.connection && (pub.connection.isp || pub.connection.org)) || ''], ['LOCALISATION IP', [pub.city, pub.country].filter(Boolean).join(', ')]]) : null,
        w && w.ssid ? el('div', {}, el('div', { class: 'sect', text: 'WI-FI CONNECTÉ' }), kv([
          ['RÉSEAU', w.ssid], ['SIGNAL', el('span', {}, el('span', { class: 'sig' }, el('i', { style: `width:${sig || 0}%;background:${sig >= 70 ? 'var(--ok)' : sig >= 45 ? 'var(--amber)' : 'var(--bad)'}` })), (w.signal || '') + (w.rssi ? ' · ' + w.rssi + ' dBm' : '')).textContent],
          ['CANAL / BANDE', `${w.channel} · ${w.band || ''}`], ['NORME', w.radio], ['DÉBIT LIEN', `↓ ${w.rx} · ↑ ${w.tx} Mb/s`], ['SÉCURITÉ', `${w.auth} / ${w.cipher}`]])) : null,
        ...r.ifaces.map(i => el('div', {}, el('div', { class: 'sect', text: (i.alias || 'INTERFACE').toUpperCase() }), kv([
          ['CARTE', i.desc], ['IPv4', i.ipv4.join(', ')], ['PASSERELLE', i.gw.join(', ')], ['DNS', i.dns.join(', ')], ['MAC', i.mac], ['VITESSE LIEN', i.speed], i.ipv6.length ? ['IPv6', i.ipv6[0]] : null]))),
        el('div', { class: 'note', text: `${r.established} connexions TCP établies en ce moment.` }));
    } catch (e) { fail(box, e); }
  }

  /* ---------- latence & débit ---------- */
  let lastPing = null, lastSpeed = null;
  function renderSpeed() {
    const box = $('#sy-speed'); box.replaceChildren();
    const s = lastSpeed;
    box.append(el('div', { class: 'row' }, el('button', { class: 'btn amber', id: 'sy-sp-go', text: '▶ TEST DE DÉBIT', onclick: runSpeed }), el('button', { class: 'btn', id: 'sy-pg-go', text: '▶ TEST DE LATENCE', onclick: runPing }), el('span', { class: 'dim', id: 'sy-sp-msg' })));
    if (s) box.append(el('div', { class: 'bigs' },
      el('div', {}, el('div', { class: 'k', text: 'DESCENDANT' }), el('div', { class: 'v', text: s.down.toFixed(0) }), el('div', { class: 'u', text: 'Mb/s' })),
      el('div', {}, el('div', { class: 'k', text: 'MONTANT' }), el('div', { class: 'v', text: s.up.toFixed(0) }), el('div', { class: 'u', text: 'Mb/s' })),
      el('div', {}, el('div', { class: 'k', text: 'LATENCE' }), el('div', { class: 'v ' + qual(s.latency, 30, 80), text: s.latency != null ? s.latency.toFixed(0) : '--' }), el('div', { class: 'u', text: 'ms (HTTP)' })),
      el('div', {}, el('div', { class: 'k', text: 'GIGUE' }), el('div', { class: 'v ' + qual(s.jitter, 10, 30), text: s.jitter != null ? s.jitter.toFixed(0) : '--' }), el('div', { class: 'u', text: 'ms' }))));
    if (lastPing) box.append(tbl(['CIBLE', 'PERTE', 'MIN', 'MOY', 'MAX'], lastPing.map(p => { const loss = Math.round((1 - p.recv / p.sent) * 100);
      return { cells: [p.name + ' (' + p.host + ')', el('span', { class: loss ? 'badc' : 'good', text: loss + ' %' }), p.recv ? p.min + ' ms' : '—', el('span', { class: qual(p.avg, 30, 80), text: p.recv ? p.avg + ' ms' : '—' }), p.recv ? p.max + ' ms' : '—'] }; }), { right: [1, 2, 3, 4] }));
    if (!s && !lastPing) box.append(el('div', { class: 'note', text: 'Le test de débit télécharge ~50 Mo et envoie ~15 Mo vers les serveurs Cloudflare. La latence est mesurée vers ta box, des DNS publics et des sites.' }));
    if (s) box.append(el('div', { class: 'note', text: 'Dernier test : ' + fmtDate(s.at) + ' · serveurs Cloudflare' }));
  }
  async function runSpeed() {
    const b = $('#sy-sp-go'); b.disabled = true; $('#sy-sp-msg').textContent = 'MESURE DU DÉBIT EN COURS (~20 s)…';
    try { lastSpeed = await Q.sys('speed'); try { localStorage.setItem('qg-speed', JSON.stringify(lastSpeed)); } catch (e) {} renderSpeed(); }
    catch (e) { $('#sy-sp-msg').textContent = 'ÉCHEC : ' + errTxt(e); b.disabled = false; }
  }
  async function runPing() {
    const b = $('#sy-pg-go'); b.disabled = true; $('#sy-sp-msg').textContent = 'MESURE DE LA LATENCE (~10 s)…';
    try { lastPing = await Q.sys('ping', gwIP); renderSpeed(); }
    catch (e) { $('#sy-sp-msg').textContent = 'ÉCHEC : ' + errTxt(e); b.disabled = false; }
  }

  /* ---------- Wi-Fi alentour ---------- */
  async function scanWifi() {
    const box = $('#sy-wifi'); box.textContent = 'SCAN DES RÉSEAUX WI-FI…';
    try {
      const r = await Q.sys('wifiScan');
      if (!r.nets.length) { box.replaceChildren(el('div', { class: 'msg', text: r.error || 'Aucun réseau détecté.' })); return; }
      const occ24 = {}, occ5 = {};
      for (const n of r.nets) { if (n.channel <= 14) occ24[n.channel] = (occ24[n.channel] || 0) + 1; else occ5[n.channel] = (occ5[n.channel] || 0) + 1; }
      const line = (o) => Object.keys(o).sort((a, b) => a - b).map(c => `${String(c).padStart(3)} ${'█'.repeat(o[c])}`).join('\n') || '  —';
      box.replaceChildren(
        tbl(['RÉSEAU', 'SIGNAL', 'CANAL', 'BANDE', 'SÉCURITÉ'], r.nets.slice(0, 40).map(n => ({ cls: myBssid && n.bssid.toLowerCase() === myBssid ? 'me' : null,
          cells: [n.ssid, el('span', {}, el('span', { class: 'sig' }, el('i', { style: `width:${n.signal}%;background:${n.signal >= 70 ? 'var(--ok)' : n.signal >= 45 ? 'var(--amber)' : 'var(--bad)'}` })), n.signal + '%'), String(n.channel), n.band, n.auth] })), { right: [2] }),
        el('div', { class: 'sect', text: 'OCCUPATION DES CANAUX' }),
        el('div', { class: 'row', style: 'align-items:flex-start;gap:30px' }, el('div', { class: 'chan', text: '2,4 GHz\n' + line(occ24) }), el('div', { class: 'chan', text: '5 GHz\n' + line(occ5) })));
    } catch (e) { fail(box, e); }
  }

  /* ---------- ports ---------- */
  const RISKY = { 21: 'FTP', 23: 'Telnet', 135: 'RPC', 139: 'NetBIOS', 445: 'SMB (partage)', 3389: 'Bureau à distance', 5900: 'VNC', 1900: 'UPnP', 5357: 'WSD' };
  async function loadPorts() {
    const box = $('#sy-ports'); box.textContent = 'ANALYSE…';
    try {
      const r = await Q.sys('ports');
      const ext = r.tcp.filter(p => p.LocalAddress !== '127.0.0.1' && p.LocalAddress !== '::1');
      box.replaceChildren(
        el('div', { class: 'sect', text: `PORTS TCP EN ÉCOUTE (${r.tcp.length}, dont ${ext.length} ouverts au réseau)` }),
        tbl(['PORT', 'ADRESSE', 'PROGRAMME', ''], r.tcp.map(p => ({ cells: [String(p.LocalPort), p.LocalAddress, p.proc || ('PID ' + p.OwningProcess), RISKY[p.LocalPort] && p.LocalAddress !== '127.0.0.1' ? el('span', { class: 'mid', text: RISKY[p.LocalPort] }) : ''] })), { right: [0] }),
        el('div', { class: 'sect', text: 'PROGRAMMES CONNECTÉS À INTERNET' }),
        r.remote.length ? tbl(['PROGRAMME', 'CONNEXIONS'], r.remote.map(x => ({ cells: [x.Name || '?', String(x.Count)] })), { right: [1] }) : el('div', { class: 'dim', text: 'Aucune' }),
        el('div', { class: 'note', text: 'Ports surlignés : services Windows sensibles s\'ils sont exposés sur un réseau public (Wi-Fi gare, hôtel…). Sur ta box à la maison, c\'est normal.' }));
    } catch (e) { fail(box, e); }
  }

  /* ---------- appareils LAN ---------- */
  async function loadLan(scan) {
    const box = $('#sy-lan'); box.textContent = scan ? 'SCAN DU RÉSEAU LOCAL (254 adresses)…' : 'ANALYSE…';
    try {
      const r = await Q.sys('lan', scan);
      const alive = new Set(r.alive);
      const devs = r.devices.filter((d, i, a) => a.findIndex(x => x.IPAddress === d.IPAddress) === i)
        .sort((a, b) => a.IPAddress.split('.').map(Number).reduce((s, x) => s * 256 + x, 0) - b.IPAddress.split('.').map(Number).reduce((s, x) => s * 256 + x, 0));
      box.replaceChildren(
        kv([['MON IP', r.me], ['BOX / ROUTEUR', r.gw], ['APPAREILS VUS', String(devs.length)]]),
        tbl(['IP', 'ADRESSE MAC', 'ÉTAT', 'RÔLE'], devs.map(d => ({ cls: d.IPAddress === r.gw ? 'me' : null,
          cells: [d.IPAddress, d.LinkLayerAddress, alive.has(d.IPAddress) ? el('span', { class: 'good', text: 'répond' }) : (d.State === 'Reachable' ? 'actif' : d.State === 'Stale' ? 'vu récemment' : d.State),
            d.IPAddress === r.gw ? 'box' : /^.[26AEae]/.test(d.LinkLayerAddress) ? 'MAC aléatoire (tél.)' : ''] }))),
        el('div', { class: 'note', text: scan ? 'Scan terminé.' : 'Liste issue du cache réseau de Windows. Clique SCANNER pour sonder tout le réseau local.' }));
    } catch (e) { fail(box, e); }
  }

  /* ---------- cycle de vie ---------- */
  $('#sy-net-r').onclick = loadNet; $('#sy-wifi-r').onclick = scanWifi; $('#sy-ports-r').onclick = loadPorts; $('#sy-lan-r').onclick = () => loadLan(true);
  function active(on) {
    isActive = on;
    timers.forEach(clearInterval); timers = [];
    if (!on) return;
    if (!loadedOnce) {
      loadedOnce = true; buildLive();
      try { lastSpeed = JSON.parse(localStorage.getItem('qg-speed') || 'null'); } catch (e) {}
      renderSpeed(); $('#sy-wifi').replaceChildren(el('div', { class: 'msg', text: 'Clique SCANNER pour lister les réseaux Wi-Fi autour de toi.' }));
      loadInfo(); loadNet(); loadPorts(); loadLan(false);
    }
    pollLive(); pollProcs();
    timers.push(setInterval(pollLive, 2500), setInterval(pollProcs, 6000));
  }
  window.sysView = { active };
})();
