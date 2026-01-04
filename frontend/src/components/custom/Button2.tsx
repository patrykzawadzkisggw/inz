"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface Button2Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: "primary" | "outline" | "outlinie" | "destructive";
}

const variantClasses: Record<string, string> = {
  primary:
    "text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 focus:outline-none dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-blue-700 dark:disabled:hover:bg-blue-600",
  outline:
    "py-2.5 px-5 me-2 mb-2 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-900 dark:disabled:hover:bg-gray-800 dark:disabled:hover:text-gray-400",
  destructive:
    "focus:outline-none text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-red-700 dark:disabled:hover:bg-red-600",
};

const Button2 = React.forwardRef<HTMLButtonElement, Button2Props>(
  ({ className, children, type = "button", variant = "primary", ...props }, ref) => {
  const normalizedVariant = variant === "outlinie" ? "outline" : variant;
    return (
      <button
        ref={ref}
        type={type}
        className={cn(variantClasses[normalizedVariant] ?? variantClasses.primary, className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button2.displayName = "Button2";

export default Button2;
