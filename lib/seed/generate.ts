// Deterministic synthetic dataset. Shared by the mock data source and the Arkiv seed script (/cli),
// so both produce the same entries. 100% fictional — no real people, companies or keys.

import { CITIES, cityLabel, COMPANIES } from "../catalog";
import { ENTRY_TTL_MS } from "../constants";
import type { Address, Comment, Confirmation, Discussion, EntityKey, Flair, Rating, Review, SalaryEntry, Vote } from "../data/types";

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


const SALARY_COMMENTS = [
  "Matches my offer from last cycle almost exactly.",
  "Is this including variable pay or just fixed?",
  "Base looks a bit low for this level, but the band is right.",
  "Was there a joining bonus on top?",
  "Similar band in my team, maybe 1–2 L lower.",
  "Useful. I was about to accept something 20% lower.",
  "How many interview rounds did it take?",
  "Does this include ESOPs at grant value?",
  "Pretty standard for the city honestly.",
  "Negotiated or first offer?",
];
const REVIEW_THREAD_COMMENTS = [
  "Agree on the appraisal part, it's a slow cycle.",
  "Depends heavily on which manager you get.",
  "The learning budget point is real.",
  "On-call was the dealbreaker for me.",
  "Hybrid policy changed recently, worth checking again.",
  "Culture is better in the newer teams.",
];
const REPLIES = [
  "Mostly fixed, about 10% variable.",
  "First offer, didn't negotiate much.",
  "Excludes ESOPs.",
  "Same experience here.",
  "Not in my org, but plausible.",
  "Three rounds plus a hiring-manager chat.",
  "Joining bonus was separate, one-time.",
  "Thanks, this helps.",
];
const FRAUD_COMMENTS = [
  "This is ~3× what anyone else reports for this level at Nimbus. Fake?",
  "Eight posts in an hour from one wallet. Come on.",
  "Nobody at Nimbus makes this at SDE-1.",
  "Trust badge already flags it as Unusual. Good.",
];
const FRAUD_REPLIES = [
  "Same wallet posted the 5-star reviews too.",
  "That's why it's hidden by default. Click 'All' to see the burst.",
];

interface ThreadTemplate {
  flair: Flair;
  title: string;
  body?: string;
  /** Pin to one company; otherwise spread across companies. */
  company?: string;
  atHq?: boolean;
}

