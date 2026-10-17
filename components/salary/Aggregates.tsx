"use client";

import Link from "next/link";
import * as React from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CountUp } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/primitives";
import { histogram, median, summarize, type Summary } from "@/lib/aggregate";
import { K_ANONYMITY } from "@/lib/constants";
import type { SalaryEntry } from "@/lib/data/types";
import { formatINR, formatINRCompact } from "@/lib/format";

/** p25–p75 band on a min–max track, with a median tick. */
export function RangeBar({ s, className }: { s: Summary; className?: string }) {
  const span = s.max - s.min || 1;
  const pos = (v: number) => ((v - s.min) / span) * 100;
  return (
    <div className={className}>
      <div className="relative h-2.5 rounded-full bg-surface-2" role="img" aria-label={`Middle 50% earn ${formatINR(s.p25)} to ${formatINR(s.p75)}; median ${formatINR(s.median)}`}>
        <div
          className="absolute inset-y-0 rounded-full bg-accent/70"
          style={{ left: `${pos(s.p25)}%`, width: `${Math.max(2, pos(s.p75) - pos(s.p25))}%` }}
        />
        <div className="absolute -inset-y-1 w-0.5 rounded-full bg-text" style={{ left: `calc(${pos(s.median)}% - 1px)` }} />
      </div>
      <div className="mt-2 flex justify-between gap-2 text-xs text-muted">
        <span className="tabular">{formatINRCompact(s.min)}</span>
        <span className="tabular">
          p25 <span className="text-text">{formatINRCompact(s.p25)}</span> · p75{" "}
          <span className="text-text">{formatINRCompact(s.p75)}</span>
        </span>
        <span className="tabular">{formatINRCompact(s.max)}</span>
      </div>
    </div>
  );
}

function HistTooltip({ active, payload }: { active?: boolean; payload?: { payload: { start: number; end: number; count: number } }[] }) {
  if (!active || !payload?.length) return null;
  const b = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-raised">
      <p className="tabular text-muted">
        {formatINRCompact(b.start)} – {formatINRCompact(b.end)}
      </p>
      <p className="tabular font-semibold text-text">
        {b.count} entr{b.count === 1 ? "y" : "ies"}
      </p>
    </div>
  );
}

export function Histogram({ values }: { values: number[] }) {
  const bins = React.useMemo(
    () => histogram(values, Math.min(12, Math.max(6, Math.round(Math.sqrt(values.length) * 1.5)))).map((b) => ({ ...b, mid: (b.start + b.end) / 2 })),
    [values],
  );
  return (
    <div className="h-36 w-full" role="img" aria-label={`Histogram of ${values.length} salaries`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bins} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap={2}>
          <XAxis
            dataKey="mid"
            tickFormatter={(v: number) => formatINRCompact(v)}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis hide allowDecimals={false} />
          <Tooltip content={<HistTooltip />} cursor={{ fill: "var(--surface-2)" }} isAnimationActive={false} />
          <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AggregatePanel({
  entries,
  loading,
  children,
}: {
  entries: SalaryEntry[];
  loading?: boolean;
  children?: React.ReactNode;
}) {
  const ctcs = entries.map((e) => e.ctc);
  const s = summarize(ctcs);

  if (loading) {
    return (
      <Card className="p-5 sm:p-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-14 w-48" />
        <Skeleton className="mt-5 h-2.5 w-full" />
        <Skeleton className="mt-6 h-32 w-full" />
      </Card>
    );
  }

  if (!s) {
    return (
      <Card className="flex flex-col items-start gap-3 p-5 sm:p-6">
        <p className="font-display text-2xl font-bold">Not enough data yet — add yours.</p>
        <p className="max-w-md text-sm text-muted">
          We only show aggregates for groups of {K_ANONYMITY} or more, so no single person can be singled out.
          {entries.length > 0 && ` This group has ${entries.length}.`}
        </p>
        <Button asChild>
          <Link href="/submit/">Add your salary</Link>
        </Button>
        {children}
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-10">
        <div className="flex flex-col">
          <p className="text-sm font-medium text-muted">Median annual CTC</p>
          <p className="font-display text-5xl font-extrabold leading-none tracking-tight sm:text-6xl">
            <CountUp value={s.median} format={formatINRCompact} />
          </p>
          <RangeBar s={s} className="mt-5" />
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted">Entries</dt>
              <dd className="tabular font-display text-2xl font-bold">{s.count}</dd>
            </div>
            <div>
              <dt className="text-muted">Median experience</dt>
              <dd className="tabular font-display text-2xl font-bold">{median(entries.map((e) => e.yoe)).toFixed(1)} yrs</dd>
            </div>
          </dl>
        </div>
        <div className="min-w-0">
          <p className="mb-2 text-sm font-medium text-muted">Distribution</p>
          <Histogram values={ctcs} />
        </div>
      </div>
      {children && <div className="mt-4 border-t border-border pt-2">{children}</div>}
    </Card>
  );
}
