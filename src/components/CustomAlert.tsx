import { useEffect } from "react";

type AlertType = "success" | "error" | "info";

interface CustomAlertProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: AlertType;
  onClose: () => void;
}

export default function CustomAlert({
  isOpen,
  title,
  message,
  type = "info",
  onClose,
}: CustomAlertProps) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Design Config based on type
  const config = {
    success: {
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      ),
    },
    error: {
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
    },
    info: {
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  };

  const currentConfig = config[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Icon Circle */}
            <div
              className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${currentConfig.iconBg} ${currentConfig.iconColor}`}
            >
              {currentConfig.icon}
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed whitespace-pre-line">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
