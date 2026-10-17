// Deterministic synthetic dataset. Shared by the mock data source and the Arkiv seed script (/cli),
// so both produce the same entries. 100% fictional — no real people, companies or keys.

import { CITIES, COMPANIES } from "../catalog";
import { ENTRY_TTL_MS } from "../constants";
import type { Address, Confirmation, EntityKey, Rating, Review, SalaryEntry } from "../data/types";

export const DEFAULT_SEED = 0x7a4b4a;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** mulberry32 — tiny, fast, deterministic PRNG. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
const int = (r: Rng, min: number, max: number) => Math.floor(r() * (max - min + 1)) + min;
const pick = <T>(r: Rng, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
const weighted = <T>(r: Rng, items: readonly [T, number][]) => {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of items) if ((x -= w) < 0) return v;
  return items[items.length - 1][0];
};
const hex = (r: Rng, len: number) =>
  Array.from({ length: len }, () => Math.floor(r() * 16).toString(16)).join("");

export const address = (r: Rng): Address => `0x${hex(r, 40)}`;
export const entityKey = (r: Rng): EntityKey => `0x${hex(r, 64)}`;

/** Annual CTC band midpoints (INR) per level, before company/role multipliers. */
const LEVEL_BAND: Record<string, [number, number]> = {
  intern: [400_000, 1_000_000],
  "sde-1": [600_000, 1_800_000],
  "sde-2": [1_400_000, 3_500_000],
  senior: [2_500_000, 6_000_000],
  staff: [4_500_000, 9_000_000],
  lead: [4_000_000, 8_500_000],
};
const LEVEL_YOE: Record<string, [number, number]> = {
  intern: [0, 0],
  "sde-1": [0, 3],
  "sde-2": [2, 5],
  senior: [4, 9],
  staff: [8, 15],
  lead: [7, 16],
};
const ROLE_FACTOR: Record<string, number> = {
  "software-engineer": 1,
  "frontend-engineer": 0.97,
  "backend-engineer": 1.03,
  "data-scientist": 1.08,
  "data-analyst": 0.75,
  "qa-engineer": 0.72,
  "devops-engineer": 0.95,
  "product-manager": 1.15,
  "product-designer": 0.9,
};
const ROLE_WEIGHTS: [string, number][] = [
  ["software-engineer", 30],
  ["backend-engineer", 15],
  ["frontend-engineer", 12],
  ["data-scientist", 8],
  ["data-analyst", 7],
  ["qa-engineer", 7],
  ["devops-engineer", 7],
  ["product-manager", 8],
  ["product-designer", 6],
];
const LEVEL_WEIGHTS: [string, number][] = [
  ["intern", 4],
  ["sde-1", 30],
  ["sde-2", 32],
  ["senior", 22],
  ["staff", 7],
  ["lead", 5],
];

/** Expected (noise-free) CTC for a company/role/level — the "typical" value. */
export function typicalCtc(company: string, role: string, level: string): number {
  const tier = COMPANIES.find((c) => c.id === company)?.tier ?? 1;
  const [lo, hi] = LEVEL_BAND[level] ?? LEVEL_BAND["sde-1"];
  return ((lo + hi) / 2) * tier * (ROLE_FACTOR[role] ?? 1);
}

const roundCtc = (n: number) => Math.round(n / 10_000) * 10_000;

const REVIEW_COMMENTS = [
  "Good learning curve in the first year, slower after that.",
  "Managers are supportive but release weeks are long.",
  "Hybrid policy is genuinely flexible. Appraisals are slow.",
  "Great peers. Promotions depend a lot on which team you land in.",
  "On-call is heavy but compensated. Tooling is modern.",
  "Process-heavy, lots of approvals for small changes.",
  "Fair pay for the city. Leadership communicates openly.",
  "Bench time between projects can be stressful.",
  "Strong engineering culture, real code reviews.",
  "Work-life balance depends entirely on the client.",
  "Learning budget is generous and actually used.",
  "Too many meetings, not enough focus time.",
];

const COMPANY_MOOD: Record<string, number> = {
  "nimbus-infotech": 2.6,
  "kaveri-systems": 4.0,
  "godavari-labs": 3.9,
  "deccan-cloudworks": 3.5,
  "sahyadri-software": 3.6,
  "tungabhadra-tech": 2.9,
  "vindhya-analytics": 3.4,
  "coromandel-digital": 3.2,
};

