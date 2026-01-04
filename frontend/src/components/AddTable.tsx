"use client";
import React, { useEffect, useRef, useState } from "react";
import { Separator } from "@/components/ui/separator";
import SimpleTabs from "./ui/simple-tabs";
import Input2 from "./custom/Input2";
import Button2 from "./custom/Button2";
import FormulaBox from "./FormulaBox";
import {
  useRecordNavigator,
  type RecordItem,
} from "@/hooks/useRecordNavigator";

interface AddTableProps {
  onAdd?: (data: {
    rows: RecordItem[];
    content: string;
    title?: string;
  }) => void;
  initialRows?: Array<{ name: string; value: string }>;
  initialContent?: string;
  initialTitle?: string;
  submitLabel?: string;
}

export function AddTable({
  onAdd,
  initialRows,
  initialContent = "",
  initialTitle = "",
  submitLabel = "Dodaj",
}: AddTableProps) {
  const {
    records,
    index,
    current,
    savedRecords,
    displayIndex,
    displayTotal,
    isCurrentComplete,
    isCurrentPartial,
    handleNew,
    handleDelete,
    handleChange,
    goPrev,
    goNext,
  } = useRecordNavigator({ initial: initialRows });
  const nameRef = useRef<HTMLInputElement | null>(null);
  const valueRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState<string>(initialTitle);

  useEffect(() => {
    if (nameRef.current) nameRef.current.focus();
  }, [index, records.length]);

  const [formulaValue, setFormulaValue] = useState<string>(initialContent);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function onSubmit() {
    if (savedRecords.length === 0 || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      onAdd?.({ rows: savedRecords, content: formulaValue, title: title });
    } catch {
      setError("Błąd przekazania danych");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-5">
      <SimpleTabs
        tabs={[
          {
            id: "Skrypt",
            label: "Skrypt",
            content: (
              <FormulaBox
                Title="Ciało skryptu"
                initialValue={formulaValue}
                onChangeText={setFormulaValue}
              />
            ),
          },
          {
            id: "Wykres",
            label: "Tabela",
            content: (
              <>
                <div className="flex flex-col col-span-2 gap-2 md:col-span-2 mb-4">
                  <label className="block  text-sm font-medium text-gray-900 dark:text-white">
                    Tytuł
                  </label>
                  <Input2
                    value={title}
                    placeholder="Tytuł..."
                    onChange={(e: { target: { value: string } }) =>
                      setTitle(e.target.value)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"></h3>
                  <span className="text-xs text-muted-foreground">
                    {displayIndex} / {displayTotal}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <label className="block  text-sm font-medium text-gray-900 dark:text-white">
                        Nazwa
                      </label>
                      <Input2
                        ref={nameRef}
                        value={current?.name || ""}
                        placeholder="Nazwa..."
                        onChange={(e: { target: { value: string } }) =>
                          handleChange("name", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="block  text-sm font-medium text-gray-900 dark:text-white">
                      Wartość
                    </label>
                    <Input2
                      ref={valueRef}
                      value={current?.value || ""}
                      placeholder="Wartość..."
                      onChange={(e: { target: { value: string } }) =>
                        handleChange("value", e.target.value)
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex flex-wrap items-center gap-2">
                    <Button2
                      type="button"
                      variant="outline"
                      onClick={() => goPrev(nameRef.current, valueRef.current)}
                      disabled={index === 0 || isCurrentPartial(current)}
                      title={
                        isCurrentPartial(current)
                          ? "Uzupełnij lub wyczyść pola przed nawigacją"
                          : undefined
                      }
                    >
                      {"<"}
                    </Button2>
                    <Button2
                      type="button"
                      variant="outline"
                      onClick={() => goNext(nameRef.current, valueRef.current)}
                      disabled={isCurrentPartial(current)}
                      title={
                        isCurrentPartial(current)
                          ? "Uzupełnij lub wyczyść pola przed nawigacją"
                          : index === records.length - 1
                          ? "Dodaj nowy (jeśli bieżący kompletny)"
                          : undefined
                      }
                    >
                      {">"}
                    </Button2>
                    <Button2
                      type="button"
                      onClick={() =>
                        handleNew(nameRef.current, valueRef.current)
                      }
                      disabled={!isCurrentComplete(current)}
                      aria-disabled={!isCurrentComplete(current)}
                      title={
                        !isCurrentComplete(current)
                          ? "Uzupełnij wszystkie pola aby dodać nowy"
                          : undefined
                      }
                    >
                      Nowy
                    </Button2>
                    <Button2
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                    >
                      Usuń
                    </Button2>
                  </div>
                </div>
              </>
            ),
          },
        ]}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button2
        type="button"
        variant="primary"
        disabled={savedRecords.length === 0 || submitting}
        onClick={onSubmit}
        title={
          savedRecords.length === 0 ? "Brak wierszy do dodania" : undefined
        }
      >
        {submitting && (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        {submitLabel}
      </Button2>
    </div>
  );
}
