"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Definicja kolumn
type IndexRecord = Record<string, unknown>;

export interface DataTableColumn<T extends IndexRecord> {
  key: string; 
  header: React.ReactNode; 
  accessor?: (row: T, rowIndex: number) => React.ReactNode; // niestandardowy renderer komórki
  width?: number | string;
  className?: string; 
  headerClassName?: string;
  truncate?: boolean; 
  align?: "left" | "center" | "right";
}

export interface DataTableProps<T extends IndexRecord> {
  columns?: DataTableColumn<T>[];
  data: T[];
  className?: string;
  dense?: boolean; // kompaktowa wysokość wierszy
  striped?: boolean; // naprzemienne paskowanie wierszy
  hoverable?: boolean; // podświetlanie wiersza po najechaniu
  border?: boolean; // wyświetl obramowanie
  stickyHeader?: boolean; // nagłówek przyklejony przy przewijaniu
  maxRows?: number; // ogranicz widoczną liczbę wierszy (lekka „wirtualizacja”)
  emptyMessage?: React.ReactNode; // wiadomość dla pustych danych
  onRowClick?: (row: T, index: number) => void; // obsługa kliknięcia wiersza
  rowKey?: (row: T, index: number) => string | number; // funkcja zwracająca klucz wiersza
  // Jeśli kontener (Card) ma ograniczoną wysokość, komponent może się rozciągać (domyślnie true)
  fillParent?: boolean;
  // Gdy nie podano columns -> spróbuj wywnioskować z danych
  inferColumns?: boolean;
  // Limit liczby automatycznie wygenerowanych kolumn (ochrona przed zbyt szerokim zestawem)
  maxAutoColumns?: number;
  // Kolejność sortowania automatycznych kolumn (np. (k)=>k.sort())
  orderAutoColumns?: (keys: string[]) => string[];
}

function buildColStyles<T extends IndexRecord>(cols: DataTableColumn<T>[]) {
  const anyWidth = cols.some((c) => c.width !== undefined);
  if (!anyWidth) return null;
  return (
    <colgroup>
      {cols.map((c) => (
        <col
          key={c.key}
          style={
            c.width
              ? {
                  width: typeof c.width === "number" ? c.width + "px" : c.width,
                }
              : undefined
          }
        />
      ))}
    </colgroup>
  );
}

