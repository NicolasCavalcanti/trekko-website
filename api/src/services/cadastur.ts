export type CadasturMappedField =
  | 'cadasturNumber'
  | 'name'
  | 'email'
  | 'languages'
  | 'serviceAreas'
  | 'status'
  | 'certificateValidity'
  | 'municipality'
  | 'uf'
  | 'phone'
  | 'website'
  | 'activity'
  | 'categories'
  | 'segments'
  | 'isDriver';

export type CadasturFieldMapping = Record<string, CadasturMappedField | null>;

export type CadasturNormalizedRecord = {
  cadasturNumber: string | null;
  name: string | null;
  email: string | null;
  languages: string[];
  serviceAreas: string[];
  status: string | null;
  statusOriginal: string | null;
  certificateValidity: string | null;
  certificateValidityOriginal: string | null;
  municipality: string | null;
  uf: string | null;
  phone: string | null;
  website: string | null;
  activity: string | null;
  categories: string[];
  segments: string[];
  isDriver: boolean | null;
};

export type CadasturCsvRow = {
  rowNumber: number;
  raw: Record<string, string>;
  normalized: CadasturNormalizedRecord;
};

export type CadasturCsvParseResult = {
  rows: CadasturCsvRow[];
  fieldMapping: CadasturFieldMapping;
  delimiter: string;
};

export type CadasturImportStatusEvaluation = 'ACTIVE' | 'INACTIVE' | 'UNKNOWN';

export class CadasturCsvError extends Error {}

const CANDIDATE_DELIMITERS = [',', ';', '\t', '|'] as const;

const HEADER_FIELD_MAP = new Map<string, CadasturMappedField>([
  ['cadastur', 'cadasturNumber'],
  ['cadasturnumber', 'cadasturNumber'],
  ['numerodocadastur', 'cadasturNumber'],
  ['numerodocertificado', 'cadasturNumber'],
  ['numeroderegistro', 'cadasturNumber'],
  ['registro', 'cadasturNumber'],
  ['nregistrotur', 'cadasturNumber'],
  ['ncadastur', 'cadasturNumber'],
  ['name', 'name'],
  ['nome', 'name'],
  ['nomecompleto', 'name'],
  ['nomedoguia', 'name'],
  ['guidename', 'name'],
  ['responsavel', 'name'],
  ['email', 'email'],
  ['emailcomercial', 'email'],
  ['emailprincipal', 'email'],
  ['contatoemail', 'email'],
  ['idiomas', 'languages'],
  ['idioma', 'languages'],
  ['idiomasdeatuacao', 'languages'],
  ['idiomasatendidos', 'languages'],
  ['linguas', 'languages'],
  ['linguagens', 'languages'],
  ['municipiodeatuacao', 'serviceAreas'],
  ['municipiosdeatuacao', 'serviceAreas'],
  ['areasdeatuacao', 'serviceAreas'],
  ['atuacao', 'serviceAreas'],
  ['cidadesatendidas', 'serviceAreas'],
  ['municipio', 'municipality'],
  ['municipiodeorigem', 'municipality'],
  ['cidade', 'municipality'],
  ['uf', 'uf'],
  ['estado', 'uf'],
  ['estados', 'uf'],
  ['validade', 'certificateValidity'],
  ['validadedocertificado', 'certificateValidity'],
  ['datavalidade', 'certificateValidity'],
  ['datadevalidade', 'certificateValidity'],
  ['dataexpiracao', 'certificateValidity'],
  ['status', 'status'],
  ['situacao', 'status'],
  ['situacaodocadastro', 'status'],
  ['situacaocadastur', 'status'],
  ['situacaocertificado', 'status'],
  ['atividade', 'activity'],
  ['atividadeturistica', 'activity'],
  ['atividadeprincipal', 'activity'],
  ['categorias', 'categories'],
  ['categoria', 'categories'],
  ['segmentos', 'segments'],
  ['segmento', 'segments'],
  ['guiamotorista', 'isDriver'],
  ['motoristaguia', 'isDriver'],
  ['guiamotorista?', 'isDriver'],
  ['telefone', 'phone'],
  ['telefonecomercial', 'phone'],
  ['contatotelefone', 'phone'],
  ['telefone1', 'phone'],
  ['website', 'website'],
  ['site', 'website'],
  ['paginaweb', 'website'],
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const ACTIVE_STATUS_CODES = new Set([
  'ATIVO',
  'ATIVA',
  'REGULAR',
  'EMDIA',
  'EM DIA',
  'VALIDO',
  'HABILITADO',
]);

const INACTIVE_STATUS_KEYWORDS = [
  'INATIV',
  'CANCEL',
  'SUSP',
  'VENC',
  'EXPIR',
  'IRREG',
  'BAIXA',
  'ENCERR',
  'DESATIV',
  'PENDENTE',
];

const normalizeHeaderKey = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const detectDelimiter = (headerLine: string): string => {
  let bestDelimiter = ',';
  let bestCount = -1;

  for (const delimiter of CANDIDATE_DELIMITERS) {
    const count = headerLine.split(delimiter).length - 1;
    if (count > bestCount) {
      bestCount = count;
      bestDelimiter = delimiter;
    }
  }

  if (bestCount <= 0) {
    if (headerLine.includes(';')) {
      return ';';
    }

    if (headerLine.includes('\t')) {
      return '\t';
    }

    if (headerLine.includes('|')) {
      return '|';
    }

    return ',';
  }

  return bestDelimiter;
};

const parseCsvContent = (content: string, delimiter: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (char === '"') {
      if (inQuotes && content[index + 1] === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === '\r') {
      if (inQuotes) {
        currentValue += char;
      }
      continue;
    }

    if (char === '\n') {
      if (inQuotes) {
        currentValue += char;
      } else {
        currentRow.push(currentValue);
        currentValue = '';
        rows.push(currentRow);
        currentRow = [];
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = '';
      continue;
    }

    currentValue += char;
  }

  if (inQuotes) {
    throw new CadasturCsvError('CSV possui aspas não balanceadas');
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
  }

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
};

const toTitleCase = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return '';
  }

  const lower = trimmed.toLowerCase();

  return lower
    .split(/\s+/)
    .map((segment) => (segment.length === 0 ? '' : segment[0].toUpperCase() + segment.slice(1)))
    .join(' ');
};

const uniqueList = (values: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (key.length === 0) {
      continue;
    }
    if (!seen.has(key)) {
      seen.add(key);
      result.push(value.trim());
    }
  }

  return result;
};

