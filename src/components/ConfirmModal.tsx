interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  // NEW PROPS 👇
  confirmText?: string;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onClose,
  onConfirm,
  isLoading,
  confirmText = "Confirm", // Default text
  isDestructive = false, // Default color (Green/Blue)
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <h3
            className={`text-xl font-bold mb-2 ${isDestructive ? "text-red-600" : "text-slate-800"}`}
          >
            {title}
          </h3>
          <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
            {message}
          </p>
        </div>

        <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-200 rounded-lg transition"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`
              px-4 py-2 text-white font-bold rounded-lg transition shadow-sm
              ${
                isDestructive
                  ? "bg-red-600 hover:bg-red-700 disabled:bg-red-400"
                  : "bg-green-600 hover:bg-green-700 disabled:bg-green-400"
              }
            `}
          >
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
