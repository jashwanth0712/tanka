"use client";

import { EyeOff, RotateCcw } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { EmptyState, ErrorState } from "@/components/common";
import { AggregatePanel } from "@/components/salary/Aggregates";
import { FilterDrawer, FilterFields, SORT_OPTS } from "@/components/salary/Filters";
import { QueryReveal } from "@/components/salary/QueryReveal";
import { ResultsSkeleton, SalaryCard, SalaryTable } from "@/components/salary/Results";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/primitives";
import { useSalaries, useTrustIndex } from "@/hooks/queries";
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  toQueryFilters,
  useSalaryFilters,
  type SortKey,
  type UIFilters,
} from "@/hooks/useSalaryFilters";
import { passesTrustFilter } from "@/lib/trust";

const PAGE = 25;

function SalariesView() {
  const { filters, setFilters } = useSalaryFilters();

  // Sidebar edits are local and pushed to the URL with a short debounce (sliders fire a lot).
  const [draft, setDraft] = React.useState<UIFilters>(filters);
  React.useEffect(() => setDraft(filters), [filters]);
  React.useEffect(() => {
    if (draft === filters) return;
    const id = setTimeout(() => setFilters(draft), 250);
    return () => clearTimeout(id);
  }, [draft, filters, setFilters]);

  const queryFilters = React.useMemo(() => toQueryFilters(filters), [filters]);
  const salaries = useSalaries(queryFilters);
  const trust = useTrustIndex();
  const [shown, setShown] = React.useState(PAGE);
  React.useEffect(() => setShown(PAGE), [filters]);

  const all = salaries.data?.data;
  const visible = React.useMemo(() => {
    if (!all) return [];
    const rows = all.filter((e) => passesTrustFilter(trust.index?.get(e.key), filters.trust));
    const score = (k: string) => trust.index?.get(k as `0x${string}`)?.score ?? 0;
    if (filters.sort === "ctc") rows.sort((a, b) => b.ctc - a.ctc);
    else if (filters.sort === "trust") rows.sort((a, b) => score(b.key) - score(a.key));
    else rows.sort((a, b) => b.createdAt - a.createdAt);
    return rows;
  }, [all, trust.index, filters.trust, filters.sort]);
  const hidden = (all?.length ?? 0) - visible.length;

  const loading = salaries.isLoading || (trust.isLoading && !trust.index);
  const count = activeFilterCount(filters);
  const setSort = (sort: SortKey) => setFilters({ ...filters, sort });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-6 flex flex-col gap-2 sm:mb-8">
        <h1 className="text-4xl font-extrabold sm:text-5xl">Salaries</h1>
        <p className="max-w-2xl text-muted">
          Every number below is an Arkiv entity. Filter it, check the query, run it yourself.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
        {/* Desktop sidebar */}
        <aside aria-label="Filters" className="hidden md:block">
          <div className="sticky top-24 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Filters</h2>
              {count > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setDraft({ ...DEFAULT_FILTERS, sort: filters.sort })}>
                  <RotateCcw /> Reset
                </Button>
              )}
            </div>
            <FilterFields value={draft} onChange={setDraft} />
          </div>
        </aside>

        <section aria-label="Results" className="flex min-w-0 flex-col gap-4">
          {/* Mobile sticky filter bar */}
          <div className="sticky top-16 z-30 -mx-4 flex gap-2 border-b border-border bg-bg/90 px-4 py-2 backdrop-blur md:hidden">
            <FilterDrawer value={filters} onApply={setFilters} />
            <label className="sr-only" htmlFor="sort-mobile">
              Sort
            </label>
            <div className="w-36">
              <NativeSelect id="sort-mobile" value={filters.sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                {SORT_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          {salaries.isError ? (
            <ErrorState error={salaries.error} onRetry={() => salaries.refetch()} />
          ) : (
            <>
              <AggregatePanel entries={visible} loading={loading}>
                <QueryReveal queries={[salaries.data?.query]} />
              </AggregatePanel>

              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-muted" aria-live="polite">
                  {loading ? "Loading from Arkiv…" : (
                    <>
                      <span className="tabular font-semibold text-text">{visible.length}</span> salar{visible.length === 1 ? "y" : "ies"}
                      {hidden > 0 && (
                        <button
                          type="button"
                          onClick={() => setFilters({ ...filters, trust: "all" })}
                          className="ml-2 inline-flex items-center gap-1 text-accent-ink hover:underline cursor-pointer"
                        >
                          <EyeOff className="size-3.5" aria-hidden /> {hidden} low-trust hidden — show
                        </button>
                      )}
                    </>
                  )}
                </p>
                <div className="hidden items-center gap-2 md:flex lg:hidden">
                  <label htmlFor="sort-md" className="text-muted">
                    Sort
                  </label>
                  <div className="w-36">
                    <NativeSelect id="sort-md" value={filters.sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                      {SORT_OPTS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
              </div>

              {loading ? (
                <ResultsSkeleton />
              ) : visible.length === 0 ? (
                <EmptyState
                  title="No salaries match."
                  body="Loosen filters or be the first."
                  action={
                    <div className="flex flex-wrap gap-2">
                      <Button asChild>
                        <Link href="/submit/">Add your salary</Link>
                      </Button>
                      <Button variant="secondary" onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })}>
                        Clear filters
                      </Button>
                    </div>
                  }
                />
              ) : (
                <>
                  <div className="hidden lg:block">
                    <SalaryTable rows={visible.slice(0, shown)} trust={trust.index} sort={filters.sort} onSort={setSort} />
                  </div>
                  <ul className="flex flex-col gap-3 lg:hidden">
                    {visible.slice(0, shown).map((e, i) => (
                      <SalaryCard key={e.key} e={e} trust={trust.index?.get(e.key)} index={i} />
                    ))}
                  </ul>
                  {shown < visible.length && (
                    <Button variant="secondary" className="self-center" onClick={() => setShown((s) => s + PAGE)}>
                      Show more ({visible.length - shown} left)
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default function SalariesPage() {
  return (
    <React.Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><ResultsSkeleton /></div>}>
      <SalariesView />
    </React.Suspense>
  );
}
