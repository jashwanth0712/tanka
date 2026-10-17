"use client";

import { AlertTriangle, ChevronRight, MapPin, Star } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { TimeAgo } from "@/components/common";
import { Card } from "@/components/ui/primitives";
import { groupMatrix } from "@/lib/aggregate";
import { cityLabel, LEVELS, ROLES, type Company } from "@/lib/catalog";
import type { CompanyStats } from "@/lib/companyStats";
import { FLAG_THRESHOLD, reviewAvg } from "@/lib/companyStats";
import type { Review, SalaryEntry } from "@/lib/data/types";
import { formatINRCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

function hueOf(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

/** Initials + deterministic hue. No logos, ever. */
export function Monogram({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden
      style={{ "--h": hueOf(name) } as React.CSSProperties}
      className={cn(
        "grid shrink-0 place-items-center rounded-[12px] font-display font-extrabold",
        "bg-[oklch(0.9_0.06_var(--h))] text-[oklch(0.32_0.09_var(--h))] dark:bg-[oklch(0.3_0.07_var(--h))] dark:text-[oklch(0.9_0.07_var(--h))]",
        size === "lg" ? "size-16 text-2xl sm:size-20 sm:text-3xl" : "size-12 text-lg",
      )}
    >
      {initials}
    </span>
  );
}

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-label={`${value.toFixed(1)} out of 5`}>
      <Star className="size-4 fill-accent text-accent" aria-hidden />
      <span className="tabular font-semibold">{value.toFixed(1)}</span>
    </span>
  );
}

