"use client";

type ModalSize = "md" | "lg" | "xl";

export function Modal({
  isOpen,
  onClose,
  children,
  Title = "Wstaw",
  size = "md",
  contentClassName,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  Title?: string;
  size?: ModalSize;
  contentClassName?: string;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex justify-center items-center w-full 
                 h-[calc(100%)] max-h-full bg-black bg-opacity-50"
    >
      <div
        className={`relative p-4 w-full ${
          size === "md" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-5xl"
        } max-h-full`}
      >
        <div
          className={`relative bg-white rounded-lg shadow-sm dark:bg-gray-700 ${
            contentClassName ?? ""
          }`}
        >
          <div
            className="flex items-center justify-between p-4 md:p-5 border-b rounded-t 
                          border-gray-200 dark:border-gray-600"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {Title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 
                         rounded-lg text-sm h-8 w-8 inline-flex justify-center items-center 
                         dark:hover:bg-gray-600 dark:hover:text-white"
            >
              <svg
                className="w-3 h-3"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 14 14"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
              <span className="sr-only">Close modal</span>
            </button>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