export function DataTable<T extends IndexRecord>({
  columns,
  data,
  className,
  dense = true,
  striped = true,
  hoverable = true,
  border = true,
  stickyHeader = true,
  maxRows,
  emptyMessage = <span className="text-muted-foreground">Brak danych</span>,
  onRowClick,
  rowKey,
  fillParent = true,
  inferColumns = true,
  maxAutoColumns = 40,
  orderAutoColumns,
}: DataTableProps<T>) {
  const bodyRef = React.useRef<HTMLTableSectionElement | null>(null);

  const displayedData = React.useMemo(
    () => (maxRows ? data.slice(0, maxRows) : data),
    [data, maxRows]
  );

  const effectiveColumns: DataTableColumn<T>[] = React.useMemo(() => {
    if (columns && columns.length > 0) return columns;
    if (!inferColumns) return [];
    const keySet = new Set<string>();
    for (let i = 0; i < data.length && keySet.size < maxAutoColumns; i++) {
      const row = data[i];
      if (row && typeof row === "object" && !Array.isArray(row)) {
        for (const k of Object.keys(row)) {
          keySet.add(k);
          if (keySet.size >= maxAutoColumns) break;
        }
      }
    }
    let keys = Array.from(keySet);
    if (orderAutoColumns) {
      try {
        keys = orderAutoColumns([...keys]);
      } catch {}
    }
    return keys.map((k) => ({
      key: k,
      header: k,
      truncate: true,
    })) as DataTableColumn<T>[];
  }, [columns, inferColumns, data, maxAutoColumns, orderAutoColumns]);

  const rowPad = dense ? "py-1.5" : "py-2.5";
  const cellPad = dense ? "px-2" : "px-3";

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "relative flex flex-col w-full min-w-0",
          fillParent && "h-full min-h-0",
          border && "border border-border/60 rounded-md",
          className
        )}
      >
        <div className={cn("flex-1 min-h-0 overflow-auto")}>
       
          <table
            className={cn(
              "w-full text-xs table-fixed border-collapse",
            
              "[&_th]:font-medium"
            )}
          >
            {buildColStyles(effectiveColumns)}
            <thead
              className={cn(
                "text-muted-foreground select-none",
                stickyHeader && "sticky top-0 z-10",
                "bg-muted/30 backdrop-blur supports-[backdrop-filter]:bg-muted/50",
                border && "[&_th]:border-b [&_th]:border-border/60"
              )}
            >
              <tr>
                {effectiveColumns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "text-left font-medium whitespace-nowrap",
                      cellPad,
                      rowPad,
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right",
                      col.headerClassName
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody ref={bodyRef} className="align-top">
              {displayedData.length === 0 && (
                <tr>
                  <td
                    colSpan={effectiveColumns.length}
                    className={cn(
                      "text-center text-muted-foreground",
                      rowPad,
                      cellPad
                    )}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
              {displayedData.map((row, rIdx) => {
                const deriveId = (r: T): string | number | undefined => {
                  const candidate = (r as unknown as { id?: unknown }).id;
                  if (
                    typeof candidate === "string" ||
                    typeof candidate === "number"
                  )
                    return candidate;
                  return undefined;
                };
                const key: string | number = rowKey
                  ? rowKey(row, rIdx)
                  : deriveId(row) ?? rIdx;
                return (
                  <tr
                    key={key}
                    className={cn(
                      "transition-colors",
                      striped && rIdx % 2 === 1 && "bg-muted/20",
                      hoverable && "hover:bg-muted/40 cursor-pointer",
                      onRowClick && "cursor-pointer"
                    )}
                    onClick={() => onRowClick?.(row, rIdx)}
                  >
                    {effectiveColumns.map((col) => {
                      const rawVal = col.accessor
                        ? col.accessor(row, rIdx)
                        : (row as T)[col.key as keyof T];
                      const isString = typeof rawVal === "string";
                      const content: React.ReactNode =
                        rawVal === null ||
                        rawVal === undefined ||
                        (typeof rawVal === "string" && rawVal === "") ? (
                          <span className="text-muted-foreground/70">—</span>
                        ) : (
                          (rawVal as unknown as React.ReactNode)
                        );
                      const cell = (
                        <td
                          key={col.key}
                          className={cn(
                            "align-top border-b border-border/40",
                            cellPad,
                            rowPad,
                            col.truncate && "max-w-[12rem] truncate",
                            col.align === "center" && "text-center",
                            col.align === "right" && "text-right",
                            col.className
                          )}
                          title={
                            col.truncate && isString
                              ? (rawVal as string)
                              : undefined
                          }
                        >
                          {content}
                        </td>
                      );
                      if (
                        col.truncate &&
                        isString &&
                        (rawVal as string).length > 30
                      ) {
                        return (
                          <Tooltip key={col.key}>
                            <TooltipTrigger asChild>{cell}</TooltipTrigger>
                            <TooltipContent className="max-w-sm break-words">
                              {rawVal as string}
                            </TooltipContent>
                          </Tooltip>
                        );
                      }
                      return cell;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {maxRows && data.length > maxRows && (
          <div className="border-t border-border/60 text-[10px] px-2 py-1 text-muted-foreground bg-background/80">
            Pokażono pierwsze {maxRows} z {data.length}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}


export function SimpleObjectTable({
  data,
  columns,
  height,
}: {
  data: IndexRecord[];
  columns: string[];
  height?: number | string;
}) {
  return (
    <div style={height ? { height } : undefined} className="w-full h-full">
      <DataTable
        columns={columns.map((c) => ({ key: c, header: c, truncate: true }))}
        data={data}
        striped
        hoverable
        dense
      />
    </div>
  );
}

export default DataTable;
