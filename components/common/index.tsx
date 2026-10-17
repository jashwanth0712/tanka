"use client";

import { AlertTriangle, Check, Copy, RefreshCw, Server } from "lucide-react";
import { animate, useInView, useReducedMotion } from "motion/react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { Tooltip } from "@/components/ui/overlays";
import { formatDateTime, formatINR, formatINRCompact, relativeTime, truncateAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const [done, setDone] = React.useState(false);
  return (
    <button
      type="button"
      aria-label={done ? "Copied" : label}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-text cursor-pointer",
        className,
      )}
      onClick={async (e) => {
        e.stopPropagation();
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success("Copied to clipboard");
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Couldn't access the clipboard");
        }
      }}
    >
      {done ? <Check className="size-4 text-trust-high" /> : <Copy className="size-4" />}
    </button>
  );
}

/** Monospace on-chain value (key, address, block) with optional truncation and copy. */
export function Mono({
  value,
  truncate = true,
  copy = true,
  className,
}: {
  value: string;
  truncate?: boolean;
  copy?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-0.5 font-mono text-[13px] text-chain", className)}>
      <span className={cn(!truncate && "break-all")} title={value}>
        {truncate ? truncateAddress(value) : value}
      </span>
      {copy && <CopyButton value={value} label={`Copy ${value}`} className="size-7" />}
    </span>
  );
}

export function Money({ value, className }: { value: number; className?: string }) {
  return (
    <Tooltip content={`${formatINR(value)} / year`}>
      <span tabIndex={0} className={cn("tabular whitespace-nowrap", className)}>
        {formatINRCompact(value)}
      </span>
    </Tooltip>
  );
}

export function TimeAgo({ ts, now, className }: { ts: number; now?: number; className?: string }) {
  if (!now) return <span className={className}>&nbsp;</span>;
  return (
    <Tooltip content={formatDateTime(ts)}>
      <time tabIndex={0} dateTime={new Date(ts).toISOString()} className={cn("whitespace-nowrap", className)}>
        {relativeTime(ts, now)}
      </time>
    </Tooltip>
  );
}

export function CountUp({ value, format = (n) => Math.round(n).toLocaleString("en-IN"), className }: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const prev = React.useRef(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduce) {
      el.textContent = format(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: prev.current === 0 ? 1.1 : 0.5,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => (el.textContent = format(v)),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, inView, reduce, format]);
  return (
    <span ref={ref} className={cn("tabular", className)}>
      {format(0)}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <Card className="flex flex-col items-start gap-3 p-8 sm:p-12">
      <p className="font-display text-2xl font-semibold sm:text-3xl">{title}</p>
      {body && <p className="max-w-md text-muted">{body}</p>}
      {action}
    </Card>
  );
}

export function ErrorState({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : "Couldn't reach Arkiv.";
  return (
    <Card role="alert" className="flex flex-col gap-3 border-danger/40 p-6">
      <div className="flex items-center gap-2 font-medium text-danger">
        <AlertTriangle className="size-5" /> Couldn&apos;t load from Arkiv
      </div>
      <p className="text-sm text-muted">{msg} The data is still on-chain — this endpoint may be blocked or down.</p>
      <div className="flex flex-wrap gap-2">
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RefreshCw /> Retry
          </Button>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href="/verify/#rpc">
            <Server /> Switch RPC
          </Link>
        </Button>
      </div>
    </Card>
  );
}

export function SectionHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-2 sm:mb-8">
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">{eyebrow}</p>}
      <h2 className="text-3xl font-semibold sm:text-4xl">{title}</h2>
      {children && <div className="max-w-2xl text-muted">{children}</div>}
    </div>
  );
}

export function LiveDot({ ok = true, className }: { ok?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        ok ? "animate-pulse-dot bg-trust-high text-trust-high" : "bg-danger",
        className,
      )}
    />
  );
}
