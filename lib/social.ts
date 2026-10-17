// Pure social logic: vote tallies, ranking, comment trees. Everything computed client-side from
// Arkiv entities, so any client can reproduce the same feed order.

import type { Address, Comment, EntityKey, Post, Vote, VoteDir } from "./data/types";

export interface Tally {
  score: number;
  up: number;
  down: number;
  /** The given viewer's current vote on this target. */
  mine: VoteDir;
}

const EMPTY: Tally = { score: 0, up: 0, down: 0, mine: "none" };
export const emptyTally = () => ({ ...EMPTY });

/** Latest vote per (wallet, target) wins; "none" clears. */
export function tallyVotes(votes: Vote[], viewer?: Address): Map<string, Tally> {
  const latest = new Map<string, Vote>();
  for (const v of votes) {
    const id = `${v.targetKey.toLowerCase()}|${v.owner.toLowerCase()}`;
    const prev = latest.get(id);
    if (!prev || v.createdAt >= prev.createdAt) latest.set(id, v);
  }
  const out = new Map<string, Tally>();
  const me = viewer?.toLowerCase();
  for (const v of latest.values()) {
    const t = out.get(v.targetKey.toLowerCase()) ?? emptyTally();
    if (v.dir === "up") t.up++;
    if (v.dir === "down") t.down++;
    t.score = t.up - t.down;
    if (me && v.owner.toLowerCase() === me) t.mine = v.dir;
    out.set(v.targetKey.toLowerCase(), t);
  }
  return out;
}

export const tallyFor = (tallies: Map<string, Tally> | undefined, key: string) =>
  tallies?.get(key.toLowerCase()) ?? EMPTY;

/** Reddit-style "hot": log-scaled score plus recency. 12.5 hours ≈ one order of magnitude of votes. */
export function hotScore(score: number, createdAt: number): number {
  const order = Math.log10(Math.max(Math.abs(score), 1));
  const sign = score > 0 ? 1 : score < 0 ? -1 : 0;
  return sign * order + createdAt / 45_000_000;
}

export type FeedSort = "hot" | "new" | "top";

export function sortPosts<T extends { key: EntityKey; createdAt: number }>(
  posts: T[],
  sort: FeedSort,
  tallies?: Map<string, Tally>,
): T[] {
  const score = (p: T) => tallyFor(tallies, p.key).score;
  const out = [...posts];
  if (sort === "new") out.sort((a, b) => b.createdAt - a.createdAt);
  else if (sort === "top") out.sort((a, b) => score(b) - score(a) || b.createdAt - a.createdAt);
  else out.sort((a, b) => hotScore(score(b), b.createdAt) - hotScore(score(a), a.createdAt));
  return out;
}

export interface CommentNode {
  comment: Comment;
  children: CommentNode[];
  /** Total descendants, for "n more replies". */
  descendants: number;
}

/** Build a thread tree. Replies whose parent is missing (expired) attach to the top level. */
export function buildCommentTree(
  comments: Comment[],
  sort: "top" | "new" = "top",
  tallies?: Map<string, Tally>,
): CommentNode[] {
  const nodes = new Map<string, CommentNode>();
  for (const c of comments) nodes.set(c.key.toLowerCase(), { comment: c, children: [], descendants: 0 });
  const roots: CommentNode[] = [];
  for (const n of nodes.values()) {
    const parent = n.comment.parentKey ? nodes.get(n.comment.parentKey.toLowerCase()) : undefined;
    if (parent && parent !== n) parent.children.push(n);
    else roots.push(n);
  }
  const cmp = (a: CommentNode, b: CommentNode) =>
    sort === "new"
      ? b.comment.createdAt - a.comment.createdAt
      : tallyFor(tallies, b.comment.key).score - tallyFor(tallies, a.comment.key).score ||
        a.comment.createdAt - b.comment.createdAt;
  const finish = (list: CommentNode[]): number => {
    list.sort(cmp);
    let total = 0;
    for (const n of list) {
      n.descendants = finish(n.children);
      total += 1 + n.descendants;
    }
    return total;
  };
  finish(roots);
  return roots;
}

export function commentCounts(comments: Comment[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of comments) m.set(c.postKey.toLowerCase(), (m.get(c.postKey.toLowerCase()) ?? 0) + 1);
  return m;
}

export const isSalary = (p: Post): p is Extract<Post, { kind: "salary" }> => p.kind === "salary";

export function compactScore(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 10_000) return `${Math.round(n / 1000)}k`;
  if (abs >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
