"use client";

import { Clock, EyeOff, Flame, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { EmptyState, ErrorState } from "@/components/common";
import { QueryReveal } from "@/components/salary/QueryReveal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { useFeed } from "@/hooks/social";
import type { Post } from "@/lib/data/types";
import { tallyFor, type FeedSort } from "@/lib/social";
import type { TrustFilter } from "@/lib/trust";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/wallet/useWallet";
import { IdentityAvatar } from "./identity";
import { PostCard, PostSkeleton } from "./PostCard";

const SORTS: { value: FeedSort; label: string; Icon: typeof Flame }[] = [
  { value: "hot", label: "Hot", Icon: Flame },
  { value: "new", label: "New", Icon: Clock },
  { value: "top", label: "Top", Icon: TrendingUp },
];
const TRUSTS: { value: TrustFilter; label: string }[] = [
  { value: "medium", label: "Medium+" },
  { value: "all", label: "All" },
  { value: "high", label: "High only" },
];
const PAGE = 15;

/**
 * Keep the order stable while the user votes (Reddit doesn't reshuffle under your cursor).
 * The order is recomputed when sort/filter/community change; new posts are prepended.
 */
function useStableOrder(posts: Post[], signature: string) {
  const [state, setState] = React.useState<{ sig: string; keys: string[] }>({ sig: "", keys: [] });
  const keys = posts.map((p) => p.key);
  let order = state.keys;
  if (state.sig !== signature || (state.keys.length === 0 && keys.length > 0)) {
    order = keys;
    setState({ sig: signature, keys });
  } else {
    const known = new Set(state.keys);
    const fresh = keys.filter((k) => !known.has(k));
    if (fresh.length) {
      order = [...fresh, ...state.keys];
      setState({ sig: signature, keys: order });
    }
  }
  const byKey = new Map(posts.map((p) => [p.key as string, p]));
  return order.map((k) => byKey.get(k)).filter(Boolean) as Post[];
}

export function Feed({ company }: { company?: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const wallet = useWallet();
  const sortParam = sp.get("sort");
  const trustParam = sp.get("trust");
  const sort: FeedSort = sortParam === "new" || sortParam === "top" ? sortParam : "hot";
  const trust: TrustFilter = trustParam === "all" || trustParam === "high" ? trustParam : "medium";
  const [shown, setShown] = React.useState(PAGE);

  const feed = useFeed({ company, sort, trust });
  const signature = `${company ?? ""}|${sort}|${trust}|${feed.isLoading}`;
  const ordered = useStableOrder(feed.posts, signature);
  const [lastSig, setLastSig] = React.useState(signature);
  if (lastSig !== signature) {
    setLastSig(signature);
    setShown(PAGE);
  }

  const setParam = (k: string, v: string, def: string) => {
    const p = new URLSearchParams(sp.toString());
    if (v === def) p.delete(k);
    else p.set(k, v);
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Create post bar */}
      <Card className="flex items-center gap-3 p-2.5 pl-3">
        <IdentityAvatar address={wallet.address} size={32} />
        <Link
          href="/submit/"
          className="flex h-10 flex-1 items-center rounded-full border border-border bg-surface-2 px-4 text-sm text-muted hover:border-muted/50"
        >
          {company ? `Post to c/${company}…` : "Share a salary or review, anonymously…"}
        </Link>
        <Button asChild size="icon-sm" aria-label="Create post">
          <Link href="/submit/"><Plus /></Link>
        </Button>
      </Card>

      {/* Sort + trust */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Sort posts" className="flex gap-1">
          {SORTS.map(({ value, label, Icon }) => (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={sort === value}
              onClick={() => setParam("sort", value, "hot")}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors cursor-pointer",
                sort === value ? "bg-surface-2 text-text" : "text-muted hover:bg-surface-2/60 hover:text-text",
              )}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted">
          <span className="hidden sm:inline">Trust</span>
          <select
            aria-label="Trust filter"
            value={trust}
            onChange={(e) => setParam("trust", e.target.value, "medium")}
            className="h-9 rounded-full border border-border bg-surface px-3 text-xs font-semibold text-text cursor-pointer"
          >
            {TRUSTS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
      </div>

      {feed.hidden > 0 && trust !== "all" && (
        <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
          <EyeOff className="size-4" aria-hidden />
          <span className="tabular font-semibold text-trust-low">{feed.hidden}</span> low-trust post{feed.hidden === 1 ? "" : "s"} hidden ·
          <button type="button" onClick={() => setParam("trust", "all", "medium")} className="font-medium text-accent-ink hover:underline cursor-pointer">
            show them
          </button>
        </p>
      )}

      {feed.isError ? (
        <ErrorState error={feed.error} onRetry={feed.refetch} />
      ) : feed.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, i) => <PostSkeleton key={i} />)}
        </div>
      ) : ordered.length === 0 ? (
        <EmptyState
          title="Nothing here yet."
          body={company ? `Be the first to post in c/${company}.` : "Be the first to post."}
          action={<Button asChild><Link href="/submit/">Create a post</Link></Button>}
        />
      ) : (
        <>
          <ul aria-label="Posts" className="flex flex-col gap-3">
            {ordered.slice(0, shown).map((p, i) => (
              <PostCard
                key={p.key}
                post={p}
                index={i}
                trust={p.kind === "salary" ? feed.trustIndex?.get(p.key) : undefined}
                tally={tallyFor(feed.tallies, p.key)}
                comments={feed.commentCounts.get(p.key.toLowerCase()) ?? 0}
                flagged={p.kind === "review" && feed.flaggedWallets.has(p.owner.toLowerCase())}
                showCommunity={!company}
              />
            ))}
          </ul>
          {shown < ordered.length ? (
            <Button variant="secondary" className="self-center" onClick={() => setShown((s) => s + PAGE)}>
              Load more ({ordered.length - shown})
            </Button>
          ) : (
            <p className="py-4 text-center text-sm text-muted">You&apos;ve reached the end. Everything above is on Arkiv.</p>
          )}
        </>
      )}
      <QueryReveal
        queries={feed.queries}
        note="The feed is these Arkiv queries plus votes and comments. Ranking, trust and filtering happen in your browser — anyone can reproduce this exact order."
      />
    </div>
  );
}
