"use client";
import React, { useOptimistic, useTransition } from "react";
import DeleteModal from "./DeleteModal";
import Link from "next/link";

interface ReportItem {
  id: string;
  name: string;
  status: string;
  repeat: string;
}

interface FunctionItem {
  id: string;
  name: string;
  description?: string | null;
}

type TableVariant = "reports" | "functions";

type TableItem = ReportItem | FunctionItem;

const Header: React.FC = () => (
  <div className="flex items-center gap-x-3"></div>
);

interface TableHeaderProps {
  variant: TableVariant;
}
const TableHeader: React.FC<TableHeaderProps> = ({ variant }) => (
  <thead className="bg-gray-50 dark:bg-gray-800">
    <tr>
      <th
        scope="col"
        className="py-3.5 px-4 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400 w-full"
      >
        <div className="flex items-center gap-x-3">
          <span>Nazwa</span>
        </div>
      </th>
      {variant === "reports" && (
        <>
          <th
            scope="col"
            className="px-12 py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400"
          >
            <button className="flex items-center gap-x-2">
              <span>Status</span>
            </button>
          </th>
          <th
            scope="col"
            className="px-4 py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400"
          >
            <button className="flex items-center gap-x-2">
              <span>Powtarzanie</span>
            </button>
          </th>
        </>
      )}
      <th scope="col" className="relative py-3.5 px-4 text-right">
        <span className="sr-only">Akcje</span>
      </th>
    </tr>
  </thead>
);

interface TableRowProps {
  item: TableItem;
  variant: TableVariant;
  basePath: string;
  onDeleteClick: (id: string) => void;
}

const TableRow: React.FC<TableRowProps> = ({
  item,
  variant,
  basePath,
  onDeleteClick,
}) => {
  const isReport = variant === "reports";
  const isFunction = variant === "functions";
  const report = isReport ? (item as ReportItem) : undefined;
  const fn = isFunction ? (item as FunctionItem) : undefined;
  return (
    <tr>
      <td className="px-4 py-4 text-sm font-medium text-gray-700 whitespace-nowrap w-full">
        {isFunction ? (
          <div className="flex flex-col">
            <span>{fn?.name}</span>
            {fn?.description ? (
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-[40ch]">
                {fn.description}
              </span>
            ) : null}
          </div>
        ) : (
          <span>{item.name}</span>
        )}
      </td>
      {isReport && report?.status && (
        <td className="px-12 py-4 text-sm font-medium text-gray-700 whitespace-nowrap">
          {report.status === "WŁ" ? (
            <div className="inline-flex items-center px-3 py-1 rounded-full gap-x-2 bg-emerald-100/60 dark:bg-gray-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <h2 className="text-sm font-normal text-emerald-500">
                {report.status}
              </h2>
            </div>
          ) : (
            <div className="inline-flex items-center px-3 py-1 rounded-full gap-x-2 bg-red-100/60 dark:bg-gray-800">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              <h2 className="text-sm font-normal text-red-500">
                {report.status}
              </h2>
            </div>
          )}
        </td>
      )}
      {isReport && report?.repeat && (
        <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-300 whitespace-nowrap">
          {report.repeat}
        </td>
      )}
      <td className="px-4 py-4 text-sm whitespace-nowrap text-right">
        <div className="flex items-center gap-x-6 justify-end">
          <button
            onClick={() => onDeleteClick(item.id)}
            className="text-gray-500 cursor-pointer transition-colors duration-200 dark:hover:text-red-500 dark:text-gray-300 hover:text-red-500 focus:outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
          </button>
          <Link href={`${basePath}/${item.id}`}>
            <button className="text-gray-500 cursor-pointer transition-colors duration-200 dark:hover:text-yellow-500 dark:text-gray-300 hover:text-yellow-500 focus:outline-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
            </button>
          </Link>
        </div>
      </td>
    </tr>
  );
};

interface Table2Props {
  variant?: TableVariant;
  items?: TableItem[];
  basePath?: string;
  hideDelete?: boolean;
  onDelete?: (id: string) => Promise<void> | void;
}

export function Table2({
  variant = "reports",
  items,
  basePath,
  hideDelete,
  onDelete,
}: Table2Props) {
  const effectiveBasePath =
    basePath ?? (variant === "reports" ? "/notifications" : "/functions");

  const seed = React.useMemo<TableItem[]>(() => {
    if (items && items.length) return items;
    return [];
  }, [items]);

  const [rows, setRows] = React.useState<TableItem[]>(seed);
  React.useEffect(() => {
    setRows(seed);
  }, [seed]);

  const [optimisticRows, applyOptimistic] = useOptimistic<
    TableItem[],
    { type: "delete"; id: string }
  >(rows, (current, action) => {
    switch (action.type) {
      case "delete":
        return current.filter((r) => r.id !== action.id);
      default:
        return current;
    }
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const openDelete = (id: string) => {
    if (hideDelete) return;
    setSelectedId(id);
    setIsDeleteModalOpen(true);
  };

  const [, startDelTransition] = useTransition();

  const handleConfirmDelete = async () => {
    if (selectedId === null) return;
    const id = selectedId;
    startDelTransition(() => {
      applyOptimistic({ type: "delete", id });
      setSelectedId(null);
    });
    try {
      await onDelete?.(id);
      setRows((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const selectedItemName = rows.find((m) => m.id === selectedId)?.name;

  return (
    <section className="container px-4 mx-auto max-w-4xl">
      <Header />
      <div className="flex flex-col mt-6">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden border border-gray-200 dark:border-gray-700 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <TableHeader variant={variant} />
                <tbody className="bg-white divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-900">
                  {optimisticRows.map((row) => (
                    <TableRow
                      key={row.id}
                      item={row}
                      variant={variant}
                      basePath={effectiveBasePath}
                      onDeleteClick={openDelete}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {!hideDelete && (
        <DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedId(null);
          }}
          onConfirm={handleConfirmDelete}
          itemName={selectedItemName}
        />
      )}
    </section>
  );
}
