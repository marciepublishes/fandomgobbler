const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../modules/hidden-rules/core.js');

test('sanitizeRule normalizes exact-match rules', () => {
  const rule = core.sanitizeRule({ type: 'relationship', value: '  Aziraphale / Crowley  ' });
  assert.equal(rule.type, 'relationship');
  assert.equal(rule.value, 'Aziraphale / Crowley');
  assert.equal(rule.normalizedValue, 'aziraphale / crowley');
});

test('sanitizeRulesMap dedupes repeated rules and keeps crossover singular', () => {
  const rules = core.sanitizeRulesMap([
    { id: 'a', type: 'freeform', value: 'Angst' },
    { id: 'b', type: 'freeform', value: ' angst ' },
    { id: 'c', type: 'crossover' },
    { id: 'd', type: 'crossover' }
  ]);

  assert.equal(Object.keys(rules).length, 2);
  assert.ok(Object.values(rules).some(rule => rule.type === 'freeform'));
  assert.ok(Object.values(rules).some(rule => rule.type === 'crossover'));
});

test('evaluateHiddenRules matches authors by normalized URL before name fallback', () => {
  const rules = core.sanitizeRulesMap([
    { type: 'author', value: 'Different Name', authorUrl: 'https://archiveofourown.org/users/Example/pseuds/Test?view=flat#top' }
  ]);

  const match = core.evaluateHiddenRules(rules, {}, {
    authors: [{ name: 'Anything', url: 'https://archiveofourown.org/users/example/pseuds/test' }],
    relationships: [],
    freeforms: [],
    language: '',
    fandomCount: 1
  });

  assert.equal(match.shouldCollapse, true);
  assert.equal(match.reasons[0].type, 'author');
});

test('evaluateHiddenRules respects the crossover threshold preference', () => {
  const rules = core.sanitizeRulesMap([{ type: 'crossover' }]);

  const noMatch = core.evaluateHiddenRules(rules, { crossoverThreshold: 4 }, {
    authors: [],
    relationships: [],
    freeforms: [],
    language: '',
    fandomCount: 3
  });
  assert.equal(noMatch.shouldCollapse, false);

  const yesMatch = core.evaluateHiddenRules(rules, { crossoverThreshold: 3 }, {
    authors: [],
    relationships: [],
    freeforms: [],
    language: '',
    fandomCount: 3
  });
  assert.equal(yesMatch.shouldCollapse, true);
  assert.equal(yesMatch.reasons[0].label, 'Crossover (3+ fandoms)');
});
