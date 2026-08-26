"use client";

import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ─── Button ──────────────────────────────────────────────
export function Button({
  variant = "primary",
  size,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm";
}) {
  return <button className={cn("btn", `btn-${variant}`, size === "sm" && "btn-sm", className)} {...props} />;
}

// ─── Fields ──────────────────────────────────────────────
export function Field({ label, children, hint, required }: { label?: string; children: React.ReactNode; hint?: string; required?: boolean }) {
  return (
    <div>
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-rust"> *</span>}
        </label>
      )}
      {children}
      {hint && <p className="text-[11px] text-ink-faint mt-1">{hint}</p>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(props, ref) {
  return <input ref={ref} className={cn("input", props.className)} {...props} />;
});
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} className={cn("textarea", props.className)} {...props} />;
}
export function Select({
  options,
  placeholder,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select className={cn("select", props.className)} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
export function Checkbox({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="inline-flex items-center gap-2 text-[13px] text-ink-soft cursor-pointer select-none">
      <input type="checkbox" className="accent-[var(--color-clay)] w-4 h-4 rounded border-line" {...props} />
      {label}
    </label>
  );
}

/** Tag-style multi value input */
export function TagsInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  };
  return (
    <div className="input flex flex-wrap gap-1.5 items-center min-h-[38px] py-1.5">
      {value.map((tag) => (
        <span key={tag} className="badge bg-clay-soft text-clay-dark">
          {tag}
          <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} className="ml-0.5 opacity-60 hover:opacity-100">
            ×
          </button>
        </span>
      ))}
      <input
        className="flex-1 min-w-[80px] outline-none bg-transparent"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={commit}
      />
    </div>
  );
}

// ─── Badges & status pills ───────────────────────────────
const badgeTones = {
  neutral: "bg-parchment text-ink-soft",
  clay: "bg-clay-soft text-clay-dark",
  olive: "bg-olive-soft text-olive",
  rust: "bg-rust-soft text-rust",
  amber: "bg-amber-soft text-amber-warm",
  slate: "bg-slateblue-soft text-slateblue",
} as const;
export type BadgeTone = keyof typeof badgeTones;

export function Badge({ tone = "neutral", children, className }: { tone?: BadgeTone; children: React.ReactNode; className?: string }) {
  return <span className={cn("badge", badgeTones[tone], className)}>{children}</span>;
}

const STATUS_META: Record<string, { tone: BadgeTone; symbol: string }> = {
  NEW_LEAD: { tone: "slate", symbol: "●" },
  CONTACTED: { tone: "clay", symbol: "●" },
  QUALIFIED: { tone: "clay", symbol: "●" },
  SITE_VISIT_PLANNED: { tone: "slate", symbol: "●" },
  SAMPLE_REQUESTED: { tone: "amber", symbol: "●" },
  QUOTATION_PREPARATION: { tone: "amber", symbol: "●" },
  QUOTATION_SENT: { tone: "slate", symbol: "●" },
  NEGOTIATION: { tone: "amber", symbol: "●" },
  WON: { tone: "olive", symbol: "✓" },
  LOST: { tone: "rust", symbol: "×" },
  ON_HOLD: { tone: "neutral", symbol: "Ⅱ" },
  PLANNING: { tone: "neutral", symbol: "●" },
  SCHEDULED: { tone: "slate", symbol: "●" },
  IN_PROGRESS: { tone: "amber", symbol: "●" },
  ON_HOLD_PROJECT: { tone: "neutral", symbol: "Ⅱ" },
  QUALITY_CONTROL: { tone: "clay", symbol: "●" },
  COMPLETED: { tone: "olive", symbol: "✓" },
  CANCELLED: { tone: "rust", symbol: "×" },
  NO_SHOW: { tone: "rust", symbol: "!" },
  DRAFT: { tone: "neutral", symbol: "●" },
  SENT: { tone: "slate", symbol: "●" },
  VIEWED: { tone: "clay", symbol: "●" },
  ACCEPTED: { tone: "olive", symbol: "✓" },
  REJECTED: { tone: "rust", symbol: "×" },
  EXPIRED: { tone: "rust", symbol: "!" },
  ISSUED: { tone: "slate", symbol: "●" },
  PARTIALLY_PAID: { tone: "amber", symbol: "●" },
  PAID: { tone: "olive", symbol: "✓" },
  OVERDUE: { tone: "rust", symbol: "!" },
};

export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  const meta = STATUS_META[status] ?? { tone: "neutral" as const, symbol: "●" };
  return (
    <Badge tone={meta.tone} className={className}>
      <span aria-hidden="true" className="text-[9px]">{meta.symbol}</span>
      {label ?? status.replaceAll("_", " ").toLowerCase()}
    </Badge>
  );
}

