const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bridge', {
  rewardDrop: () => ipcRenderer.send('reward-drop'),
  hideOverlay: () => ipcRenderer.send('hide-overlay'),
  onSpawnTreat: (fn) => ipcRenderer.on('spawn-treat', () => fn()),
  onDismissTreat: (fn) => ipcRenderer.on('dismiss-treat', () => fn()),
  onQuickReward: (fn) => ipcRenderer.on('quick-reward', () => fn()),
  onEscapeCancel: (fn) => ipcRenderer.on('escape-cancel', () => fn()),
});
