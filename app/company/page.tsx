"use client";

import { ArrowLeft, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { EmptyState, ErrorState } from "@/components/common";
import { FlagBanner, Monogram, RatingBars, ReviewCard, SalaryMatrix, Stars } from "@/components/company";
import { QueryReveal } from "@/components/salary/QueryReveal";
import { SalaryCard } from "@/components/salary/Results";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/overlays";
import { Card, Skeleton } from "@/components/ui/primitives";
import { useCompany } from "@/hooks/queries";
import { useNow } from "@/hooks/useNow";
import { cityLabel, getCompany } from "@/lib/catalog";
import { companyStats, FLAG_THRESHOLD, isFlagged } from "@/lib/companyStats";
import { salariesQuery } from "@/lib/data/query";
import { formatINRCompact } from "@/lib/format";

const TABS = ["salaries", "reviews", "entries"] as const;
type Tab = (typeof TABS)[number];

function CompanyView() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const id = sp.get("name") ?? "";
  const tabParam = sp.get("tab");
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "salaries";
  const company = getCompany(id);
  const data = useCompany(company ? id : undefined);
  const [showFlagged, setShowFlagged] = React.useState(false);
  const now = useNow();

  if (!company) {
    return (
      <EmptyState
        title="No such company in the catalog."
        body="Tankha only lists fictional catalog companies."
        action={<Button asChild><Link href="/companies/">All companies</Link></Button>}
      />
    );
  }

  const reviews = data.reviews.data?.data ?? [];
  const stats = data.all ? companyStats(id, data.all, data.index, reviews) : undefined;
  const flagBanner = !!stats && stats.flaggedPct > FLAG_THRESHOLD;
  const hideFlagged = flagBanner && !showFlagged;
  const salaries = hideFlagged ? data.salaries.filter((s) => !isFlagged(data.index?.get(s.key))) : data.salaries;
  const shownReviews = hideFlagged ? reviews.filter((r) => !stats!.flaggedWallets.has(r.owner.toLowerCase())) : reviews;

  const setTab = (t: string) => {
    const p = new URLSearchParams(sp.toString());
    p.set("tab", t);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Monogram name={company.label} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-extrabold sm:text-5xl">{company.label}</h1>
          <p className="mt-1 flex items-center gap-1 text-muted">
            {company.industry} · <MapPin className="size-4" aria-hidden /> {cityLabel(company.hq)}
          </p>
        </div>
        <Button asChild className="sm:self-start">
          <Link href="/submit/"><Plus /> Add yours</Link>
        </Button>
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-border bg-border sm:grid-cols-4">
        {[
          ["Entries", stats ? String(stats.entries) : null],
          ["Median CTC", stats ? (stats.medianCtc != null ? formatINRCompact(stats.medianCtc) : "—") : null],
          ["Avg rating", stats ? (stats.avgRating != null ? <Stars key="s" value={stats.avgRating} className="text-2xl" /> : "—") : null],
          ["High trust", stats ? (stats.highTrustPct != null ? `${stats.highTrustPct}%` : "—") : null],
        ].map(([label, value]) => (
          <div key={label as string} className="bg-surface p-4 sm:p-5">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="tabular font-display text-2xl font-bold sm:text-3xl">{value ?? <Skeleton className="mt-1 h-8 w-20" />}</dd>
          </div>
        ))}
      </dl>

      {flagBanner && <FlagBanner pct={stats!.flaggedPct} showing={showFlagged} onToggle={() => setShowFlagged((s) => !s)} />}

      {data.isError ? (
        <ErrorState error={data.error} onRetry={data.refetch} />
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="salaries">Salaries</TabsTrigger>
            <TabsTrigger value="reviews">Reviews <span className="tabular text-muted">{shownReviews.length}</span></TabsTrigger>
            <TabsTrigger value="entries">Entries <span className="tabular text-muted">{salaries.length}</span></TabsTrigger>
          </TabsList>

          <TabsContent value="salaries" className="pt-6">
            {data.isLoading ? <Skeleton className="h-64 w-full" /> : <SalaryMatrix company={id} entries={salaries} />}
            <QueryReveal className="mt-2" queries={[salariesQuery({ companies: [id] })]} />
          </TabsContent>

          <TabsContent value="reviews" className="pt-6">
            {data.reviews.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : shownReviews.length === 0 ? (
              <EmptyState title="No reviews yet." body="Be the first to rate this company." action={<Button asChild><Link href="/submit/">Write a review</Link></Button>} />
            ) : (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
                <Card className="h-fit p-5 lg:sticky lg:top-24">
                  <p className="mb-4 text-sm text-muted">Average of {shownReviews.length} reviews</p>
                  <RatingBars reviews={shownReviews} />
                </Card>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {shownReviews.map((r) => (
                    <li key={r.key}>
                      <ReviewCard review={r} now={now} flagged={stats?.flaggedWallets.has(r.owner.toLowerCase())} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <QueryReveal className="mt-2" queries={[data.reviews.data?.query]} />
          </TabsContent>

          <TabsContent value="entries" className="pt-6">
            {data.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {[...salaries].sort((a, b) => b.createdAt - a.createdAt).map((e, i) => (
                  <SalaryCard key={e.key} e={e} trust={data.index?.get(e.key)} index={i} />
                ))}
              </ul>
            )}
            <QueryReveal className="mt-2" queries={[salariesQuery({ companies: [id] })]} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default function CompanyPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
        <Link href="/companies/"><ArrowLeft /> All companies</Link>
      </Button>
      <React.Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <CompanyView />
      </React.Suspense>
    </div>
  );
}