// ─── Modal ───────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  wide,
  initialFocusRef,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )).filter((element) => !element.hasAttribute("hidden"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => (initialFocusRef?.current ?? closeRef.current)?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previousFocus.current?.focus();
    };
  }, [open, initialFocusRef]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn("card relative w-full shadow-pop my-4 max-sm:my-0 max-sm:min-h-full max-sm:rounded-none", wide ? "max-w-4xl" : "max-w-lg")}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-line-soft">
          <h2 id={titleId} className="display text-xl">{title}</h2>
          <button ref={closeRef} onClick={onClose} className="text-ink-faint hover:text-ink text-xl leading-none px-2 py-1 min-w-10 min-h-10" aria-label="close">
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Confirm dialog hook ─────────────────────────────────
export function useConfirm() {
  const [state, setState] = useState<{ message: string; resolve: (ok: boolean) => void } | null>(null);
  const confirm = useCallback(
    (message: string) =>
      new Promise<boolean>((resolve) => {
        setState({ message, resolve });
      }),
    []
  );
  const dialog = state ? (
    <Modal open onClose={() => { state.resolve(false); setState(null); }} title="Confirm">
      <p className="text-sm text-ink-soft mb-5">{state.message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => { state.resolve(false); setState(null); }}>
          Cancel
        </Button>
        <Button variant="danger" onClick={() => { state.resolve(true); setState(null); }}>
          Delete
        </Button>
      </div>
    </Modal>
  ) : null;
  return { confirm, dialog };
}

// ─── Toasts ──────────────────────────────────────────────
type Toast = { id: number; msg: string; kind: "ok" | "err" };
const ToastCtx = createContext<{ toast: (msg: string, kind?: "ok" | "err") => void }>({ toast: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 right-4 left-4 sm:bottom-4 sm:left-auto z-[70] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "shadow-pop rounded-lg px-4 py-3 text-sm font-medium animate-[fadeIn_0.15s_ease-out]",
              t.kind === "ok" ? "bg-ink text-paper" : "bg-rust text-white"
            )}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ─── Misc primitives ─────────────────────────────────────
export function EmptyState({ icon, title, hint }: { icon?: string; title: string; hint?: string }) {
  return (
    <div className="text-center py-14 text-ink-faint">
      <div className="text-3xl mb-2">{icon ?? "◇"}</div>
      <p className="font-medium">{title}</p>
      {hint && <p className="text-xs mt-1 max-w-sm mx-auto">{hint}</p>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="py-10 flex justify-center">
      <div className="w-6 h-6 border-2 border-line border-t-clay rounded-full animate-spin" />
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string; count?: number }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="flex gap-1 border-b border-line-soft overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "px-4 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
            active === tab.key ? "border-clay text-clay-dark" : "border-transparent text-ink-faint hover:text-ink"
          )}
        >
          {tab.label}
          {tab.count !== undefined && <span className="ml-1.5 text-[11px] text-ink-faint">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 pt-3 text-[13px] text-ink-soft">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        ‹
      </Button>
      <span>
        {page} / {pages}
      </span>
      <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        ›
      </Button>
    </div>
  );
}

export function Avatar({ name, color, size = 32 }: { name: string; color?: string; size?: number }) {
  const ini = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0"
      style={{ width: size, height: size, background: color ?? "#8a7968", fontSize: size * 0.38 }}
    >
      {ini}
    </span>
  );
}

/** Debounced search input that calls onSearch */
export function DebouncedSearch({ onSearch, placeholder, delay = 300 }: { onSearch: (q: string) => void; placeholder?: string; delay?: number }) {
  const [val, setVal] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">⌕</span>
      <input
        className="input pl-8"
        placeholder={placeholder}
        value={val}
        onChange={(e) => {
          const v = e.target.value;
          setVal(v);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => onSearch(v), delay);
        }}
      />
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
  interactive = false,
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: BadgeTone;
  interactive?: boolean;
  onClick?: () => void;
}) {
  const actionable = interactive || Boolean(onClick);
  const accent =
    tone === "olive" ? "bg-olive" : tone === "rust" ? "bg-rust" : tone === "amber" ? "bg-amber-warm" : tone === "clay" ? "bg-clay" : "bg-bronze";
  return (
    <div className={cn("card p-5 relative overflow-hidden h-full", actionable && "cursor-pointer hover:shadow-pop transition-shadow")} onClick={onClick}>
      <span className={cn("absolute left-0 top-0 bottom-0 w-1", accent)} />
      <p className="eyebrow mb-2">{label}</p>
      <p className="display text-2xl leading-tight">{value}</p>
      {sub && <p className="text-xs text-ink-faint mt-1">{sub}</p>}
    </div>
  );
}
