import { ChartResultData } from "@/components/custom/Chart2";
import { z } from "zod";

const ChartDataSchema = z
  .object({
    series: z.any(),
  })
  .loose();

const ChartResultSchema = z
  .object({
    type: z.literal("chart"),
    chartType: z.string(),
    data: ChartDataSchema,
  })
  .loose();

const TextEntrySchema = z
  .object({
    type: z.literal("text"),
    text: z.string(),
  })
  .loose();

const TableEntrySchema = z
  .object({
    type: z.literal("table"),
    columns: z.array(z.string()),
    rows: z.array(z.record(z.string(), z.unknown())),
  })
  .loose();

export const isChartResult = (obj: unknown): obj is ChartResultData =>
  ChartResultSchema.safeParse(obj).success;

export const isTextEntry = (obj: unknown): obj is { type: string; text: string } =>
  TextEntrySchema.safeParse(obj).success;

export const isTableEntry = (
  obj: unknown
): obj is { type: string; columns: string[]; rows: Record<string, unknown>[] } =>
  TableEntrySchema.safeParse(obj).success;

export const extractChartFromCache = (cache: unknown): ChartResultData | null => {
  if (!Array.isArray(cache)) return null;
  for (const item of cache) {
    const parsed = ChartResultSchema.safeParse(item);
    if (parsed.success) return parsed.data as unknown as ChartResultData;
  }
  return null;
};

export const extractTextFromCache = (cache: unknown): string | null => {
  if (!Array.isArray(cache)) return null;
  const parts: string[] = [];
  for (const item of cache) {
    const parsed = TextEntrySchema.safeParse(item);
    if (parsed.success) parts.push(parsed.data.text);
  }
  return parts.length ? parts.join("\n") : null;
};

export const extractTableFromCache = (
  cache: unknown
): { columns: string[]; rows: Record<string, unknown>[] } | null => {
  if (!Array.isArray(cache)) return null;
  for (const item of cache) {
    const parsed = TableEntrySchema.safeParse(item);
    if (parsed.success) return { columns: parsed.data.columns, rows: parsed.data.rows };
  }
  return null;
};
  