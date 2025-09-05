import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN","GUIDE","TREKKER"]).default("TREKKER"),
  cadastur: z.string().optional(),
});

export const userUpdateSchema = signupSchema.extend({
  password: z.string().min(8).optional(),
  bio: z.string().optional(),
  phone: z.string().optional(),
}).partial();

export const trailCreateSchema = z.object({
  name: z.string().min(2),
  state: z.string().min(2),
  city: z.string().min(2),
  regionOrPark: z.string().min(2),
  distanceKm: z.number().positive(),
  elevationGainM: z.number().int().nonnegative(),
  difficulty: z.enum(["EASY","MODERATE","HARD","EXTREME"]).default("MODERATE"),
  requiresGuide: z.boolean().default(false),
  entryFeeCents: z.number().int().nonnegative().nullable().optional(),
  waterPoints: z.number().int().nonnegative().optional(),
  campingSpots: z.number().int().nonnegative().optional(),
  description: z.string().optional(),
});

export const trailUpdateSchema = trailCreateSchema.partial();

export const expeditionCreateSchema = z.object({
  trailId: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  pricePerPersonCents: z.number().int().positive(),
  maxPeople: z.number().int().positive(),
  description: z.string().optional(),
  status: z.enum(["DRAFT","PUBLISHED","CANCELLED","FINISHED"]).default("DRAFT"),
}).refine(v => new Date(v.endDate) > new Date(v.startDate), { message: "endDate must be after startDate" });

export const expeditionUpdateSchema = expeditionCreateSchema
  .partial()
  .refine(
    (v) =>
      !v.startDate ||
      !v.endDate ||
      new Date(v.endDate) > new Date(v.startDate),
    { message: "endDate must be after startDate" }
  );

export const bookingCreateSchema = z.object({
  expeditionId: z.string(),
  headcount: z.number().int().positive().default(1),
  notes: z.string().optional()
});

export const bookingUpdateSchema = z.object({
  status: z.enum(["PENDING","CONFIRMED","CANCELLED","REFUNDED"]).optional(),
  notes: z.string().optional()
});

export const mediaCreateSchema = z.object({
  url: z.string().url(),
  type: z.enum(["image","video"]),
  caption: z.string().optional(),
  trailId: z.string().nullable().optional(),
  expeditionId: z.string().nullable().optional(),
});

export const reviewCreateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  trailId: z.string().nullable().optional(),
  expeditionId: z.string().nullable().optional(),
}).refine(v => v.trailId || v.expeditionId, { message: "trailId or expeditionId required" });

export const filterExpeditionsSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(15).default(15),
});
