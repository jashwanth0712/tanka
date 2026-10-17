import { describe, expect, it } from "vitest";
import { bandFor, computeTrust, computeTrustIndex, passesTrustFilter } from "@/lib/trust";
import type { Address, Confirmation, EntityKey, SalaryEntry } from "@/lib/data/types";
import { DAY } from "@/lib/format";
import { generateSeed } from "@/lib/seed/generate";

const NOW = 1_800_000_000_000;
let n = 0;
const k = (): EntityKey => `0x${(++n).toString(16).padStart(64, "0")}`;
const A = (c: string): Address => `0x${c.repeat(40)}`;

const entry = (o: Partial<SalaryEntry> = {}): SalaryEntry => ({
  key: k(),
  kind: "salary",
  company: "c",
  role: "r",
  level: "l",
  city: "x",
  yoe: 2,
  ctc: 1_000_000,
  createdAt: NOW - DAY,
  expiresAt: NOW + 400 * DAY,
  owner: A("a"),
  ...o,
});
const conf = (e: SalaryEntry, owner: Address, createdAt = NOW - DAY / 2): Confirmation => ({
  key: k(),
  entryKey: e.key,
  owner,
  createdAt,
});
const oldWallet = (e: SalaryEntry) => ({ firstSeenAt: e.createdAt - 30 * DAY, entries: [e] });
const run = (e: SalaryEntry, o: Partial<Parameters<typeof computeTrust>[0]> = {}) =>
  computeTrust({ entry: e, peers: [], confirmations: [], wallet: oldWallet(e), now: NOW, ...o });

describe("trust", () => {
  it("is neutral on range fit with < 3 peers", () => {
    const t = run(entry(), { peers: [entry({ owner: A("b") })] });
    expect(t.parts.rangeFit).toBe(15);
    expect(t.flags).toEqual([]);
  });

  it("excludes same-owner peers from the median", () => {
    const e = entry({ ctc: 3_000_000 });
    const sameOwner = [1, 2, 3].map(() => entry({ ctc: 3_000_000 }));
    expect(run(e, { peers: sameOwner }).detail.peers).toBe(0);
  });

  it("flags outliers as Unusual", () => {
    const e = entry({ ctc: 3_000_000 });
    const peers = ["b", "c", "d"].map((c) => entry({ owner: A(c) }));
    const t = run(e, { peers });
    expect(t.parts.rangeFit).toBe(0);
    expect(t.flags[0].kind).toBe("unusual");
    expect(t.flags[0].label).toContain("3.0×");
  });

  it("gives full range fit inside 0.67–1.5× and half inside 0.5–2×", () => {
    const peers = ["b", "c", "d"].map((c) => entry({ owner: A(c) }));
    expect(run(entry({ ctc: 1_200_000 }), { peers }).parts.rangeFit).toBe(30);
    expect(run(entry({ ctc: 1_800_000 }), { peers }).parts.rangeFit).toBe(15);
  });

  it("ignores self-confirmations and duplicate confirmers", () => {
    const e = entry();
    const confirmations = [conf(e, e.owner), conf(e, A("b")), conf(e, A("b")), conf(e, A("c"))];
    expect(run(e, { confirmations }).parts.confirmations).toBe(16);
  });

  it("caps confirmations at 5 wallets", () => {
    const e = entry();
    const confirmations = "bcdefgh".split("").map((c) => conf(e, A(c)));
    expect(run(e, { confirmations }).parts.confirmations).toBe(40);
  });

  it("detects bursts", () => {
    const es = [0, 1, 2, 3].map((i) => entry({ createdAt: NOW - DAY + i * 600_000 }));
    const t = run(es[0], { wallet: { firstSeenAt: NOW - 100 * DAY, entries: es } });
    expect(t.parts.walletHistory).toBe(0);
    expect(t.flags.some((f) => f.kind === "burst")).toBe(true);
  });

  it("does not call 3 posts a burst", () => {
    const es = [0, 1, 2].map((i) => entry({ createdAt: NOW - DAY + i * 600_000 }));
    const t = run(es[0], { wallet: { firstSeenAt: NOW - 100 * DAY, entries: es } });
    expect(t.flags).toEqual([]);
  });

  it("scores wallet history by age", () => {
    const e = entry();
    const w = (days: number) => ({ firstSeenAt: e.createdAt - days * DAY, entries: [e] });
    expect(run(e, { wallet: w(10) }).parts.walletHistory).toBe(15);
    expect(run(e, { wallet: w(2) }).parts.walletHistory).toBe(8);
    expect(run(e, { wallet: w(0) }).parts.walletHistory).toBe(0);
  });

  it("scores freshness from last confirmation", () => {
    const e = entry({ createdAt: NOW - 400 * DAY });
    const w = oldWallet(e);
    expect(run(e, { wallet: w }).parts.freshness).toBe(5);
    expect(run(e, { wallet: w, confirmations: [conf(e, A("b"), NOW - 10 * DAY)] }).parts.freshness).toBe(15);
  });

  it("gives unflagged new posts a 72h 'New' grace period", () => {
    const fresh = entry({ createdAt: NOW - 3_600_000 });
    const t = run(fresh, { wallet: { firstSeenAt: fresh.createdAt, entries: [fresh] } });
    expect(t.band).toBe("low");
    expect(t.isNew).toBe(true);
    expect(passesTrustFilter(t, "medium")).toBe(true);
    expect(passesTrustFilter(t, "high")).toBe(false);
  });

  it("no grace for flagged or older posts", () => {
    const es = [0, 1, 2, 3].map((i) => entry({ createdAt: NOW - 3_600_000 + i * 60_000 }));
    const burst = run(es[0], { wallet: { firstSeenAt: es[0].createdAt, entries: es } });
    expect(burst.isNew).toBe(false);
    expect(passesTrustFilter(burst, "medium")).toBe(false);
    const old = entry({ createdAt: NOW - 4 * DAY });
    expect(run(old, { wallet: { firstSeenAt: old.createdAt, entries: [old] } }).isNew).toBe(false);
  });

  it("band boundaries", () => {
    expect(bandFor(70)).toBe("high");
    expect(bandFor(69)).toBe("medium");
    expect(bandFor(40)).toBe("medium");
    expect(bandFor(39)).toBe("low");
  });
});

