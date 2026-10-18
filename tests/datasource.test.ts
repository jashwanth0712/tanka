// Integration tests for the mock DataSource — the executable spec the Arkiv implementation must match.
import { beforeEach, describe, expect, it } from "vitest";
import { createMockDataSource } from "@/lib/data/mock";
import type { Address, DataSource } from "@/lib/data/types";
import { tallyVotes } from "@/lib/social";
import { setActiveSigner } from "@/lib/wallet/session";

const ME: Address = `0x${"a1".repeat(20)}`;
const OTHER: Address = `0x${"b2".repeat(20)}`;

let ds: DataSource;
beforeEach(() => {
  ds = createMockDataSource();
  setActiveSigner({ address: ME, isFresh: true });
});

describe("mock DataSource", () => {
  it("reads every post type and returns the query it ran", async () => {
    const [d, s, r] = await Promise.all([ds.getDiscussions(), ds.searchSalaries({}), ds.getReviews()]);
    expect(d.data.length).toBeGreaterThan(20);
    expect(s.data.length).toBeGreaterThan(100);
    expect(r.data.length).toBeGreaterThan(50);
    expect(d.query).toContain("type = str('discussion')");
    expect(s.query).toContain("type = str('salary')");
  });

  it("filters salaries server-side with the shown query", async () => {
    const { data, query } = await ds.searchSalaries({ companies: ["kaveri-systems"], ctcMin: 2_000_000 });
    expect(query).toBe("project = str('tankha') AND type = str('salary') AND company = str('kaveri-systems') AND ctc >= i32(2000000)");
    expect(data.every((e) => e.company === "kaveri-systems" && e.ctc >= 2_000_000)).toBe(true);
  });

  it("creates a discussion, finds it by key, and lists it under its company", async () => {
    const r = await ds.createDiscussion({ company: "deccan-cloudworks", flair: "layoffs", title: "Hiring freeze in platform org?" });
    expect(r.owner).toBe(ME);
    const post = await ds.getPost(r.key);
    expect(post.data).toMatchObject({ kind: "discussion", title: "Hiring freeze in platform org?" });
    const list = await ds.getDiscussions("deccan-cloudworks");
    expect(list.data.some((x) => x.key === r.key)).toBe(true);
  });

  it("rejects personal details and too-short titles", async () => {
    await expect(ds.createDiscussion({ company: "kaveri-systems", flair: "ask", title: "Call me on 9876543210 please" })).rejects.toThrow(/personal details/);
    await expect(ds.createDiscussion({ company: "kaveri-systems", flair: "ask", title: "hi" })).rejects.toThrow(/at least 8/);
    const { data } = await ds.getDiscussions();
    await expect(ds.createComment({ postKey: data[0].key, body: "mail me at someone@example.com" })).rejects.toThrow(/personal details/);
  });

  it("threads comments under any post type", async () => {
    const { data } = await ds.getDiscussions();
    const top = await ds.createComment({ postKey: data[0].key, body: "Same in our team." });
    await ds.createComment({ postKey: data[0].key, parentKey: top.key, body: "Agreed." });
    const { data: thread } = await ds.getComments(data[0].key);
    expect(thread.some((c) => c.parentKey === top.key)).toBe(true);
  });

  it("votes: latest vote per wallet wins, 'none' clears", async () => {
    const { data } = await ds.getDiscussions();
    const key = data[0].key;
    const base = tallyVotes((await ds.getVotes([key])).data).get(key.toLowerCase())?.score ?? 0;
    await ds.castVote(key, "up");
    expect(tallyVotes((await ds.getVotes([key])).data).get(key.toLowerCase())!.score).toBe(base + 1);
    await ds.castVote(key, "down");
    expect(tallyVotes((await ds.getVotes([key])).data).get(key.toLowerCase())!.score).toBe(base - 1);
    await ds.castVote(key, "none");
    expect(tallyVotes((await ds.getVotes([key])).data).get(key.toLowerCase())?.score ?? 0).toBe(base);
  });

  it("confirm: refills expiry, rejects own entry and duplicates", async () => {
    const mine = await ds.createSalary({ company: "kaveri-systems", role: "software-engineer", level: "sde-2", city: "bengaluru", yoe: 4, ctc: 2_800_000 });
    await expect(ds.confirmEntry(mine.key)).rejects.toThrow(/own entry/);

    const { data } = await ds.searchSalaries({});
    const target = data.find((e) => e.owner !== OTHER && e.expiresAt - Date.now() < 300 * 864e5)!;
    setActiveSigner({ address: OTHER, isFresh: true });
    const r = await ds.confirmEntry(target.key);
    expect(r.expiresAt).toBeGreaterThan(target.expiresAt);
    await expect(ds.confirmEntry(target.key)).rejects.toThrow(/already confirmed/);
  });

  it("writes require a signer", async () => {
    setActiveSigner(null);
    await expect(ds.castVote(`0x${"c".repeat(64)}`, "up")).rejects.toThrow(/wallet/i);
  });

  it("raw query playground matches the same entities", async () => {
    const rows = (await ds.runRawQuery("project = str('tankha') AND type = str('discussion') AND flair = str('layoffs')")) as { attributes: { flair: string } }[];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((x) => x.attributes.flair === "layoffs")).toBe(true);
    await expect(ds.runRawQuery("type = ")).rejects.toThrow();
  });

  it("stats count discussions", async () => {
    const s = await ds.getStats();
    expect(s.discussions).toBeGreaterThan(20);
    expect(s.entries).toBeGreaterThan(s.discussions);
  });
});