// Company-wise discussions — the main content of the app. Fictional companies only, no people named.
const THREADS: ThreadTemplate[] = [
  { flair: "culture", company: "godavari-labs", atHq: true, title: "Is there a discrimination problem at the Hyderabad HO?", body: "Two people on my floor have quietly raised complaints about being passed over and spoken to differently because of where they're from. HR says it's \"being looked into\". Is this a pattern anyone else has seen, or is it one team?" },
  { flair: "company-news", company: "tungabhadra-tech", title: "Does anyone feel Tungabhadra Tech is heading for bankruptcy?", body: "Salaries credited late two months in a row, vendor payments on hold, and the town hall got cancelled. Am I overthinking this or should people start interviewing?" },
  { flair: "culture", company: "kaveri-systems", atHq: true, title: "Toxic culture in the Bengaluru office", body: "Late-night calls are normal, people get called out in public stand-ups, and nobody pushes back because reviews are around the corner. Is it the whole org or just product engineering?" },
  { flair: "layoffs", company: "sahyadri-software", title: "My manager is worried about getting laid off. Anyone else hearing rumours?", body: "Our skip-level meetings got cancelled and my manager asked me to document everything I own. Feels like something is coming. Any signals in other teams?" },
  { flair: "compensation", company: "kaveri-systems", title: "What % hike is realistic after 2 YOE?", body: "Joined as SDE-1, cycle is next month. Ratings are 'meets' or 'exceeds'. What did people actually get last year?" },
  { flair: "compensation", company: "nimbus-infotech", title: "Appraisal cycle delayed again this year?", body: "Letters were supposed to come out in April. Still nothing. Anyone got an official date?" },
  { flair: "workplace", company: "deccan-cloudworks", atHq: true, title: "Return-to-office: 5 days a week from next quarter?", body: "Heard this in an all-hands. Is it confirmed for everyone or only for certain teams?" },
  { flair: "interviews", company: "vindhya-analytics", title: "How long does the SDE-2 interview loop take?", body: "Cleared the online test. How many rounds after this and how long before an offer?" },
  { flair: "layoffs", company: "tungabhadra-tech", title: "Bench policy changed — 30 days and then out?", body: "New email says people on bench beyond 30 days will be 'reviewed'. Anyone know what that means in practice?" },
  { flair: "compensation", company: "coromandel-digital", title: "Is the night-shift allowance still being paid?", body: "My last two payslips don't show it. Is it removed for everyone or a payroll error?" },
  { flair: "management", company: "sahyadri-software", title: "Promotion criteria feel completely arbitrary", body: "Same rating, same scope, one person promoted and one not. Is there a written rubric anywhere?" },
  { flair: "workplace", company: "nimbus-infotech", title: "Moonlighting policy — has anyone received a warning?", body: "Not doing anything myself, but heard people got emails about side projects on GitHub. What exactly is allowed?" },
  { flair: "compensation", company: "godavari-labs", title: "ESOP vesting schedule changed for new joiners?", body: "Offer letter says 4-year vest with a 1-year cliff, but a friend who joined last year has monthly vesting after the cliff. Anyone compared?" },
  { flair: "management", company: "coromandel-digital", title: "Leave only approved if you worked the previous weekend?", body: "Is this an official rule or just my team?" },
  { flair: "ask", company: "vindhya-analytics", title: "Good place for freshers?", body: "Got an offer as a Data Analyst. Learning curve, mentorship, and how long until you get real projects?" },
  { flair: "layoffs", company: "vindhya-analytics", title: "Layoffs in the data platform team this week?", body: "A few accounts went inactive on chat yesterday. Anyone know how many people were affected?" },
  { flair: "company-news", company: "deccan-cloudworks", title: "New funding round — does it change anything for employees?", body: "Leadership says 'business as usual'. Any word on ESOP buyback or salary corrections?" },
  { flair: "interviews", company: "kaveri-systems", title: "System design round for frontend roles — what to expect?", body: "Is it a generic system design round or frontend-specific (state, caching, rendering)?" },
  { flair: "culture", company: "coromandel-digital", title: "Sale season crunch is getting worse every year", body: "Three weeks of 14-hour days before the big sale. Comp-offs are promised and then not approved. Is this normal for e-commerce?" },
  { flair: "workplace", company: "godavari-labs", title: "GPU access for research teams is a nightmare", body: "We wait days for a slot on the shared cluster. Is any team getting dedicated capacity?" },
  { flair: "compensation", company: "sahyadri-software", title: "Variable pay paid out at 60% this year?", body: "Company met targets per the town hall, but bonus letters say 60%. What did others get?" },
  { flair: "management", company: "deccan-cloudworks", title: "Skip-levels stopped after the reorg", body: "We used to have monthly skip-levels. Since the reorg, nothing. Is anyone else's manager chain this quiet?" },
  { flair: "ask", company: "tungabhadra-tech", title: "Notice period buyout — does the company allow it?", body: "Got an offer elsewhere with a 30-day joining requirement. Ours is 90 days. Has anyone negotiated a buyout?" },
  { flair: "culture", company: "nimbus-infotech", title: "Client-site teams vs office teams feel like two companies", body: "Client-site people get no team events, no rewards, nothing. Anyone found a way to move back to an internal project?" },
];

// Common threads every company gets a few of. {co} = company name, {city} = HQ city.
const GENERIC_THREADS: ThreadTemplate[] = [
  { flair: "compensation", title: "Appraisal letters are out. How did everyone do?", body: "Post your rating band and hike % (no names). Trying to see if {co} is being fair this year." },
  { flair: "workplace", title: "WFH policy at {co} after the latest HR mail?", body: "Is it 3 days in office now or still team-dependent?" },
  { flair: "ask", title: "Notice period at {co} — can it be shortened?", body: "Got an offer that needs me in 30 days. Has anyone negotiated an early release?" },
  { flair: "management", title: "Is it normal for managers at {co} to change every 6 months?", body: "On my third manager this year. Does this reset promotion chances?" },
  { flair: "culture", title: "How is the {city} office compared to other {co} locations?", body: "Thinking of asking for a transfer. Culture, commute, food, anything." },
  { flair: "layoffs", title: "Any restructuring news at {co} this quarter?", body: "Heard about a 'cost optimisation' exercise. Anyone have details?" },
  { flair: "interviews", title: "Interview process at {co} for experienced hires?", body: "4+ YOE, backend. How many rounds, and is there a take-home?" },
  { flair: "compensation", title: "Does {co} match competing offers?", body: "Have an offer about 30% higher. Will they counter, or is it better to just leave?" },
];

