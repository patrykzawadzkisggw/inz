"use client";
import { useEffect, useRef, useState } from "react";
import { useCallback } from "react";
import { Chart2, ChartResultData } from "./custom/Chart2";
import {
  getWidgetCacheAction,
  refreshWidgetAction,
} from "@/app/(authorized)/actions";

import { SimpleObjectTable } from "@/components/DataTable";
import {
  extractChartFromCache,
  extractTableFromCache,
  extractTextFromCache,
} from "@/lib/cardHelpers";
import { cacheItem } from "@/lib/gridHelpers";

interface CardProps {
  children?: React.ReactNode;
  onRequestDelete?: () => void;
  onRequestEdit?: () => void;
  type: "tekst" | "wykres" | "tabela";
  widgetId: string;
  cacheJason?: cacheItem[]; 
  title?: string;
  reloadKey?: number;
  hideMenu?: boolean;
}

const Card = ({
  children,
  onRequestDelete,
  onRequestEdit,
  type,
  widgetId,
  cacheJason,
  title,
  reloadKey,
  hideMenu,
}: CardProps) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState<number>(10);
  const [copied, setCopied] = useState(false);
  const [chartResult, setChartResult] = useState<ChartResultData | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [refreshedText, setRefreshedText] = useState<string | null>(null);
  const [tableResult, setTableResult] = useState<{
    columns: string[];
    rows: Record<string, unknown>[];
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshWidget = useCallback(
    async (showIndicators = true) => {
      try {
        if (showIndicators) {
          setRefreshing(true);
          if (type === "wykres") {
            setChartLoading(true);
            setChartError(null);
          } else if (type === "tekst") {
            setRefreshedText(null);
          }
        }
        await refreshWidgetAction(widgetId);
        const cache = await getWidgetCacheAction(widgetId);
        if (type === "wykres") {
          const chart = extractChartFromCache(cache);
          if (chart) setChartResult(chart);
        } else if (type === "tekst") {
          const text = extractTextFromCache(cache);
          if (text !== null) setRefreshedText(text);
        } else if (type === "tabela") {
          const table = extractTableFromCache(cache);
          if (table) setTableResult(table);
        }
      } catch {
        if (type === "wykres" && showIndicators)
          setChartError("Błąd odświeżania");
      } finally {
        if (type === "wykres" && showIndicators) setChartLoading(false);
        if (showIndicators) setRefreshing(false);
      }
    },
    [type, widgetId]
  );
  // Obsługa zdarzeń (bez asynchronicznych funkcji inline w JSX)
  const handleToggleMenu = () => setOpen((o) => !o);
  const handleEdit = () => {
    onRequestEdit?.();
    setOpen(false);
  };
  const handleRefresh = async () => {
    await refreshWidget(true);
    setOpen(false);
  };
  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(widgetId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed", err);
    }
    setOpen(false);
  };
  const handleDelete = () => {
    if (onRequestDelete) onRequestDelete();
    setOpen(false);
  };

  // menu opcji
  useEffect(() => {
    if (hideMenu) return
    const gridItem = cardRef.current?.closest(
      ".react-grid-item"
    ) as HTMLElement | null;
    if (open && gridItem) gridItem.style.zIndex = "1000";
    const handler = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      if (gridItem) gridItem.style.zIndex = "";
    };
  }, [open, hideMenu]);
  // pomocne przy ustaleniu wymiarów wykresu
  useEffect(() => {
    if (type !== "wykres") return;
    if (!cardRef.current || !chartWrapperRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      const cardEl = cardRef.current!;
      const wrapperEl = chartWrapperRef.current!;
      const total = cardEl.clientHeight;
      const wrapperTop = wrapperEl.offsetTop;
      const styles = getComputedStyle(wrapperEl);
      const paddingBottom = parseFloat(styles.paddingBottom || "0");
      const available = total - wrapperTop - paddingBottom;
      setChartHeight(available);
    });
    resizeObserver.observe(cardRef.current);
    return () => resizeObserver.disconnect();
  }, [type]);

  // Wczytuje dane z cache
  useEffect(() => {
    if (type !== "wykres") return;
    let active = true;
    setChartLoading(true);
    setChartError(null);
    getWidgetCacheAction(widgetId)
      .then((res) => {
        if (!active) return;
        const chart = extractChartFromCache(res);
        if (chart) setChartResult(chart);
      })
      .catch(() => {
        if (active) setChartError("Błąd pobierania danych");
      })
      .finally(() => {
        if (active) setChartLoading(false);
      });
    return () => {
      active = false;
    };
  }, [type, widgetId, reloadKey]);

  // odświeżenie danych po załadowaniu
  useEffect(() => {
    let cancelled = false;
    const delay = 200 + Math.floor(Math.random() * 600);
    const t = setTimeout(() => {
      if (cancelled) return;
      refreshWidget(false);
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [refreshWidget]);

  // Reset tekstu po zmianie cacheJason (np. po edycji)
  useEffect(() => {
    if (type === "tekst") setRefreshedText(null);
  }, [type, cacheJason, reloadKey]);

  return (
    <div
      ref={cardRef}
      className="w-full h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700"
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="flex-1 min-w-0">
          {title && (
            <h3
              className="text-lg font-medium text-gray-800 dark:text-gray-100 truncate"
              title={title}
            >
              {title}
            </h3>
          )}
        </div>
        {!hideMenu && (
          <div className="relative shrink-0">
            <button
              ref={buttonRef}
              id="dropdownButton"
              data-dropdown-toggle="dropdown"
              className="inline-block text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-4 focus:outline-none focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg text-sm p-1.5"
              type="button"
              onClick={handleToggleMenu}
            >
              <span className="sr-only">Open dropdown</span>
              <svg
                className="w-5 h-5"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 16 3"
              >
                <path d="M2 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6.041 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM14 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
              </svg>
            </button>
            {/* Menu rozwijane */}
            <div
              ref={menuRef}
              id="dropdown"
              className={`absolute right-0 mt-2 z-999 ${
                open ? "block" : "hidden"
              } text-base list-none bg-white divide-y divide-gray-100 rounded-lg shadow-sm w-44 dark:bg-gray-700`}
            >
              <ul className="py-2" aria-labelledby="dropdownButton">
                <li>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleEdit}
                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white"
                  >
                    Edytuj
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleRefresh}
                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white"
                  >
                    Odśwież
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleCopyId}
                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white"
                  >
                    {copied ? "Skopiowano!" : "Kopiuj ID"}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      // zapobiegamy zamknięciu przed akcją przez focus change
                      e.preventDefault();
                    }}
                    onClick={handleDelete}
                    className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white"
                  >
                    Usuń
                  </button>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
      <div
        ref={chartWrapperRef}
        className="relative flex flex-col px-4 pb-4 mt-2 w-full flex-1 min-h-0"
      >
        {refreshing && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 dark:bg-gray-900/50">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
          </div>
        )}
        {type === "tekst" && (
          <div className="w-full whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100">
            {refreshedText !== null
              ? refreshedText
              : cacheJason && cacheJason.length > 0
              ? cacheJason
                  .filter((c) => c.type === "text")
                  .map((c) => c.text)
                  .join("\n")
              : "Brak danych tekstowych"}
          </div>
        )}
        {type === "wykres" && (
          <div className="w-full flex-1 flex items-stretch">
            <Chart2
              height={chartHeight}
              result={chartResult ?? undefined}
              loading={chartLoading}
              error={chartError}
            />
          </div>
        )}
        {type === "tabela" && (
          <div className="w-full flex-1 min-h-0">
            {tableResult ? (
              <SimpleObjectTable
                data={tableResult.rows}
                columns={tableResult.columns}
              />
            ) : (
              children
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;