describe("seed fraud story", () => {
  const seed = generateSeed({ now: NOW });
  const index = computeTrustIndex(seed.salaries, seed.confirmations, NOW);

  it("generates the expected volume", () => {
    expect(seed.salaries.length).toBeGreaterThanOrEqual(140);
    expect(seed.reviews.length).toBeGreaterThanOrEqual(55);
    expect(seed.confirmations.length).toBeGreaterThanOrEqual(90);
    expect(seed.wallets.length).toBe(20);
  });

  it("is deterministic", () => {
    expect(generateSeed({ now: NOW }).salaries[0].key).toBe(seed.salaries[0].key);
  });

  it("marks every planted entry Unusual + Burst + low", () => {
    const fraud = seed.salaries.filter((s) => s.owner === seed.fraudWallet);
    expect(fraud).toHaveLength(8);
    for (const f of fraud) {
      const t = index.get(f.key)!;
      expect(t.band).toBe("low");
      expect(t.flags.map((x) => x.kind).sort()).toEqual(["burst", "unusual"]);
    }
  });

  it("does not let the burst poison honest Nimbus entries", () => {
    const honest = seed.salaries.filter(
      (s) => s.company === "nimbus-infotech" && s.owner !== seed.fraudWallet,
    );
    for (const s of honest) expect(index.get(s.key)!.flags).toEqual([]);
  });

  it("flags > 30% of Nimbus entries", () => {
    const nimbus = seed.salaries.filter((s) => s.company === "nimbus-infotech");
    const flagged = nimbus.filter((s) => index.get(s.key)!.flags.length > 0);
    expect(flagged.length / nimbus.length).toBeGreaterThan(0.3);
  });

  it("keeps almost all legit entries at Medium+", () => {
    const legit = seed.salaries.filter((s) => s.owner !== seed.fraudWallet);
    const low = legit.filter((s) => index.get(s.key)!.band === "low");
    expect(low.length / legit.length).toBeLessThan(0.05);
  });

  it("plants entries close to expiry", () => {
    expect(seed.salaries.filter((s) => s.expiresAt - NOW < 30 * DAY).length).toBeGreaterThanOrEqual(3);
  });
});

describe("seed social layer", () => {
  const NOW2 = 1_800_000_000_000;
  const seed = generateSeed({ now: NOW2 });
  it("has threads and votes", () => {
    expect(seed.comments.length).toBeGreaterThan(150);
    expect(seed.votes.length).toBeGreaterThan(600);
    expect(seed.comments.some((c) => c.parentKey)).toBe(true);
  });
  it("buries the fraud burst with downvotes and calls it out in comments", () => {
    const fraudKeys = new Set(seed.salaries.filter((s) => s.owner === seed.fraudWallet).map((s) => s.key));
    const net = seed.votes.filter((v) => fraudKeys.has(v.targetKey)).reduce((a, v) => a + (v.dir === "up" ? 1 : v.dir === "down" ? -1 : 0), 0);
    expect(net).toBeLessThan(0);
    expect(seed.comments.filter((c) => fraudKeys.has(c.postKey)).length).toBeGreaterThanOrEqual(8);
  });
  it("contains no personal details in comments", async () => {
    const { scanPII } = await import("@/lib/pii");
    for (const c of seed.comments) expect(scanPII(c.body).ok).toBe(true);
  });
});
