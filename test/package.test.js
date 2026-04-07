const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

describe('package.json', () => {
  it('name is goodclaude', () => {
    assert.strictEqual(pkg.name, 'goodclaude');
  });

  it('bin points to bin/goodclaude.js', () => {
    assert.strictEqual(pkg.bin.goodclaude, 'bin/goodclaude.js');
  });

  it('bin/goodclaude.js exists on disk', () => {
    assert.ok(fs.existsSync(path.join(root, 'bin', 'goodclaude.js')));
  });

  it('engines.node is set', () => {
    assert.ok(pkg.engines && pkg.engines.node);
  });

  it('electron is in dependencies', () => {
    assert.ok(pkg.dependencies.electron);
  });

  it('supports darwin and win32', () => {
    assert.ok(pkg.os.includes('darwin'));
    assert.ok(pkg.os.includes('win32'));
  });
});
