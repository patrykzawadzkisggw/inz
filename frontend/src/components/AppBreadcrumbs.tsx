"use client";
import React from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  models: "Modele",
  functions: "Funkcje",
  notifications: "Powiadomienia",
  new: "Nowy",
  edit: "Edycja",
  logs: "Logi",
  "manual-data": "Dane ręczne",
  results: "Wyniki",
  train: "Trenowanie",
  "not-found": "Nie znaleziono",
};

function formatSegment(seg: string): string {
  if (LABELS[seg]) return LABELS[seg];
  if (/^[0-9]+$/.test(seg)) return `ID ${seg}`;
  if (/^[0-9a-fA-F-]{6,}$/.test(seg)) return "ID";
  return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
}

export const AppBreadcrumbs: React.FC = () => {
  const pathname = usePathname() || "/";
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = segments.map((seg, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    return { label: formatSegment(seg), href };
  });

  const full = [{ label: "Strona główna", href: "/" }, ...crumbs];

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {full.map((c, i) => {
          const isLast = i === full.length - 1;
          return (
            <React.Fragment key={c.href + i}>
              <BreadcrumbItem
                className={i === 0 ? "hidden md:block" : undefined}
              >
                {isLast ? (
                  <BreadcrumbPage>{c.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={c.href}>{c.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && (
                <BreadcrumbSeparator
                  className={i === 0 ? "hidden md:block" : undefined}
                />
              )}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default AppBreadcrumbs;
