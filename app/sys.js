// QG — analyse du PC et du réseau (Windows, via PowerShell / CIM, aucune dépendance)
const { execFile } = require('child_process');
const os = require('os');

function runPS(body, timeout = 30000) {
  // Le JSON ressort en base64 UTF-8 pour éviter tout problème d'accents (console Windows en OEM).
  const script = "$ErrorActionPreference='SilentlyContinue'; $ProgressPreference='SilentlyContinue';\n$__r = & {\n" + body + "\n};\n$__j = $__r | ConvertTo-Json -Depth 5 -Compress;\n[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes([string]$__j))";
  const enc = Buffer.from(script, 'utf16le').toString('base64');
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') return reject(new Error('Analyse disponible uniquement sous Windows.'));
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', enc], { timeout, windowsHide: true, maxBuffer: 20 * 1024 * 1024 }, (err, out) => {
      const b64 = String(out || '').trim().split(/\r?\n/).pop();
      if (!b64) return reject(new Error(err ? 'PowerShell : ' + err.message : 'Réponse vide'));
      try { const s = Buffer.from(b64, 'base64').toString('utf8'); resolve(s ? JSON.parse(s) : null); }
      catch (e) { reject(new Error('Réponse illisible')); }
    });
  });
}
const arr = (x) => x == null ? [] : Array.isArray(x) ? x : [x];

/* ---- machine ---- */
async function info() {
  const r = await runPS(`
$os=Get-CimInstance Win32_OperatingSystem; $cs=Get-CimInstance Win32_ComputerSystem; $cpu=Get-CimInstance Win32_Processor | Select-Object -First 1
[pscustomobject]@{
 os=[pscustomobject]@{name=$os.Caption; version=$os.Version; build=$os.BuildNumber; arch=$os.OSArchitecture}
 pc=[pscustomobject]@{maker=$cs.Manufacturer; model=$cs.Model; ram=$cs.TotalPhysicalMemory}
 board=(Get-CimInstance Win32_BaseBoard | Select-Object Manufacturer,Product)
 bios=(Get-CimInstance Win32_BIOS | Select-Object SMBIOSBIOSVersion)
 cpu=[pscustomobject]@{name=$cpu.Name.Trim(); cores=$cpu.NumberOfCores; threads=$cpu.NumberOfLogicalProcessors; mhz=$cpu.MaxClockSpeed}
 gpu=@(Get-CimInstance Win32_VideoController | Select-Object Name,DriverVersion,CurrentHorizontalResolution,CurrentVerticalResolution,CurrentRefreshRate)
 disks=@(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object DeviceID,VolumeName,FileSystem,Size,FreeSpace)
 phys=@(Get-PhysicalDisk | Select-Object FriendlyName,@{n='Media';e={[string]$_.MediaType}},@{n='Health';e={[string]$_.HealthStatus}},@{n='Bus';e={[string]$_.BusType}},Size)
 battery=@(Get-CimInstance Win32_Battery | Select-Object EstimatedChargeRemaining,BatteryStatus,EstimatedRunTime)
}`, 40000);
  r.uptime = os.uptime(); r.hostname = os.hostname(); r.user = os.userInfo().username;
  for (const k of ['gpu', 'disks', 'phys', 'battery']) r[k] = arr(r[k]);
  return r;
}

/* ---- charge en direct ---- */
async function live() {
  const r = await runPS(`
$c=(Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'").PercentProcessorTime
$n=Get-CimInstance Win32_PerfFormattedData_Tcpip_NetworkInterface | Measure-Object BytesReceivedPersec,BytesSentPersec -Sum
$d=Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk -Filter "Name='_Total'"
[pscustomobject]@{cpu=$c; rx=($n | Where-Object Property -eq 'BytesReceivedPersec').Sum; tx=($n | Where-Object Property -eq 'BytesSentPersec').Sum; diskRead=$d.DiskReadBytesPersec; diskWrite=$d.DiskWriteBytesPersec; diskBusy=$d.PercentDiskTime}`, 15000);
  r.memTotal = os.totalmem(); r.memFree = os.freemem(); r.at = Date.now();
  return r;
}

/* ---- processus ---- */
async function procs() {
  const r = await runPS(`
$n=(Get-CimInstance Win32_ComputerSystem).NumberOfLogicalProcessors
$p=Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | Where-Object { $_.Name -ne '_Total' -and $_.Name -ne 'Idle' }
[pscustomobject]@{
 cpu=@($p | Sort-Object PercentProcessorTime -Descending | Select-Object -First 10 @{n='name';e={$_.Name -replace '#\\d+$',''}},@{n='pid';e={$_.IDProcess}},@{n='cpu';e={[math]::Round($_.PercentProcessorTime/$n,1)}},@{n='mem';e={$_.WorkingSetPrivate}})
 mem=@($p | Sort-Object WorkingSetPrivate -Descending | Select-Object -First 10 @{n='name';e={$_.Name -replace '#\\d+$',''}},@{n='pid';e={$_.IDProcess}},@{n='cpu';e={[math]::Round($_.PercentProcessorTime/$n,1)}},@{n='mem';e={$_.WorkingSetPrivate}})
 count=@($p).Count
}`, 20000);
  r.cpu = arr(r.cpu); r.mem = arr(r.mem);
  return r;
}

