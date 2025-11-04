const {
  normalizeNameForCadastur,
  isNormalizedCadasturNameLooseMatch,
} = require('../normalizeCadastur.js');

describe('normalizeNameForCadastur', () => {
  it('removes diacritics and normalizes whitespace', () => {
    expect(normalizeNameForCadastur(' JúliÉli  FERRÁRI  dos  Santos ')).toBe('julieli ferrari dos santos');
  });

  it('removes punctuation and keeps letters', () => {
    expect(normalizeNameForCadastur('João-Pedro! Silva?')).toBe('joao pedro silva');
  });
});

describe('isNormalizedCadasturNameLooseMatch', () => {
  it('considers names with stopwords differences as match', () => {
    const input = normalizeNameForCadastur('Maria de Souza Lima');
    const candidate = normalizeNameForCadastur('Maria Souza Lima');
    expect(isNormalizedCadasturNameLooseMatch(input, candidate)).toBe(true);
  });

  it('rejects completely different names', () => {
    const input = normalizeNameForCadastur('Maria Souza Lima');
    const candidate = normalizeNameForCadastur('Ana Pereira');
    expect(isNormalizedCadasturNameLooseMatch(input, candidate)).toBe(false);
  });
});
