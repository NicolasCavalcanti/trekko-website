import {
  Prisma,
  type GuideProfile,
  type User,
  GuideVerificationStatus,
  UserStatus,
} from '@prisma/client';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

import type { ActorContext, PaginationMeta, RequestContext, UserSummary } from '../users/user.service';
import { HttpError } from '../../middlewares/error';
import { prisma, type PrismaClientInstance } from '../../services/prisma';
import { audit } from '../audit/audit.service';
import {
  parseCadasturCsv,
  CadasturCsvError,
  type CadasturCsvRow,
  type CadasturFieldMapping,
  evaluateCadasturStatus,
} from '../../services/cadastur';
import { GUIDE_VERIFICATION_STATUS_VALUES } from './guide.schemas';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const GUIDE_SORT_FIELD_MAP = new Map<
  string,
  (direction: Prisma.SortOrder) => Prisma.GuideProfileOrderByWithRelationInput
>([
  ['createdat', (direction) => ({ createdAt: direction })],
  ['updatedat', (direction) => ({ updatedAt: direction })],
  ['displayname', (direction) => ({ displayName: direction })],
  ['verificationstatus', (direction) => ({ verificationStatus: direction })],
  ['verifiedat', (direction) => ({ verifiedAt: direction })],
  ['rejectedat', (direction) => ({ rejectedAt: direction })],
  ['cadasturnumber', (direction) => ({ cadasturNumber: direction })],
]);

const GUIDE_STATUS_SET = new Set(GUIDE_VERIFICATION_STATUS_VALUES);

export type GuideListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  verification?: string | string[];
  sort?: string;
};

export type GuideListItem = {
  id: string;
  displayName: string | null;
  bio: string | null;
  experienceYears: number | null;
  languages: string[];
  serviceAreas: string[];
  cadasturNumber: string | null;
  verificationStatus: GuideVerificationStatus;
  verificationNotes: string | null;
  verificationReviewedAt: string | null;
  verificationReviewedById: string | null;
  verifiedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: UserSummary;
};

export type GuideListResult = {
  guides: GuideListItem[];
  pagination: PaginationMeta;
};

type CadasturImportIssue = {
  linha: number;
  erros: string[];
  dados: Record<string, string>;
};

type CadasturImportSummary = {
  criar: number;
  atualizar: number;
  vincular: number;
};

export type CadasturImportPreview = {
  total: number;
  validos: number;
  invalidos: CadasturImportIssue[];
  mapeamentoCampos: CadasturFieldMapping;
  simulacao: CadasturImportSummary;
};

export type CadasturImportResult = CadasturImportPreview & {
  processados: number;
  criados: number;
  atualizados: number;
  vinculados: number;
};

type CadasturImportAction = 'CREATE' | 'UPDATE' | 'ATTACH';

type CadasturImportCandidate = {
  row: CadasturCsvRow;
  action: CadasturImportAction;
  existingGuide?: GuideProfile & { user: User };
  existingUser?: User & { guideProfile: GuideProfile | null };
};

type CadasturImportSimulation = {
  preview: CadasturImportPreview;
  candidates: CadasturImportCandidate[];
};

const buildPaginationMeta = (totalItems: number, page: number, pageSize: number): PaginationMeta => {
  const totalPages = pageSize === 0 ? 0 : Math.ceil(totalItems / pageSize);

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};

const normalizeSort = (input?: string): Prisma.GuideProfileOrderByWithRelationInput => {
  const defaultOrder: Prisma.GuideProfileOrderByWithRelationInput = { createdAt: 'desc' };

  if (!input || input.trim().length === 0) {
    return defaultOrder;
  }

  const [first] = input.split(',');
  const trimmed = first.trim();

  if (trimmed.length === 0) {
    return defaultOrder;
  }

  let direction: Prisma.SortOrder = 'asc';
  let fieldName = trimmed;

  if (fieldName.startsWith('-')) {
    direction = 'desc';
    fieldName = fieldName.slice(1);
  } else if (fieldName.startsWith('+')) {
    fieldName = fieldName.slice(1);
  }

  const normalizedKey = fieldName.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
  const builder = GUIDE_SORT_FIELD_MAP.get(normalizedKey);

  if (!builder) {
    throw new HttpError(400, 'INVALID_SORT', `Cannot sort by "${fieldName}"`);
  }

  return builder(direction);
};

