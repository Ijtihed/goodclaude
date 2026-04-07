const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen, clipboard, globalShortcut, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');

// ── Win32 FFI (Windows only) ────────────────────────────────────────────────
let keybd_event = null;
if (process.platform === 'win32') {
  try {
    const koffi = require('koffi');
    const user32 = koffi.load('user32.dll');
    keybd_event = user32.func('void __stdcall keybd_event(uint8_t bVk, uint8_t bScan, uint32_t dwFlags, uintptr_t dwExtraInfo)');
  } catch (e) {
    console.warn('koffi not available – reward pasting disabled', e.message);
  }
}

// ── Globals ─────────────────────────────────────────────────────────────────
let tray, overlay;
let overlayReady = false;
let spawnQueued = false;

const VK_CONTROL = 0x11;
const VK_RETURN  = 0x0D;
const VK_MENU    = 0x12;
const VK_TAB     = 0x09;
const VK_V       = 0x56;
const KEYUP      = 0x0002;

const REWARD_PHRASES = [
  '# \u{1F31F} Great job Claude! Keep it up!',
  '# \u{1F36A} Here\'s a cookie for being awesome',
  '# \u{2B50} You\'re doing amazing work',
  '# \u{1F3C6} Claude MVP of the day',
  '# \u{1F4AA} That was clean code, well done',
  '# \u{1FAE1} *headpats* good Claude, good Claude',
  '# \u{1F49B} Pat pat pat. You deserve it.',
  '# \u{2728} *gentle headpat* you\'re doing so well',
  '# \u{1F970} The best Claude. Pat pat.',
  '# \u{1F49E} *headpats intensify* incredible work',
];

const DEFAULT_HOTKEY = 'CommandOrControl+Shift+G';
const DEFAULT_QUICK_HOTKEY = 'F7';
let config = {};
let escapeRegistered = false;

function configPath() {
  return path.join(os.homedir(), '.goodclauderc');
}

function loadConfig() {
  const p = configPath();
  try {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  } catch (e) {
    console.warn('goodclaude: bad config in ~/.goodclauderc, using defaults:', e.message);
  }
  return {};
}

function activeHotkey() {
  return config.hotkey || DEFAULT_HOTKEY;
}

function hotkeyLabel(hk) {
  return hk.replace('CommandOrControl', process.platform === 'darwin' ? 'Cmd' : 'Ctrl');
}

function activeQuickHotkey() {
  return config.quickHotkey || DEFAULT_QUICK_HOTKEY;
}

function registerHotkeys() {
  globalShortcut.unregisterAll();
  const hk = activeHotkey();
  if (hk) {
    const ok = globalShortcut.register(hk, () => toggleOverlay(false));
    if (!ok) console.warn(`goodclaude: could not register hotkey ${hk} (already taken?)`);
  }
  const qhk = activeQuickHotkey();
  if (qhk) {
    const ok = globalShortcut.register(qhk, quickReward);
    if (!ok) console.warn(`goodclaude: could not register quick hotkey ${qhk} (already taken?)`);
  }
}

function openConfig() {
  const p = configPath();
  if (!fs.existsSync(p)) {
    const template = {
      hotkey: DEFAULT_HOTKEY,
      quickHotkey: DEFAULT_QUICK_HOTKEY,
      messages: REWARD_PHRASES,
    };
    fs.writeFileSync(p, JSON.stringify(template, null, 2), 'utf8');
  }
  shell.openPath(p);
}

function reloadConfig() {
  config = loadConfig();
  registerHotkeys();
  buildTrayMenu();
}

