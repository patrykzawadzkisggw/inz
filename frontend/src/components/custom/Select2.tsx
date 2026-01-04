import React, { ReactNode, SelectHTMLAttributes, forwardRef } from 'react';

interface Select2Props extends SelectHTMLAttributes<HTMLSelectElement> {
  children?: ReactNode;
  className?: string;
}

const baseClasses = "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500";

const Select2 = forwardRef<HTMLSelectElement, Select2Props>(({ children, className, ...props }, ref) => {
  return (
    <select ref={ref} {...props} className={className ? `${baseClasses} ${className}` : baseClasses}>
      {children}
    </select>
  );
});

Select2.displayName = 'Select2';

export default Select2;
