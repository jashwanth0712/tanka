"use client";

import { ArrowLeft, Briefcase, Clock, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { EmptyState, ErrorState, Mono, TimeAgo } from "@/components/common";
import { ConfirmButton, OnChainPanel } from "@/components/entry";
import { LifeBar } from "@/components/entry/LifeBar";
import { QueryReveal } from "@/components/salary/QueryReveal";
import { TrustBreakdown, TrustRing } from "@/components/trust";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/primitives";
import { useConfirmations, useSalary, useTrust } from "@/hooks/queries";
import { useNow } from "@/hooks/useNow";
import { cityLabel, companyName, levelLabel, roleLabel } from "@/lib/catalog";
import type { EntityKey } from "@/lib/data/types";
import { salaryAttributes } from "@/lib/data/schema";
import { formatINR, formatINRCompact } from "@/lib/format";

function EntryView() {
  const key = (useSearchParams().get("key") ?? "") as EntityKey;
  const valid = /^0x[0-9a-fA-F]{6,}$/.test(key);
  const salary = useSalary(valid ? key : undefined);
  const { trust } = useTrust(valid ? key : undefined);
  const confs = useConfirmations(valid ? key : undefined);
  const now = useNow();

  if (!valid) {
    return <EmptyState title="That's not an entity key." body="Entry links look like /entry?key=0x…" action={<Button asChild><Link href="/salaries/">Browse salaries</Link></Button>} />;
  }
  if (salary.isError) return <ErrorState error={salary.error} onRetry={() => salary.refetch()} />;
  if (salary.isLoading) return <EntrySkeleton />;
  const e = salary.data?.data;
  if (!e) {
    return (
      <EmptyState
        title="Not found — or expired."
        body="Entries live ~18 months unless someone confirms them. This one may have expired, or the key is wrong."
        action={<Button asChild><Link href="/salaries/">Browse salaries</Link></Button>}
      />
    );
  }

  const confirmations = confs.data?.data ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-8">
      <div className="flex min-w-0 flex-col gap-6">
        <Card className="p-5 sm:p-8">
          <Link href={`/company/?name=${e.company}`} className="text-sm font-semibold text-accent-ink hover:underline">
            {companyName(e.company)}
          </Link>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            {roleLabel(e.role)} <span className="text-muted">· {levelLabel(e.level)}</span>
          </h1>
          <p className="mt-6 text-sm font-medium text-muted">Annual CTC</p>
          <p className="font-display text-6xl font-extrabold leading-none tracking-tight sm:text-7xl">{formatINRCompact(e.ctc)}</p>
          <p className="tabular mt-2 text-sm text-muted">
            {formatINR(e.ctc)}
            {e.baseSalary != null && <> · base {formatINR(e.baseSalary)}</>}
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            <li className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden />{cityLabel(e.city)}</li>
            <li className="inline-flex items-center gap-1.5"><Briefcase className="size-4" aria-hidden />{e.yoe} yrs experience</li>
            <li className="inline-flex items-center gap-1.5"><Clock className="size-4" aria-hidden />Posted <TimeAgo ts={e.createdAt} now={now} /></li>
          </ul>
        </Card>

        <Card className="flex flex-col gap-5 p-5 sm:p-8">
          <div>
            <h2 className="font-display text-xl font-bold">Life left</h2>
            <p className="text-sm text-muted">Stale salaries mislead, so entries expire. Anyone who knows it&apos;s still right can extend it.</p>
          </div>
          <LifeBar expiresAt={e.expiresAt} createdAt={e.createdAt} size="lg" />
          <ConfirmButton entryKey={e.key} owner={e.owner} />
        </Card>

        <OnChainPanel entityKey={e.key} owner={e.owner} expiresAt={e.expiresAt} attributes={salaryAttributes(e)} />
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 font-display text-xl font-bold">Trust</h2>
          {trust ? (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-5">
                <TrustRing trust={trust} />
                <p className="text-sm text-muted">
                  Scored from Arkiv data alone — confirmations, how it compares to peers, the posting wallet&apos;s history and freshness. No identities involved.
                </p>
              </div>
              <TrustBreakdown trust={trust} />
            </div>
          ) : (
            <Skeleton className="h-56 w-full" />
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <Users className="size-5" aria-hidden /> Confirmations
            <span className="tabular text-base text-muted">{confirmations.length}</span>
          </h2>
          {confs.isLoading ? (
            <Skeleton className="mt-4 h-20 w-full" />
          ) : confirmations.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nobody has confirmed this yet. If it matches what you know, be the first.</p>
          ) : (
            <ul className="mt-3 flex flex-col">
              {confirmations.map((c) => (
                <li key={c.key} className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-0">
                  <Mono value={c.owner} />
                  <TimeAgo ts={c.createdAt} now={now} className="text-muted" />
                </li>
              ))}
            </ul>
          )}
          <QueryReveal className="mt-2" queries={[confs.data?.query]} />
        </Card>
      </div>
    </div>
  );
}

function EntrySkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card className="p-8">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-8 w-64" />
        <Skeleton className="mt-8 h-16 w-56" />
        <Skeleton className="mt-6 h-4 w-72" />
      </Card>
      <Card className="p-6">
        <Skeleton className="h-28 w-28 rounded-full" />
        <Skeleton className="mt-6 h-32 w-full" />
      </Card>
    </div>
  );
}

export default function EntryPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
        <Link href="/salaries/"><ArrowLeft /> All salaries</Link>
      </Button>
      <React.Suspense fallback={<EntrySkeleton />}>
        <EntryView />
      </React.Suspense>
    </div>
  );
}