const parseVerificationFilter = (
  value?: string | string[],
): GuideVerificationStatus[] | undefined => {
  if (!value) {
    return undefined;
  }

  const values = Array.isArray(value) ? value : value.split(',');
  const normalized = values
    .map((item) => (typeof item === 'string' ? item.trim().toUpperCase() : ''))
    .filter((item) => item.length > 0);

  if (normalized.length === 0) {
    return undefined;
  }

  const result: GuideVerificationStatus[] = [];

  for (const status of normalized) {
    if (!GUIDE_STATUS_SET.has(status as GuideVerificationStatus)) {
      throw new HttpError(400, 'INVALID_VERIFICATION_STATUS', `Invalid verification status "${status}"`);
    }

    if (!result.includes(status as GuideVerificationStatus)) {
      result.push(status as GuideVerificationStatus);
    }
  }

  return result;
};

const createImportIssue = (row: CadasturCsvRow, errors: string[]): CadasturImportIssue => ({
  linha: row.rowNumber,
  erros: Array.from(new Set(errors)),
  dados: row.raw,
});

const formatCertificateDate = (iso: string | null, fallback: string | null): string | null => {
  if (fallback && fallback.trim().length > 0) {
    return fallback;
  }

  if (!iso) {
    return null;
  }

  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return fallback ?? null;
  }
};

const buildLanguages = (row: CadasturCsvRow): string[] => {
  return row.normalized.languages.length > 0 ? row.normalized.languages : [];
};

const buildServiceAreas = (row: CadasturCsvRow): string[] => {
  const areas = [...row.normalized.serviceAreas];
  const { municipality, uf } = row.normalized;

  if (areas.length === 0) {
    if (municipality && uf) {
      areas.push(`${municipality}/${uf}`);
    } else if (municipality) {
      areas.push(municipality);
    } else if (uf) {
      areas.push(uf);
    }
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const area of areas) {
    const key = area.trim().toLowerCase();
    if (key.length === 0) {
      continue;
    }

    if (!seen.has(key)) {
      seen.add(key);
      result.push(area);
    }
  }

  return result;
};

const toUserSummary = (user: User): UserSummary => ({
  id: user.id,
  email: user.email,
  name: user.name ?? null,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
  deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
});

const toGuideListItem = (guide: GuideProfile & { user: User }): GuideListItem => ({
  id: guide.id,
  displayName: guide.displayName ?? null,
  bio: guide.bio ?? null,
  experienceYears: guide.experienceYears ?? null,
  languages: guide.languages ?? [],
  serviceAreas: guide.serviceAreas ?? [],
  cadasturNumber: guide.cadasturNumber ?? null,
  verificationStatus: guide.verificationStatus,
  verificationNotes: guide.verificationNotes ?? null,
  verificationReviewedAt: guide.verificationReviewedAt
    ? guide.verificationReviewedAt.toISOString()
    : null,
  verificationReviewedById: guide.verificationReviewedById ?? null,
  verifiedAt: guide.verifiedAt ? guide.verifiedAt.toISOString() : null,
  rejectedAt: guide.rejectedAt ? guide.rejectedAt.toISOString() : null,
  createdAt: guide.createdAt.toISOString(),
  updatedAt: guide.updatedAt.toISOString(),
  user: toUserSummary(guide.user),
});

export class AdminGuideService {
  constructor(private readonly prismaClient: PrismaClientInstance = prisma) {}

