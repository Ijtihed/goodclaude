const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const iconPath = path.join(root, 'icon', 'icon.png');

describe('icon', () => {
  it('icon/icon.png exists', () => {
    assert.ok(fs.existsSync(iconPath));
  });

  it('starts with PNG magic bytes', () => {
    const buf = fs.readFileSync(iconPath);
    assert.strictEqual(buf[0], 0x89);
    assert.strictEqual(buf.subarray(1, 4).toString(), 'PNG');
  });

  it('is > 100 bytes', () => {
    assert.ok(fs.statSync(iconPath).size > 100);
  });
});
