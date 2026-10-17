import { median } from "./aggregate";
import type { Address, Confirmation, EntityKey, SalaryEntry } from "./data/types";
import { DAY } from "./format";

export type TrustBand = "high" | "medium" | "low";

export interface TrustParts {
  confirmations: number; // 0–40
  rangeFit: number; // 0–30
  walletHistory: number; // 0–15
  freshness: number; // 0–15
}

export interface TrustFlag {
  kind: "unusual" | "burst";
  label: string;
}

export interface TrustResult {
  score: number;
  band: TrustBand;
  parts: TrustParts;
  flags: TrustFlag[];
  /** Extra numbers for the breakdown UI. */
  detail: {
    confirmers: number;
    peers: number;
    ratio: number | null;
    walletAgeDays: number;
    burstCount: number;
    lastActivityAt: number;
  };
}

export interface TrustInput {
  entry: SalaryEntry;
  /** Same company + role + level. May include the entry itself and same-owner entries; both are excluded. */
  peers: SalaryEntry[];
  confirmations: Confirmation[];
  /** Wallet's first activity (ms) and its salary entries. */
  wallet: { firstSeenAt: number; entries: SalaryEntry[] };
  now?: number;
}

export const MAX_PARTS: TrustParts = { confirmations: 40, rangeFit: 30, walletHistory: 15, freshness: 15 };

export function bandFor(score: number): TrustBand {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function computeTrust({ entry, peers, confirmations, wallet, now = Date.now() }: TrustInput): TrustResult {
  const flags: TrustFlag[] = [];

  // 1. Confirmations — distinct wallets, never the owner.
  const confirmers = new Set(
    confirmations
      .filter((c) => c.entryKey === entry.key && c.owner.toLowerCase() !== entry.owner.toLowerCase())
      .map((c) => c.owner.toLowerCase()),
  );
  const confirmationsPts = Math.min(confirmers.size, 5) * 8;

  // 2. Range fit vs. peers (other wallets' entries for the same company/role/level).
  const peerCtcs = peers
    .filter((p) => p.key !== entry.key && p.owner.toLowerCase() !== entry.owner.toLowerCase())
    .map((p) => p.ctc);
  let rangeFit = 15;
  let ratio: number | null = null;
  if (peerCtcs.length >= 3) {
    ratio = entry.ctc / median(peerCtcs);
    if (ratio >= 0.67 && ratio <= 1.5) rangeFit = 30;
    else if (ratio >= 0.5 && ratio <= 2) rangeFit = 15;
    else {
      rangeFit = 0;
      flags.push({ kind: "unusual", label: `Unusual: ${ratio.toFixed(1)}× median` });
    }
  }

  // 3. Wallet history + burst detection.
  const walletAgeMs = entry.createdAt - wallet.firstSeenAt;
  let walletHistory = walletAgeMs >= 7 * DAY ? 15 : walletAgeMs >= DAY ? 8 : 0;
  const burstCount = wallet.entries.filter(
    (e) =>
      e.company === entry.company &&
      e.owner.toLowerCase() === entry.owner.toLowerCase() &&
      Math.abs(e.createdAt - entry.createdAt) <= DAY,
  ).length;
  if (burstCount > 3) {
    walletHistory = 0;
    flags.push({ kind: "burst", label: `Burst: ${burstCount} posts in 24h from this wallet` });
  }

  // 4. Freshness — from last confirmation, else creation.
  const lastActivityAt = Math.max(
    entry.createdAt,
    ...confirmations.filter((c) => c.entryKey === entry.key).map((c) => c.createdAt),
  );
  const ageMs = now - lastActivityAt;
  const freshness = ageMs < 182 * DAY ? 15 : ageMs < 365 * DAY ? 10 : 5;

  const parts: TrustParts = { confirmations: confirmationsPts, rangeFit, walletHistory, freshness };
  const score = confirmationsPts + rangeFit + walletHistory + freshness;
  return {
    score,
    band: bandFor(score),
    parts,
    flags,
    detail: {
      confirmers: confirmers.size,
      peers: peerCtcs.length,
      ratio,
      walletAgeDays: Math.max(0, Math.floor(walletAgeMs / DAY)),
      burstCount,
      lastActivityAt,
    },
  };
}

/**
 * Compute trust for every entry from the full Arkiv dataset (all salaries + all confirmations).
 * Wallet activity is derived from the same data so the score depends only on Arkiv.
 */
export function computeTrustIndex(
  all: SalaryEntry[],
  confirmations: Confirmation[],
  now = Date.now(),
): Map<EntityKey, TrustResult> {
  const byGroup = new Map<string, SalaryEntry[]>();
  const byOwner = new Map<string, SalaryEntry[]>();
  const firstSeen = new Map<string, number>();
  const confByEntry = new Map<EntityKey, Confirmation[]>();

  const seen = (owner: Address, at: number) => {
    const o = owner.toLowerCase();
    firstSeen.set(o, Math.min(firstSeen.get(o) ?? Infinity, at));
  };

  for (const e of all) {
    const g = `${e.company}|${e.role}|${e.level}`;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(e);
    const o = e.owner.toLowerCase();
    if (!byOwner.has(o)) byOwner.set(o, []);
    byOwner.get(o)!.push(e);
    seen(e.owner, e.createdAt);
  }
  for (const c of confirmations) {
    if (!confByEntry.has(c.entryKey)) confByEntry.set(c.entryKey, []);
    confByEntry.get(c.entryKey)!.push(c);
    seen(c.owner, c.createdAt);
  }

  // Pass 1: burst detection depends only on the owner's own posts. Burst entries are then left
  // out of every peer median, so a sybil burst can't drag honest entries into "Unusual".
  const isBurst = (e: SalaryEntry) =>
    (byOwner.get(e.owner.toLowerCase()) ?? []).filter(
      (x) => x.company === e.company && Math.abs(x.createdAt - e.createdAt) <= DAY,
    ).length > 3;
  const burst = new Set(all.filter(isBurst).map((e) => e.key));

  const out = new Map<EntityKey, TrustResult>();
  for (const e of all) {
    const o = e.owner.toLowerCase();
    out.set(
      e.key,
      computeTrust({
        entry: e,
        peers: (byGroup.get(`${e.company}|${e.role}|${e.level}`) ?? []).filter((p) => !burst.has(p.key)),
        confirmations: confByEntry.get(e.key) ?? [],
        wallet: { firstSeenAt: firstSeen.get(o) ?? e.createdAt, entries: byOwner.get(o) ?? [] },
        now,
      }),
    );
  }
  return out;
}

export const BAND_LABEL: Record<TrustBand, string> = { high: "High", medium: "Medium", low: "Unusual" };

export type TrustFilter = "all" | "medium" | "high";

export function passesTrustFilter(t: TrustResult | undefined, f: TrustFilter): boolean {
  if (!t || f === "all") return true;
  if (f === "high") return t.band === "high";
  return t.band !== "low";
}
