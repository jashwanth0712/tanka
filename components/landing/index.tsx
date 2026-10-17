"use client";

import { ArrowRight, Database, Hourglass, Laptop, Plus, ScanSearch, ShieldCheck, Terminal, Globe } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import * as React from "react";
import { CountUp, LiveDot, Money, SectionHeading, TimeAgo } from "@/components/common";
import { CompanyCard } from "@/components/company";
import { LifeBar } from "@/components/entry/LifeBar";
import { SearchTrigger } from "@/components/layout/CommandMenu";
import { TrustBadge } from "@/components/trust";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/primitives";
import { useAllReviews, useRecent, useStats, useTrustIndex } from "@/hooks/queries";
import { useNow } from "@/hooks/useNow";
import { cityLabel, COMPANIES, companyName, levelLabel, roleLabel } from "@/lib/catalog";
import { companyStats } from "@/lib/companyStats";
import { RPC_ENDPOINTS } from "@/lib/constants";

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div aria-hidden className="hero-grid pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-20 lg:pb-24 lg:pt-28">
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted"
        >
          <LiveDot /> Live on Arkiv · Tiramisu testnet
        </motion.p>
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.05 }}
          className="max-w-4xl text-[44px] font-extrabold leading-[0.95] tracking-[-0.035em] sm:text-6xl lg:text-[72px]"
        >
          Salaries no one <span className="text-accent-ink">can delete.</span>
        </motion.h1>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.12 }}
          className="mt-6 max-w-2xl text-lg text-muted sm:text-xl"
        >
          Anonymous salaries and workplace reviews, stored on Arkiv. No company can take them down. Anyone can query them.
        </motion.p>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.2 }}
          className="mt-8 flex max-w-2xl flex-col gap-3"
        >
          <SearchTrigger wide />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/submit/"><Plus /> Add your salary</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/verify/">Verify it yourself <ArrowRight /></Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function LiveStats() {
  const { data } = useStats();
  const items = [
    { label: "Entries on Arkiv", value: data?.entries },
    { label: "Companies", value: data?.companies },
    { label: "Confirmations", value: data?.confirmations },
    { label: "Latest block", value: data?.latestBlock, mono: true },
  ];
  return (
    <section aria-label="Live stats" className="border-b border-border">
      <dl className="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4">
        {items.map((s, i) => (
          <div
            key={s.label}
            className={`flex flex-col gap-1 px-4 py-6 sm:px-6 sm:py-8 ${i % 2 === 1 ? "border-l border-border" : ""} ${i >= 2 ? "border-t border-border lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
          >
            <dt className="flex items-center gap-2 text-xs text-muted sm:text-sm">
              <LiveDot className="size-1.5" /> {s.label}
            </dt>
            <dd className={s.mono ? "font-mono text-xl text-chain sm:text-3xl" : "font-display text-3xl font-extrabold sm:text-5xl"}>
              {s.value == null ? (
                <Skeleton className="h-9 w-24" />
              ) : s.mono ? (
                <span className="tabular">#{s.value.toLocaleString("en-IN")}</span>
              ) : (
                <CountUp value={s.value} />
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function LiveFeed() {
  const recent = useRecent(8);
  const trust = useTrustIndex();
  const now = useNow(10_000);
  const reduce = useReducedMotion();
  const rows = recent.data?.data ?? [];
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading eyebrow="Live feed" title="Just posted">
          Pulled from Arkiv every 10 seconds. Nothing here passes through our server — there isn&apos;t one.
        </SectionHeading>
        <Button asChild variant="secondary" className="mb-6 sm:mb-8">
          <Link href="/salaries/">All salaries <ArrowRight /></Link>
        </Button>
      </div>
      {recent.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" aria-live="polite">
          <AnimatePresence initial={false}>
            {rows.map((e, i) => (
              <motion.li
                key={e.key}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i, 10) * 0.03, ease }}
              >
                <Card className="relative flex items-center gap-4 p-4 transition-colors hover:border-muted/50">
                  <div className="min-w-0 flex-1">
                    <Link href={`/entry/?key=${e.key}`} className="font-semibold after:absolute after:inset-0 after:content-['']">
                      {companyName(e.company)}
                    </Link>
                    <p className="truncate text-sm text-muted">
                      {roleLabel(e.role)} · {levelLabel(e.level)} · {cityLabel(e.city)}
                    </p>
                    <div className="relative z-10 mt-2 flex items-center gap-3 text-xs text-muted">
                      <TrustBadge trust={trust.index?.get(e.key)} size="sm" />
                      <TimeAgo ts={e.createdAt} now={now} />
                      <LifeBar expiresAt={e.expiresAt} size="xs" className="hidden min-[400px]:flex" />
                    </div>
                  </div>
                  <p className="font-display text-2xl font-bold sm:text-3xl"><Money value={e.ctc} /></p>
                </Card>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

export function HowItWorks() {
  const cards = [
    { Icon: Database, title: "Stored on Arkiv", body: "Every salary, review and confirmation is an Arkiv entity. No central database to subpoena, hack or switch off." },
    { Icon: ShieldCheck, title: "Verified by data, not identity", body: "A trust score built only from on-chain signals: confirmations, fit with peers, wallet history, freshness." },
    { Icon: Hourglass, title: "Self-cleaning", body: "Entries expire after ~18 months unless someone confirms they're still accurate. Stale numbers fade out." },
  ];
  return (
    <section className="border-y border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <SectionHeading eyebrow="How it works" title="Three rules. No exceptions." />
        <ul className="grid gap-4 md:grid-cols-3">
          {cards.map(({ Icon, title, body }, i) => (
            <li key={title}>
              <Card className="h-full p-6">
                <span className="font-mono text-xs text-muted">0{i + 1}</span>
                <Icon className="mt-4 size-7 text-accent-ink" aria-hidden />
                <h3 className="mt-4 text-2xl font-bold">{title}</h3>
                <p className="mt-2 text-muted">{body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function TakedownDiagram() {
  const clients = [
    { Icon: Globe, label: "This website", sub: "Vercel · IPFS mirrors" },
    { Icon: Terminal, label: "CLI", sub: "pnpm tankha query" },
    { Icon: Laptop, label: "Any client", sub: "curl · scripts · your app" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div>
          <SectionHeading eyebrow="Censorship resistance" title="Try to take it down.">
            Send a legal notice to this website and it can go dark. The data doesn&apos;t. It lives on Arkiv, reachable through
            any RPC endpoint, readable by any client. Kill one window, the others stay open.
          </SectionHeading>
          <Button asChild>
            <Link href="/verify/"><ScanSearch /> Verify it yourself</Link>
          </Button>
        </div>
        <figure aria-label="Many clients talk to many RPC endpoints, all reading the same Arkiv data" className="flex flex-col items-stretch gap-3">
          <ul className="grid grid-cols-3 gap-2 sm:gap-3">
            {clients.map(({ Icon, label, sub }) => (
              <li key={label} className="flex flex-col items-center gap-1 rounded-[14px] border border-border bg-surface p-3 text-center">
                <Icon className="size-5 text-accent-ink" aria-hidden />
                <span className="text-sm font-semibold">{label}</span>
                <span className="hidden text-[11px] text-muted sm:block">{sub}</span>
              </li>
            ))}
          </ul>
          <Connector />
          <ul className="grid grid-cols-3 gap-2 sm:gap-3">
            {RPC_ENDPOINTS.map((r, i) => (
              <li key={r.url} className="flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 py-2 font-mono text-[11px] text-chain">
                <LiveDot className="size-1.5" /> RPC {i + 1}
              </li>
            ))}
          </ul>
          <Connector />
          <div className="rounded-[14px] border border-accent/50 bg-accent/10 p-5 text-center">
            <p className="font-display text-2xl font-extrabold">Arkiv</p>
            <p className="font-mono text-xs text-muted">salary · review · confirmation entities</p>
          </div>
          <figcaption className="text-center text-xs text-muted">No server of ours sits in this picture.</figcaption>
        </figure>
      </div>
    </section>
  );
}

function Connector() {
  return (
    <div aria-hidden className="grid grid-cols-3">
      {[0, 1, 2].map((i) => (
        <span key={i} className="mx-auto h-6 w-px bg-gradient-to-b from-border via-accent/60 to-border" />
      ))}
    </div>
  );
}

export function TopCompanies() {
  const trust = useTrustIndex();
  const reviews = useAllReviews(COMPANIES.map((c) => c.id));
  const rows = React.useMemo(() => {
    if (!trust.all) return [];
    return COMPANIES.map((c) => ({ company: c, stats: companyStats(c.id, trust.all!, trust.index, reviews.byCompany.get(c.id)) }))
      .sort((a, b) => b.stats.entries - a.stats.entries)
      .slice(0, 6);
  }, [trust.all, trust.index, reviews.byCompany]);
  return (
    <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading eyebrow="Companies" title="Where people are posting" />
        <Button asChild variant="secondary" className="mb-6 sm:mb-8">
          <Link href="/companies/">All companies <ArrowRight /></Link>
        </Button>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.length === 0
          ? Array.from({ length: 6 }, (_, i) => <li key={i}><Skeleton className="h-48" /></li>)
          : rows.map((r) => (
              <li key={r.company.id}>
                <CompanyCard company={r.company} stats={r.stats} />
              </li>
            ))}
      </ul>
    </section>
  );
}