const THREAD_REPLIES = [
  "Same here.",
  "Can confirm, at least in our team.",
  "This matches what I've heard from friends there.",
  "Thanks for raising this. More people should.",
  "Not in my org, but it sounds plausible.",
  "Agree. Nobody says it out loud though.",
];

const THREAD_COMMENTS: Record<Flair, string[]> = {
  culture: [
    "Same experience in my team. The complaint was closed without any follow-up.",
    "It depends a lot on the floor and the manager. Mine has been fine, but I believe you.",
    "Use the anonymous ethics line — it at least gets logged and escalated.",
    "This has been going on for a while. People just stopped raising it.",
  ],
  layoffs: [
    "Documenting everything you own is usually the first sign. Update your resume.",
    "Our org got a hiring freeze notice last week. Nothing about layoffs yet.",
    "Same rumours here. Nothing official, but leadership has gone very quiet.",
    "Severance last time was two months plus notice, if that helps anyone plan.",
  ],
  compensation: [
    "Got about 9% after 2 years, 14% with the promotion.",
    "Ask for a market correction with offers in hand — they do grant it.",
    "Ours was 6–8% for 'meets', 10–12% for 'exceeds'.",
    "Variable came in lower than the town hall suggested for us too.",
  ],
  workplace: [
    "It's confirmed for our team. Exceptions only with a VP sign-off.",
    "Hybrid is still allowed for us, but attendance is being tracked.",
    "Not official yet. Wait for the HR mail before planning anything.",
  ],
  management: [
    "There's a rubric on the internal wiki, but nobody follows it.",
    "Calibration decides everything. Your manager's influence in that room matters most.",
    "Raise it in your next 1:1 and ask for the criteria in writing.",
  ],
  interviews: [
    "Four rounds: DSA, system design, hiring manager, HR. About three weeks end to end.",
    "Design round was frontend-specific for me: caching, state, rendering performance.",
    "Recruiters went quiet for a week after the final round, then the offer came.",
  ],
  "company-news": [
    "Late salaries twice is a red flag. Start interviewing quietly — no harm in options.",
    "Leadership always says business as usual. Watch what they do, not what they say.",
    "No buyback news yet. The last round didn't have one either.",
  ],
  ask: [
    "Good learning in the first year, mentorship depends on the team.",
    "Buyouts are allowed if your manager signs off. HR will try to say no first.",
    "Ask to talk to someone on the team before you accept — they usually agree.",
  ],
};

