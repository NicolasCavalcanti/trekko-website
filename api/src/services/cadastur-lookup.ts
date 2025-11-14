import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import { HttpError } from '../middlewares/error';
import {
  isNormalizedCadasturNameLooseMatch,
  normalizeNameForCadastur,
} from '../../../shared/normalizeCadastur.js';

const CACHE_TTL_MS = 15 * 60 * 1000;
const FILE_NAMES = ['BD_CADASTUR.csv', 'CADASTUR.csv'] as const;
const DELIMITERS = [',', ';', '\t', '|'] as const;
const NAME_HEADER_CANDIDATES = [
  'NOME_COMPLETO',
  'NOME',
  'NOME_COMPLETO_DO_GUIA',
  'NOME_DO_GUIA',
];
const NUMBER_HEADER_CANDIDATES = [
  'NUMERO_CADASTUR',
  'NUMERO_DO_CADASTUR',
  'NUMERO_DO_CERTIFICADO',
  'NUMERO_CADASTRU',
];

export type CadasturLookup = {
  namesByNumber: Map<string, CadasturNameRecord[]>;
  total: number;
  sourcePath: string;
};

let cachedLookup: CadasturLookup | null = null;
let cacheTimestamp = 0;

const uniqueDirectories = (paths: string[]): string[] => {
  return Array.from(new Set(paths.map((item) => path.resolve(item))));
};

const candidateDirectories = uniqueDirectories([
  process.cwd(),
  path.resolve(process.cwd(), 'public'),
  path.resolve(process.cwd(), 'static'),
  path.resolve(process.cwd(), '..'),
  '/var/www/html',
  path.resolve(__dirname, '..'),
  path.resolve(__dirname, '../..'),
  path.resolve(__dirname, '../../..'),
]);

const normalizeHeader = (value: string): string =>
  value
    .replace(/^\uFEFF/, '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');

const normalizeNumber = (value: string): string => value.replace(/\D/g, '');

