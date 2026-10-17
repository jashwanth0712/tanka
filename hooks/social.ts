"use client";
// Social hooks: feed, votes, comments. All derived client-side from Arkiv entities.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { isFlagged } from "@/lib/companyStats";
import { getDataSource } from "@/lib/data";
import type { CommentInput, DiscussionInput, EntityKey, Flair, Post, QueryResult, Vote, VoteDir } from "@/lib/data/types";
import { commentCounts, sortPosts, tallyVotes, type FeedSort } from "@/lib/social";
import { passesTrustFilter, type TrustFilter, type TrustResult } from "@/lib/trust";
import { isMyPost, myPostsVersion, subscribeMyPosts } from "@/lib/myPosts";
import { getActiveSigner } from "@/lib/wallet/session";
import { useWallet, type WalletState } from "@/lib/wallet/useWallet";
import { useAllReviews, useTrustIndex } from "./queries";

const ds = () => getDataSource();

export const sk = {
  post: (key: string) => ["post", key] as const,
  allVotes: ["votes", "all"] as const,
  allComments: ["comments", "all"] as const,
  allDiscussions: ["discussions", "all"] as const,
  comments: (postKey: string) => ["comments", postKey] as const,
};

/** Make sure there's an anonymous identity to sign with (creates a per-tab burner if needed). */
export async function ensureIdentity(wallet: WalletState) {
  if (!getActiveSigner()) await wallet.useFreshWallet();
}

export function usePost(key: EntityKey | undefined) {
  return useQuery({ queryKey: sk.post(key ?? ""), queryFn: () => ds().getPost(key!), enabled: !!key });
}

export function useAllVotes() {
  return useQuery({ queryKey: sk.allVotes, queryFn: () => ds().getVotes(), staleTime: 15_000, refetchInterval: 20_000 });
}

/** Score per target for the current viewer. */
export function useTallies() {
  const votes = useAllVotes();
  const { address } = useWallet();
  const tallies = React.useMemo(() => tallyVotes(votes.data?.data ?? [], address), [votes.data, address]);
  return { tallies, query: votes.data?.query, isLoading: votes.isLoading };
}

export function useAllComments() {
  return useQuery({ queryKey: sk.allComments, queryFn: () => ds().getComments(), staleTime: 15_000, refetchInterval: 20_000 });
}

export function useComments(postKey: EntityKey | undefined) {
  return useQuery({
    queryKey: sk.comments(postKey ?? ""),
    queryFn: () => ds().getComments(postKey!),
    enabled: !!postKey,
    refetchInterval: 15_000,
  });
}

export function useCastVote() {
  const qc = useQueryClient();
  const wallet = useWallet();
  return useMutation({
    mutationFn: async ({ targetKey, dir }: { targetKey: EntityKey; dir: VoteDir }) => {
      await ensureIdentity(wallet);
      return ds().castVote(targetKey, dir);
    },
    // Votes should feel instant: write an optimistic vote into the cache, roll back on failure.
    onMutate: async ({ targetKey, dir }) => {
      await qc.cancelQueries({ queryKey: sk.allVotes });
      const prev = qc.getQueryData<QueryResult<Vote[]>>(sk.allVotes);
      const owner = getActiveSigner()?.address ?? wallet.address;
      if (prev && owner) {
        const now = Date.now();
        const optimistic: Vote = { key: `0xoptimistic${now}`, kind: "vote", targetKey, dir, createdAt: now, expiresAt: now + 1, owner };
        qc.setQueryData<QueryResult<Vote[]>>(sk.allVotes, { ...prev, data: [...prev.data, optimistic] });
      }
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(sk.allVotes, ctx.prev);
      toast.error(e instanceof Error ? e.message : "Vote failed");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: sk.allVotes }),
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  const wallet = useWallet();
  return useMutation({
    mutationFn: async (input: CommentInput) => {
      await ensureIdentity(wallet);
      return ds().createComment(input);
    },
    onSuccess: (_r, input) => {
      qc.invalidateQueries({ queryKey: sk.comments(input.postKey) });
      qc.invalidateQueries({ queryKey: sk.allComments });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export type FeedKind = "all" | "discussion" | "salary" | "review";

export interface FeedOptions {
  company?: string;
  sort: FeedSort;
  trust: TrustFilter;
  kind?: FeedKind;
  flair?: Flair;
}

export function useAllDiscussions() {
  return useQuery({ queryKey: sk.allDiscussions, queryFn: () => ds().getDiscussions(), staleTime: 15_000, refetchInterval: 20_000 });
}

export function useCreateDiscussion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DiscussionInput) => ds().createDiscussion(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discussions"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

/**
 * The home / community feed: every live discussion, package (salary) and review, filtered by trust and
 * ranked by votes. Discussions and reviews (which have no trust score) are hidden under Medium+ when
 * their wallet posted flagged entries.
 */
export function useFeed({ company, sort, trust, kind = "all", flair }: FeedOptions) {
  const t = useTrustIndex();
  const reviews = useAllReviews();
  const discussions = useAllDiscussions();
  const { tallies } = useTallies();
  const comments = useAllComments();

  const flaggedWallets = React.useMemo(() => {
    const s = new Set<string>();
    for (const e of t.all ?? []) if (isFlagged(t.index?.get(e.key))) s.add(e.owner.toLowerCase());
    return s;
  }, [t.all, t.index]);

  const mineVersion = React.useSyncExternalStore(subscribeMyPosts, myPostsVersion, () => 0);
  const counts = React.useMemo(() => commentCounts(comments.data?.data ?? []), [comments.data]);

  const result = React.useMemo(() => {
    const posts: Post[] = [...(discussions.data?.data ?? []), ...(t.all ?? []), ...(reviews.all ?? [])].filter(
      (p) =>
        (!company || p.company === company) &&
        (kind === "all" || p.kind === kind) &&
        (!flair || (p.kind === "discussion" && p.flair === flair)),
    );
    const visible = posts.filter((p) =>
      isMyPost(p.key) ||
      (p.kind === "salary"
        ? passesTrustFilter(t.index?.get(p.key), trust)
        : trust === "all" || !flaggedWallets.has(p.owner.toLowerCase())),
    );
    return { posts: sortPosts(visible, sort, tallies), hidden: posts.length - visible.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mineVersion re-runs this when I post
  }, [t.all, t.index, reviews.all, discussions.data, company, kind, flair, trust, sort, tallies, flaggedWallets, mineVersion]);

  return {
    ...result,
    trustIndex: t.index as Map<string, TrustResult> | undefined,
    flaggedWallets,
    tallies,
    commentCounts: counts,
    isLoading: t.isLoading || reviews.isLoading || discussions.isLoading || !t.index,
    isError: t.isError || reviews.isError || discussions.isError,
    error: t.error ?? reviews.error ?? discussions.error,
    refetch: () => {
      t.refetch();
      reviews.refetch();
      discussions.refetch();
    },
    queries: [
      kind === "all" || kind === "discussion" ? discussions.data?.query : undefined,
      kind === "all" || kind === "salary" ? t.queries.salaries : undefined,
      kind === "all" || kind === "review" ? reviews.data?.query : undefined,
    ].filter(Boolean) as string[],
  };
}
