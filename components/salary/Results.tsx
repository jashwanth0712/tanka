"use client";

import { ArrowDown, ChevronRight, MapPin } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Money, TimeAgo } from "@/components/common";
import { LifeBar } from "@/components/entry/LifeBar";
import { TrustBadge } from "@/components/trust";
import { Card, Skeleton } from "@/components/ui/primitives";
import { useNow } from "@/hooks/useNow";
import type { SortKey } from "@/hooks/useSalaryFilters";
import { cityLabel, companyName, levelLabel, roleLabel } from "@/lib/catalog";
import { formatYears } from "@/lib/format";
import type { SalaryEntry } from "@/lib/data/types";
import type { TrustResult } from "@/lib/trust";
import { cn } from "@/lib/utils";

const entryHref = (key: string) => `/post/?key=${key}`;

function Th({
  children,
  k,
  sort,
  onSort,
  className,
}: {
  children: React.ReactNode;
  k?: SortKey;
  sort?: SortKey;
  onSort?: (s: SortKey) => void;
  className?: string;
}) {
  return (
    <th
      scope="col"
      aria-sort={k && sort === k ? "descending" : undefined}
      className={cn("px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted", className)}
    >
      {k && onSort ? (
        <button type="button" onClick={() => onSort(k)} className={cn("inline-flex items-center gap-1 hover:text-text cursor-pointer", sort === k && "text-text")}>
          {children}
          <ArrowDown className={cn("size-3", sort !== k && "opacity-0")} aria-hidden />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function SalaryTable({
  rows,
  trust,
  sort,
  onSort,
}: {
  rows: SalaryEntry[];
  trust?: Map<string, TrustResult>;
  sort: SortKey;
  onSort: (s: SortKey) => void;
}) {
  const router = useRouter();
  const now = useNow();
  const s = { sort, onSort };

  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-surface-2/50">
          <tr>
            <Th className="pl-5">Company</Th>
            <Th>Role · Level</Th>
            <Th>City</Th>
            <Th className="text-right">YoE</Th>
            <Th k="ctc" {...s} className="text-right">CTC</Th>
            <Th k="trust" {...s}>Trust</Th>
            <Th>Life</Th>
            <Th k="newest" {...s} className="pr-5">Posted</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr
              key={e.key}
              onClick={() => router.push(entryHref(e.key))}
              className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-surface-2/60"
            >
              <td className="py-3 pl-5 pr-3 font-medium">
                <Link href={entryHref(e.key)} className="hover:underline" onClick={(ev) => ev.stopPropagation()}>
                  {companyName(e.company)}
                </Link>
              </td>
              <td className="px-3 py-3">
                <span>{roleLabel(e.role)}</span>
                <span className="block text-xs text-muted">{levelLabel(e.level)}</span>
              </td>
              <td className="px-3 py-3 text-muted">{cityLabel(e.city)}</td>
              <td className="tabular px-3 py-3 text-right">{e.yoe}</td>
              <td className="px-3 py-3 text-right font-display text-base font-semibold">
                <Money value={e.ctc} />
              </td>
              <td className="px-3 py-3">
                <TrustBadge trust={trust?.get(e.key)} size="sm" />
              </td>
              <td className="px-3 py-3">
                <LifeBar expiresAt={e.expiresAt} size="xs" />
              </td>
              <td className="py-3 pl-3 pr-5 text-muted">
                <TimeAgo ts={e.createdAt} now={now} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export function SalaryCard({ e, trust, index = 0 }: { e: SalaryEntry; trust?: TrustResult; index?: number }) {
  const now = useNow();
  const reduce = useReducedMotion();
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 10) * 0.03, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="relative p-4 transition-colors hover:border-muted/50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={entryHref(e.key)} className="font-medium after:absolute after:inset-0 after:content-['']">
              {companyName(e.company)}
            </Link>
            <p className="truncate text-sm text-muted">
              {roleLabel(e.role)} · {levelLabel(e.level)}
            </p>
          </div>
          <p className="shrink-0 font-display text-2xl font-semibold leading-none">
            <Money value={e.ctc} />
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
          <span className="relative z-10">
            <TrustBadge trust={trust} size="sm" />
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" aria-hidden /> {cityLabel(e.city)}
          </span>
          <span className="tabular">{formatYears(e.yoe)}</span>
          <span className="ml-auto inline-flex items-center gap-2">
            <LifeBar expiresAt={e.expiresAt} size="xs" />
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <TimeAgo ts={e.createdAt} now={now} />
          <ChevronRight className="size-4" aria-hidden />
        </div>
      </Card>
    </motion.li>
  );
}

export function ResultsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      <div className="hidden lg:block">
        <Card className="p-2">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border px-3 py-4 last:border-0">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="ml-auto h-5 w-16" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-2 w-16" />
            </div>
          ))}
        </Card>
      </div>
      <ul className="flex flex-col gap-3 lg:hidden">
        {Array.from({ length: Math.min(rows, 4) }, (_, i) => (
          <li key={i}>
            <Card className="p-4">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="mt-2 h-3 w-48" />
              <Skeleton className="mt-4 h-5 w-24 rounded-full" />
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