export interface SeedData {
  wallets: Address[];
  fraudWallet: Address;
  salaries: SalaryEntry[];
  reviews: Review[];
  confirmations: Confirmation[];
  comments: Comment[];
  votes: Vote[];
  discussions: Discussion[];
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
  // 4 clustered groups of 4 (each entry then has 3 peers, enough for range-fit) plus 3 scattered.
  const others = COMPANIES.filter((c) => c.id !== "nimbus-infotech");
  for (const c of others) {
    const groups = new Set<string>();
    while (groups.size < 4) groups.add(`${weighted(r, ROLE_WEIGHTS)}|${weighted(r, LEVEL_WEIGHTS)}`);
    for (const g of groups) {
      const [role, level] = g.split("|");
      for (let i = 0; i < 4; i++) salaries.push(makeSalary(c.id, role, level));
    }
    for (let i = 0; i < 3; i++)
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
  // Confirmations cluster: a minority of entries get most of them (people confirm what they see often).
  const groupSize = (s: SalaryEntry) =>
    confirmable.filter((x) => x.company === s.company && x.role === s.role && x.level === s.level).length;
  const popular = confirmable.filter((s, i) => groupSize(s) >= 4 && i % 2 === 0);
  while (confirmations.length < 190) confirm(pick(r, r() < 0.75 ? popular : confirmable), now - 170 * DAY);

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


  // ── Social layer (generated last so it never changes the data above) ──────
  const comments: Comment[] = [];
  const votes: Vote[] = [];
  const posts: (SalaryEntry | Review)[] = [...salaries, ...reviews];
  const isFraud = (p: { owner: Address }) => p.owner === fraudWallet;
  const between = (from: number) => from + Math.floor(r() * Math.max(1, now - from));
  const other = (not: Address) => {
    let w = pick(r, wallets);
    if (w === not) w = wallets[(wallets.indexOf(w) + 1) % wallets.length];
    return w;
  };
  const addComment = (post: { key: EntityKey; createdAt: number; owner: Address }, body: string, parent?: Comment, owner?: Address, at?: number) => {
    const createdAt = at ?? between(parent?.createdAt ?? post.createdAt);
    const c: Comment = {
      key: entityKey(r),
      kind: "comment",
      postKey: post.key,
      parentKey: parent?.key,
      body,
      createdAt,
      expiresAt: createdAt + ENTRY_TTL_MS,
      owner: owner ?? other(post.owner),
    };
    comments.push(c);
    return c;
  };

  // Ordinary threads on legit posts.
  const legitPosts = posts.filter((p) => !isFraud(p));
  // Discussion concentrates on recent posts, like any feed.
  const recentLegit = [...legitPosts].sort((x, y) => y.createdAt - x.createdAt).slice(0, 45);
  for (let i = 0; i < 150; i++) {
    const post = pick(r, r() < 0.65 ? recentLegit : legitPosts);
    const top = addComment(post, pick(r, post.kind === "salary" ? SALARY_COMMENTS : REVIEW_THREAD_COMMENTS));
    if (r() < 0.45) {
      const reply = addComment(post, pick(r, REPLIES), top);
      if (r() < 0.35) addComment(post, pick(r, REPLIES), reply, post.owner);
    }
  }

  // The community notices the Nimbus burst.
  const fraudSalaries = salaries.filter(isFraud);
  fraudSalaries.forEach((post, i) => {
    const c = addComment(post, FRAUD_COMMENTS[i % FRAUD_COMMENTS.length], undefined, undefined, post.createdAt + (2 + i) * HOUR);
    if (i % 2 === 0) addComment(post, FRAUD_REPLIES[(i / 2) % FRAUD_REPLIES.length], c);
  });

  // Votes: every wallet votes on a slice of posts; the burst gets buried.
  const castVote = (targetKey: EntityKey, dir: "up" | "down", owner: Address, from: number) => {
    const createdAt = between(from);
    votes.push({ key: entityKey(r), kind: "vote", targetKey, dir, createdAt, expiresAt: createdAt + ENTRY_TTL_MS, owner });
  };
  for (const w of wallets) {
    const seen = new Set<string>();
    for (let i = 0; i < 45; i++) {
      const post = pick(r, r() < 0.55 ? recentLegit : posts);
      if (seen.has(post.key) || post.owner === w) continue;
      seen.add(post.key);
      castVote(post.key, isFraud(post) ? (r() < 0.9 ? "down" : "up") : r() < 0.86 ? "up" : "down", w, post.createdAt);
    }
    for (let i = 0; i < 10; i++) {
      const c = pick(r, comments);
      if (c.owner !== w) castVote(c.key, r() < 0.85 ? "up" : "down", w, c.createdAt);
    }
  }
  for (const p of posts.filter(isFraud)) {
    castVote(p.key, "up", fraudWallet, p.createdAt); // self-upvote
    // A burst like this gets noticed: 4–7 regulars downvote each post.
    const voters = new Set<Address>();
    const n = int(r, 4, 7);
    while (voters.size < n) voters.add(pick(r, wallets));
    for (const w of voters) castVote(p.key, "down", w, p.createdAt);
  }
  comments.sort((a, b) => a.createdAt - b.createdAt);

  // ── Discussions (generated last so nothing above changes) ────────────────
  const discussions: Discussion[] = [];
  const hqOf = (c: string) => COMPANIES.find((x) => x.id === c)?.hq;
  for (const t of THREADS) {
    const company = t.company ?? pick(r, COMPANIES).id;
    const createdAt = now - int(r, 2, 24 * 45) * HOUR; // last ~45 days: forums are about what's happening now
    const d: Discussion = {
      key: entityKey(r),
      kind: "discussion",
      company,
      flair: t.flair,
      city: t.atHq ? hqOf(company) : undefined,
      title: t.title,
      body: t.body,
      createdAt,
      expiresAt: createdAt + ENTRY_TTL_MS,
      owner: pick(r, wallets),
    };
    discussions.push(d);
    // Threads attract discussion: 3–9 top-level comments, many with replies.
    const n = int(r, 3, 9);
    for (let i = 0; i < n; i++) {
      const top = addComment(d, pick(r, THREAD_COMMENTS[t.flair]));
      if (r() < 0.5) {
        const reply = addComment(d, pick(r, THREAD_REPLIES), top);
        if (r() < 0.4) addComment(d, pick(r, THREAD_COMMENTS[t.flair]), reply, d.owner);
      }
    }
    // …and votes: 6–17 wallets weigh in, mostly up.
    const voters = new Set<Address>();
    const v = int(r, 6, 17);
    while (voters.size < v) voters.add(pick(r, wallets));
    for (const w of voters) if (w !== d.owner) castVote(d.key, r() < 0.88 ? "up" : "down", w, d.createdAt);
  }
  // Three common threads per company, so every community has a living forum.
  for (const c of COMPANIES) {
    const picked = new Set<number>();
    while (picked.size < 3) picked.add(int(r, 0, GENERIC_THREADS.length - 1));
    for (const i of picked) {
      const t = GENERIC_THREADS[i];
      const fill = (x?: string) => x?.replaceAll("{co}", c.label).replaceAll("{city}", cityLabel(c.hq));
      const createdAt = now - int(r, 2, 24 * 60) * HOUR;
      const d: Discussion = {
        key: entityKey(r),
        kind: "discussion",
        company: c.id,
        flair: t.flair,
        city: t.title.includes("{city}") ? c.hq : undefined,
        title: fill(t.title)!,
        body: fill(t.body),
        createdAt,
        expiresAt: createdAt + ENTRY_TTL_MS,
        owner: pick(r, wallets),
      };
      discussions.push(d);
      for (let k = int(r, 2, 7); k > 0; k--) {
        const top = addComment(d, pick(r, THREAD_COMMENTS[t.flair]));
        if (r() < 0.45) addComment(d, pick(r, THREAD_REPLIES), top);
      }
      const voters = new Set<Address>();
      const v = int(r, 3, 12);
      while (voters.size < v) voters.add(pick(r, wallets));
      for (const w of voters) if (w !== d.owner) castVote(d.key, r() < 0.86 ? "up" : "down", w, d.createdAt);
    }
  }
  // The fraud wallet also tries a glowing thread; it's hidden under Medium+ with its other posts.
  {
    const createdAt = burstStart + 70 * 60_000;
    discussions.push({
      key: entityKey(r),
      kind: "discussion",
      company: "nimbus-infotech",
      flair: "compensation",
      title: "Everyone here gets 3x hikes, best company in India!!",
      body: "Seriously, join now. Highest pay in the industry.",
      createdAt,
      expiresAt: createdAt + ENTRY_TTL_MS,
      owner: fraudWallet,
    });
  }
  comments.sort((a, b) => a.createdAt - b.createdAt);
  discussions.sort((a, b) => b.createdAt - a.createdAt);

  // Expiry = last activity (creation or latest confirmation) + TTL.
  const lastConf = new Map<string, number>();
  for (const c of confirmations)
    lastConf.set(c.entryKey, Math.max(lastConf.get(c.entryKey) ?? 0, c.createdAt));
  for (const s of salaries) s.expiresAt = Math.max(s.createdAt, lastConf.get(s.key) ?? 0) + ENTRY_TTL_MS;

  salaries.sort((a, b) => b.createdAt - a.createdAt);
  reviews.sort((a, b) => b.createdAt - a.createdAt);
  confirmations.sort((a, b) => b.createdAt - a.createdAt);
  return { wallets, fraudWallet, salaries, reviews, confirmations, comments, votes, discussions };
}

