const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'overlay.html'), 'utf8');

describe('overlay.html', () => {
  it('exists and is non-empty', () => {
    assert.ok(html.length > 0);
  });

  it('contains a canvas tag', () => {
    assert.ok(html.includes('<canvas'));
  });

  it('calls bridge.rewardDrop', () => {
    assert.ok(html.includes('bridge.rewardDrop'));
  });

  it('calls bridge.hideOverlay', () => {
    assert.ok(html.includes('bridge.hideOverlay'));
  });

  it('listens for onSpawnTreat', () => {
    assert.ok(html.includes('bridge.onSpawnTreat'));
  });

  it('does not contain Ctrl+C references', () => {
    const lower = html.toLowerCase();
    assert.ok(!lower.includes('ctrl+c'));
    assert.ok(!lower.includes('ctrl-c'));
    assert.ok(!html.includes('VK_C'));
  });

  it('handles quick-reward IPC', () => {
    assert.ok(html.includes('bridge.onQuickReward'));
  });
});
