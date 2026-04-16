const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('background imports step registry module and uses sparse order values', () => {
  const source = fs.readFileSync('background.js', 'utf8');
  assert.match(source, /background\/steps\/registry\.js/);
  assert.match(source, /order:\s*10/);
  assert.match(source, /order:\s*90/);
  assert.match(source, /stepRegistry\.executeStep\(step,\s*state\)/);
});
