"use client";

import { Flag, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { motion } from "motion/react";
import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import { BAND_LABEL, MAX_PARTS, type TrustBand, type TrustResult } from "@/lib/trust";
import { cn } from "@/lib/utils";

type BadgeKind = TrustBand | "new";
const kindOf = (t: TrustResult): BadgeKind => (t.isNew ? "new" : t.band);
const labelOf = (t: TrustResult) => (t.isNew ? "New" : BAND_LABEL[t.band]);

const BAND_STYLE: Record<BadgeKind, { text: string; bg: string; Icon: typeof ShieldCheck; stroke: string }> = {
  high: { text: "text-trust-high", bg: "bg-trust-high/12 border-trust-high/30", Icon: ShieldCheck, stroke: "var(--trust-high)" },
  medium: { text: "text-trust-mid", bg: "bg-trust-mid/12 border-trust-mid/30", Icon: TriangleAlert, stroke: "var(--trust-mid)" },
  low: { text: "text-trust-low", bg: "bg-trust-low/12 border-trust-low/30", Icon: Flag, stroke: "var(--trust-low)" },
  new: { text: "text-chain", bg: "bg-chain/12 border-chain/30", Icon: Sparkles, stroke: "var(--chain)" },
};

export function TrustPill({ trust, size = "md" }: { trust: TrustResult; size?: "sm" | "md" }) {
  const s = BAND_STYLE[kindOf(trust)];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap",
        s.bg,
        s.text,
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
      )}
    >
      <s.Icon className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden />
      {labelOf(trust)} <span className="tabular">{trust.score}</span>
    </span>
  );
}

/** Pill + breakdown popover on hover/tap. */
export function TrustBadge({ trust, size }: { trust?: TrustResult; size?: "sm" | "md" }) {
  if (!trust) return <span className="inline-block h-6 w-20 animate-pulse rounded-full bg-surface-2" aria-hidden />;
  return (
    <Popover>
      <PopoverTrigger
        className="rounded-full cursor-pointer"
        aria-label={`Trust ${labelOf(trust)} ${trust.score} of 100. Show breakdown`}
        onClick={(e) => e.stopPropagation()}
      >
        <TrustPill trust={trust} size={size} />
      </PopoverTrigger>
      <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
        <p className="mb-3 text-sm font-medium">Trust score {trust.score}/100</p>
        {trust.isNew && (
          <p className="-mt-2 mb-3 text-xs text-chain">New post: it has 72 hours to collect confirmations before a low score hides it.</p>
        )}
        <TrustBreakdown trust={trust} compact />
        <p className="mt-3 text-xs text-muted">Computed in your browser from Arkiv data only. No identities.</p>
      </PopoverContent>
    </Popover>
  );
}

export function TrustBreakdown({ trust }: { trust: TrustResult; compact?: boolean }) {
  const d = trust.detail;
  const rows: { label: string; key: keyof typeof MAX_PARTS; hint: string }[] = [
    { label: "Confirmations", key: "confirmations", hint: `${d.confirmers} other wallet${d.confirmers === 1 ? "" : "s"} confirmed` },
    {
      label: "Range fit",
      key: "rangeFit",
      hint: d.ratio == null ? `Only ${d.peers} peer${d.peers === 1 ? "" : "s"} — neutral` : `${d.ratio.toFixed(2)}× peer median (${d.peers} peers)`,
    },
    {
      label: "Wallet history",
      key: "walletHistory",
      hint: d.burstCount > 3 ? `${d.burstCount} posts for this company in 24h` : `First seen ${d.walletAgeDays}d before posting`,
    },
    { label: "Freshness", key: "freshness", hint: "Since last confirmation or posting" },
  ];
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2.5">
        {rows.map((r) => {
          const pts = trust.parts[r.key];
          const max = MAX_PARTS[r.key];
          return (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{r.label}</span>
                <span className="tabular font-mono text-xs text-muted">
                  <span className="text-text">{pts}</span>/{max}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={cn("h-full rounded-full", pts === 0 ? "bg-trust-low" : pts >= max * 0.75 ? "bg-trust-high" : "bg-trust-mid")}
                  style={{ width: `${Math.max(3, (pts / max) * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted">{r.hint}</p>
            </li>
          );
        })}
      </ul>
      {trust.flags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {trust.flags.map((f) => (
            <li
              key={f.kind}
              className="inline-flex items-center gap-1 rounded-full border border-trust-low/40 bg-trust-low/10 px-2 py-0.5 text-xs font-medium text-trust-low"
            >
              <Flag className="size-3" aria-hidden /> {f.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TrustRing({ trust, size = 112 }: { trust: TrustResult; size?: number }) {
  const s = BAND_STYLE[kindOf(trust)];
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={8} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={s.stroke}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - trust.score / 100) }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-medium">{trust.score}</span>
        <span className={cn("flex items-center gap-1 text-xs font-medium", s.text)}>
          <s.Icon className="size-3" aria-hidden />
          {labelOf(trust)}
        </span>
      </div>
    </div>
  );
}
