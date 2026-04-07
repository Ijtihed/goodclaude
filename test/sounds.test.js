const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const chimes = ['chime1.mp3', 'chime2.mp3', 'chime3.mp3', 'chime4.mp3'];
const allSounds = [...chimes, 'grumpy.mp3'];

describe('sound files', () => {
  for (const name of allSounds) {
    const fp = path.join(root, 'sounds', name);

    it(`${name} exists`, () => {
      assert.ok(fs.existsSync(fp));
    });

    it(`${name} is valid MP3 (starts with ID3 or FF FB)`, () => {
      const buf = fs.readFileSync(fp);
      const hasID3 = buf.subarray(0, 3).toString() === 'ID3';
      const hasSync = buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0;
      assert.ok(hasID3 || hasSync, `${name} doesn't start with ID3 tag or MP3 sync word`);
    });

    it(`${name} is > 1KB`, () => {
      assert.ok(fs.statSync(fp).size > 1024);
    });
  }
});
