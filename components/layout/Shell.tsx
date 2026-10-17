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
import { IdentityChip } from "@/components/social/identity";
import { SearchTrigger } from "./CommandMenu";
import { StatusPill } from "./StatusPill";

const NAV = [
  { href: "/salaries/", label: "Packages" },
  { href: "/companies/", label: "Communities" },
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
    <Link href="/" className={cn("group inline-flex shrink-0 items-center gap-2 rounded-md", className)} aria-label="Tankha home">
      <span
        aria-hidden
        className="grid size-9 place-items-center rounded-[11px] bg-gradient-primary glow font-display text-lg font-semibold text-accent-fg transition-transform group-hover:-rotate-6"
      >
        ₹
      </span>
      <span className="font-display text-xl font-semibold tracking-tight">Tankha</span>
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
    <div role="status" className="bg-gradient-primary px-4 py-1.5 text-center text-xs font-semibold text-accent-fg">
      Demo data — not reading from Arkiv
    </div>
  );
}

export function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/55 backdrop-blur-2xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 min-[400px]:px-4 sm:gap-3 sm:px-6">
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
        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
          <SearchTrigger className="hidden lg:inline-flex" />
          <StatusPill className="max-[380px]:px-2" />
          <span className="hidden sm:inline-flex">
            <ThemeToggle />
          </span>
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href="/submit/" aria-label="Create post">
              <Plus /> <span className="hidden lg:inline">Create</span>
            </Link>
          </Button>
          <IdentityChip />
        </div>
      </div>
    </header>
  );
}

const TABS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/salaries/", label: "Packages", Icon: Table2 },
  { href: "/submit/", label: "Post", Icon: Plus, raised: true },
  { href: "/companies/", label: "Communities", short: "Groups", Icon: Building2 },
  { href: "/verify/", label: "Verify", Icon: ShieldCheck },
];

export function MobileTabBar() {
  const path = usePathname();
  return (
    <nav
      aria-label="Mobile"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/60 backdrop-blur-2xl backdrop-saturate-150 md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {TABS.map(({ href, label, short, Icon, raised }: (typeof TABS)[number] & { short?: string }) => {
          const active = isActive(path, href);
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 whitespace-nowrap text-[10px] font-medium min-[380px]:text-[11px]",
                  active ? "text-text" : "text-muted",
                )}
              >
                {raised ? (
                  <span className="-mt-6 grid size-14 place-items-center rounded-full bg-gradient-primary text-accent-fg glow ring-4 ring-bg">
                    <Icon className="size-6" aria-hidden />
                  </span>
                ) : (
                  <Icon className={cn("size-5", active && "text-accent-ink")} aria-hidden />
                )}
                {short ? (
                  <>
                    <span className="min-[380px]:hidden">{short}</span>
                    <span className="hidden min-[380px]:inline">{label}</span>
                  </>
                ) : (
                  <span>{label}</span>
                )}
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
    <footer className="mt-24 border-t border-border bg-bg/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-sm flex-col gap-3">
          <Logo />
          <p className="text-sm text-muted">
            Salaries no one can delete. Anonymous company discussions, packages and reviews — stored on Arkiv, queryable by anyone.
          </p>
          <p className="text-xs text-muted">Built for the CROPS Censorship Resistance track · MIT</p>
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
