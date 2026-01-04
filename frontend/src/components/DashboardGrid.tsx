"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import GridLayout from "react-grid-layout";
import Card from "@/components/Card";
import { SimpleObjectTable } from "@/components/DataTable";
import DeleteModal from "@/components/notify/DeleteModal";
import { AddWidgetModal } from "@/components/AddWidgetModal";
import { useDashboard } from "@/context/DashboardContext";
import {
  bulkUpdateWidgetPositionsAction,
  deleteWidgetAction,
} from "@/app/(authorized)/actions";
import { cacheItem, GridItem, isTextCacheArray, TableCache } from "@/lib/gridHelpers";





export default function DashboardGrid({
  initialItems,
  readOnly = false,
}: {
  initialItems: GridItem[];
  readOnly?: boolean;
}) {
  const { isEditMode, isModalOpen, closeModal } = useDashboard();
  const [items, setItems] = useState<GridItem[]>(initialItems);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<GridItem | null>(null);
  const isDeleteOpen = deleteId !== null;
  const lastSavedLayout = useRef<string>(
    JSON.stringify(initialItems.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })))
  );
  const [, startTransition] = useTransition();

  // Accept a widget object coming directly from API (shape aligned with /api/widgets POST response)
  interface ApiWidget {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    type: "TEXT" | "CHART" | "TABLE";
    content: string | null;
    cacheJson?: unknown;
    title?: string;
  }
  const addItem = (apiWidget: ApiWidget) => {
    const gridType: GridItem["type"] =
      apiWidget.type === "TEXT"
        ? "tekst"
        : apiWidget.type === "CHART"
        ? "wykres"
        : "tabela";
    const cache = apiWidget.cacheJson;
    let tableCache: TableCache | undefined;
    if (Array.isArray(cache)) {
      const tableObj = cache.find(
        (
          o: unknown
        ): o is { type: string; columns: unknown; rows: unknown } => {
          if (!o || typeof o !== "object") return false;
          const obj = o as Record<string, unknown>;
          return (
            obj.type === "table" &&
            Array.isArray(obj.columns) &&
            Array.isArray(obj.rows)
          );
        }
      );
      if (tableObj) {
        tableCache = {
          columns: tableObj.columns as string[],
          rows: tableObj.rows as Record<string, unknown>[],
        };
      }
    }
    const newItem: GridItem = {
      i: apiWidget.id,
      x: apiWidget.x,
      y: Infinity,
      w: apiWidget.w,
      h: apiWidget.h,
      title: apiWidget.title ?? undefined,
      type: gridType,
      content: apiWidget.content ?? undefined,
      ...(isTextCacheArray(cache)
        ? {
            cacheJson: cache.map((c) => ({ type: c.type, text: c.text ?? "" })),
          }
        : {}),
      ...(tableCache ? { tableCache } : {}),
    };
    setItems((prev) => [...prev, newItem]);
    closeModal();
  };

  const requestDelete = (id: string) => setDeleteId(id);

  const confirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    // optimistic remove
    setItems((prev) => prev.filter((it) => it.i !== id));
    await deleteWidgetAction(id);
    setDeleteId(null);
  };

  const closeDelete = () => setDeleteId(null);

  // Persist layout when turning off edit mode
  useEffect(() => {
    if (!isEditMode) {
      const layout = JSON.stringify(
        items.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }))
      );
      if (layout !== lastSavedLayout.current) {
        const payload = items.map(({ i, x, y, w, h }) => ({
          id: i,
          x,
          y,
          w,
          h,
        }));
        startTransition(() => {
          bulkUpdateWidgetPositionsAction(payload).catch(() => {});
          lastSavedLayout.current = layout;
        });
      }
    }
  }, [isEditMode, items]);

  return (
    <>
      <GridLayout
        className={`layout ${isEditMode ? "edit-mode" : ""}`}
        layout={items.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }))}
        cols={12}
        rowHeight={80}
        width={1200}
        onLayoutChange={(newLayout) => {
          setItems((prev) =>
            prev.map((item) => {
              const l = newLayout.find((n) => n.i === item.i);
              return l ? { ...item, x: l.x, y: l.y, w: l.w, h: l.h } : item;
            })
          );
        }}
        isResizable={isEditMode}
        isDraggable={isEditMode}
      >
        {items.map((item) => {
          let body: React.ReactNode = null;
          if (item.type === "tekst") {
            if (item.cacheJson && item.cacheJson.length > 0) {
              body = item.cacheJson
                .filter((c) => c.type === "text")
                .map((c) => c.text)
                .join("\n");
            } else {
              body = item.content;
            }
          } else if (item.type === "tabela") {
            if (
              item.tableCache &&
              item.tableCache.columns &&
              item.tableCache.rows
            ) {
              body = (
                <SimpleObjectTable
                  data={item.tableCache.rows}
                  columns={item.tableCache.columns}
                />
              );
            } else {
              body = (
                <span className="text-xs text-gray-500">
                  Brak danych tabeli
                </span>
              );
            }
          }
          return (
            <div key={item.i} className="p-2">
              <Card
                title={item.title}
                widgetId={item.i}
                type={item.type}
                cacheJason={item.cacheJson}
                reloadKey={item.reloadKey}
                onRequestDelete={() => requestDelete(item.i)}
                onRequestEdit={() => setEditing(item)}
                hideMenu={readOnly}
              >
                {body}
              </Card>
            </div>
          );
        })}
      </GridLayout>
      <AddWidgetModal
        isOpen={isModalOpen}
        onClose={closeModal}
        addItem={addItem}
      />
      <AddWidgetModal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        addItem={() => {}}
        mode="edit"
        existing={
          editing
            ? {
                id: editing.i,
                type:
                  editing.type === "tekst"
                    ? "TEXT"
                    : editing.type === "wykres"
                    ? "CHART"
                    : "TABLE",
                title: editing.title || null,
                content: editing.content || null,
                configJson: editing.configJson || undefined,
              }
            : null
        }
        onUpdated={(widget) => {
          interface AnyWidget {
            id: string;
            cacheJson?: unknown;
            configJson?: unknown;
            title?: string | null;
            content?: string | null;
          }
          const w = widget as AnyWidget;
          const cacheVal = w.cacheJson;
          type RawText = { type: string; text?: string };
          type RawTable = { type: string; columns?: unknown; rows?: unknown };
          const isTextEntry = (o: unknown): o is cacheItem => {
            if (!o || typeof o !== "object") return false;
            const r = o as RawText;
            return r.type === "text" && typeof r.text === "string";
          };
          const isTableEntry = (
            o: unknown
          ): o is {
            type: string;
            columns: string[];
            rows: Record<string, unknown>[];
          } => {
            if (!o || typeof o !== "object") return false;
            const r = o as RawTable;
            return (
              r.type === "table" &&
              Array.isArray(r.columns) &&
              Array.isArray(r.rows)
            );
          };
          setItems((prev) =>
            prev.map((it) => {
              if (it.i !== w.id) return it;
              const next: GridItem = {
                ...it,
                title: w.title || it.title,
                content: w.content || it.content,
                configJson: w.configJson ?? it.configJson,
                reloadKey: Date.now(),
              };
              if (Array.isArray(cacheVal)) {
                const textItems = cacheVal.filter(isTextEntry);
                if (textItems.length)
                  next.cacheJson = textItems.map((t) => ({
                    type: t.type,
                    text: t.text,
                  }));
                if (it.type === "tabela") {
                  const tableObj = cacheVal.find(isTableEntry);
                  if (tableObj)
                    next.tableCache = {
                      columns: tableObj.columns,
                      rows: tableObj.rows,
                    };
                }
              }
              return next;
            })
          );
          setEditing(null);
        }}
      />
      <DeleteModal
        isOpen={isDeleteOpen}
        onClose={closeDelete}
        onConfirm={confirmDelete}
        itemName={deleteId ? `Kafelek ${deleteId}` : undefined}
      />
    </>
  );
}