export function CompanyCard({ company, stats }: { company: Company; stats?: CompanyStats }) {
  return (
    <Card className="group relative flex flex-col gap-4 p-5 transition-colors hover:border-muted/50">
      <div className="flex items-start gap-3">
        <Monogram name={company.label} />
        <div className="min-w-0 flex-1">
          <Link href={`/company/?name=${company.id}`} className="font-display text-lg font-bold after:absolute after:inset-0 after:content-['']">
            {company.label}
          </Link>
          <p className="flex items-center gap-1 truncate text-sm text-muted">
            c/{company.id} · {company.industry}
          </p>
          <p className="flex items-center gap-1 truncate text-xs text-muted">
            <MapPin className="size-3" aria-hidden /> {cityLabel(company.hq)}
          </p>
        </div>
        <ChevronRight className="size-5 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted">Median CTC</dt>
          <dd className="font-display text-2xl font-bold">{stats?.medianCtc != null ? formatINRCompact(stats.medianCtc) : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Entries</dt>
          <dd className="tabular font-display text-2xl font-bold">{stats?.entries ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Rating</dt>
          <dd>{stats?.avgRating != null ? <Stars value={stats.avgRating} /> : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">High trust</dt>
          <dd className="tabular font-semibold">{stats?.highTrustPct != null ? `${stats.highTrustPct}%` : "—"}</dd>
        </div>
      </dl>
      {stats && stats.flaggedPct > FLAG_THRESHOLD && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-trust-low">
          <AlertTriangle className="size-3.5" aria-hidden /> Burst of low-trust entries detected
        </p>
      )}
    </Card>
  );
}

export function FlagBanner({ pct, showing, onToggle }: { pct: number; showing: boolean; onToggle: () => void }) {
  return (
    <div role="status" className="glass flex flex-col gap-3 rounded-[18px] border-trust-mid/50 bg-trust-mid/10 p-4 sm:flex-row sm:items-center sm:p-5">
      <AlertTriangle className="size-6 shrink-0 text-trust-mid" aria-hidden />
      <div className="flex-1">
        <p className="font-semibold">We detected a burst of low-trust entries for this company.</p>
        <p className="text-sm text-muted">
          {Math.round(pct * 100)}% of its entries are flagged Unusual or Burst. They&apos;re {showing ? "shown below, marked" : "hidden by default"} — and so are reviews from the same wallets.
        </p>
      </div>
      <button
        type="button"
        aria-pressed={showing}
        onClick={onToggle}
        className="h-10 shrink-0 rounded-[10px] border border-trust-mid/50 px-4 text-sm font-semibold hover:bg-trust-mid/10 cursor-pointer"
      >
        {showing ? "Hide them" : "Show them"}
      </button>
    </div>
  );
}

/** Role × level matrix of medians. Cells under k-anonymity show only "n<3". */
export function SalaryMatrix({ company, entries }: { company: string; entries: SalaryEntry[] }) {
  const matrix = React.useMemo(() => groupMatrix(entries, "role", "level", (e) => e.ctc), [entries]);
  const roles = ROLES.filter((r) => matrix.has(r.id));
  const levels = LEVELS.filter((l) => roles.some((r) => matrix.get(r.id)?.has(l.id)));
  const href = (role: string, level: string) => `/salaries/?company=${company}&role=${role}&level=${level}&trust=all`;
  if (roles.length === 0) return <p className="text-muted">No salaries yet.</p>;

  const Cell = ({ role, level }: { role: string; level: string }) => {
    const has = matrix.get(role)?.has(level);
    const cell = matrix.get(role)?.get(level);
    if (!has) return <span className="text-border">·</span>;
    if (!cell) {
      return (
        <Link href={href(role, level)} className="text-xs text-muted hover:text-text" title="Fewer than 3 entries — hidden for privacy">
          n&lt;3
        </Link>
      );
    }
    return (
      <Link href={href(role, level)} className="block rounded-md px-2 py-1 hover:bg-surface-2">
        <span className="block font-display text-lg font-bold leading-tight">{formatINRCompact(cell.median)}</span>
        <span className="tabular text-xs text-muted">{cell.count} entries</span>
      </Link>
    );
  };

  return (
    <>
      {/* Desktop/tablet matrix */}
      <div className="hidden sm:block">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-2/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Role</th>
                {levels.map((l) => (
                  <th key={l.id} scope="col" className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    {l.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <th scope="row" className="px-4 py-2 text-left font-medium">{r.label}</th>
                  {levels.map((l) => (
                    <td key={l.id} className="px-1 py-1.5">
                      <Cell role={r.id} level={l.id} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      {/* Mobile: one card per role */}
      <ul className="flex flex-col gap-3 sm:hidden">
        {roles.map((r) => (
          <li key={r.id}>
            <Card className="p-4">
              <p className="mb-2 font-semibold">{r.label}</p>
              <ul className="grid grid-cols-2 gap-2">
                {levels
                  .filter((l) => matrix.get(r.id)?.has(l.id))
                  .map((l) => (
                    <li key={l.id} className="rounded-[10px] border border-border p-1">
                      <span className="block px-2 pt-1 text-[11px] uppercase tracking-wider text-muted">{l.label}</span>
                      <Cell role={r.id} level={l.id} />
                    </li>
                  ))}
              </ul>
            </Card>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">Median annual CTC. Groups with fewer than 3 entries are hidden so nobody can be singled out. Tap a cell to see the entries.</p>
    </>
  );
}

const DIMENSIONS = [
  ["wlb", "Work-life balance"],
  ["management", "Management"],
  ["growth", "Growth"],
  ["culture", "Culture"],
] as const;

export function RatingBars({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;
  return (
    <ul className="flex flex-col gap-3">
      {DIMENSIONS.map(([k, label]) => {
        const avg = reviews.reduce((a, r) => a + r[k], 0) / reviews.length;
        return (
          <li key={k} className="grid grid-cols-[minmax(0,130px)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[160px_1fr_auto]">
            <span className="text-muted">{label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <span className="block h-full rounded-full bg-gradient-primary" style={{ width: `${(avg / 5) * 100}%` }} />
            </span>
            <span className="tabular w-8 text-right font-semibold">{avg.toFixed(1)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function ReviewCard({ review, now, flagged }: { review: Review; now: number; flagged?: boolean }) {
  return (
    <Card className={cn("p-4", flagged && "border-trust-low/40")}>
      <div className="flex items-center justify-between gap-2">
        <Stars value={reviewAvg(review)} />
        <TimeAgo ts={review.createdAt} now={now} className="text-xs text-muted" />
      </div>
      {review.comment ? <p className="mt-2 text-sm">{review.comment}</p> : <p className="mt-2 text-sm italic text-muted">No comment.</p>}
      <p className="tabular mt-3 text-xs text-muted">
        WLB {review.wlb} · Mgmt {review.management} · Growth {review.growth} · Culture {review.culture}
      </p>
      {flagged && <p className="mt-2 text-xs font-semibold text-trust-low">From a wallet flagged for a posting burst</p>}
    </Card>
  );
}

