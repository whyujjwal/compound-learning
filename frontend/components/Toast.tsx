"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ToastKind = "info" | "success" | "warn" | "error";

type Toast = {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
};

type ToastContextValue = {
  push: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let _id = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = ++_id;
      setToasts((prev) => [...prev, { ...toast, id }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            <div className="toast-title">{t.title}</div>
            {t.body && <div className="toast-body">{t.body}</div>}
            <button className="toast-close" onClick={() => remove(t.id)} aria-label="Dismiss">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      push: () => {
        // noop when used outside provider during SSR/tests
      },
    } as ToastContextValue;
  }
  return ctx;
}

export function useAutoDismissOnRouteChange() {
  // placeholder — toasts already auto-dismiss after 4s; provider clears on unmount.
  useEffect(() => {}, []);
}
