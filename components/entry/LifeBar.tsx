"use client";

import { Hourglass } from "lucide-react";
import { motion } from "motion/react";
import { useNow } from "@/hooks/useNow";
import { ENTRY_TTL_MS } from "@/lib/constants";
import { daysUntil, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Thin bar that drains as expiry approaches. Refills (animated) when expiresAt moves forward. */
export function LifeBar({
  expiresAt,
  createdAt,
  size = "sm",
  className,
}: {
  expiresAt: number;
  createdAt?: number;
  size?: "xs" | "sm" | "lg";
  className?: string;
}) {
  const now = useNow(60_000);
  const left = now ? Math.max(0, expiresAt - now) : ENTRY_TTL_MS;
  const pct = Math.min(100, (left / ENTRY_TTL_MS) * 100);
  const days = now ? daysUntil(expiresAt, now) : 0;
  const tone = pct < 6 ? "bg-trust-low" : pct < 20 ? "bg-trust-mid" : "bg-chain";
  const label = !now ? "" : days < 0 ? "expired" : days === 0 ? "expires today" : `expires in ${days} day${days === 1 ? "" : "s"}`;

  if (size === "xs") {
    return (
      <div className={cn("flex min-w-0 items-center gap-2", className)} title={label}>
        <div
          className="h-1 w-14 shrink-0 overflow-hidden rounded-full bg-surface-2"
          role="meter"
          aria-label="Time until expiry"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={label}
        >
          <motion.div className={cn("h-full rounded-full", tone)} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
        </div>
        <span className="tabular text-xs text-muted">{now ? `${Math.max(0, days)}d` : ""}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className={cn("inline-flex items-center gap-1.5 font-medium", pct < 6 ? "text-trust-low" : "text-text")}>
          <Hourglass className="size-4" aria-hidden /> {label}
        </span>
        {size === "lg" && now > 0 && <span className="tabular text-xs text-muted">{Math.round(pct)}% life left</span>}
      </div>
      <div
        className={cn("overflow-hidden rounded-full bg-surface-2", size === "lg" ? "h-3" : "h-1.5")}
        role="meter"
        aria-label="Time until expiry"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={label}
      >
        <motion.div
          className={cn("h-full rounded-full", tone)}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: size === "lg" ? 0.9 : 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {size === "lg" && createdAt != null && (
        <div className="flex justify-between text-xs text-muted">
          <span>Posted {formatDate(createdAt)}</span>
          <span>Expires {formatDate(expiresAt)}</span>
        </div>
      )}
    </div>
  );
}