/* ---- réseau ---- */
function parseWlan(txt) {
  const g = (re) => { const m = txt.match(re); return m ? m[m.length - 1].trim() : ''; };
  if (!/SSID/.test(txt)) return null;
  return {
    ssid: g(/^\s*SSID\s*:\s*(.+)$/m), bssid: g(/^\s*(AP )?BSSID\s*:\s*(.+)$/m), state: g(/^\s*(État|Etat|State)\s*:\s*(.+)$/m),
    radio: g(/^\s*(Type de radio|Radio type)\s*:\s*(.+)$/m), band: g(/^\s*(Bande|Band)\s*:\s*(.+)$/m), channel: g(/^\s*(Canal|Channel)\s*:\s*(.+)$/m),
    auth: g(/^\s*(Authentification|Authentication)\s*:\s*(.+)$/m), cipher: g(/^\s*(Chiffrement|Cipher)\s*:\s*(.+)$/m),
    rx: g(/^\s*(R.ception|Receive rate)[^:]*:\s*(.+)$/m), tx: g(/^\s*(Transmission|Transmit rate)[^:]*:\s*(.+)$/m),
    signal: g(/^\s*Signal\s*:\s*(.+)$/m), rssi: g(/^\s*Rssi\s*:\s*(.+)$/m)
  };
}
async function net() {
  const r = await runPS(`
$cfg=@(Get-NetIPConfiguration | Where-Object { $_.NetAdapter.Status -eq 'Up' } | ForEach-Object {
 [pscustomobject]@{ alias=$_.InterfaceAlias; desc=$_.InterfaceDescription; mac=$_.NetAdapter.MacAddress; speed=$_.NetAdapter.LinkSpeed;
  ipv4=@($_.IPv4Address | ForEach-Object { $_.IPAddress + '/' + $_.PrefixLength }); ipv6=@($_.IPv6Address.IPAddress);
  gw=@($_.IPv4DefaultGateway.NextHop); dns=@($_.DNSServer | Where-Object AddressFamily -eq 2 | ForEach-Object ServerAddresses) } })
$est=@(Get-NetTCPConnection -State Established).Count
[pscustomobject]@{ ifaces=$cfg; wlan=((netsh wlan show interfaces) -join [char]10); established=$est }`, 30000);
  r.ifaces = arr(r.ifaces).map(i => ({ ...i, ipv4: arr(i.ipv4), ipv6: arr(i.ipv6), gw: arr(i.gw), dns: arr(i.dns) }));
  r.wifi = parseWlan(r.wlan || ''); delete r.wlan;
  return r;
}
async function wifiScan() {
  const r = await runPS(`((netsh wlan show networks mode=bssid) -join [char]10)`, 20000);
  const txt = String(r || '');
  if (!/SSID/.test(txt)) return { error: txt.trim().split('\n').slice(0, 3).join(' ') || 'Aucune carte Wi-Fi ou accès à la localisation refusé (Windows 11 l\'exige pour lister les réseaux).', nets: [] };
  const nets = [];
  for (const block of txt.split(/\n(?=SSID \d+ :)/)) {
    const ssid = (block.match(/^SSID \d+ :\s*(.*)$/m) || [])[1];
    if (ssid === undefined) continue;
    const auth = ((block.match(/^\s*(Authentification|Authentication)\s*:\s*(.+)$/m) || [])[2] || '').trim();
    for (const b of block.split(/\n(?=\s+BSSID \d+)/).slice(1)) {
      const g = (re) => { const m = b.match(re); return m ? m[m.length - 1].trim() : ''; };
      nets.push({ ssid: ssid.trim() || '(masqué)', auth, bssid: g(/BSSID \d+\s*:\s*(.+)$/m), signal: parseInt(g(/^\s*Signal\s*:\s*(.+)$/m)) || 0,
        channel: parseInt(g(/^\s*(Canal|Channel)\s*:\s*(.+)$/m)) || 0, band: g(/^\s*(Bande|Band)\s*:\s*(.+)$/m), radio: g(/^\s*(Type de radio|Radio type)\s*:\s*(.+)$/m) });
    }
  }
  nets.sort((a, b) => b.signal - a.signal);
  return { nets };
}
async function ports() {
  const r = await runPS(`
$names=@{}; Get-Process | ForEach-Object { $names[[int]$_.Id]=$_.ProcessName }
[pscustomobject]@{
 tcp=@(Get-NetTCPConnection -State Listen | Sort-Object LocalPort -Unique | Select-Object LocalAddress,LocalPort,@{n='proc';e={$names[[int]$_.OwningProcess]}},OwningProcess)
 udp=@(Get-NetUDPEndpoint | Where-Object { $_.LocalAddress -eq '0.0.0.0' -or $_.LocalAddress -eq '::' } | Sort-Object LocalPort -Unique | Select-Object LocalAddress,LocalPort,@{n='proc';e={$names[[int]$_.OwningProcess]}})
 remote=@(Get-NetTCPConnection -State Established | Where-Object { $_.RemoteAddress -notmatch '^(127\\.|::1|0\\.0\\.0\\.0)' } | Group-Object { $names[[int]$_.OwningProcess] } | Sort-Object Count -Descending | Select-Object -First 10 Name,Count)
}`, 30000);
  r.tcp = arr(r.tcp); r.udp = arr(r.udp); r.remote = arr(r.remote);
  return r;
}
async function lan(scan) {
  const r = await runPS(`
$scan=${scan ? '$true' : '$false'}; $alive=@()
$ip=Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } | Select-Object -First 1
$me=$ip.IPv4Address.IPAddress | Select-Object -First 1
if ($scan -and $me) {
  $base=($me -split '\\.')[0..2] -join '.'
  $tasks=@{}; foreach ($i in 1..254) { $tasks["$base.$i"]=(New-Object System.Net.NetworkInformation.Ping).SendPingAsync("$base.$i",400) }
  try { [Threading.Tasks.Task]::WaitAll([Threading.Tasks.Task[]]$tasks.Values) } catch {}
  $alive=@($tasks.Keys | Where-Object { $tasks[$_].Status -eq 'RanToCompletion' -and $tasks[$_].Result.Status -eq 'Success' })
}
$nb=@(Get-NetNeighbor -AddressFamily IPv4 | Where-Object { $_.State -ne 'Unreachable' -and $_.State -ne 'Incomplete' -and $_.LinkLayerAddress -and $_.LinkLayerAddress -ne 'FF-FF-FF-FF-FF-FF' -and $_.LinkLayerAddress -ne '00-00-00-00-00-00' -and $_.IPAddress -notmatch '^(22[4-9]|23\\d|255)\\.' } | Select-Object IPAddress,LinkLayerAddress,@{n='State';e={[string]$_.State}},InterfaceAlias)
[pscustomobject]@{ me=$me; gw=($ip.IPv4DefaultGateway.NextHop | Select-Object -First 1); alive=$alive; devices=$nb }`, 60000);
  r.alive = arr(r.alive); r.devices = arr(r.devices);
  return r;
}
async function ping(gw) {
  const targets = [gw && /^[\d.]+$/.test(gw) ? ['Box / routeur', gw] : null, ['Cloudflare DNS', '1.1.1.1'], ['Google DNS', '8.8.8.8'], ['google.com', 'google.com'], ['Paris (OVH)', 'ovh.com']].filter(Boolean);
  const body = '@(' + targets.map(([n, h]) => `(& { $res=@(); foreach ($k in 1..5) { $p=(New-Object System.Net.NetworkInformation.Ping).Send('${h}',1500); $res+=$p }; $ok=@($res | Where-Object Status -eq 'Success'); [pscustomobject]@{ name='${n}'; host='${h}'; sent=5; recv=$ok.Count; min=($ok | Measure-Object RoundtripTime -Minimum).Minimum; avg=[math]::Round(($ok | Measure-Object RoundtripTime -Average).Average,1); max=($ok | Measure-Object RoundtripTime -Maximum).Maximum } })`).join(',') + ')';
  return arr(await runPS(body, 60000));
}
async function speed() {
  const UA = 'Mozilla/5.0 QG/1.0';
  const lat = [];
  for (let i = 0; i < 5; i++) { const t = performance.now(); try { await (await fetch('https://speed.cloudflare.com/__down?bytes=0', { headers: { 'User-Agent': UA }, cache: 'no-store' })).arrayBuffer(); lat.push(performance.now() - t); } catch (e) {} }
  const down = async (bytes) => { const t = performance.now(); const r = await fetch('https://speed.cloudflare.com/__down?bytes=' + bytes, { headers: { 'User-Agent': UA }, cache: 'no-store' }); const b = await r.arrayBuffer(); return (b.byteLength * 8) / ((performance.now() - t) / 1000) / 1e6; };
  const up = async (bytes) => { const body = Buffer.alloc(bytes, 97); const t = performance.now(); const r = await fetch('https://speed.cloudflare.com/__up', { method: 'POST', body, headers: { 'User-Agent': UA, 'Content-Type': 'text/plain' } }); await r.text(); return (bytes * 8) / ((performance.now() - t) / 1000) / 1e6; };
  await down(1e6);
  const d = Math.max(await down(25e6), await down(25e6));
  const u = Math.max(await up(5e6), await up(10e6));
  lat.sort((a, b) => a - b);
  const jitter = lat.length > 1 ? lat.slice(1).reduce((s, x, i) => s + Math.abs(x - lat[i]), 0) / (lat.length - 1) : null;
  return { down: d, up: u, latency: lat.length ? lat[Math.floor(lat.length / 2)] : null, jitter, at: new Date().toISOString() };
}

module.exports = { info, live, procs, net, wifiScan, ports, lan, ping, speed };
