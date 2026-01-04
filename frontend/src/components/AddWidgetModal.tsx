"use client";
import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { AddText } from "./AddText";
import { AddSheet } from "./AddSheet";
import { AddTable } from "./AddTable";

type JobId = "wykres" | "tabela" | "tekst";
interface JobOption {
  id: JobId;
  title: string;
  description: string;
}

const JOBS: JobOption[] = [
  { id: "wykres", title: "Wykres", description: "" },
  { id: "tabela", title: "Tabela", description: "" },
  { id: "tekst", title: "Tekst", description: "" },
];

import React from "react";
type TekstComp = React.FC<{
  clearPadding?: boolean;
  onSubmitText?: (text: string, title: string) => void;
  initialText?: string;
  initialTitle?: string;
  submitLabel?: string;
}>;
type WykresComp = React.FC<{
  onAdd?: (data: unknown) => void;
  initialRecords?: Array<{ name: string; value: string }>;
  initialChartType?: string;
  initialContent?: string;
  initialTitle?: string;
  submitLabel?: string;
}>;
type TabelaComp = React.FC<{
  onAdd?: (data: unknown) => void;
  initialRows?: Array<{ name: string; value: string }>;
  initialContent?: string;
  initialTitle?: string;
  submitLabel?: string;
}>;
const jobComponents: {
  wykres: WykresComp;
  tabela: TabelaComp;
  tekst: TekstComp;
} = {
  wykres: AddSheet as WykresComp,
  tabela: AddTable as TabelaComp,
  tekst: AddText as TekstComp,
};

interface ApiWidgetResponse {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: "TEXT" | "CHART" | "TABLE";
  content: string | null;
  cacheJson?: unknown;
}
interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  addItem: (widget: ApiWidgetResponse) => void;
  mode?: "create" | "edit";
  existing?: {
    id: string;
    type: "TEXT" | "CHART" | "TABLE";
    title?: string | null;
    content?: string | null;
    configJson?: unknown;
  } | null;
  onUpdated?: (widget: ApiWidgetResponse & { title?: string | null }) => void;
}

