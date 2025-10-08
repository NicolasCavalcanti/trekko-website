import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import { HttpError } from '../middlewares/error';

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
  namesByNumber: Map<string, Set<string>>;
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
  path.resolve(process.cwd(), '..'),
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

const normalizeName = (value: string): string =>
  value.replace(/^\uFEFF/, '').trim().replace(/\s+/g, ' ').toLowerCase();

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
  for (const directory of candidateDirectories) {
    for (const fileName of FILE_NAMES) {
      const candidate = path.resolve(directory, fileName);
      try {
        await access(candidate);
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

  const namesByNumber = new Map<string, Set<string>>();
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
    const normalizedName = normalizeName(rawName);

    if (!normalizedNumber || !normalizedName) {
      continue;
    }

    if (!namesByNumber.has(normalizedNumber)) {
      namesByNumber.set(normalizedNumber, new Set());
    }

    namesByNumber.get(normalizedNumber)?.add(normalizedName);
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

  cachedLookup = parsed;
  cacheTimestamp = now;
  return parsed;
};

export const cadasturLookupService = {
  async isValid(name: string, cadasturNumber: string): Promise<boolean> {
    const lookup = await loadCadasturLookup();
    const normalizedName = normalizeName(name);
    const normalizedNumber = normalizeNumber(cadasturNumber);

    if (!normalizedName || !normalizedNumber) {
      return false;
    }

    const names = lookup.namesByNumber.get(normalizedNumber);
    return names ? names.has(normalizedName) : false;
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
