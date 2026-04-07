const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = ['chime1.wav', 'chime2.wav', 'chime3.wav', 'chime4.wav'];

describe('sound files', () => {
  for (const name of files) {
    const fp = path.join(root, 'sounds', name);

    it(`${name} exists`, () => {
      assert.ok(fs.existsSync(fp));
    });

    it(`${name} starts with RIFF header`, () => {
      const buf = fs.readFileSync(fp);
      assert.strictEqual(buf.subarray(0, 4).toString(), 'RIFF');
    });

    it(`${name} contains WAVE marker`, () => {
      const buf = fs.readFileSync(fp);
      assert.strictEqual(buf.subarray(8, 12).toString(), 'WAVE');
    });

    it(`${name} is > 1KB`, () => {
      assert.ok(fs.statSync(fp).size > 1024);
    });
  }
});
