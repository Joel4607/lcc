const toastStyles = {
  error: "border-rose-200 bg-rose-50 text-rose-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export default function ToastViewport({ onDismiss, toasts }) {
  if (!toasts.length) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <article
          className={`pointer-events-auto rounded-3xl border px-4 py-4 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.35)] ${
            toastStyles[toast.type] || toastStyles.success
          }`}
          key={toast.id}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em]">
                {toast.title || (toast.type === "error" ? "Error" : "Success")}
              </p>
              <p className="mt-2 text-sm font-medium leading-6">{toast.message}</p>
            </div>
            <button
              className="rounded-full border border-current/20 px-2 py-1 text-xs font-semibold"
              onClick={() => onDismiss(toast.id)}
              type="button"
            >
              Close
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