export function AddWidgetModal({
  isOpen,
  onClose,
  addItem,
  mode = "create",
  existing = null,
  onUpdated,
}: AddWidgetModalProps) {
  const [selectedJob, setSelectedJob] = useState<JobId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const closeModal = () => {
    setSelectedJob(null);
    onClose();
  };

  useEffect(() => {
    if (mode === "edit" && existing) {
      const job: JobId =
        existing.type === "TEXT"
          ? "tekst"
          : existing.type === "CHART"
          ? "wykres"
          : "tabela";
      setSelectedJob(job);
    }
  }, [mode, existing]);

  if (!isOpen) return null;

  const SelectedComponent = selectedJob ? jobComponents[selectedJob] : null;
  const existingCfg = existing?.configJson as
    | Record<string, unknown>
    | undefined;
  type NamedVal = { name: string; value: string };
  const readNamedVals = (
    cfg: Record<string, unknown> | undefined,
    key: "records" | "rows"
  ): NamedVal[] | undefined => {
    const arrLike = cfg?.[key];
    if (!Array.isArray(arrLike)) return undefined;
    const out: NamedVal[] = [];
    for (const r of arrLike) {
      if (r && typeof r === "object") {
        const obj = r as Record<string, unknown>;
        if (typeof obj.name === "string" && typeof obj.value === "string")
          out.push({ name: obj.name, value: obj.value });
      }
    }
    return out.length ? out : undefined;
  };
  const existingRecords = readNamedVals(existingCfg, "records");
  const existingRows = readNamedVals(existingCfg, "rows");
  const existingChartType =
    existingCfg && typeof existingCfg["chartType"] === "string"
      ? (existingCfg["chartType"] as string)
      : undefined;

  const upsertWidget = async (kind: JobId, body: Record<string, unknown>) => {
    const isEdit = mode === "edit" && !!existing;
    const url = isEdit ? `/api/widgets/${existing!.id}` : "/api/widgets";
    const method = isEdit ? "PATCH" : "POST";
    const payload = isEdit ? body : { type: kind, ...body };
    const resp = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      setError(data?.error || (isEdit ? "Błąd zapisu" : "Błąd utworzenia"));
      return null;
    }
    const widget = data?.widget;
    if (widget) {
      if (isEdit) onUpdated?.(widget);
      else addItem(widget);
      closeModal();
    }
    return data;
  };

  const handleSubmitText = async (text: string, title: string) => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await upsertWidget("tekst", { content: text, title });
    } catch {
      setError("Błąd sieci");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddChart = async (raw: unknown) => {
    const d = raw as {
      records?: Array<{ name: string; value: string }>;
      chartType?: string;
      content: string;
      title?: string;
    };
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const { records = [], chartType, content, title } = d || {};
      const parts: string[] = [];
      records.forEach((r) => {
        parts.push(`${r.value}`, `"${r.name}"`);
      });
      const script = `${content}\nDisplayChart(CreateDF(${parts.join(
        ","
      )}), "${chartType}");`;
      await upsertWidget("wykres", {
        content,
        title,
        configJson: { records, chartType },
        transpileSource: script,
      });
    } catch {
      setError("Błąd sieci");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTable = async (raw: unknown) => {
    const d = raw as {
      rows: Array<{ name: string; value: string }>;
      content: string;
      title: string;
    };
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const { rows = [], content, title } = d || {};
      const parts: string[] = [];
      rows.forEach((r) => {
        parts.push(`${r.value}`, `"${r.name}"`);
      });
      const script = `${content}\nDisplayTable(CreateDF(${parts.join(",")}));`;
      await upsertWidget("tabela", {
        content,
        title,
        configJson: { rows },
        transpileSource: script,
      });
    } catch {
      setError("Błąd sieci");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal}>
      {SelectedComponent ? (
        selectedJob === "tekst" ? (
          <SelectedComponent
            clearPadding
            initialText={mode === "edit" ? existing?.content || "" : undefined}
            initialTitle={mode === "edit" ? existing?.title || "" : undefined}
            submitLabel={mode === "edit" ? "Zapisz" : "Wstaw"}
            onSubmitText={handleSubmitText}
          />
        ) : selectedJob === "wykres" ? (
          <SelectedComponent
            initialRecords={mode === "edit" ? existingRecords : undefined}
            initialChartType={mode === "edit" ? existingChartType : undefined}
            initialContent={
              mode === "edit" ? existing?.content || "" : undefined
            }
            initialTitle={mode === "edit" ? existing?.title || "" : undefined}
            submitLabel={mode === "edit" ? "Zapisz" : "Dodaj"}
            onAdd={handleAddChart}
          />
        ) : selectedJob === "tabela" ? (
          <SelectedComponent
            initialRows={mode === "edit" ? existingRows : undefined}
            initialContent={
              mode === "edit" ? existing?.content || "" : undefined
            }
            initialTitle={mode === "edit" ? existing?.title || "" : undefined}
            submitLabel={mode === "edit" ? "Zapisz" : "Dodaj"}
            onAdd={handleAddTable}
          />
        ) : null
      ) : (
        <div className="p-4 md:p-5">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Wybierz komponent:
          </p>
          <ul className="space-y-4 mb-4">
            {JOBS.map((job) => (
              <li key={job.id}>
                <input
                  type="radio"
                  id={job.id}
                  name="job"
                  value={job.id}
                  checked={selectedJob === job.id}
                  onChange={() => setSelectedJob(job.id)}
                  className="hidden peer"
                />
                <label
                  htmlFor={job.id}
                  className="inline-flex items-center justify-between w-full p-5 text-gray-900 bg-white border border-gray-200 rounded-lg cursor-pointer dark:hover:text-gray-300 dark:border-gray-500 dark:peer-checked:text-blue-500 peer-checked:border-blue-600 dark:peer-checked:border-blue-600 peer-checked:text-blue-600 hover:text-gray-900 hover:bg-gray-100 dark:text-white dark:bg-gray-600 dark:hover:bg-gray-500"
                >
                  <div className="block">
                    <div className="w-full text-lg font-semibold">
                      {job.title}
                    </div>
                    <div className="w-full text-gray-500 dark:text-gray-400">
                      {job.description}
                    </div>
                  </div>
                  <svg
                    className="w-4 h-4 ms-3 rtl:rotate-180 text-gray-500 dark:text-gray-400"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 14 10"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M1 5h12m0 0L9 1m4 4L9 9"
                    />
                  </svg>
                </label>
              </li>
            ))}
          </ul>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {submitting && (
            <p className="text-xs text-gray-500">Zapisywanie...</p>
          )}
        </div>
      )}
    </Modal>
  );
}
