import { createContext, useContext, useState } from "react";
import ToastViewport from "../components/feedback/ToastViewport";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  function dismissToast(id) {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }

  function showToast({ message, title, type = "success" }) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const nextToast = {
      id,
      title,
      message,
      type,
    };

    setToasts((currentToasts) => [...currentToasts, nextToast]);
    window.setTimeout(() => dismissToast(id), 3600);
  }

  return (
    <ToastContext.Provider
      value={{
        dismissToast,
        showToast,
      }}
    >
      {children}
      <ToastViewport onDismiss={dismissToast} toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider.");
  }

  return context;
}
