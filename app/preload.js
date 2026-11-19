const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('qg', {
  getData: () => ipcRenderer.invoke('data:get'),
  setData: (d) => ipcRenderer.invoke('data:set', d),
  fetchText: (url) => ipcRenderer.invoke('net:text', url),
  weather: (lat, lon) => ipcRenderer.invoke('net:weather', lat, lon),
  mailConfig: () => ipcRenderer.invoke('mail:config:get'),
  setMailConfig: (cfg) => ipcRenderer.invoke('mail:config:set', cfg),
  mail: (query) => ipcRenderer.invoke('mail:fetch', query),
  world: () => ipcRenderer.invoke('world'),
  reverse: (lat, lon) => ipcRenderer.invoke('geo:reverse', lat, lon),
  resolveLink: (u) => ipcRenderer.invoke('geo:resolve', u),
  locate: () => ipcRenderer.invoke('geo:locate'),
  geoSearch: (q, cc) => ipcRenderer.invoke('geo:search', q, cc),
  sys: (k, a) => ipcRenderer.invoke('sys:' + k, a),
  publicIP: () => ipcRenderer.invoke('net:public'),
  backupInfo: () => ipcRenderer.invoke('backup:info'),
  backupExport: () => ipcRenderer.invoke('backup:export'),
  backupImport: () => ipcRenderer.invoke('backup:import'),
  backupRestore: (n) => ipcRenderer.invoke('backup:restore', n),
  backupMirror: () => ipcRenderer.invoke('backup:mirror'),
  openPath: (p) => ipcRenderer.invoke('open-path', p),
  open: (url) => ipcRenderer.invoke('open', url),
  dataPath: () => ipcRenderer.invoke('data:path')
});
