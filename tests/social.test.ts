import { describe, expect, it } from "vitest";
import type { Address, Comment, EntityKey, Vote, VoteDir } from "@/lib/data/types";
import { buildCommentTree, hotScore, sortPosts, tallyVotes } from "@/lib/social";

let n = 0;
const k = (): EntityKey => `0x${(++n).toString(16).padStart(64, "0")}`;
const A = (c: string): Address => `0x${c.repeat(40)}`;
const T = k();
const vote = (owner: string, dir: VoteDir, createdAt: number, targetKey = T): Vote => ({
  key: k(), kind: "vote", targetKey, dir, createdAt, expiresAt: Infinity, owner: A(owner),
});
const comment = (createdAt: number, parentKey?: EntityKey): Comment => ({
  key: k(), kind: "comment", postKey: T, parentKey, body: "x", createdAt, expiresAt: Infinity, owner: A("a"),
});

describe("tallyVotes", () => {
  it("counts the latest vote per wallet", () => {
    const t = tallyVotes([vote("a", "up", 1), vote("a", "down", 2), vote("b", "up", 1)]).get(T.toLowerCase())!;
    expect(t).toMatchObject({ up: 1, down: 1, score: 0 });
  });
  it("'none' clears a vote and reports the viewer's vote", () => {
    const t = tallyVotes([vote("a", "up", 1), vote("a", "none", 2), vote("b", "down", 3)], A("b")).get(T.toLowerCase())!;
    expect(t).toMatchObject({ up: 0, down: 1, score: -1, mine: "down" });
  });
  it("is case-insensitive on keys and owners", () => {
    const v = vote("a", "up", 1);
    const t = tallyVotes([v, { ...v, key: k(), owner: v.owner.toUpperCase() as Address, createdAt: 2, dir: "down" }]);
    expect(t.get(T.toLowerCase())!.score).toBe(-1);
  });
});

describe("ranking", () => {
  it("hot prefers newer posts at equal score and more votes at equal age", () => {
    expect(hotScore(10, 2_000_000_000)).toBeGreaterThan(hotScore(10, 1_000_000_000));
    expect(hotScore(100, 1_000)).toBeGreaterThan(hotScore(10, 1_000));
    expect(hotScore(-10, 1_000)).toBeLessThan(hotScore(0, 1_000));
  });
  it("sorts top by score then recency", () => {
    const a = { key: k(), createdAt: 1 };
    const b = { key: k(), createdAt: 2 };
    const tallies = tallyVotes([vote("a", "up", 1, a.key), vote("b", "up", 1, a.key), vote("c", "up", 1, b.key)]);
    expect(sortPosts([b, a], "top", tallies).map((p) => p.key)).toEqual([a.key, b.key]);
    expect(sortPosts([a, b], "new", tallies).map((p) => p.key)).toEqual([b.key, a.key]);
  });
});

describe("buildCommentTree", () => {
  it("nests replies and counts descendants", () => {
    const root = comment(1);
    const reply = comment(2, root.key);
    const deep = comment(3, reply.key);
    const tree = buildCommentTree([deep, reply, root]);
    expect(tree).toHaveLength(1);
    expect(tree[0].descendants).toBe(2);
    expect(tree[0].children[0].children[0].comment.key).toBe(deep.key);
  });
  it("lifts orphans (expired parent) to the top level", () => {
    const orphan = comment(5, k());
    expect(buildCommentTree([orphan])[0].comment.key).toBe(orphan.key);
  });
});
