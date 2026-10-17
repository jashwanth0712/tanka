"use client";

import { Activity, Database, Flame, Home, ScanSearch, ShieldCheck, Table2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import * as React from "react";
import { CountUp, LiveDot } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { useStats } from "@/hooks/queries";
import { COMPANIES, getCompany } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { hueOf } from "./identity";

/** Small round community icon: initials on a deterministic hue. */
export function CommunityIcon({ company, size = 24 }: { company: string; size?: number }) {
  const name = getCompany(company)?.label ?? company;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden
      style={{ "--h": hueOf(name), width: size, height: size, fontSize: size * 0.4 } as React.CSSProperties}
      className="grid shrink-0 place-items-center rounded-full font-display font-extrabold bg-[oklch(0.88_0.07_var(--h))] text-[oklch(0.32_0.09_var(--h))] dark:bg-[oklch(0.34_0.08_var(--h))] dark:text-[oklch(0.92_0.07_var(--h))]"
    >
      {initials}
    </span>
  );
}

function NavItem({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-10 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition-colors",
        active ? "bg-gradient-soft text-text ring-1 ring-accent/30" : "text-muted hover:bg-surface-2 hover:text-text",
      )}
    >
      {children}
    </Link>
  );
}

/** Left rail (desktop): feeds + communities. */
export function LeftRail() {
  const path = usePathname();
  const sp = useSearchParams();
  const current = path.startsWith("/company") ? sp.get("name") : null;
  return (
    <nav aria-label="Communities" className="flex flex-col gap-1">
      <NavItem href="/" active={path === "/"}>
        <Home className="size-4" aria-hidden /> Home
      </NavItem>
      <NavItem href="/salaries/" active={path.startsWith("/salaries")}>
        <Table2 className="size-4" aria-hidden /> Salary search
      </NavItem>
      <NavItem href="/verify/" active={path.startsWith("/verify")}>
        <ScanSearch className="size-4" aria-hidden /> Verify it yourself
      </NavItem>
      <p className="mt-5 px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted">Communities</p>
      {COMPANIES.map((c) => (
        <NavItem key={c.id} href={`/company/?name=${c.id}`} active={current === c.id}>
          <CommunityIcon company={c.id} size={22} />
          <span className="truncate">c/{c.id}</span>
        </NavItem>
      ))}
      <Link href="/companies/" className="mt-1 px-3 py-2 text-xs font-medium text-accent-ink hover:underline">
        All communities →
      </Link>
    </nav>
  );
}

/** Horizontal community chips (mobile / tablet). */
export function CommunityChips() {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden">
      <ul className="flex w-max gap-2">
        {COMPANIES.map((c) => (
          <li key={c.id}>
            <Link
              href={`/company/?name=${c.id}`}
              className="glass inline-flex h-9 items-center gap-1.5 rounded-full pl-1 pr-3 text-xs font-semibold hover:bg-surface-2"
            >
              <CommunityIcon company={c.id} size={26} /> c/{c.id}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Right rail: what this place is, live numbers, verify CTA. */
export function AboutCard() {
  const { data } = useStats();
  return (
    <Card className="overflow-hidden">
      <div className="relative h-16 bg-gradient-primary" aria-hidden><div className="hero-grid absolute inset-0 opacity-60" /></div>
      <div className="-mt-6 flex flex-col gap-3 p-4">
        <span className="grid size-12 place-items-center rounded-[14px] border-4 border-[var(--surface-solid)] bg-gradient-primary font-display text-xl font-extrabold text-accent-fg glow">₹</span>
        <div>
          <p className="font-display text-lg font-extrabold">Salaries no one <span className="text-gradient">can delete.</span></p>
          <p className="mt-1 text-sm text-muted">
            Anonymous salaries, reviews and discussion — every post, vote and comment is an Arkiv entity. No company can take them down.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-3 border-y border-border py-3 text-sm">
          {[
            ["Posts", data?.entries],
            ["Comments", data?.comments],
            ["Confirmations", data?.confirmations],
            ["Block", data?.latestBlock],
          ].map(([label, v]) => (
            <div key={label as string}>
              <dt className="flex items-center gap-1.5 text-xs text-muted"><LiveDot className="size-1.5" />{label}</dt>
              <dd className={cn("font-display text-xl font-bold", label === "Block" && "font-mono text-base font-normal text-chain")}>
                {v == null ? "—" : label === "Block" ? `#${(v as number).toLocaleString("en-IN")}` : <CountUp value={v as number} />}
              </dd>
            </div>
          ))}
        </dl>
        <Button asChild>
          <Link href="/submit/">Create a post</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/verify/"><ScanSearch /> Verify it yourself</Link>
        </Button>
      </div>
    </Card>
  );
}

export function RulesCard() {
  const rules = [
    { Icon: Database, t: "Everything is on Arkiv", d: "Posts, votes, comments, confirmations. No database of ours." },
    { Icon: ShieldCheck, t: "Trust from data, not identity", d: "Low-trust posts are hidden by default. Votes don't change trust." },
    { Icon: Activity, t: "Self-cleaning", d: "Posts expire after ~18 months unless confirmed still accurate." },
    { Icon: Flame, t: "No personal details", d: "Emails, phone numbers, links and @handles are blocked." },
  ];
  return (
    <Card className="p-4">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">House rules</p>
      <ol className="flex flex-col gap-3">
        {rules.map(({ Icon, t, d }) => (
          <li key={t} className="flex gap-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
            <div>
              <p className="text-sm font-semibold">{t}</p>
              <p className="text-xs text-muted">{d}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
