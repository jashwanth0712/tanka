"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { ErrorState } from "@/components/common";
import { CompanyCard } from "@/components/company";
import { Segmented } from "@/components/ui/multi-select";
import { Card, Input, Skeleton } from "@/components/ui/primitives";
import { useAllReviews, useTrustIndex } from "@/hooks/queries";
import { useAllDiscussions } from "@/hooks/social";
import { parseLinkedInCompany } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { activityOf, useCommunities } from "@/hooks/communities";
import { companyName } from "@/lib/catalog";
import { companyStats } from "@/lib/companyStats";

type Sort = "active" | "recent" | "median" | "rating";
const SORTS: { value: Sort; label: string }[] = [
  { value: "active", label: "Most active" },
  { value: "recent", label: "Newest" },
  { value: "median", label: "Highest median" },
  { value: "rating", label: "Best rated" },
];

export default function CompaniesPage() {
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<Sort>("active");
  const trust = useTrustIndex();
  const reviews = useAllReviews();
  const threads = useAllDiscussions();
  const communities = useCommunities();

  const rows = React.useMemo(() => {
    // Every community that exists on Arkiv right now: the demo companies plus any created from a LinkedIn link.
    const needle = q.trim().toLowerCase();
    const slug = needle.includes("linkedin.com") ? parseLinkedInCompany(needle) : null;
    const terms = [needle, slug].filter((t): t is string => !!t);
    return communities.rows
      .filter(({ company: c }) => !needle || terms.some((t) => `${c.label} ${c.id} ${c.industry} ${c.hq}`.toLowerCase().includes(t)))
      .map((r) => ({ ...r, company: r.company, stats: trust.all ? companyStats(r.company.id, trust.all, trust.index, reviews.byCompany.get(r.company.id)) : undefined }))
      .sort((a, b) => {
        if (sort === "recent") return b.lastActive - a.lastActive;
        const s = (x: typeof a) => (sort === "active" ? activityOf(x) : sort === "median" ? (x.stats?.medianCtc ?? 0) : (x.stats?.avgRating ?? 0));
        return s(b) - s(a);
      });
  }, [q, sort, trust.all, trust.index, reviews.byCompany, communities.rows]);

  const typedSlug = parseLinkedInCompany(q) ?? (/^[a-z0-9][a-z0-9-]{1,63}$/i.test(q.trim()) ? q.trim().toLowerCase() : null);
  const exists = !!typedSlug && communities.rows.some((r) => r.company.id === typedSlug);
  const totalPosts = communities.rows.reduce((n, r) => n + r.threads + r.packages + r.reviews, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-6 flex flex-col gap-2 sm:mb-8">
        <h1 className="text-3xl font-medium sm:text-4xl">Communities</h1>
        <p className="max-w-2xl text-muted">One community per company: salaries, reviews and discussion. Headline numbers come from live Arkiv entries; low-trust entries are left out of medians.</p>
        <p className="text-sm text-muted" aria-live="polite">
          {communities.isLoading ? "Reading communities from Arkiv…" : `${communities.rows.length} communities · ${totalPosts} posts, read live from Arkiv`}
        </p>
      </header>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="company-search" className="sr-only">Search communities</label>
          <Input id="company-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search communities, or paste a LinkedIn company link…" className="pl-9" />
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
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted">No community matches “{q}”.</p>
          {typedSlug && (
            <Button asChild>
              <Link href={`/submit/?type=discussion&company=${typedSlug}`}>
                <Plus /> Start c/{typedSlug} ({companyName(typedSlug)})
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <li key={r.company.id}>
              <CompanyCard company={r.company} stats={r.stats} discussions={threads.isLoading ? undefined : r.threads} />
            </li>
          ))}
        </ul>
      )}
      {typedSlug && !exists && rows.length > 0 && !trust.isLoading && (
        <div className="mt-6">
          <Button asChild variant="secondary">
            <Link href={`/submit/?type=discussion&company=${typedSlug}`}>
              <Plus /> Start c/{typedSlug} ({companyName(typedSlug)})
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
