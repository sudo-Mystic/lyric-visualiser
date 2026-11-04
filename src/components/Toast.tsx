import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "./ui";

export type ToastTone = "info" | "success" | "error";

export interface ToastMessage {
  id: number;
  text: string;
  tone: ToastTone;
}

const tones = {
  info: {
    icon: Info,
    className: "border-edge bg-panel text-bone",
    iconClass: "text-muted",
  },
  success: {
    icon: CheckCircle2,
    className: "border-emerald-500/25 bg-panel text-bone",
    iconClass: "text-emerald-400",
  },
  error: {
    icon: TriangleAlert,
    className: "border-blood/30 bg-panel text-bone",
    iconClass: "text-blood",
  },
};

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-32px))] flex-col gap-2">
      {toasts.map((toast) => {
        const tone = tones[toast.tone];
        const Icon = tone.icon;
        return (
          <div
            key={toast.id}
            className={cn(
              "toast-in pointer-events-auto flex items-start gap-2.5 rounded-md border px-3 py-2.5 shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
              tone.className,
            )}
            role="status"
          >
            <Icon className={cn("mt-0.5 size-3.5 shrink-0", tone.iconClass)} />
            <span className="min-w-0 flex-1 text-[11px] leading-relaxed text-bone/90">
              {toast.text}
            </span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="mt-0.5 text-dim transition-colors hover:text-bone"
              aria-label="Dismiss notification"
            >
              <X className="size-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