const splitList = (value: string): string[] => {
  if (!value) {
    return [];
  }

  const parts = value
    .split(/[|;,]/)
    .map((part) => toTitleCase(part))
    .filter((part) => part.length > 0);

  return uniqueList(parts);
};

const normalizeCadasturNumber = (value: string): string | null => {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 5) {
    return null;
  }
  return digits;
};

const normalizeEmail = (value: string): string | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const lower = trimmed.toLowerCase();

  if (!EMAIL_REGEX.test(lower)) {
    return null;
  }

  return lower;
};

const normalizeStatus = (value: string): string | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Z\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
};

export const evaluateCadasturStatus = (
  status: string | null,
): CadasturImportStatusEvaluation => {
  if (!status) {
    return 'UNKNOWN';
  }

  const compact = status.replace(/\s+/g, '');

  if (ACTIVE_STATUS_CODES.has(compact)) {
    return 'ACTIVE';
  }

  for (const keyword of INACTIVE_STATUS_KEYWORDS) {
    if (compact.includes(keyword)) {
      return 'INACTIVE';
    }
  }

  return 'UNKNOWN';
};

const parseDateValue = (value: string): string | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const normalized = trimmed.replace(/\s+/g, ' ');

  const matchBR = normalized.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (matchBR) {
    const day = Number.parseInt(matchBR[1], 10);
    const month = Number.parseInt(matchBR[2], 10);
    let year = Number.parseInt(matchBR[3], 10);

    if (year < 100) {
      year += year >= 70 ? 1900 : 2000;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day)).toISOString();
    }
  }

  const matchISO = normalized.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (matchISO) {
    const year = Number.parseInt(matchISO[1], 10);
    const month = Number.parseInt(matchISO[2], 10);
    const day = Number.parseInt(matchISO[3], 10);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day)).toISOString();
    }
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(
      Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()),
    ).toISOString();
  }

  return null;
};

const normalizePhone = (value: string): string | null => {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 8) {
    return null;
  }
  return digits;
};

const normalizeWebsite = (value: string): string | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed;
};

const parseBooleanValue = (value: string): boolean | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const normalized = trimmed
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

  if (['1', 'true', 'sim', 's', 'yes'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'nao', 'n', 'no'].includes(normalized)) {
    return false;
  }

  return null;
};

