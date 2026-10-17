"use client";

import { MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { EmptyState } from "@/components/common";
import { FlagBanner, RatingBars, SalaryMatrix, Stars } from "@/components/company";
import { QueryReveal } from "@/components/salary/QueryReveal";
import { CommunityIcon, RulesCard } from "@/components/social/community";
import { Feed } from "@/components/social/Feed";
import { hueOf } from "@/components/social/identity";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/overlays";
import { Card, Skeleton } from "@/components/ui/primitives";
import { useCompany } from "@/hooks/queries";
import { cityLabel, getCompany } from "@/lib/catalog";
import { companyStats, FLAG_THRESHOLD, isFlagged } from "@/lib/companyStats";
import { salariesQuery } from "@/lib/data/query";
import { formatINRCompact } from "@/lib/format";

const TABS = ["posts", "salaries", "ratings"] as const;
type Tab = (typeof TABS)[number];

function CommunityView() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const id = sp.get("name") ?? "";
  const tabParam = sp.get("tab");
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "posts";
  const showingAll = sp.get("trust") === "all";
  const company = getCompany(id);
  const data = useCompany(company ? id : undefined);

  if (!company) {
    return (
      <EmptyState
        title="No such community."
        body="Communities are the fictional catalog companies."
        action={<Button asChild><Link href="/companies/">All communities</Link></Button>}
      />
    );
  }

  const reviews = data.reviews.data?.data ?? [];
  const stats = data.all ? companyStats(id, data.all, data.index, reviews) : undefined;
  const flagBanner = !!stats && stats.flaggedPct > FLAG_THRESHOLD;
  const cleanSalaries = showingAll ? data.salaries : data.salaries.filter((s) => !isFlagged(data.index?.get(s.key)));
  const cleanReviews = showingAll || !stats ? reviews : reviews.filter((r) => !stats.flaggedWallets.has(r.owner.toLowerCase()));

  const setParams = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null) p.delete(k);
      else p.set(k, v);
    }
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  const statItems: [string, React.ReactNode][] = [
    ["Posts", stats ? stats.entries + reviews.length : null],
    ["Median CTC", stats ? (stats.medianCtc != null ? formatINRCompact(stats.medianCtc) : "—") : null],
    ["Rating", stats ? (stats.avgRating != null ? <Stars key="s" value={stats.avgRating} /> : "—") : null],
    ["High trust", stats ? (stats.highTrustPct != null ? `${stats.highTrustPct}%` : "—") : null],
  ];

  return (
    <>
      {/* Banner */}
      <div
        aria-hidden
        style={{ "--h": hueOf(company.label) } as React.CSSProperties}
        className="relative h-24 sm:h-32 bg-[linear-gradient(120deg,oklch(0.88_0.05_var(--h)),oklch(0.94_0.025_calc(var(--h)+60)))] dark:bg-[linear-gradient(120deg,oklch(0.32_0.07_var(--h)),oklch(0.18_0.03_calc(var(--h)+60)))]"
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="relative z-10 -mt-8 flex flex-col gap-3 sm:-mt-10 sm:flex-row sm:items-end">
          <span className="w-fit rounded-full border-4 border-[var(--bg)] glow">
            <CommunityIcon company={id} size={72} />
          </span>
          <div className="min-w-0 flex-1 sm:pb-1">
            <h1 className="truncate text-2xl font-semibold sm:text-4xl">c/{id}</h1>
            <p className="flex flex-wrap items-center gap-1 text-sm text-muted">
              {company.label} · {company.industry} · <MapPin className="size-3.5" aria-hidden /> {cityLabel(company.hq)}
            </p>
          </div>
          <Button asChild className="sm:mb-1">
            <Link href="/submit/"><Plus /> Create post</Link>
          </Button>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-4">
            <dl className="glass grid grid-cols-2 gap-px overflow-hidden rounded-[18px] bg-border sm:grid-cols-4 lg:hidden">
              {statItems.map(([label, value]) => (
                <div key={label} className="bg-[var(--surface-strong)] p-3">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="tabular font-display text-xl font-semibold">{value ?? <Skeleton className="mt-1 h-6 w-16" />}</dd>
                </div>
              ))}
            </dl>

            {flagBanner && (
              <FlagBanner pct={stats!.flaggedPct} showing={showingAll} onToggle={() => setParams({ trust: showingAll ? null : "all" })} />
            )}

            <Tabs value={tab} onValueChange={(t) => setParams({ tab: t === "posts" ? null : t })}>
              <TabsList>
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="salaries">Salary bands</TabsTrigger>
                <TabsTrigger value="ratings">Ratings</TabsTrigger>
              </TabsList>
              <TabsContent value="posts" className="pt-4">
                <Feed company={id} />
              </TabsContent>
              <TabsContent value="salaries" className="pt-4">
                {data.isLoading ? <Skeleton className="h-64 w-full" /> : <SalaryMatrix company={id} entries={cleanSalaries} />}
                <QueryReveal className="mt-2" queries={[salariesQuery({ companies: [id] })]} />
              </TabsContent>
              <TabsContent value="ratings" className="pt-4">
                {data.reviews.isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : cleanReviews.length === 0 ? (
                  <EmptyState title="No reviews yet." body="Be the first to rate this company." action={<Button asChild><Link href="/submit/">Write a review</Link></Button>} />
                ) : (
                  <Card className="p-5">
                    <p className="mb-4 text-sm text-muted">Average of {cleanReviews.length} reviews</p>
                    <RatingBars reviews={cleanReviews} />
                  </Card>
                )}
                <QueryReveal className="mt-2" queries={[data.reviews.data?.query]} />
              </TabsContent>
            </Tabs>
          </div>

          <aside className="hidden lg:block">
            <div className="no-scrollbar sticky top-20 flex max-h-[calc(100dvh-6rem)] flex-col gap-4 overflow-y-auto overscroll-contain pb-2">
              <Card className="p-4">
                <p className="font-medium">About c/{id}</p>
                <p className="mt-1 text-sm text-muted">
                  Salaries, reviews and discussion about {company.label}. Anonymous, on Arkiv, impossible for {company.label} to take down.
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
                  {statItems.map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-muted">{label}</dt>
                      <dd className="tabular font-display text-xl font-semibold">{value ?? <Skeleton className="mt-1 h-6 w-16" />}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
              <RulesCard />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

export default function CommunityPage() {
  return (
    <div className="pb-10">
      <React.Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10"><Skeleton className="h-64 w-full" /></div>}>
        <CommunityView />
      </React.Suspense>
    </div>
  );
}
