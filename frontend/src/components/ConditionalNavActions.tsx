"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { NavActions } from "@/components/nav-actions";

// Renderuj NavActions tylko na stronie głównej (/)
export const ConditionalNavActions: React.FC = () => {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  return <NavActions />;
};

export default ConditionalNavActions;
