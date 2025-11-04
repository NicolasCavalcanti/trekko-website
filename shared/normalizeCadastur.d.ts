export type CadasturNameComparison = {
  exactMatch: boolean;
  looseMatch: boolean;
  normalizedInput: string;
  normalizedCandidate: string;
};

export declare function normalizeNameForCadastur(input: string): string;
export declare function tokenizeNormalizedName(normalizedName: string): string[];
export declare function isNormalizedCadasturNameLooseMatch(
  inputNormalized: string,
  candidateNormalized: string,
): boolean;
export declare function compareCadasturNames(
  inputName: string,
  candidateName: string,
): CadasturNameComparison;