const detectDelimiter = (line: string): string => {
  let bestDelimiter = ';';
  let bestCount = -1;

  for (const delimiter of DELIMITERS) {
    const count = line.split(delimiter).length - 1;
    if (count > bestCount) {
      bestCount = count;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
};

const parseCsvLine = (line: string, delimiter: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
};

const findColumnIndex = (headers: string[], candidates: string[]): number => {
  for (const candidate of candidates) {
    const index = headers.indexOf(candidate);
    if (index !== -1) {
      return index;
    }
  }
  return -1;
};

const resolveCadasturFile = async (): Promise<string> => {
  const customPath = process.env.CADASTUR_CSV_PATH;

  if (customPath) {
    const resolvedCustomPath = path.resolve(customPath);
    try {
      await access(resolvedCustomPath);
      console.info('[cadasturLookupService] Base CADASTUR localizada via CADASTUR_CSV_PATH:', resolvedCustomPath);
      return resolvedCustomPath;
    } catch (error) {
      console.warn(
        '[cadasturLookupService] Caminho definido em CADASTUR_CSV_PATH indisponível:',
        resolvedCustomPath,
        error instanceof Error ? error.message : error,
      );
    }
  }

  for (const directory of candidateDirectories) {
    for (const fileName of FILE_NAMES) {
      const candidate = path.resolve(directory, fileName);
      try {
        await access(candidate);
        console.info('[cadasturLookupService] Base CADASTUR localizada em diretório candidato:', candidate);
        return candidate;
      } catch {
        // Continue searching in next candidate
      }
    }
  }

  throw new HttpError(
    500,
    'CADASTUR_DATA_UNAVAILABLE',
    'Base oficial CADASTUR não encontrada no servidor',
  );
};

export type CadasturNameRecord = {
  rawName: string;
  normalizedName: string;
};

const parseCadasturCsv = (content: string, sourcePath: string): CadasturLookup => {
  const sanitized = content.replace(/\r/g, '\n');
  const lines = sanitized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return {
      namesByNumber: new Map(),
      total: 0,
      sourcePath,
    };
  }

  const headerLine = lines.shift()?.replace(/^\uFEFF/, '') ?? '';
  const delimiter = detectDelimiter(headerLine);
  const headers = parseCsvLine(headerLine, delimiter).map((header) => normalizeHeader(header));
  const nameIndex = findColumnIndex(headers, NAME_HEADER_CANDIDATES);
  const numberIndex = findColumnIndex(headers, NUMBER_HEADER_CANDIDATES);

  if (nameIndex === -1 || numberIndex === -1) {
    throw new Error('Colunas obrigatórias ausentes na base CADASTUR');
  }

  const namesByNumber = new Map<string, CadasturNameRecord[]>();
  let total = 0;

  for (const rawLine of lines) {
    const values = parseCsvLine(rawLine, delimiter);
    if (values.length <= Math.max(nameIndex, numberIndex)) {
      continue;
    }

    const rawName = values[nameIndex]?.trim();
    const rawNumber = values[numberIndex]?.trim();

    if (!rawName || !rawNumber) {
      continue;
    }

    const normalizedNumber = normalizeNumber(rawNumber);
    const normalizedName = normalizeNameForCadastur(rawName);

    if (!normalizedNumber || !normalizedName) {
      continue;
    }

    if (!namesByNumber.has(normalizedNumber)) {
      namesByNumber.set(normalizedNumber, []);
    }

    namesByNumber.get(normalizedNumber)?.push({
      rawName,
      normalizedName,
    });
    total += 1;
  }

  return {
    namesByNumber,
    total,
    sourcePath,
  };
};

const loadCadasturLookup = async (): Promise<CadasturLookup> => {
  const now = Date.now();
  if (cachedLookup && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedLookup;
  }

  const filePath = await resolveCadasturFile();
  let content: string;

  try {
    content = await readFile(filePath, 'utf-8');
  } catch (error) {
    throw new HttpError(
      500,
      'CADASTUR_FILE_READ_ERROR',
      'Não foi possível ler o arquivo da base CADASTUR',
      error instanceof Error ? error.message : undefined,
    );
  }

  let parsed: CadasturLookup;
  try {
    parsed = parseCadasturCsv(content, filePath);
  } catch (error) {
    throw new HttpError(
      500,
      'CADASTUR_DATA_INVALID',
      'Base oficial CADASTUR inválida ou corrompida',
      error instanceof Error ? error.message : undefined,
    );
  }

  if (parsed.namesByNumber.size === 0) {
    throw new HttpError(500, 'CADASTUR_DATA_EMPTY', 'Base oficial CADASTUR vazia');
  }

  console.info(
    '[cadasturLookupService] Base CADASTUR carregada com sucesso:',
    JSON.stringify({ source: filePath, registros: parsed.total }),
  );

  cachedLookup = parsed;
  cacheTimestamp = now;
  return parsed;
};

export type CadasturValidationResult = {
  valid: boolean;
  exactMatch: boolean;
  numberExists: boolean;
  matchedName: string | null;
  normalizedMatchedName: string | null;
  availableNames: string[];
};

const createValidationResult = (
  overrides: Partial<CadasturValidationResult>,
): CadasturValidationResult => ({
  valid: false,
  exactMatch: false,
  numberExists: false,
  matchedName: null,
  normalizedMatchedName: null,
  availableNames: [],
  ...overrides,
});

export const cadasturLookupService = {
  async validate(name: string, cadasturNumber: string): Promise<CadasturValidationResult> {
    const lookup = await loadCadasturLookup();
    const normalizedNumber = normalizeNumber(cadasturNumber);
    const normalizedInputName = normalizeNameForCadastur(name);

    if (!normalizedNumber) {
      return createValidationResult({ numberExists: false });
    }

    const entries = lookup.namesByNumber.get(normalizedNumber);

    if (!entries || entries.length === 0) {
      return createValidationResult({ numberExists: false });
    }

    const availableNames = entries.map((entry) => entry.rawName);

    if (!normalizedInputName) {
      return createValidationResult({ numberExists: true, availableNames });
    }

    const exactMatch = entries.find((entry) => entry.normalizedName === normalizedInputName);

    if (exactMatch) {
      return createValidationResult({
        valid: true,
        exactMatch: true,
        numberExists: true,
        matchedName: exactMatch.rawName,
        normalizedMatchedName: exactMatch.normalizedName,
        availableNames,
      });
    }

    const partialMatch = entries.find((entry) =>
      isNormalizedCadasturNameLooseMatch(normalizedInputName, entry.normalizedName),
    );

    if (partialMatch) {
      return createValidationResult({
        valid: true,
        exactMatch: false,
        numberExists: true,
        matchedName: partialMatch.rawName,
        normalizedMatchedName: partialMatch.normalizedName,
        availableNames,
      });
    }

    return createValidationResult({ numberExists: true, availableNames });
  },
  async refresh(): Promise<void> {
    cachedLookup = null;
    cacheTimestamp = 0;
    try {
      await loadCadasturLookup();
    } catch {
      // ignore refresh errors, next validation will report them
    }
  },
  get cachedSource(): string | null {
    return cachedLookup?.sourcePath ?? null;
  },
};
