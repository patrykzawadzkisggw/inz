"use client";
import React, { useState } from "react";
import FormulaBox from "./FormulaBox";
import Input2 from "./custom/Input2";

interface AddTextProps {
  onSubmitText?: (text: string, title: string) => Promise<void> | void;
  initialText?: string;
  initialTitle?: string;
  submitLabel?: string;
}

export function AddText({
  onSubmitText,
  initialText = "",
  initialTitle = "",
  submitLabel = "Wstaw",
}: AddTextProps) {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState<string>(initialTitle);

  return (
    <form
      className={` p-4 md:p-5`}
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed || submitting) return;
        setError(null);
        setSubmitting(true);
        Promise.resolve(onSubmitText?.(trimmed, title?.trim() || ""))
          .catch(() => setError("Błąd zapisu"))
          .finally(() => setSubmitting(false));
      }}
    >
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
      <FormulaBox
        Title="Treść"
        initialValue={text}
        onChangeText={(val) => setText(val)}
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="flex justify-end mt-4">
        <button
          type="submit"
          disabled={!text.trim() || submitting}
          className="disabled:opacity-50 disabled:cursor-not-allowed text-white inline-flex items-center bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        >
          {submitting && (
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          <svg
            className="me-1 -ms-1 w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
              clipRule="evenodd"
            ></path>
          </svg>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
