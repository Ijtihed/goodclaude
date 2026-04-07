const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'main.js'), 'utf8');

describe('main.js', () => {
  it('exists and is non-empty', () => {
    assert.ok(src.length > 0);
  });

  it('overlay is transparent', () => {
    assert.ok(src.includes('transparent: true'));
  });

  it('overlay is always on top', () => {
    assert.ok(src.includes('alwaysOnTop: true'));
  });

  it('overlay has no frame', () => {
    assert.ok(src.includes('frame: false'));
  });

  it('contains all 5 reward messages', () => {
    assert.ok(src.includes('Great job Claude'));
    assert.ok(src.includes('cookie for being awesome'));
    assert.ok(src.includes('doing amazing work'));
    assert.ok(src.includes('MVP of the day'));
    assert.ok(src.includes('clean code, well done'));
  });

  it('does not contain VK_C (no Ctrl+C interrupt)', () => {
    assert.ok(!(/\bVK_C\b/).test(src));
  });

  it('all reward messages are shell comments', () => {
    const block = src.match(/REWARD_PHRASES\s*=\s*\[([\s\S]*?)\]/);
    assert.ok(block, 'REWARD_PHRASES array not found');
    const lines = block[1].split('\n').map(l => l.trim()).filter(l => l.startsWith("'"));
    assert.ok(lines.length >= 5, `expected >= 5 phrases, got ${lines.length}`);
    for (const line of lines) {
      assert.ok(line.includes("'# "), `not a shell comment: ${line}`);
    }
  });

  it('imports globalShortcut from electron', () => {
    assert.ok(src.includes('globalShortcut'));
  });

  it('defines a DEFAULT_HOTKEY', () => {
    assert.ok(src.includes('DEFAULT_HOTKEY'));
  });

  it('has a loadConfig function', () => {
    assert.ok(src.includes('function loadConfig'));
  });

  it('reads config from ~/.goodclauderc', () => {
    assert.ok(src.includes('.goodclauderc'));
  });

  it('unregisters shortcuts on quit', () => {
    assert.ok(src.includes('globalShortcut.unregisterAll'));
  });

  it('defines a DEFAULT_QUICK_HOTKEY', () => {
    assert.ok(src.includes('DEFAULT_QUICK_HOTKEY'));
  });

  it('has a quickReward function', () => {
    assert.ok(src.includes('function quickReward'));
  });

  it('quick reward opens overlay', () => {
    assert.ok(src.includes('toggleOverlay'));
  });

  it('only refocuses after tray click, not hotkey', () => {
    assert.ok(src.includes('toggleOverlay(true)'));
    assert.ok(src.includes('toggleOverlay(false)'));
    assert.ok(src.includes('if (fromTray) refocusPreviousApp'));
  });
});
