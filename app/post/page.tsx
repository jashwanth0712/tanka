"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { EmptyState, ErrorState } from "@/components/common";
import { ConfirmButton, OnChainPanel } from "@/components/entry";
import { LifeBar } from "@/components/entry/LifeBar";
import { QueryReveal } from "@/components/salary/QueryReveal";
import { CommentComposer, CommentThread } from "@/components/social/Comments";
import { CommunityIcon } from "@/components/social/community";
import { PostCard, PostSkeleton } from "@/components/social/PostCard";
import { TrustBreakdown, TrustRing } from "@/components/trust";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/primitives";
import { useConfirmations } from "@/hooks/queries";
import { useComments, useFeed, usePost } from "@/hooks/social";
import { getCompany } from "@/lib/catalog";
import { postAttributes } from "@/lib/data/schema";
import type { EntityKey } from "@/lib/data/types";
import { tallyFor } from "@/lib/social";

function PostView() {
  const key = (useSearchParams().get("key") ?? "") as EntityKey;
  const router = useRouter();
  const valid = /^0x[0-9a-fA-F]{6,}$/.test(key);
  const post = usePost(valid ? key : undefined);
  const comments = useComments(valid ? key : undefined);
  // The feed hook gives us trust, tallies and flagged wallets from the shared cache.
  const feed = useFeed({ sort: "new", trust: "all" });
  const p = post.data?.data;
  const confs = useConfirmations(p?.kind === "salary" ? p.key : undefined);

  if (!valid) {
    return <EmptyState title="That's not a post link." body="Post links look like /post?key=0x…" action={<Button asChild><Link href="/">Back to the feed</Link></Button>} />;
  }
  if (post.isError) return <ErrorState error={post.error} onRetry={() => post.refetch()} />;
  if (post.isLoading) return <PostSkeleton />;
  if (!p) {
    return (
      <EmptyState
        title="Not found — or expired."
        body="Posts live ~18 months unless someone confirms them. This one may have expired, or the link is wrong."
        action={<Button asChild><Link href="/">Back to the feed</Link></Button>}
      />
    );
  }

  const trust = p.kind === "salary" ? feed.trustIndex?.get(p.key) : undefined;
  const flagged = p.kind !== "salary" && feed.flaggedWallets.has(p.owner.toLowerCase());
  const company = getCompany(p.company);
  const list = comments.data?.data ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-5">
        <button type="button" onClick={() => router.back()} className="-ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-muted hover:text-text cursor-pointer">
          <ArrowLeft className="size-4" aria-hidden /> Back
        </button>
        <PostCard post={p} full trust={trust} tally={tallyFor(feed.tallies, p.key)} comments={list.length} flagged={flagged} />

        {p.kind === "salary" && (
          <Card className="flex flex-col gap-4 p-5 sm:p-6">
            <div>
              <h2 className="font-display text-lg font-semibold">Is this still accurate?</h2>
              <p className="text-sm text-muted">Stale salaries mislead, so posts expire. If this matches what you know, extend it.</p>
            </div>
            <LifeBar expiresAt={p.expiresAt} createdAt={p.createdAt} size="lg" />
            <ConfirmButton entryKey={p.key} owner={p.owner} />
            <p className="text-xs text-muted">
              {confs.data?.data.length ?? 0} confirmation{confs.data?.data.length === 1 ? "" : "s"} so far · upvotes rank posts, confirmations build trust.
            </p>
          </Card>
        )}

        <section id="comments" className="scroll-mt-24">
          <Card className="flex flex-col gap-5 p-4 sm:p-6">
            <CommentComposer postKey={p.key} />
            {comments.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <CommentThread postKey={p.key} opAddress={p.owner} comments={list} tallies={feed.tallies} hiddenWallets={feed.flaggedWallets} />
            )}
            <QueryReveal queries={[comments.data?.query]} />
          </Card>
        </section>

        <OnChainPanel entityKey={p.key} owner={p.owner} expiresAt={p.expiresAt} attributes={postAttributes(p)} />
      </div>

      <aside className="flex min-w-0 flex-col gap-4">
        {company && (
          <Card className="p-4">
            <Link href={`/company/?name=${company.id}`} className="flex items-center gap-3 hover:underline">
              <CommunityIcon company={company.id} size={40} />
              <span>
                <span className="block font-medium">c/{company.id}</span>
                <span className="block text-xs text-muted">{company.label} · {company.industry}</span>
              </span>
            </Link>
            <Button asChild variant="secondary" size="sm" className="mt-3 w-full">
              <Link href={`/company/?name=${company.id}`}>View community</Link>
            </Button>
          </Card>
        )}
        {p.kind === "salary" && (
          <Card className="p-4 sm:p-5">
            <h2 className="mb-4 font-display text-lg font-semibold">Trust</h2>
            {trust ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <TrustRing trust={trust} size={96} />
                  <p className="text-xs text-muted">From Arkiv data alone: confirmations, fit with peers, the wallet&apos;s history, freshness. Votes don&apos;t count.</p>
                </div>
                <TrustBreakdown trust={trust} />
              </div>
            ) : (
              <Skeleton className="h-48 w-full" />
            )}
          </Card>
        )}
      </aside>
    </div>
  );
}

export default function PostPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <React.Suspense fallback={<PostSkeleton />}>
        <PostView />
      </React.Suspense>
    </div>
  );
}

