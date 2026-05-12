const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function collectFiles(dir) {
  const fullDir = path.join(root, dir);
  return fs.readdirSync(fullDir, { withFileTypes: true })
    .flatMap(entry => {
      const relativePath = path.join(dir, entry.name);
      if (entry.isDirectory()) return collectFiles(relativePath);
      return [relativePath];
    });
}

const filesToScan = [
  'architecture.md',
  'content.js',
  'dashboard.html',
  'dashboard.css',
  'dashboard.js',
  'popup.html',
  'popup.js',
  ...collectFiles('modules').filter(file => file.endsWith('.js') || file.endsWith('.md')),
  ...collectFiles('tests').filter(file => file.endsWith('.js') && file !== path.join('tests', 'mojibake-regression.test.js'))
];

const mojibakePatterns = [
  new RegExp('\u00e2\u20ac\u201d', 'u'),
  new RegExp('\u00e2\u20ac\u201c', 'u'),
  new RegExp('\u00e2\u20ac\u00a6', 'u'),
  new RegExp('\u00e2\u2013', 'u'),
  new RegExp('\u00e2\u2020', 'u'),
  new RegExp('\u00e2\u0153', 'u'),
  new RegExp('\u00e2\u0161', 'u'),
  new RegExp('\u00e2\u20ac"', 'u'),
  new RegExp('\u00e2\u20ac\u02dc', 'u'),
  new RegExp('\u00e2\u20ac\u2122', 'u'),
  new RegExp('\u00e2\u20ac\u0153', 'u'),
  new RegExp('\u00e2\u20ac\u009d', 'u'),
  new RegExp('\u00c3\u2014', 'u'),
  new RegExp('\u00c2\u00b7', 'u'),
  new RegExp('\u00e2\u201d', 'u'),
  new RegExp('\ufffd', 'u')
];

const sectionScarPattern = /^\s*(\/\/|\/\*|<!--)\s*\?{2,}/u;

test('source files stay free of mojibake and degraded section-heading scars', () => {
  const findings = [];

  for (const relativePath of filesToScan) {
    const fullPath = path.join(root, relativePath);
    const contents = fs.readFileSync(fullPath, 'utf8');
    const lines = contents.split(/\r?\n/u);

    lines.forEach((line, index) => {
      if (mojibakePatterns.some(pattern => pattern.test(line)) || sectionScarPattern.test(line)) {
        findings.push(`${relativePath}:${index + 1}:${line.trim()}`);
      }
    });
  }

  assert.deepEqual(findings, []);
});
