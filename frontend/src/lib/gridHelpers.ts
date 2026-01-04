import { z } from 'zod'

export const CacheItemSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
}).loose()

export type cacheItem = z.infer<typeof CacheItemSchema>;
export type TableCache = z.infer<typeof TableCacheSchema>;
export type GridItem = z.infer<typeof GridItemSchema>;

export const TableCacheSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.record(z.string(), z.unknown())),
}).loose()

export const GridItemSchema = z.object({
  i: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  type: z.enum(["tekst","wykres","tabela"]),
  content: z.string().optional(),
  cacheJson: z.array(CacheItemSchema).optional(),
  tableCache: TableCacheSchema.optional(),
  title: z.string().optional(),
  configJson: z.unknown().optional(),
  reloadKey: z.number().optional(),
}).loose()

export function isTextCacheArray(val: unknown): val is cacheItem[] {
  const schema = z.array(CacheItemSchema)
  return schema.safeParse(val).success
}