export interface SeedData {
  wallets: Address[];
  fraudWallet: Address;
  salaries: SalaryEntry[];
  reviews: Review[];
  confirmations: Confirmation[];
}

export interface GenerateOptions {
  seed?: number;
  now?: number;
}

export function generateSeed({ seed = DEFAULT_SEED, now = Date.now() }: GenerateOptions = {}): SeedData {
  const r = mulberry32(seed);
  const wallets = Array.from({ length: 20 }, () => address(r));
  const fraudWallet = address(r);

  const salaries: SalaryEntry[] = [];
  const reviews: Review[] = [];
  const confirmations: Confirmation[] = [];

  const makeSalary = (
    company: string,
    role: string,
    level: string,
    opts: { createdAt?: number; owner?: Address; ctc?: number } = {},
  ): SalaryEntry => {
    const comp = COMPANIES.find((c) => c.id === company)!;
    const createdAt = opts.createdAt ?? now - int(r, 1, 16 * 30 * 24) * HOUR;
    const ctc = opts.ctc ?? roundCtc(typicalCtc(company, role, level) * (0.78 + r() * 0.44));
    const [ylo, yhi] = LEVEL_YOE[level];
    const city = r() < 0.7 ? comp.hq : pick(r, CITIES).id;
    const withBase = r() < 0.6;
    return {
      key: entityKey(r),
      kind: "salary",
      company,
      role,
      level,
      city,
      yoe: int(r, ylo, yhi),
      ctc,
      baseSalary: withBase ? roundCtc(ctc * (0.72 + r() * 0.15)) : undefined,
      createdAt,
      expiresAt: createdAt + ENTRY_TTL_MS,
      owner: opts.owner ?? pick(r, wallets),
    };
  };

  // Nimbus Infotech — legit baseline, concentrated so peer groups have ≥ 3 entries.
  const nimbusPlan: [string, string, number][] = [
    ["software-engineer", "sde-1", 4],
    ["software-engineer", "sde-2", 4],
    ["backend-engineer", "sde-2", 3],
    ["qa-engineer", "sde-1", 1],
    ["data-analyst", "sde-1", 1],
    ["software-engineer", "senior", 1],
  ];
  for (const [role, level, n] of nimbusPlan)
    for (let i = 0; i < n; i++) salaries.push(makeSalary("nimbus-infotech", role, level));

  // Everyone else.
  // Real data clusters around a few common role/level pairs per company, so each company gets
  // 4 clustered groups of 3 (enough peers for range-fit) plus 6 scattered entries.
  const others = COMPANIES.filter((c) => c.id !== "nimbus-infotech");
  for (const c of others) {
    const groups = new Set<string>();
    while (groups.size < 4) groups.add(`${weighted(r, ROLE_WEIGHTS)}|${weighted(r, LEVEL_WEIGHTS)}`);
    for (const g of groups) {
      const [role, level] = g.split("|");
      for (let i = 0; i < 3; i++) salaries.push(makeSalary(c.id, role, level));
    }
    for (let i = 0; i < 6; i++)
      salaries.push(makeSalary(c.id, weighted(r, ROLE_WEIGHTS), weighted(r, LEVEL_WEIGHTS)));
  }

  // A few entries about to expire (< 30 days left) — for the life bar / "Still accurate" demo.
  // They sit in an existing peer group and were confirmed once, hours after posting, long ago.
  const nearExpiry: SalaryEntry[] = [];
  for (let i = 0; i < 4; i++) {
    const daysLeft = int(r, 4, 27);
    const confirmedAt = now - ENTRY_TTL_MS + daysLeft * DAY;
    const peer = salaries.find((s) => s.company === others[(i * 2) % others.length].id)!;
    const e = makeSalary(peer.company, peer.role, peer.level, {
      createdAt: confirmedAt - int(r, 2, 20) * HOUR,
    });
    let owner = pick(r, wallets);
    if (owner === e.owner) owner = wallets[(wallets.indexOf(owner) + 1) % wallets.length];
    confirmations.push({ key: entityKey(r), entryKey: e.key, createdAt: confirmedAt, owner });
    nearExpiry.push(e);
    salaries.push(e);
  }

  // Confirmations from other wallets on legit entries (not the near-expiry ones).
  const confirmable = salaries.filter((s) => !nearExpiry.includes(s));
  const confirm = (entry: SalaryEntry, earliest: number) => {
    let owner = pick(r, wallets);
    if (owner === entry.owner) owner = wallets[(wallets.indexOf(owner) + 1) % wallets.length];
    if (confirmations.some((c) => c.entryKey === entry.key && c.owner === owner)) return;
    const from = Math.max(entry.createdAt, earliest);
    const createdAt = from + Math.floor(r() * (now - from));
    confirmations.push({ key: entityKey(r), entryKey: entry.key, createdAt, owner });
  };
  // Older entries that are still around have usually been re-confirmed recently.
  for (const s of confirmable) if (now - s.createdAt > 150 * DAY) confirm(s, now - 170 * DAY);
  while (confirmations.length < 120) confirm(pick(r, confirmable), 0);

  // People lurk before they post: each wallet confirms something a few days before its first entry.
  for (const w of wallets) {
    const first = Math.min(...salaries.filter((s) => s.owner === w).map((s) => s.createdAt));
    const at = first - int(r, 8, 30) * DAY;
    const target = confirmable.find((s) => s.owner !== w && s.createdAt < at);
    if (target) confirmations.push({ key: entityKey(r), entryKey: target.key, createdAt: at, owner: w });
  }

  // Planted fraud: one fresh wallet posts 8 inflated Nimbus entries within 1 hour, 0 confirmations.
  const burstStart = now - 2 * DAY - 3 * HOUR;
  const fraudPlan: [string, string][] = [
    ["software-engineer", "sde-1"],
    ["software-engineer", "sde-1"],
    ["software-engineer", "sde-1"],
    ["software-engineer", "sde-2"],
    ["software-engineer", "sde-2"],
    ["software-engineer", "sde-2"],
    ["backend-engineer", "sde-2"],
    ["backend-engineer", "sde-2"],
  ];
  fraudPlan.forEach(([role, level], i) => {
    const multiple = 2.5 + r();
    salaries.push(
      makeSalary("nimbus-infotech", role, level, {
        owner: fraudWallet,
        createdAt: burstStart + i * 7 * 60_000 + int(r, 0, 120) * 1000,
        ctc: roundCtc(typicalCtc("nimbus-infotech", role, level) * multiple),
      }),
    );
  });

  // Reviews.
  const clampRating = (x: number) => Math.max(1, Math.min(5, Math.round(x))) as Rating;
  for (const c of COMPANIES) {
    const mood = COMPANY_MOOD[c.id] ?? 3.3;
    for (let i = 0; i < 7; i++) {
      const createdAt = now - int(r, 1, 15 * 30) * DAY;
      reviews.push({
        key: entityKey(r),
        kind: "review",
        company: c.id,
        wlb: clampRating(mood + (r() - 0.5) * 2.2),
        management: clampRating(mood + (r() - 0.5) * 2.2),
        growth: clampRating(mood + (r() - 0.5) * 2.2),
        culture: clampRating(mood + (r() - 0.5) * 2.2),
        comment: r() < 0.8 ? pick(r, REVIEW_COMMENTS) : undefined,
        createdAt,
        expiresAt: createdAt + ENTRY_TTL_MS,
        owner: pick(r, wallets),
      });
    }
  }
  // Fraud wallet's glowing 5-star reviews, same hour as the burst.
  for (let i = 0; i < 4; i++) {
    const createdAt = burstStart + 60 * 60_000 + i * 4 * 60_000;
    reviews.push({
      key: entityKey(r),
      kind: "review",
      company: "nimbus-infotech",
      wlb: 5,
      management: 5,
      growth: 5,
      culture: 5,
      comment: "Best company ever. Highest pay in the industry!!",
      createdAt,
      expiresAt: createdAt + ENTRY_TTL_MS,
      owner: fraudWallet,
    });
  }

  // Expiry = last activity (creation or latest confirmation) + TTL.
  const lastConf = new Map<string, number>();
  for (const c of confirmations)
    lastConf.set(c.entryKey, Math.max(lastConf.get(c.entryKey) ?? 0, c.createdAt));
  for (const s of salaries) s.expiresAt = Math.max(s.createdAt, lastConf.get(s.key) ?? 0) + ENTRY_TTL_MS;

  salaries.sort((a, b) => b.createdAt - a.createdAt);
  reviews.sort((a, b) => b.createdAt - a.createdAt);
  confirmations.sort((a, b) => b.createdAt - a.createdAt);
  return { wallets, fraudWallet, salaries, reviews, confirmations };
}

