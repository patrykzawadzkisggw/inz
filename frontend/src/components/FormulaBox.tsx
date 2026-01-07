"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import catalog from "@/components/functions_catalog.json";
import { useUserFunctions } from "@/context/UserFunctionsContext";
import type { UserFunction } from "@/context/UserFunctionsContext";
import { useModels } from "@/context/ModelsContext";

export type FormulaBoxProps = {
  Title: string;
  initialValue?: string;
  onChangeText?: (value: string) => void;
  showCatalog?: boolean;
  name?: string;
};

type CatalogCategory = {
  category: string;
  items: { name: string; example: string; description: string }[];
};

const buildUserFunctionExample = (fn: UserFunction): string => {
  const src = (fn.body || fn.body2 || "").trim();
  const match = src.match(/function\s+[A-Za-z_]\w*\s*\(([^)]*)\)/i);
  const paramsRaw = match?.[1]?.trim() || "";
  if (!paramsRaw) return `${fn.name}()`;

  const params = paramsRaw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const [name] = p.split("=");
      const cleaned = (name || "").trim().replace(/[^A-Za-z0-9_]/g, "");
      return cleaned ? `<${cleaned}>` : "";
    })
    .filter(Boolean)
    .join(", ");

  return `${fn.name}(${params || ""})`;
};

const FormulaBox = ({
  Title,
  initialValue = "",
  onChangeText,
  showCatalog = true,
  name,
}: FormulaBoxProps) => {
  const staticCats = catalog as CatalogCategory[];
  const [userCat, setUserCat] = useState<CatalogCategory | null>({
    category: "Moje funkcje",
    items: [],
  });
  const [modelsCat, setModelsCat] = useState<CatalogCategory | null>({
    category: "Dane",
    items: [],
  });
  const [predictionsCat, setPredictionsCat] = useState<CatalogCategory | null>(
    {
      category: "Predykcje",
      items: [],
    }
  );
  const cats: CatalogCategory[] = React.useMemo(() => {
    const dyn: CatalogCategory[] = [];
    if (modelsCat) dyn.push(modelsCat);
    if (predictionsCat) dyn.push(predictionsCat);
    if (userCat) dyn.push(userCat);
    return [...dyn, ...staticCats];
  }, [userCat, modelsCat, predictionsCat, staticCats]);
  const [text, setText] = useState(initialValue);
  const [category, setCategory] = useState(cats[0]?.category || "");
  useEffect(() => {
    setText(initialValue);
    setCaret(initialValue.length);
  }, [initialValue]);
  const items = cats.find((c) => c.category === category)?.items || [];
  const [selectedItem, setSelectedItem] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [caret, setCaret] = useState<number>(initialValue.length);

  const focusTextarea = useCallback((pos?: number) => {
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      if (typeof pos === "number") {
        el.selectionStart = el.selectionEnd = Math.min(pos, el.value.length);
      }
    });
  }, []);

  useEffect(() => {
    if (onChangeText) onChangeText(text);
  }, [text, onChangeText]);

  const handleInsert = (example: string) => {
    setText((prev) => {
      const before = prev.slice(0, caret);
      const after = prev.slice(caret);
      const snippet = example;
      const newText = before + snippet + after;
      const newCaret = before.length + snippet.length;
      focusTextarea(newCaret);
      setCaret(newCaret);
      return newText;
    });
  };

  useEffect(() => {
    setSelectedItem("");
  }, [category]);


  const { functions } = useUserFunctions();

  useEffect(() => {
    if (!showCatalog) return;
    const items = functions.map((f) => ({
      name: f.name,
      example: buildUserFunctionExample(f),
      description: String(f.description || ""),
    }));
    setUserCat({ category: "Moje funkcje", items });
    setCategory((prev) => prev || "Moje funkcje");
  }, [functions, showCatalog]);

  const { models } = useModels();

  useEffect(() => {
    if (!showCatalog) return;
    const items = models.map((m) => {
      const columns = Array.isArray(m.imports![0]?.processedSchemaJson)
        ? m.imports![0]?.processedSchemaJson
            .filter((c) => !c?.removed)
            .map((c) => String(c?.name || c?.key))
            .filter(Boolean)
        : [];
      const colsExpr = columns.length ? columns.join(", ") : "";
      const modelNameEsc = m.name.replace(/"/g, '\\"');
      return {
        name: m.name,
        description: m.description || "",
        example: `select ${colsExpr} from ModelData("${modelNameEsc}")`,
      };
    });
    setModelsCat({ category: "Dane", items });

    const predItems = models.map((m) => {
      const modelNameEsc = m.name.replace(/"/g, '\\"');
      return {
        name: m.name,
        description: m.description || "",
        example: `select date, low, median, high from ModelPredictions("${modelNameEsc}")`,
      };
    });
    setPredictionsCat({ category: "Predykcje", items: predItems });
  }, [models, showCatalog]);


  return (
    <div className="grid gap-4 mb-4 grid-cols-2">
      <div className="col-span-2">
        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
          {Title}
        </label>
        <textarea
          ref={textareaRef}
          name={name}
          rows={6}
          className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="Napisz formułę tutaj"
          value={text}
          spellCheck={false}
          onChange={(e) => {
            setText(e.target.value);
            setCaret(e.target.selectionStart);
          }}
          onClick={(e) =>
            setCaret((e.target as HTMLTextAreaElement).selectionStart)
          }
          onKeyUp={(e) =>
            setCaret((e.target as HTMLTextAreaElement).selectionStart)
          }
          onSelect={(e) =>
            setCaret((e.target as HTMLTextAreaElement).selectionStart)
          }
        />
      </div>
      {showCatalog && (
        <>
          <div className="col-span-1 flex flex-col gap-2">
            <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
              Kategorie
            </label>
            <select
              size={8}
              className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full p-2.5"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                focusTextarea(caret);
              }}
            >
              {cats.map((c) => (
                <option key={c.category} value={c.category}>
                  {c.category}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-1 flex flex-col gap-2">
            <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
              Funkcje
            </label>
            <select
              size={8}
              className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full p-2.5"
              value={selectedItem}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedItem(val);
                focusTextarea(caret);
              }}
              onDoubleClick={(e) => {
                const val = (e.target as HTMLSelectElement).value;
                const ex = items.find((i) => i.name === val)?.example;
                if (ex) handleInsert(ex);
              }}
            >
              {items.map((it) => (
                <option key={it.name} value={it.name}>
                  {it.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 text-xs text-gray-500 dark:text-gray-400 min-h-4">
            {selectedItem &&
              items.find((i) => i.name === selectedItem)?.description}
          </div>
        </>
      )}
    </div>
  );
};

export default FormulaBox;
