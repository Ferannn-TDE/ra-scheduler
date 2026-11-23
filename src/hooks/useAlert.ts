import { useState } from "react";

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

  const triggerAlert = (
    title: string,
    message: string,
    type: AlertType = "info",
  ) => {
    setAlertState({ isOpen: true, title, message, type });
  };

  const closeAlert = () => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  };

  return { alertState, triggerAlert, closeAlert };
}