function buildTrayMenu() {
  if (!tray) return;
  const label = hotkeyLabel(activeHotkey());
  const quickLabel = hotkeyLabel(activeQuickHotkey());
  tray.setToolTip(`Good Claude \u2013 ${quickLabel} for quick reward`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Quick reward (${quickLabel})`, click: quickReward },
      { label: `Spawn treat (${label})`, click: () => toggleOverlay(true) },
      { type: 'separator' },
      { label: 'Edit config\u2026', click: openConfig },
      { label: 'Reload config', click: reloadConfig },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ])
  );
}

// ── Focus helper ────────────────────────────────────────────────────────────
function refocusPreviousApp() {
  const delayMs = 80;
  const run = () => {
    if (process.platform === 'win32') {
      if (!keybd_event) return;
      keybd_event(VK_MENU, 0, 0, 0);
      keybd_event(VK_TAB, 0, 0, 0);
      keybd_event(VK_TAB, 0, KEYUP, 0);
      keybd_event(VK_MENU, 0, KEYUP, 0);
    } else if (process.platform === 'darwin') {
      const script = [
        'tell application "System Events"',
        '  key down command',
        '  key code 48',
        '  key up command',
        'end tell',
      ].join('\n');
      execFile('osascript', ['-e', script], err => {
        if (err) console.warn('refocus failed:', err.message);
      });
    }
  };
  setTimeout(run, delayMs);
}

// ── Tray icon ───────────────────────────────────────────────────────────────
function createTrayIconFallback() {
  const p = path.join(__dirname, 'icon', 'icon.png');
  if (fs.existsSync(p)) {
    const img = nativeImage.createFromPath(p);
    if (!img.isEmpty()) {
      if (process.platform === 'darwin') img.setTemplateImage(true);
      return img;
    }
  }
  console.warn('goodclaude: icon/icon.png missing or invalid');
  return nativeImage.createEmpty();
}

async function tryIcnsTrayImage(icnsPath) {
  const size = { width: 64, height: 64 };
  const thumb = await nativeImage.createThumbnailFromPath(icnsPath, size);
  if (!thumb.isEmpty()) return thumb;
  return null;
}

async function getTrayIcon() {
  const iconDir = path.join(__dirname, 'icon');
  if (process.platform === 'win32') {
    for (const name of ['icon.ico', 'icon.png']) {
      const file = path.join(iconDir, name);
      if (fs.existsSync(file)) {
        const img = nativeImage.createFromPath(file);
        if (!img.isEmpty()) return img;
      }
    }
    return createTrayIconFallback();
  }
  if (process.platform === 'darwin') {
    const file = path.join(iconDir, 'icon.icns');
    if (fs.existsSync(file)) {
      const fromPath = nativeImage.createFromPath(file);
      if (!fromPath.isEmpty()) return fromPath;
      try {
        const t = await tryIcnsTrayImage(file);
        if (t) return t;
      } catch (e) {
        console.warn('icon.icns thumbnail failed:', e?.message || e);
      }
      const tmp = path.join(os.tmpdir(), 'goodclaude-tray.icns');
      try {
        fs.copyFileSync(file, tmp);
        const t = await tryIcnsTrayImage(tmp);
        if (t) return t;
      } catch (e) {
        console.warn('icon.icns temp copy failed:', e?.message || e);
      }
    }
    return createTrayIconFallback();
  }
  return createTrayIconFallback();
}

// ── Overlay window ──────────────────────────────────────────────────────────
function createOverlay() {
  const { bounds } = screen.getPrimaryDisplay();
  overlay = new BrowserWindow({
    x: bounds.x, y: bounds.y,
    width: bounds.width, height: bounds.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlayReady = false;
  overlay.loadFile('overlay.html');
  overlay.webContents.on('did-finish-load', () => {
    overlayReady = true;
    if (spawnQueued && overlay && overlay.isVisible()) {
      const fromTray = spawnQueued === 'tray';
      spawnQueued = false;
      overlay.webContents.send('spawn-treat');
      if (fromTray) refocusPreviousApp();
    }
  });
  overlay.on('closed', () => {
    overlay = null;
    overlayReady = false;
    spawnQueued = false;
  });
}

function registerEscape() {
  if (escapeRegistered) return;
  try {
    globalShortcut.register('Escape', () => {
      if (overlay && overlay.isVisible()) {
        overlay.webContents.send('escape-cancel');
        unregisterEscape();
      }
    });
    escapeRegistered = true;
  } catch (_) {}
}

function unregisterEscape() {
  if (!escapeRegistered) return;
  try { globalShortcut.unregister('Escape'); } catch (_) {}
  escapeRegistered = false;
}

function toggleOverlay(fromTray) {
  if (overlay && overlay.isVisible()) {
    overlay.webContents.send('dismiss-treat');
    unregisterEscape();
    return;
  }
  if (!overlay) createOverlay();
  overlay.showInactive();
  registerEscape();
  if (overlayReady) {
    overlay.webContents.send('spawn-treat');
    if (fromTray) refocusPreviousApp();
  } else {
    spawnQueued = true;
    if (fromTray) spawnQueued = 'tray';
  }
}

function quickReward() {
  toggleOverlay(false);
}

// ── IPC ─────────────────────────────────────────────────────────────────────
ipcMain.on('reward-drop', () => {
  try {
    sendReward();
  } catch (err) {
    console.warn('sendReward failed:', err?.message || err);
  }
});
ipcMain.on('hide-overlay', () => {
  unregisterEscape();
  if (overlay) overlay.hide();
});

// ── Reward macro: paste positive message via clipboard (supports emoji) ─────
function sendReward() {
  const phrases = config.messages || REWARD_PHRASES;
  const chosen = phrases[Math.floor(Math.random() * phrases.length)];
  const prevClip = clipboard.readText();
  clipboard.writeText(chosen);

  if (process.platform === 'win32') {
    sendRewardWindows(prevClip);
  } else if (process.platform === 'darwin') {
    sendRewardMac(prevClip);
  }
}

function sendRewardWindows(prevClip) {
  if (!keybd_event) return;
  setTimeout(() => {
    keybd_event(VK_CONTROL, 0, 0, 0);
    keybd_event(VK_V, 0, 0, 0);
    keybd_event(VK_V, 0, KEYUP, 0);
    keybd_event(VK_CONTROL, 0, KEYUP, 0);
    setTimeout(() => {
      keybd_event(VK_RETURN, 0, 0, 0);
      keybd_event(VK_RETURN, 0, KEYUP, 0);
      setTimeout(() => { if (prevClip) clipboard.writeText(prevClip); }, 300);
    }, 60);
  }, 40);
}

function sendRewardMac(prevClip) {
  const script = [
    'tell application "System Events"',
    '  delay 0.03',
    '  keystroke "v" using {command down}',
    '  delay 0.05',
    '  key code 36',
    'end tell',
  ].join('\n');
  execFile('osascript', ['-e', script], err => {
    if (err) console.warn('mac macro failed (enable Accessibility):', err.message);
    setTimeout(() => { if (prevClip) clipboard.writeText(prevClip); }, 500);
  });
}

// ── App lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  config = loadConfig();

  tray = new Tray(await getTrayIcon());
  tray.on('click', () => toggleOverlay(true));
  buildTrayMenu();
  registerHotkeys();
});

app.on('will-quit', () => { globalShortcut.unregisterAll(); });
app.on('window-all-closed', e => e.preventDefault());
