(function (global) {
  'use strict';

  const RULE_TYPES = {
    relationship: 'relationship',
    freeform: 'freeform',
    language: 'language',
    crossover: 'crossover',
    author: 'author'
  };

  const RULE_TYPE_LABELS = {
    relationship: 'Relationship',
    freeform: 'Additional Tag',
    language: 'Language',
    crossover: 'Crossover',
    author: 'Author / Pseud'
  };

  const DEFAULT_PREFS = {
    showReasons: false,
    crossoverThreshold: 3
  };

  function normalizeRuleType(type) {
    const value = String(type || '').trim().toLowerCase();
    return RULE_TYPES[value] || '';
  }

  function normalizeExactValue(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function normalizeAuthorUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) return '';
    try {
      const parsed = new URL(raw, 'https://archiveofourown.org/');
      parsed.hash = '';
      parsed.search = '';
      parsed.pathname = parsed.pathname.replace(/\/+$/, '');
      return parsed.href.toLowerCase();
    } catch (e) {
      return raw.replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
    }
  }

  function makeRuleId() {
    return `hidden-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function sanitizePrefs(input) {
    const prefs = (input && typeof input === 'object') ? input : {};
    const threshold = Math.max(2, Math.min(20, parseInt(prefs.crossoverThreshold, 10) || DEFAULT_PREFS.crossoverThreshold));
    return {
      showReasons: prefs.showReasons === true,
      crossoverThreshold: threshold
    };
  }

  function sanitizeRule(input) {
    if (!input || typeof input !== 'object') return null;
    const type = normalizeRuleType(input.type);
    if (!type) return null;
    const createdAt = Number(input.createdAt) || Date.now();

    if (type === RULE_TYPES.crossover) {
      return {
        id: typeof input.id === 'string' && input.id ? input.id : makeRuleId(),
        type,
        value: '',
        normalizedValue: '',
        authorUrl: '',
        createdAt
      };
    }

    const value = String(input.value || input.name || '').trim().replace(/\s+/g, ' ');
    if (!value) return null;
    const normalizedValue = normalizeExactValue(value);
    const authorUrl = type === RULE_TYPES.author ? normalizeAuthorUrl(input.authorUrl) : '';
    return {
      id: typeof input.id === 'string' && input.id ? input.id : makeRuleId(),
      type,
      value,
      normalizedValue,
      authorUrl,
      createdAt
    };
  }

  function sanitizeRulesMap(input) {
    const rawList = Array.isArray(input)
      ? input
      : (input && typeof input === 'object' ? Object.values(input) : []);
    const rules = {};
    rawList.forEach(entry => {
      const rule = sanitizeRule(entry);
      if (!rule) return;
      const dedupeKey = `${rule.type}::${rule.authorUrl || rule.normalizedValue || 'crossover'}`;
      const existing = Object.values(rules).find(item => `${item.type}::${item.authorUrl || item.normalizedValue || 'crossover'}` === dedupeKey);
      if (existing) return;
      rules[rule.id] = rule;
    });
    return rules;
  }

  function hasCrossoverRule(rules) {
    return Object.values(rules || {}).some(rule => rule && rule.type === RULE_TYPES.crossover);
  }

  function ruleDisplayValue(rule, prefs) {
    if (!rule) return '';
    if (rule.type === RULE_TYPES.crossover) {
      const nextPrefs = sanitizePrefs(prefs);
      return `Crossover (${nextPrefs.crossoverThreshold}+ fandoms)`;
    }
    return rule.value || '';
  }

  function matchExactRule(rule, values) {
    if (!rule || !Array.isArray(values) || !values.length) return false;
    return values.some(value => normalizeExactValue(value) === rule.normalizedValue);
  }

  function matchAuthorRule(rule, authors) {
    if (!rule || !Array.isArray(authors) || !authors.length) return false;
    return authors.some(author => {
      const normalizedUrl = normalizeAuthorUrl(author && author.url);
      const normalizedName = normalizeExactValue(author && author.name);
      if (rule.authorUrl && normalizedUrl) return normalizedUrl === rule.authorUrl;
      return normalizedName && normalizedName === rule.normalizedValue;
    });
  }

  function evaluateHiddenRules(rulesInput, prefsInput, listingData) {
    const rules = sanitizeRulesMap(rulesInput);
    const prefs = sanitizePrefs(prefsInput);
    const data = (listingData && typeof listingData === 'object') ? listingData : {};
    const reasons = [];
    const authors = Array.isArray(data.authors) ? data.authors : [];
    const relationships = Array.isArray(data.relationships) ? data.relationships : [];
    const freeforms = Array.isArray(data.freeforms) ? data.freeforms : [];
    const fandomCount = Number(data.fandomCount) || 0;
    const language = data.language ? [data.language] : [];

    Object.values(rules).forEach(rule => {
      if (!rule) return;
      let matched = false;
      if (rule.type === RULE_TYPES.relationship) matched = matchExactRule(rule, relationships);
      else if (rule.type === RULE_TYPES.freeform) matched = matchExactRule(rule, freeforms);
      else if (rule.type === RULE_TYPES.language) matched = matchExactRule(rule, language);
      else if (rule.type === RULE_TYPES.author) matched = matchAuthorRule(rule, authors);
      else if (rule.type === RULE_TYPES.crossover) matched = fandomCount >= prefs.crossoverThreshold;
      if (!matched) return;
      reasons.push({
        id: rule.id,
        type: rule.type,
        label: ruleDisplayValue(rule, prefs)
      });
    });

    return {
      rules,
      prefs,
      reasons,
      shouldCollapse: reasons.length > 0
    };
  }

  const core = {
    RULE_TYPES,
    RULE_TYPE_LABELS,
    DEFAULT_PREFS,
    normalizeRuleType,
    normalizeExactValue,
    normalizeAuthorUrl,
    sanitizePrefs,
    sanitizeRule,
    sanitizeRulesMap,
    hasCrossoverRule,
    ruleDisplayValue,
    evaluateHiddenRules
  };

  global.AO3TrackerHiddenRulesCore = core;
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
})(typeof globalThis !== 'undefined' ? globalThis : this);
