(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const utils = factory();
    if (!root.TrekkoCadasturUtils) {
      root.TrekkoCadasturUtils = utils;
    } else {
      Object.assign(root.TrekkoCadasturUtils, utils);
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  const STOP_WORDS = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);

  const removeDiacritics = (value) =>
    value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');

  const normalizeNameForCadastur = (input) => {
    if (typeof input !== 'string') {
      return '';
    }

    const sanitized = input.replace(/^\uFEFF/, '').toLowerCase();
    const withoutDiacritics = removeDiacritics(sanitized);
    return withoutDiacritics
      .replace(/[^a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const tokenizeNormalizedName = (normalizedName) => {
    if (!normalizedName) {
      return [];
    }

    return normalizedName.split(' ').filter((token) => token.length > 0);
  };

  const filterCoreTokens = (tokens) => tokens.filter((token) => !STOP_WORDS.has(token));

  const calculateTokenOverlap = (tokensA, tokensB) => {
    if (tokensA.length === 0 || tokensB.length === 0) {
      return 0;
    }

    const setA = new Set(tokensA);
    let overlap = 0;

    for (const token of tokensB) {
      if (setA.has(token)) {
        overlap += 1;
      }
    }

    return overlap / Math.min(tokensA.length, tokensB.length);
  };

  const isNormalizedCadasturNameLooseMatch = (inputNormalized, candidateNormalized) => {
    if (!inputNormalized || !candidateNormalized) {
      return false;
    }

    if (inputNormalized === candidateNormalized) {
      return true;
    }

    if (
      inputNormalized.includes(candidateNormalized) ||
      candidateNormalized.includes(inputNormalized)
    ) {
      return true;
    }

    const inputTokens = tokenizeNormalizedName(inputNormalized);
    const candidateTokens = tokenizeNormalizedName(candidateNormalized);

    if (inputTokens.length === 0 || candidateTokens.length === 0) {
      return false;
    }

    const inputSet = new Set(inputTokens);
    const candidateSet = new Set(candidateTokens);

    const inputCore = filterCoreTokens(inputTokens);
    const candidateCore = filterCoreTokens(candidateTokens);

    const candidateCoreContained = candidateCore.every((token) => inputSet.has(token));
    if (candidateCoreContained && candidateCore.length > 0) {
      return true;
    }

    const inputCoreContained = inputCore.every((token) => candidateSet.has(token));
    if (inputCoreContained && inputCore.length > 0) {
      return true;
    }

    const overlapRatio = calculateTokenOverlap(inputTokens, candidateTokens);
    if (overlapRatio >= 0.6) {
      return true;
    }

    return false;
  };

  const compareCadasturNames = (inputName, candidateName) => {
    const normalizedInput = normalizeNameForCadastur(inputName);
    const normalizedCandidate = normalizeNameForCadastur(candidateName);

    const exactMatch = normalizedInput !== '' && normalizedInput === normalizedCandidate;
    const looseMatch = isNormalizedCadasturNameLooseMatch(normalizedInput, normalizedCandidate);

    return {
      exactMatch,
      looseMatch,
      normalizedInput,
      normalizedCandidate,
    };
  };

  return {
    normalizeNameForCadastur,
    tokenizeNormalizedName,
    compareCadasturNames,
    isNormalizedCadasturNameLooseMatch,
  };
});
