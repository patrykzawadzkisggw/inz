"use client";
import React, { useState, useEffect, useTransition } from 'react';
import DeleteModal from '@/components/notify/DeleteModal';
import { deleteModelAction } from '@/app/(authorized)/models/actions';
import Link from 'next/link';

export interface ModelRowData {
  id: string;
  name: string;
  type: string;
  mode: string;
  updatedAt?: Date | string | null;
}

interface ModelsTableProps {
  rows: ModelRowData[];
  onChange?: (next: ModelRowData[]) => void; 
}

export const ModelsTable: React.FC<ModelsTableProps> = ({ rows, onChange }) => {
  const [data, setData] = useState<ModelRowData[]>(rows);
  useEffect(() => { setData(rows); }, [rows]);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleConfirmDelete = () => {
    if (!deleteId) return;
    const id = deleteId;
    const next = data.filter(r => r.id !== id);
    setData(next);
    onChange?.(next);
    setDeleteId(null);
    startTransition(() => {
      deleteModelAction(id).catch(() => {
      })
    })
  };

  return (
    <section className="container px-4 mx-auto max-w-6xl w-full">
      <div className="flex flex-col mt-6">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden border border-gray-200 dark:border-gray-700 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="py-3.5 px-4 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400 w-full">Nazwa</th>
                    <th className="py-3.5 px-4 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400">Typ</th>
                    <th className="py-3.5 px-4 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400">Tryb</th>
                    <th className="py-3.5 px-4 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400">Zmieniono</th>
                    <th className="relative py-3.5 px-4 text-right"><span className="sr-only">Akcje</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-900">
                  {data.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                      <td className="px-4 py-4 text-sm font-medium text-gray-700 whitespace-nowrap w-full dark:text-gray-200">{r.name}</td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-300 whitespace-nowrap">{r.type}</td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-300 whitespace-nowrap">{r.mode}</td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {r.updatedAt ? (() => {
                          const d = typeof r.updatedAt === 'string' ? new Date(r.updatedAt) : r.updatedAt;
                          if (isNaN(d.getTime())) return '—';
                          return d.toISOString().replace('T',' ').slice(0,16);
                        })() : '—'}
                      </td>
                      <td className="px-4 py-4 text-sm whitespace-nowrap text-right">
                        <div className="flex items-center gap-x-6 justify-end">
                          <Link href={`/models/${r.id}`} className="text-gray-500 cursor-pointer transition-colors duration-200 dark:hover:text-yellow-500 dark:text-gray-300 hover:text-yellow-500 focus:outline-none" title="Edytuj">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
                            </Link>
                          
                          <Link href={`/models/${r.id}/predictions`} className="text-gray-500 cursor-pointer transition-colors duration-200 dark:hover:text-yellow-500 dark:text-gray-300 hover:text-yellow-500 focus:outline-none" title="Podgląd">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </Link>
                          <button onClick={() => setDeleteId(r.id)} className="text-gray-500 cursor-pointer transition-colors duration-200 dark:hover:text-red-500 dark:text-gray-300 hover:text-red-500 focus:outline-none" title="Usuń">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!data.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">Brak modeli.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <DeleteModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        itemName={deleteId || ''}
      />
    </section>
  );
};
