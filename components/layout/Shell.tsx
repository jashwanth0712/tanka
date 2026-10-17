"use client";

import { Building2, Home, Moon, Plus, ShieldCheck, Sun, Table2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/useNow";
import { isMock } from "@/lib/data";
import { DEMO_VIDEO_URL, FRICTION_URL, REPO_URL, SCHEMA_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { SearchTrigger } from "./CommandMenu";
import { StatusPill } from "./StatusPill";

const NAV = [
  { href: "/salaries/", label: "Salaries" },
  { href: "/companies/", label: "Companies" },
  { href: "/verify/", label: "Verify" },
];

function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  const base = href.replace(/\/$/, "");
  // /company?name=… belongs to the Companies tab.
  if (base === "/companies") return path.startsWith("/compan");
  return path.startsWith(base);
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2 rounded-md", className)} aria-label="Tankha home">
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-[9px] bg-accent font-display text-lg font-extrabold text-accent-fg transition-transform group-hover:-rotate-6"
      >
        ₹
      </span>
      <span className="font-display text-xl font-extrabold tracking-tight">Tankha</span>
    </Link>
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const dark = !mounted || resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}

export function DemoBanner() {
  if (!isMock) return null;
  return (
    <div role="status" className="bg-accent px-4 py-1.5 text-center text-xs font-semibold text-accent-fg">
      Demo data — not reading from Arkiv
    </div>
  );
}

export function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(path, n.href) ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-text",
                isActive(path, n.href) && "text-text",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SearchTrigger className="hidden md:inline-flex" />
          <StatusPill className="max-[380px]:px-2" />
          <ThemeToggle />
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href="/submit/">
              <Plus /> Add salary
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

const TABS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/salaries/", label: "Salaries", Icon: Table2 },
  { href: "/submit/", label: "Add", Icon: Plus, raised: true },
  { href: "/companies/", label: "Companies", Icon: Building2 },
  { href: "/verify/", label: "Verify", Icon: ShieldCheck },
];

export function MobileTabBar() {
  const path = usePathname();
  return (
    <nav
      aria-label="Mobile"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {TABS.map(({ href, label, Icon, raised }) => {
          const active = isActive(path, href);
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-text" : "text-muted",
                )}
              >
                {raised ? (
                  <span className="-mt-6 grid size-14 place-items-center rounded-full bg-accent text-accent-fg shadow-raised ring-4 ring-bg">
                    <Icon className="size-6" aria-hidden />
                  </span>
                ) : (
                  <Icon className={cn("size-5", active && "text-accent-ink")} aria-hidden />
                )}
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Footer() {
  const links = [
    { href: REPO_URL, label: "GitHub" },
    { href: SCHEMA_URL, label: "schema.md" },
    { href: FRICTION_URL, label: "friction.md" },
    { href: DEMO_VIDEO_URL, label: "Demo video" },
  ];
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-sm flex-col gap-3">
          <Logo />
          <p className="text-sm text-muted">
            Salaries no one can delete. Anonymous, stored on Arkiv, queryable by anyone.
          </p>
          <p className="font-mono text-xs text-muted">Built for the CROPS Censorship Resistance track · MIT</p>
        </div>
        <ul className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
          {links.map((l) => (
            <li key={l.label}>
              <a href={l.href} className="text-muted hover:text-text" target="_blank" rel="noreferrer">
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <Link href="/verify/" className="text-muted hover:text-text">
              Verify it yourself
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