export const parseCadasturCsv = (input: Buffer | string): CadasturCsvParseResult => {
  let content = typeof input === 'string' ? input : input.toString('utf-8');

  if (content.length === 0) {
    throw new CadasturCsvError('Arquivo CSV vazio');
  }

  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  const lines = content.split(/\r?\n/);
  const firstLine = lines.find((line) => line.trim().length > 0);

  if (!firstLine) {
    throw new CadasturCsvError('Arquivo CSV sem dados');
  }

  const delimiter = detectDelimiter(firstLine);
  const table = parseCsvContent(content, delimiter);

  if (table.length === 0) {
    throw new CadasturCsvError('Arquivo CSV sem dados');
  }

  const headerRow = table[0].map((header) => header.trim());

  if (headerRow.length === 0) {
    throw new CadasturCsvError('Cabeçalho do CSV ausente');
  }

  const fieldMapping: CadasturFieldMapping = {};

  for (const header of headerRow) {
    const normalized = normalizeHeaderKey(header);
    const mapped = HEADER_FIELD_MAP.get(normalized) ?? null;
    fieldMapping[header] = mapped;
  }

  const rows: CadasturCsvRow[] = [];

  for (let index = 1; index < table.length; index += 1) {
    const row = table[index];

    if (row.length === 1 && row[0].trim().length === 0) {
      continue;
    }

    if (row.length !== headerRow.length) {
      throw new CadasturCsvError(
        `Linha ${index + 1} possui ${row.length} colunas, esperado ${headerRow.length}`,
      );
    }

    const raw: Record<string, string> = {};
    const normalized: CadasturNormalizedRecord = {
      cadasturNumber: null,
      name: null,
      email: null,
      languages: [],
      serviceAreas: [],
      status: null,
      statusOriginal: null,
      certificateValidity: null,
      certificateValidityOriginal: null,
      municipality: null,
      uf: null,
      phone: null,
      website: null,
      activity: null,
      categories: [],
      segments: [],
      isDriver: null,
    };

    for (let col = 0; col < headerRow.length; col += 1) {
      const header = headerRow[col];
      const value = row[col] ?? '';
      const trimmedValue = value.trim();

      raw[header] = trimmedValue;

      const mappedField = fieldMapping[header];
      if (!mappedField) {
        continue;
      }

      switch (mappedField) {
        case 'cadasturNumber': {
          if (trimmedValue.length > 0) {
            normalized.cadasturNumber = normalizeCadasturNumber(trimmedValue);
          }
          break;
        }
        case 'name': {
          if (trimmedValue.length > 0) {
            const title = toTitleCase(trimmedValue);
            normalized.name = title.length > 0 ? title : trimmedValue;
          }
          break;
        }
        case 'email': {
          if (trimmedValue.length > 0) {
            normalized.email = normalizeEmail(trimmedValue);
          }
          break;
        }
        case 'languages': {
          normalized.languages = normalized.languages.concat(splitList(trimmedValue));
          break;
        }
        case 'serviceAreas': {
          normalized.serviceAreas = normalized.serviceAreas.concat(splitList(trimmedValue));
          break;
        }
        case 'status': {
          normalized.statusOriginal = trimmedValue.length > 0 ? trimmedValue : null;
          normalized.status = trimmedValue.length > 0 ? normalizeStatus(trimmedValue) : null;
          break;
        }
        case 'certificateValidity': {
          normalized.certificateValidityOriginal =
            trimmedValue.length > 0 ? trimmedValue : null;
          normalized.certificateValidity =
            trimmedValue.length > 0 ? parseDateValue(trimmedValue) : null;
          break;
        }
        case 'municipality': {
          if (trimmedValue.length > 0) {
            const title = toTitleCase(trimmedValue);
            normalized.municipality = title.length > 0 ? title : trimmedValue;
          }
          break;
        }
        case 'uf': {
          if (trimmedValue.length > 0) {
            normalized.uf = trimmedValue.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3);
          }
          break;
        }
        case 'phone': {
          if (trimmedValue.length > 0) {
            normalized.phone = normalizePhone(trimmedValue);
          }
          break;
        }
        case 'website': {
          if (trimmedValue.length > 0) {
            normalized.website = normalizeWebsite(trimmedValue);
          }
          break;
        }
        case 'activity': {
          if (trimmedValue.length > 0) {
            const title = toTitleCase(trimmedValue);
            normalized.activity = title.length > 0 ? title : trimmedValue;
          }
          break;
        }
        case 'categories': {
          normalized.categories = normalized.categories.concat(splitList(trimmedValue));
          break;
        }
        case 'segments': {
          normalized.segments = normalized.segments.concat(splitList(trimmedValue));
          break;
        }
        case 'isDriver': {
          if (trimmedValue.length > 0) {
            normalized.isDriver = parseBooleanValue(trimmedValue);
          }
          break;
        }
        default:
          break;
      }
    }

    normalized.languages = uniqueList(normalized.languages);
    normalized.serviceAreas = uniqueList(normalized.serviceAreas);
    normalized.categories = uniqueList(normalized.categories);
    normalized.segments = uniqueList(normalized.segments);

    rows.push({
      rowNumber: index + 1,
      raw,
      normalized,
    });
  }

  return {
    rows,
    fieldMapping,
    delimiter,
  };
};

export const cadasturCsvService = {
  parse: parseCadasturCsv,
  evaluateStatus: evaluateCadasturStatus,
};
