"use client";

import { Search } from "lucide-react";
import * as React from "react";
import { ErrorState } from "@/components/common";
import { CompanyCard } from "@/components/company";
import { Segmented } from "@/components/ui/multi-select";
import { Card, Input, Skeleton } from "@/components/ui/primitives";
import { useAllReviews, useTrustIndex } from "@/hooks/queries";
import { COMPANIES } from "@/lib/catalog";
import { companyStats } from "@/lib/companyStats";

type Sort = "entries" | "median" | "rating";
const SORTS: { value: Sort; label: string }[] = [
  { value: "entries", label: "Most entries" },
  { value: "median", label: "Highest median" },
  { value: "rating", label: "Best rated" },
];

export default function CompaniesPage() {
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<Sort>("entries");
  const trust = useTrustIndex();
  const reviews = useAllReviews();

  const rows = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return COMPANIES.filter((c) => !needle || `${c.label} ${c.industry} ${c.hq}`.toLowerCase().includes(needle))
      .map((c) => ({ company: c, stats: trust.all ? companyStats(c.id, trust.all, trust.index, reviews.byCompany.get(c.id)) : undefined }))
      .sort((a, b) => {
        const s = (x: typeof a) =>
          sort === "entries" ? (x.stats?.entries ?? 0) : sort === "median" ? (x.stats?.medianCtc ?? 0) : (x.stats?.avgRating ?? 0);
        return s(b) - s(a);
      });
  }, [q, sort, trust.all, trust.index, reviews.byCompany]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-6 flex flex-col gap-2 sm:mb-8">
        <h1 className="text-4xl font-extrabold sm:text-5xl">Communities</h1>
        <p className="max-w-2xl text-muted">One community per company: salaries, reviews and discussion. Headline numbers come from live Arkiv entries; low-trust entries are left out of medians.</p>
      </header>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="company-search" className="sr-only">Search communities</label>
          <Input id="company-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search communities…" className="pl-9" />
        </div>
        <div className="sm:ml-auto sm:w-[26rem]">
          <Segmented label="Sort companies" options={SORTS} value={sort} onChange={setSort} />
        </div>
      </div>

      {trust.isError ? (
        <ErrorState error={trust.error} onRetry={trust.refetch} />
      ) : trust.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Card key={i} className="p-5">
              <div className="flex gap-3"><Skeleton className="size-12" /><div className="flex-1"><Skeleton className="h-5 w-40" /><Skeleton className="mt-2 h-3 w-28" /></div></div>
              <Skeleton className="mt-5 h-16 w-full" />
            </Card>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-muted">No company matches “{q}”.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <li key={r.company.id}>
              <CompanyCard company={r.company} stats={r.stats} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