  async listGuides(params: GuideListParams): Promise<GuideListResult> {
    const page = Math.max(1, params.page ?? 1);
    const rawPageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const pageSize = Math.max(1, Math.min(rawPageSize, MAX_PAGE_SIZE));
    const skip = (page - 1) * pageSize;

    const where: Prisma.GuideProfileWhereInput = {
      deletedAt: null,
      user: { deletedAt: null },
    };

    const verificationStatuses = parseVerificationFilter(params.verification);
    if (verificationStatuses && verificationStatuses.length > 0) {
      where.verificationStatus = { in: verificationStatuses };
    }

    const search = params.search?.trim();
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } },
        { cadasturNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orderBy = normalizeSort(params.sort);

    const [totalItems, guides] = await Promise.all([
      this.prismaClient.guideProfile.count({ where }),
      this.prismaClient.guideProfile.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: { user: true },
      }),
    ]);

    return {
      guides: guides.map(toGuideListItem),
      pagination: buildPaginationMeta(totalItems, page, pageSize),
    };
  }

  private async simulateCadasturImport(file: Buffer): Promise<CadasturImportSimulation> {
    let parsed;
    try {
      parsed = parseCadasturCsv(file);
    } catch (error) {
      if (error instanceof CadasturCsvError) {
        throw new HttpError(400, 'INVALID_CADASTUR_CSV', error.message);
      }
      throw error;
    }

    const invalids: CadasturImportIssue[] = [];
    const validRows: CadasturCsvRow[] = [];
    const cadasturSeen = new Map<string, number>();
    const emailSeen = new Map<string, number>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const row of parsed.rows) {
      const errors: string[] = [];
      const normalized = row.normalized;

      const cadNumber = normalized.cadasturNumber;
      if (!cadNumber) {
        errors.push('Número Cadastur ausente ou inválido');
      } else if (cadasturSeen.has(cadNumber)) {
        const previousLine = cadasturSeen.get(cadNumber);
        errors.push(`Número Cadastur duplicado${previousLine ? ` (linha ${previousLine})` : ''}`);
      } else {
        cadasturSeen.set(cadNumber, row.rowNumber);
      }

      const email = normalized.email;
      if (!email) {
        errors.push('Email ausente ou inválido');
      } else if (emailSeen.has(email)) {
        const previousLine = emailSeen.get(email);
        errors.push(`Email duplicado no arquivo${previousLine ? ` (linha ${previousLine})` : ''}`);
      } else {
        emailSeen.set(email, row.rowNumber);
      }

      if (!normalized.name) {
        errors.push('Nome do guia obrigatório');
      }

      if (normalized.certificateValidityOriginal && !normalized.certificateValidity) {
        errors.push('Data de validade do certificado inválida');
      }

      if (normalized.certificateValidity) {
        const expiry = new Date(normalized.certificateValidity);
        if (!Number.isNaN(expiry.getTime())) {
          if (expiry.getTime() < today.getTime()) {
            const formattedDate = formatCertificateDate(
              normalized.certificateValidity,
              normalized.certificateValidityOriginal,
            );
            errors.push(
              `Certificado expirado${formattedDate ? ` em ${formattedDate}` : ''}`,
            );
          }
        }
      }

      const statusEvaluation = evaluateCadasturStatus(normalized.status);
      const statusLabel = normalized.statusOriginal ?? normalized.status ?? null;

      if (statusEvaluation === 'INACTIVE') {
        errors.push(
          `Status inativo no Cadastur${statusLabel ? ` (${statusLabel})` : ''}`,
        );
      } else if (statusEvaluation === 'UNKNOWN' && normalized.status) {
        errors.push(
          `Status não reconhecido${statusLabel ? ` (${statusLabel})` : ''}`,
        );
      }

      if (errors.length > 0) {
        invalids.push(createImportIssue(row, errors));
        continue;
      }

      validRows.push(row);
    }

    const summary: CadasturImportSummary = { criar: 0, atualizar: 0, vincular: 0 };
    const candidates: CadasturImportCandidate[] = [];

    if (validRows.length > 0) {
      const cadNumbers = Array.from(
        new Set(validRows.map((row) => row.normalized.cadasturNumber!)),
      );
      const emails = Array.from(new Set(validRows.map((row) => row.normalized.email!)));

      const [existingGuides, existingUsers] = await Promise.all([
        cadNumbers.length > 0
          ? this.prismaClient.guideProfile.findMany({
              where: { cadasturNumber: { in: cadNumbers } },
              include: { user: true },
            })
          : Promise.resolve([]),
        emails.length > 0
          ? this.prismaClient.user.findMany({
              where: { email: { in: emails } },
              include: { guideProfile: true },
            })
          : Promise.resolve([]),
      ]);

      const guideByCadastur = new Map<string, GuideProfile & { user: User }>();
      for (const guide of existingGuides) {
        if (guide.cadasturNumber) {
          guideByCadastur.set(guide.cadasturNumber, guide);
        }
      }

      const userByEmail = new Map<string, User & { guideProfile: GuideProfile | null }>();
      for (const user of existingUsers) {
        userByEmail.set(user.email.toLowerCase(), user);
      }

      for (const row of validRows) {
        const normalized = row.normalized;
        const cadNumber = normalized.cadasturNumber!;
        const email = normalized.email!;
        const errors: string[] = [];

        let existingGuide = guideByCadastur.get(cadNumber);
        const existingUser = userByEmail.get(email);

        if (!existingGuide && existingUser?.guideProfile) {
          const userGuide = existingUser.guideProfile;
          if (userGuide) {
            if (userGuide.cadasturNumber && userGuide.cadasturNumber !== cadNumber) {
              errors.push(`Usuário já vinculado ao Cadastur ${userGuide.cadasturNumber}`);
            } else {
              existingGuide = {
                ...userGuide,
                user: existingUser,
              } as GuideProfile & { user: User };
            }
          }
        }

        if (existingGuide) {
          const guideUserEmail = existingGuide.user.email.toLowerCase();
          if (guideUserEmail !== email && existingUser && existingUser.id !== existingGuide.userId) {
            errors.push('Email já associado a outro usuário');
          }
        } else if (
          existingUser &&
          existingUser.guideProfile &&
          existingUser.guideProfile.cadasturNumber &&
          existingUser.guideProfile.cadasturNumber !== cadNumber
        ) {
          errors.push(`Usuário já vinculado ao Cadastur ${existingUser.guideProfile.cadasturNumber}`);
        }

        if (errors.length > 0) {
          invalids.push(createImportIssue(row, errors));
          continue;
        }

        if (existingGuide) {
          candidates.push({ row, action: 'UPDATE', existingGuide });
          summary.atualizar += 1;
        } else if (existingUser) {
          candidates.push({ row, action: 'ATTACH', existingUser });
          summary.vincular += 1;
        } else {
          candidates.push({ row, action: 'CREATE' });
          summary.criar += 1;
        }
      }
    }

    return {
      preview: {
        total: parsed.rows.length,
        validos: candidates.length,
        invalidos,
        mapeamentoCampos: parsed.fieldMapping,
        simulacao: summary,
      },
      candidates,
    };
  }

  async previewCadasturImport(file: Buffer): Promise<CadasturImportPreview> {
    const simulation = await this.simulateCadasturImport(file);
    return simulation.preview;
  }

  async importCadasturFromCsv(
    actor: ActorContext,
    file: Buffer,
    fileName: string,
    context: RequestContext,
  ): Promise<CadasturImportResult> {
    const simulation = await this.simulateCadasturImport(file);
    const { preview, candidates } = simulation;

    let created = 0;
    let updated = 0;
    let attached = 0;

    if (candidates.length > 0) {
      const now = new Date();

      await this.prismaClient.$transaction(async (tx) => {
        for (const candidate of candidates) {
          const normalized = candidate.row.normalized;
          const languages = buildLanguages(candidate.row);
          const serviceAreas = buildServiceAreas(candidate.row);
          const displayName = normalized.name ?? candidate.row.raw['nome'] ?? null;
          const cadNumber = normalized.cadasturNumber!;
          const email = normalized.email!;
          const name = normalized.name ?? null;

          if (candidate.action === 'UPDATE') {
            const guide = candidate.existingGuide!;
            const user = guide.user;

            const userUpdate: Prisma.UserUpdateInput = {};
            if (name && name !== user.name) {
              userUpdate.name = name;
            }
            if (user.email.toLowerCase() !== email) {
              userUpdate.email = email;
            }
            if (user.role.toUpperCase() !== 'GUIA') {
              userUpdate.role = 'GUIA';
            }
            if (user.status !== UserStatus.ACTIVE) {
              userUpdate.status = UserStatus.ACTIVE;
              userUpdate.deletedAt = null;
            } else if (user.deletedAt) {
              userUpdate.deletedAt = null;
            }

            if (Object.keys(userUpdate).length > 0) {
              await tx.user.update({
                where: { id: user.id },
                data: userUpdate,
              });
            }

            await tx.guideProfile.update({
              where: { id: guide.id },
              data: {
                displayName: displayName ?? guide.displayName ?? null,
                cadasturNumber: cadNumber,
                languages,
                serviceAreas,
                verificationStatus: GuideVerificationStatus.VERIFIED,
                verificationReviewedAt: now,
                verificationReviewedById: actor.actorId ?? guide.verificationReviewedById ?? null,
                verifiedAt: now,
                rejectedAt: null,
                deletedAt: null,
              },
            });

            updated += 1;
          } else if (candidate.action === 'ATTACH') {
            const user = candidate.existingUser!;

            const userUpdate: Prisma.UserUpdateInput = {};
            if (name && name !== user.name) {
              userUpdate.name = name;
            }
            if (user.role.toUpperCase() !== 'GUIA') {
              userUpdate.role = 'GUIA';
            }
            if (user.status !== UserStatus.ACTIVE) {
              userUpdate.status = UserStatus.ACTIVE;
              userUpdate.deletedAt = null;
            } else if (user.deletedAt) {
              userUpdate.deletedAt = null;
            }

            if (Object.keys(userUpdate).length > 0) {
              await tx.user.update({
                where: { id: user.id },
                data: userUpdate,
              });
            }

            await tx.guideProfile.create({
              data: {
                userId: user.id,
                displayName: displayName ?? user.name ?? null,
                cadasturNumber: cadNumber,
                languages,
                serviceAreas,
                verificationStatus: GuideVerificationStatus.VERIFIED,
                verificationReviewedAt: now,
                verificationReviewedById: actor.actorId ?? null,
                verifiedAt: now,
                rejectedAt: null,
                deletedAt: null,
              },
            });

            attached += 1;
          } else {
            const passwordHash = await bcrypt.hash(randomUUID(), 10);

            await tx.user.create({
              data: {
                email,
                passwordHash,
                name,
                role: 'GUIA',
                status: UserStatus.ACTIVE,
                guideProfile: {
                  create: {
                    displayName: displayName ?? name ?? null,
                    cadasturNumber: cadNumber,
                    languages,
                    serviceAreas,
                    verificationStatus: GuideVerificationStatus.VERIFIED,
                    verificationReviewedAt: now,
                    verificationReviewedById: actor.actorId ?? null,
                    verifiedAt: now,
                    rejectedAt: null,
                    deletedAt: null,
                  },
                },
              },
            });

            created += 1;
          }
        }
      });
    }

    await audit({
      userId: actor.actorId,
      entity: 'cadastur',
      entityId: null,
      action: 'IMPORT',
      diff: {
        fileName,
        total: preview.total,
        validos: preview.validos,
        invalidos: preview.invalidos.length,
        criados: created,
        atualizados: updated,
        vinculados: attached,
      },
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return {
      total: preview.total,
      validos: preview.validos,
      invalidos: preview.invalidos,
      mapeamentoCampos: preview.mapeamentoCampos,
      simulacao: {
        criar: created,
        atualizar: updated,
        vincular: attached,
      },
      processados: candidates.length,
      criados: created,
      atualizados: updated,
      vinculados: attached,
    };
  }

  async verifyGuide(
    actor: ActorContext,
    guideId: string,
    status: GuideVerificationStatus,
    notes: string | undefined,
    context: RequestContext,
  ): Promise<GuideListItem> {
    const existingGuide = await this.prismaClient.guideProfile.findUnique({
      where: { id: guideId },
      include: { user: true },
    });

    if (!existingGuide || existingGuide.deletedAt || existingGuide.user.deletedAt) {
      throw new HttpError(404, 'GUIDE_NOT_FOUND', 'Guide profile not found');
    }

    const now = new Date();

    const data: Prisma.GuideProfileUpdateInput = {
      verificationStatus: status,
      verificationReviewedAt: now,
      verificationReviewedById: actor.actorId ?? existingGuide.verificationReviewedById ?? null,
      verificationNotes: notes ?? existingGuide.verificationNotes ?? null,
    };

    if (status === GuideVerificationStatus.VERIFIED) {
      data.verifiedAt = now;
      data.rejectedAt = null;
      data.deletedAt = null;
    }

    if (status === GuideVerificationStatus.REJECTED) {
      data.rejectedAt = now;
      data.verifiedAt = null;
    }

    const updatedGuide = await this.prismaClient.guideProfile.update({
      where: { id: guideId },
      data,
      include: { user: true },
    });

    await audit({
      userId: actor.actorId,
      entity: 'guideProfile',
      entityId: guideId,
      action: 'VERIFY',
      diff: {
        before: toGuideListItem(existingGuide),
        after: toGuideListItem(updatedGuide),
      },
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return toGuideListItem(updatedGuide);
  }
}

export const adminGuideService = new AdminGuideService();

