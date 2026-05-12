const test = require('node:test');
const assert = require('node:assert/strict');

const RelationshipCore = require('../modules/dashboard/relationship-core.js');

// --- normalizeRelationship ---

test('normalizeRelationship lowercases and collapses spaces around delimiters', () => {
  assert.equal(RelationshipCore.normalizeRelationship('A / B'), 'a/b');
  assert.equal(RelationshipCore.normalizeRelationship('A | B'), 'a | b');
  assert.equal(RelationshipCore.normalizeRelationship('  hello   world  '), 'hello world');
  assert.equal(RelationshipCore.normalizeRelationship(''), '');
  assert.equal(RelationshipCore.normalizeRelationship(null), '');
});

// --- normalizeCharacterAlias ---

test('normalizeCharacterAlias strips parenthetical notes and normalizes spaces', () => {
  assert.equal(RelationshipCore.normalizeCharacterAlias('Hermione Granger (Alternate)'), 'hermione granger');
  assert.equal(RelationshipCore.normalizeCharacterAlias('  Harry  Potter  '), 'harry potter');
  assert.equal(RelationshipCore.normalizeCharacterAlias(''), '');
});

// --- relationshipParticipants ---

test('relationshipParticipants splits on / and | and normalizes aliases', () => {
  const parts = RelationshipCore.relationshipParticipants('Harry/Draco | Ron');
  assert.deepEqual(parts, ['harry', 'draco', 'ron']);
});

test('relationshipParticipants returns empty array for empty input', () => {
  assert.deepEqual(RelationshipCore.relationshipParticipants(''), []);
});

// --- relationshipOverlapScore ---

test('relationshipOverlapScore counts shared participants', () => {
  assert.equal(RelationshipCore.relationshipOverlapScore(['harry', 'draco'], ['harry', 'ron']), 1);
  assert.equal(RelationshipCore.relationshipOverlapScore(['harry', 'draco'], ['harry', 'draco']), 2);
  assert.equal(RelationshipCore.relationshipOverlapScore(['harry'], ['ron']), 0);
});

// --- uniqueRelationshipAliases ---

test('uniqueRelationshipAliases deduplicates by normalized form', () => {
  const aliases = RelationshipCore.uniqueRelationshipAliases(['Harry/Draco', 'harry/draco', 'Ron/Harry']);
  assert.equal(aliases.length, 2);
  assert.equal(aliases[0], 'Harry/Draco');
  assert.equal(aliases[1], 'Ron/Harry');
});

test('uniqueRelationshipAliases filters empty strings', () => {
  const aliases = RelationshipCore.uniqueRelationshipAliases(['', 'A/B', null, 'A/B']);
  assert.equal(aliases.length, 1);
});

// --- chooseRelationshipGroupName ---

test('chooseRelationshipGroupName returns preferred if provided', () => {
  assert.equal(RelationshipCore.chooseRelationshipGroupName(['A/B', 'C/D'], 'My Ship'), 'My Ship');
});

test('chooseRelationshipGroupName falls back to longest alias', () => {
  assert.equal(RelationshipCore.chooseRelationshipGroupName(['A/B', 'LongerShip/Name'], ''), 'LongerShip/Name');
});

// --- sanitizeRelationshipGroups ---

test('sanitizeRelationshipGroups discards groups with fewer than 2 aliases', () => {
  const input = {
    'g1': { id: 'g1', name: 'One', aliases: ['A/B'] },
    'g2': { id: 'g2', name: 'Two', aliases: ['A/B', 'C/D'] }
  };
  const result = RelationshipCore.sanitizeRelationshipGroups(input);
  assert.ok(!result['g1'], 'single-alias group removed');
  assert.ok(result['g2'], 'two-alias group kept');
});

test('sanitizeRelationshipGroups deduplicates aliases within a group', () => {
  const input = {
    'g1': { id: 'g1', name: 'Test', aliases: ['A/B', 'a/b', 'C/D'] }
  };
  const result = RelationshipCore.sanitizeRelationshipGroups(input);
  assert.equal(result['g1'].aliases.length, 2);
});

test('sanitizeRelationshipGroups returns empty object for invalid input', () => {
  assert.deepEqual(RelationshipCore.sanitizeRelationshipGroups(null), {});
  assert.deepEqual(RelationshipCore.sanitizeRelationshipGroups('not an object'), {});
});

// --- findRelationshipGroup ---

test('findRelationshipGroup returns matching group by normalized alias', () => {
  const groups = {
    'g1': { id: 'g1', name: 'Canon Ship', aliases: ['Harry/Ginny', 'Harry / Ginny'] }
  };
  const result = RelationshipCore.findRelationshipGroup('harry/ginny', groups);
  assert.ok(result);
  assert.equal(result.id, 'g1');
});

test('findRelationshipGroup returns null if no match', () => {
  assert.equal(RelationshipCore.findRelationshipGroup('Draco/Hermione', {}), null);
  assert.equal(RelationshipCore.findRelationshipGroup('', { 'g': { aliases: ['A/B'] } }), null);
});

// --- relationshipDisplayName ---

test('relationshipDisplayName returns group name when group found', () => {
  const groups = { 'g1': { id: 'g1', name: 'My Ship', aliases: ['A/B', 'B/A'] } };
  assert.equal(RelationshipCore.relationshipDisplayName('A/B', groups), 'My Ship');
});

test('relationshipDisplayName returns relationship itself when no group', () => {
  assert.equal(RelationshipCore.relationshipDisplayName('Draco/Luna', {}), 'Draco/Luna');
});

// --- relationshipGroupKey ---

test('relationshipGroupKey returns group-based key when found', () => {
  const groups = { 'g1': { id: 'g1', name: 'Ship', aliases: ['A/B', 'C/D'] } };
  assert.equal(RelationshipCore.relationshipGroupKey('A/B', groups), 'group:g1');
  assert.equal(RelationshipCore.relationshipGroupKey('C/D', groups), 'group:g1');
});

test('relationshipGroupKey returns rel-based key when no group', () => {
  assert.equal(RelationshipCore.relationshipGroupKey('Harry/Draco', {}), 'rel:harry/draco');
});

test('relationshipGroupKey returns empty string for empty input', () => {
  assert.equal(RelationshipCore.relationshipGroupKey('', {}), '');
  assert.equal(RelationshipCore.relationshipGroupKey(null, {}), '');
});
