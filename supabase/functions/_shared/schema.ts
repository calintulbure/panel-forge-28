// schema.ts
import { z } from "https://esm.sh/zod@3.23.8";

/* ───────────── Common ───────────── */

export const SiteEnum = z.enum(["ro", "hu"]);
export type Site = z.infer<typeof SiteEnum>;

export const UrlString = z
  .string()
  .url()
  .min(8)
  .max(2_000);

/* ───────────── /trigger-snapshot ───────────── */

export const TriggerSnapshotRequest = z.object({
  productCode: z.string().min(1).max(128),
  siteUrl: UrlString,
  // Optional: if omitted we infer from siteUrl (yli.ro / yli.hu)
  site: SiteEnum.optional(),
  productDescription: z.string().nullable().optional(),
  productId: z.number().int().nullable().optional()
});
export type TriggerSnapshotRequest = z.infer<typeof TriggerSnapshotRequest>;

export const TriggerSnapshotResponse = z.object({
  success: z.boolean(),
  site: SiteEnum,
  // For visibility; not persisted in response if you don’t want to
  imageBase64: z.string().min(100).optional(),
  mimeType: z.string().startsWith("image/").optional(),
  // DB fields that were changed
  updatedFields: z.record(z.union([z.literal(true), z.string()])).optional(),
  message: z.string().optional(),
  error: z.string().optional()
});
export type TriggerSnapshotResponse = z.infer<typeof TriggerSnapshotResponse>;

/* ───────────── /bulk-upsert-products ───────────── */

export const ProductUpsertItem = z.object({
  categ1: z.string().nullable().optional(),
  categ2: z.string().nullable().optional(),
  categ3: z.string().nullable().optional(),
  // never updated on conflict, only used on insert
  articol_id: z.number().int().nullable().optional(),
  erp_product_code: z.string().min(1).max(128),
  producator: z.string().nullable().optional(),
  erp_product_description: z.string().nullable().optional(),
  stare_oferta: z.string().nullable().optional(),
  stare_stoc: z.string().nullable().optional(),
  stare_oferta_secundara: z.string().nullable().optional(),
  senior_erp_link: z.string().nullable().optional(),
  site_ro_product_id: z.number().int().nullable().optional(),
  site_hu_product_id: z.number().int().nullable().optional(),
  ro_stock: z.number().int().nullable().optional(),
  ro_stoc_detailed: z.string().nullable().optional(),
  hu_stock: z.number().int().nullable().optional(),
  hu_stock_detailed: z.string().nullable().optional()
});
export type ProductUpsertItem = z.infer<typeof ProductUpsertItem>;

export const BulkUpsertRequest = z.object({
  payload: z.array(ProductUpsertItem).min(1)
});
export type BulkUpsertRequest = z.infer<typeof BulkUpsertRequest>;

export const BulkUpsertResponse = z.object({
  success: z.boolean(),
  affected: z.number().int().nonnegative(),
  message: z.string().optional(),
  error: z.string().optional()
});
export type BulkUpsertResponse = z.infer<typeof BulkUpsertResponse>;

export const productSchema = z.object({
  categ1: z.string().optional(),
  categ2: z.string().optional(),
  categ3: z.string().optional(),
  articol_id: z.string(),
  erp_product_code: z.string(),
  erp_product_description: z.string(),
  stare_oferta: z.string().optional(),
  stare_stoc: z.string().optional(),
  senior_erp_link: z.string().url().optional(),
});

export type Product = z.infer<typeof productSchema>;