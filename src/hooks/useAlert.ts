import { useCallback, useState } from "react";

type AlertType = "success" | "error" | "info";

export interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  type: AlertType;
}

export function useAlert() {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  // Stable identities so callers can list these in effect dependencies.
  const triggerAlert = useCallback(
    (title: string, message: string, type: AlertType = "info") => {
      setAlertState({ isOpen: true, title, message, type });
    },
    [],
  );

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return { alertState, triggerAlert, closeAlert };
}
