import { useEffect, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-blood text-black hover:bg-[#ff454a] active:bg-[#e51f25] shadow-[0_0_24px_rgba(255,42,48,0.16)]",
  secondary:
    "border border-edge bg-white/[0.035] text-bone hover:border-white/25 hover:bg-white/[0.06]",
  ghost: "text-muted hover:text-bone hover:bg-white/[0.05]",
  danger: "border border-blood/35 bg-blood/10 text-blood hover:bg-blood/15",
};

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium tracking-[-0.01em] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" ? "h-8 px-3 text-[12px]" : "h-10 px-4 text-[13px]",
        buttonVariants[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/[0.06] hover:text-bone disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedProps<T extends string> {
  value: T;
  options: Array<SegmentOption<T>>;
  onChange: (value: T) => void;
  className?: string;
  compact?: boolean;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
  compact = false,
}: SegmentedProps<T>) {
  return (
    <div
      className={cn(
        "grid gap-1 rounded-md border border-edge bg-black/30 p-1",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-[4px] font-medium transition-all duration-150",
            compact ? "h-7 px-2 text-[11px]" : "h-8 px-2 text-[12px]",
            option.value === value
              ? "bg-white/[0.09] text-bone shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
              : "text-muted hover:bg-white/[0.04] hover:text-bone",
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-dim">
        {children}
      </span>
      {action}
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
  formatValue,
}: SliderProps) {
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-bone/80">
          {formatValue ? formatValue(value) : value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="raakh-range w-full"
        style={{ "--range-progress": `${progress}%` } as CSSProperties}
      />
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-md border border-edge/80 bg-white/[0.02] px-3 py-2.5 text-left transition-colors hover:border-edge hover:bg-white/[0.035]"
    >
      <span
        className={cn(
          "relative mt-0.5 inline-flex h-4 w-7 shrink-0 items-center rounded-full border transition-colors",
          checked ? "border-blood/50 bg-blood/30" : "border-edge bg-black/40",
        )}
      >
        <span
          className={cn(
            "absolute size-2.5 rounded-full transition-all",
            checked ? "left-[13px] bg-blood" : "left-[3px] bg-muted",
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-medium text-bone/90">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[11px] leading-relaxed text-dim">{description}</span>
        ) : null}
      </span>
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "red" | "green" | "amber";
  className?: string;
}) {
  const tones = {
    neutral: "border-edge bg-white/[0.03] text-muted",
    red: "border-blood/30 bg-blood/[0.08] text-blood",
    green: "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300",
    amber: "border-amber-400/25 bg-amber-400/[0.07] text-amber-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.08em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-3.5 animate-spin", className)} />;
}

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "md" | "lg";
}

export function Dialog({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  width = "md",
}: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/80 backdrop-blur-[6px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-lg border border-edge bg-panel shadow-[0_40px_120px_rgba(0,0,0,0.8)]",
          width === "lg" ? "max-w-3xl" : "max-w-xl",
        )}
      >
        <div className="flex items-start justify-between border-b border-edge/80 px-5 py-4">
          <div>
            {eyebrow ? (
              <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-blood">
                {eyebrow}
              </div>
            ) : null}
            <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-bone">{title}</h2>
          </div>
          <IconButton aria-label="Close" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="panel-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-edge/80 bg-black/20 px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export const inputClass =
  "h-9 w-full rounded-md border border-edge bg-black/40 px-3 text-[12px] text-bone outline-none transition-colors placeholder:text-dim focus:border-white/30";

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-dim"
    >
      {children}
    </label>
  );
}
