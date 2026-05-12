(function (global) {
  'use strict';

  function normalizeRelationship(relationship) {
    return String(relationship || '')
      .replace(/\s*\/\s*/g, '/')
      .replace(/\s*\|\s*/g, ' | ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function normalizeCharacterAlias(name) {
    return String(name || '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function relationshipParticipants(relationship) {
    return String(relationship || '')
      .split('/')
      .flatMap(part => part.split('|'))
      .map(part => normalizeCharacterAlias(part))
      .filter(Boolean);
  }

  function relationshipOverlapScore(leftParts, rightParts) {
    const right = new Set(rightParts || []);
    return (leftParts || []).reduce((sum, part) => sum + (right.has(part) ? 1 : 0), 0);
  }

  function uniqueRelationshipAliases(aliases) {
    const seen = new Set();
    const result = [];
    (Array.isArray(aliases) ? aliases : []).forEach(alias => {
      const value = String(alias || '').trim();
      const normalized = normalizeRelationship(value);
      if (!value || !normalized || seen.has(normalized)) return;
      seen.add(normalized);
      result.push(value);
    });
    return result;
  }

  function chooseRelationshipGroupName(aliases, preferred) {
    const preferredText = String(preferred || '').trim();
    if (preferredText) return preferredText;
    return [...aliases].sort((a, b) => b.length - a.length || a.localeCompare(b))[0] || 'Relationship group';
  }

  function sanitizeRelationshipGroups(input) {
    const source = input && typeof input === 'object' ? input : {};
    const result = {};
    Object.entries(source).forEach(([rawId, raw]) => {
      if (!raw || typeof raw !== 'object') return;
      const aliases = uniqueRelationshipAliases(raw.aliases || []);
      if (aliases.length < 2) return;
      const id = String(raw.id || rawId || '').trim();
      if (!id) return;
      result[id] = {
        id,
        name: String(raw.name || aliases[0] || 'Relationship group').trim(),
        aliases,
        createdAt: Number(raw.createdAt) || Date.now(),
        updatedAt: Number(raw.updatedAt) || null
      };
    });
    return result;
  }

  function findRelationshipGroup(relationship, groups) {
    const normalized = normalizeRelationship(relationship);
    if (!normalized) return null;
    return Object.values(groups || {}).find(group =>
      (group.aliases || []).some(alias => normalizeRelationship(alias) === normalized)
    ) || null;
  }

  function relationshipDisplayName(relationship, groups) {
    const group = findRelationshipGroup(relationship, groups);
    return group?.name || String(relationship || '').trim();
  }

  function relationshipGroupKey(relationship, groups) {
    const normalized = normalizeRelationship(relationship);
    if (!normalized) return '';
    const group = findRelationshipGroup(relationship, groups);
    return group ? `group:${group.id}` : `rel:${normalized}`;
  }

  const RelationshipCore = {
    normalizeRelationship,
    normalizeCharacterAlias,
    relationshipParticipants,
    relationshipOverlapScore,
    uniqueRelationshipAliases,
    chooseRelationshipGroupName,
    sanitizeRelationshipGroups,
    findRelationshipGroup,
    relationshipDisplayName,
    relationshipGroupKey
  };

  global.AO3TrackerDashboardRelationshipCore = RelationshipCore;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RelationshipCore;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
