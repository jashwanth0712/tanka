"use client";

import { ScanSearch, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { LiveDot } from "@/components/common";
import { AboutCard, CommunityChips, LeftRail, RulesCard } from "@/components/social/community";
import { Feed } from "@/components/social/Feed";
import { Card } from "@/components/ui/primitives";

const INTRO_KEY = "tankha.intro.dismissed";
const noop = () => () => {};
function readDismissed() {
  try {
    return !!localStorage.getItem(INTRO_KEY);
  } catch {
    return false;
  }
}

/** Compact pitch for small screens, where the right rail isn't shown. */
function IntroCard() {
  const stored = React.useSyncExternalStore(noop, readDismissed, () => false);
  const [hidden, setHidden] = React.useState(false);
  if (hidden || stored) return null;
  return (
    <Card className="relative overflow-hidden p-4 xl:hidden">
      <div aria-hidden className="hero-grid pointer-events-none absolute inset-0" />
      <button
        type="button"
        aria-label="Dismiss intro"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(INTRO_KEY, "1");
          } catch {
            /* ignore */
          }
        }}
        className="absolute right-2 top-2 rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-text cursor-pointer"
      >
        <X className="size-4" />
      </button>
      <p className="relative inline-flex items-center gap-2 font-mono text-[11px] text-muted">
        <LiveDot className="size-1.5" /> Live on Arkiv · Tiramisu
      </p>
      <h1 className="relative mt-1 pr-6 text-2xl font-semibold leading-tight sm:text-3xl">
        Salaries no one <span className="text-accent-ink">can delete.</span>
      </h1>
      <p className="relative mt-1 text-sm text-muted">
        Anonymous salaries, reviews and discussion. Every post, vote and comment is an Arkiv entity — no company can take it down.
      </p>
      <Link href="/verify/" className="relative mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink hover:underline">
        <ScanSearch className="size-4" aria-hidden /> Verify it yourself
      </Link>
    </Card>
  );
}

export default function HomePage() {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 sm:py-8 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_300px]">
      <aside className="hidden lg:block">
        <div className="glass no-scrollbar sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain rounded-[18px] p-2">
          <React.Suspense>
            <LeftRail />
          </React.Suspense>
        </div>
      </aside>
      <div className="flex min-w-0 flex-col gap-4">
        <h1 className="sr-only">Tankha — home feed</h1>
        <IntroCard />
        <CommunityChips />
        <React.Suspense>
          <Feed />
        </React.Suspense>
      </div>
      <aside className="hidden xl:block">
        <div className="no-scrollbar sticky top-20 flex max-h-[calc(100dvh-6rem)] flex-col gap-4 overflow-y-auto overscroll-contain pb-2">
          <AboutCard />
          <RulesCard />
        </div>
      </aside>
    </div>
  );
}
