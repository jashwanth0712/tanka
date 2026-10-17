# CLAUDE.md — Tankha

> **Tankha** (Hindi/Urdu slang for "salary") — *Salaries no one can delete.*
> An anonymous, censorship-resistant, **Reddit-style company forum**. **Priority 1: company-wise discussions** (threads like "Layoffs at the Pune office?", "What % hike after 2 YOE?", "Toxic culture in the Bengaluru office"). **Priority 2: salary packages.** Then reviews. One community per company (`c/nimbus-infotech`), a ranked feed, up/down votes and threaded comments. All data — posts, votes, comments, confirmations — lives on **Arkiv** (Tiramisu testnet). No company, legal notice or server shutdown can remove it, and anyone can query it.

This file is the single source of truth for building the **frontend and app logic**. The **Arkiv / web3 layer is owned by a teammate** and plugs in through the data contract in §6. Build against the mock data source first; never block on the web3 layer.

---

## 0. Non-negotiable hackathon rules (read first, obey always)

These come from the judging gates. Breaking any of them can disqualify the entry.

1. **Deadline: work must be done by 18 October 2026.** The repo's commit SHA is recorded at the deadline.
2. **Never rewrite git history.** No `git push --force`, no `rebase` of pushed commits, no amending pushed commits. Commit small and often with clear messages.
3. **Repo is public and MIT licensed.** `LICENSE` (MIT) must exist at the root.
4. **No conventional database.** No Postgres, Supabase, Firebase, SQLite, Prisma, or server-side store for app data. **All reads and writes of app data go through Arkiv** (via the data contract). A "database app with Arkiv branding" is disqualified.
5. **No real personal data, anywhere** — not in Arkiv, not in seed data, not in screenshots. Use only the fictional catalog in §7. No real names, emails, phone numbers, or real company names.
6. **No secrets in code or in Arkiv entities.** Private keys only in `.env.local` (gitignored). Never log keys. Never put keys in entity payloads or attributes.
7. **Required files** (create on day one, keep updated):
   - `/arkiv/schema.md` — entity types and attributes (teammate owns; frontend must match it)
   - `/arkiv/friction.md` — dated log of real problems hit while building on Arkiv. Add frontend-side friction too.
   - `README.md` — what it is, live URL, reproducible setup steps, wallet addresses used on Tiramisu, demo video link.
8. **Public deployment** judges can open without asking for access, kept live until 23 October.
9. **Demo video ≤ 3 minutes.**

---

## 1. What we're building (the pitch the UI must prove)

| Problem | What the app does | Where the user sees it |
|---|---|---|
| Reviews and salaries get taken down | Data stored as Arkiv entities; no central DB | "Verify it yourself" page, RPC switcher, live block indicator |
| Data must stay queryable | Search by company / role / level / city / YoE / CTC via Arkiv attribute queries | Salaries page, "Show query" toggle on every result set |
| People fear being identified | No sign-in, no email, no LinkedIn. Optional fresh wallet per post | Submit flow, "Post with a fresh wallet" option |
| Fake reviews | **Trust score** computed only from Arkiv data | Trust badge on every entry, breakdown on entry page, "High trust only" filter |
| Stale salaries mislead | Entries **expire (~18 months)** unless confirmed "Still accurate" | Life bar + countdown on every entry, confirm button |
| People need a safe place to talk about their company | **Company-wise discussions (primary post type):** titled threads with a topic (Culture, Layoffs, Compensation, Workplace, Management, Interviews, Company news, Ask) and optional office city, plus votes and threaded anonymous comments | Home feed (discussions rank first), community **Discussions** tab (default), "Start a discussion" CTA everywhere |

**Judges must be able to feel all five rows within 2 minutes of opening the site.**

---

## 2. Tech stack

Use latest stable versions. Do not add libraries beyond this list without a clear reason.

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript (strict)** | `output: 'export'` — **fully static**. No API routes, no server actions, no middleware. This lets the site be hosted on Vercel *and* pinned to IPFS: the frontend itself has no single point of takedown. |
| Styling | **Tailwind CSS v4** + CSS variables for tokens | Tokens in `app/globals.css` (§4). |
| Components | **shadcn/ui** (Radix primitives) | Button, Card, Badge, Dialog, Drawer (vaul), Select, Slider, Tabs, Tooltip, Popover, Command, Sheet, Skeleton, Progress, Toggle, Separator, Input, Textarea, Form. |
| Animation | **motion** (formerly framer-motion) | Respect `prefers-reduced-motion`. |
| Data fetching | **TanStack Query** | Caching, retries, loading/error states, `refetchInterval` for live bits. |
| Forms | **react-hook-form + zod** | Same zod schemas validate before sending to Arkiv. |
| Charts | **Recharts** | Salary histogram, ratings bars. |
| Icons | **lucide-react** | |
| Toasts | **sonner** | |
| Command palette | **cmdk** (via shadcn Command) | ⌘K / Ctrl+K company & role jump. |
| Theme | **next-themes** | Dark default, light supported. |
| Tests | **vitest** | Unit tests for `lib/trust.ts`, `lib/aggregate.ts`, `lib/format.ts`, `lib/pii.ts`. |
| Lint/format | ESLint (next config) + Prettier | |
| Package manager | pnpm | |

**Static export caveat:** dynamic segments like `/company/[slug]` don't work with unknown slugs at build time. Use **query params** instead: `/company?name=nimbus-infotech`, `/entry?key=0x…`. Read them with `useSearchParams` inside a `<Suspense>` boundary.

---

## 3. Information architecture

```
/                 Home feed — Hot/New/Top, trust filter, left rail (communities), right rail (about, live stats, house rules)
/salaries         "Packages": search + filters + aggregates + results (structured salary search)
/companies        Communities directory — one per company, with headline numbers
/company?name=    Community c/<slug> — banner, flag banner, tabs in priority order: Discussions (default, topic chips) · Packages (salary bands + package posts) · Reviews (rating bars + review posts). ?flair= filters topics.
/post?key=        Post page — full post, "Still accurate" + life bar (salaries), trust breakdown, threaded comments, raw entity
/entry?key=       Alias of /post (old links keep working)
/submit           "Create a post": Discussion (first, highlighted) · Package · Review → details → privacy check → sign → receipt. ?type=discussion|salary|review&company=<slug> pre-fills.
/verify           "Don't trust us" — takedown diagram, RPC endpoints, query playground, CLI + curl, mirrors, schema
```

Global UI:
- **On-chain details are opt-in (decided 2026-10-18).** It's a social app first, so by default users see no query boxes, raw entities, block numbers or wallet hex. A **"Show on-chain details"** switch (profile menu, status-pill menu, and the home intro card for judges; persisted in localStorage) turns all of them on: every "Show query", the post page's raw on-chain panel, the block number in the status pill, and raw addresses instead of pseudonyms. The Verify page always shows everything.
- **Pseudonyms, not wallet hex:** posters appear as a stable, anonymous `Adjective Animal · last4` name derived from their address (`lib/pseudonym.ts`), e.g. "Calm Badger · d0b8". On-chain mode shows the address.
- **Top nav (desktop):** logo, Communities, Packages, ⌘K search, "Live" status pill, theme toggle, primary CTA "Create", **identity chip** (the tab's pseudonym; "Start a new identity", on-chain switch). Verify is **not** in the top nav; it lives at the bottom of the left rail, in the About card, the intro card and the footer.
- **Bottom tab bar (mobile ≤ 768px):** Home, Packages, Post (raised center button), Communities, **Search** (opens the command palette). Theme toggle lives in the identity popover below 640px.
- **Arkiv status pill:** pulsing dot + "Live" (block number "Tiramisu · block #1,234,567" only in on-chain mode), updating every ~5s. Click → popover with RPC in use and "Switch RPC". Red + "RPC unreachable — switch endpoint" when down.
- **Settings popover (from status pill):** list of RPC endpoints + custom RPC input (stored in localStorage, wrapped in try/catch). This is a *censorship-resistance feature*: if one endpoint is blocked, users switch.
- **Demo-data banner:** if `NEXT_PUBLIC_DATA_SOURCE=mock`, show a slim amber banner "Demo data — not reading from Arkiv". Never ship production with mock.

---

## 4. Design system — "Glass" (Apple-like premium, emerald accent, frosted surfaces)

### Direction
Premium and corporate-friendly: Apple-like neutrals (`#F5F5F7` / true black, graphite greys), **one brand accent — emerald green** (money, not the generic blue), frosted-glass cards (`backdrop-filter: blur(18px) saturate(160%)`) over soft, heavily blurred mint/aqua/sky colour fields. No loud gradients: buttons get a subtle top-to-bottom emerald, salary numbers a quiet metallic shade. Monospace only for on-chain data. **Not** a clone of Reddit's branding.

Rules for the glass:
- `.glass` for cards, rails, chips and pills; `.glass-strong` (≈90% opaque) for overlays (popovers, dialogs, drawers, toasts, receipt) where text can land on anything.
- The ambient layer (`.ambient`, 5 blurred blobs, fixed, `z-index:-1`) is the only decoration. The page background lives on `<html>` and `body` is transparent, otherwise the blobs are hidden.
- `@supports not (backdrop-filter)` falls back to opaque surfaces. Blob drift stops under `prefers-reduced-motion`.
- Every text/background pair must pass **WCAG AA as measured by axe-core** in both themes (glass tints change the effective background, so check, don't assume).

### Typography (Google Fonts via `next/font`)
- **One sans for everything:** `Poppins` (300–600, latin + devanagari, so ₹ renders natively) — UI, feed text, headlines, numbers. Keep it **sharp and classic**: body 400, labels 500, headings/numbers 600. Never 700+; Poppins gets chunky.
- **Mono:** `JetBrains Mono` — **only** on-chain data: entity keys, tx hashes, block numbers, queries, raw attributes. Wallet handles in the feed use the sans. Never use mono for UI labels.
- All numbers use `font-variant-numeric: tabular-nums`.
- Scale: 12 / 14 / 16 / 18 / 24 / 32 / 48 / 72 (hero, desktop) / 44 (hero, mobile).

### Color tokens (`app/globals.css`)
Define on `:root` (light) and `.dark` (dark, default):

Source of truth: `app/globals.css`.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#000000` | `#F5F5F7` | page (on `<html>`) |
| `--surface` | `rgb(28 28 30 / .58)` | `rgb(255 255 255 / .68)` | glass cards |
| `--surface-strong` | `rgb(28 28 30 / .92)` | `rgb(255 255 255 / .92)` | overlays |
| `--surface-2` | `rgb(255 255 255 / .07)` | `rgb(0 0 0 / .045)` | inputs, chips, hover |
| `--border` | `rgb(255 255 255 / .1)` | `rgb(0 0 0 / .09)` | hairlines |
| `--text` / `--muted` | `#F5F5F7` / `#A1A1A6` | `#1D1D1F` / `#58585D` | text (light muted is darker than Apple's `#6E6E73`, which fails AA on glass) |
| `--accent` (brand) | `#2FD69A` | `#00875F` | emerald: focus, rings, active states |
| `--grad-primary` | `#078A61 → #036B4B` | same | primary buttons, logo, active upvote (white text) |
| `--accent-2` | `#2DD4BF` | `#0F766E` | teal: tab underline, thread hover |
| `--accent-3` | `#636366` | `#636366` | graphite: active downvote |
| `--accent-ink` | `#4FE0A9` | `#00704F` | links / accent text |
| `--star` | `#FF9F0A` | `#E8860C` | star ratings only |
| `--trust-high/mid/low` | `#A3E635 / #FF9F0A / #FF6961` | `#266510 / #9A5200 / #C4122F` | trust bands (High is a yellower green so it never reads as the brand colour) |
| `--chain` | `#64D2FF` | `#00668F` | on-chain data, "New" trust badge |

Contrast must meet **WCAG AA**. Never rely on color alone — trust badges always include an icon + label.

### Shape, depth, texture
- Radius: 18px cards, 12px inputs, 999px buttons and pills.
- Glass = 1px translucent border + inner top highlight + soft drop shadow. Gradient elements get a coloured glow (`.glow`).
- Background: the ambient blob layer + 5% SVG grain. Community banners use a hue → pink → violet gradient with a faint grid.
- Spacing on a 4px grid; section padding 64–96px desktop, 40–56px mobile.

### Signature elements (these make it memorable)
1. **Life bar** — every entry shows a thin horizontal bar that drains as expiry approaches, with "expires in 412 days". Confirming refills it with a satisfying animation.
2. **On-chain receipt** — after submitting, a receipt-style card (perforated top edge via CSS mask, mono type): entity key, tx hash, block, expiry date, owner wallet, "View on explorer" and "Copy query".
3. **Trust badge** — pill with icon + score: 🛡 High 82 / ⚠ Medium 55 / ⚑ Unusual 21. Hover/tap → breakdown popover.
4. **"Show query" toggle** — on every result set, reveals the exact Arkiv query in a mono code block with copy button. Proves no hidden backend.
5. **Live pulse** — status pill dot and the landing feed tick in real time.
6. **Big salary numbers** in display font: `₹18.5 L` with p25–p75 range bar beneath.
7. **Vote pill** — ▲ score ▼ on every post and comment; optimistic (instant), marigold for up, chain-blue for down. Clicking your vote again clears it.
8. **Anonymous handles** — `0x12ab…9f3c` with a deterministic two-tone avatar; `OP` badge on the poster's own comments.

### Motion
- Durations 150–250ms for UI, 400–600ms for hero/receipt. Ease: `[0.22, 1, 0.36, 1]`.
- Use: fade/slide-up on list items (stagger 30ms, max 10 items), number count-up on stats, life-bar refill, receipt "print" reveal.
- Never animate layout of large tables. Disable non-essential motion under `prefers-reduced-motion`.

### Responsive rules (mobile-first, test at 360, 390, 768, 1024, 1440)
- No horizontal scroll at any width. `html` and `body` use `overflow-x: clip` (not `hidden`) so nothing can pan the page sideways on touch devices; sticky still works.
- Test with **real mobile emulation** (isMobile + touch), not just a narrow desktop window, and down to **280px**: browser zoom makes a 440px phone behave like ~293px. Header: the status pill collapses to the live dot below 400px. Tab bar: "Communities" becomes "Groups" below 380px.
- **Salaries page:** desktop = left filter sidebar (280px) + results; mobile = sticky "Filters (3)" button opening a bottom **Drawer**, results as cards.
- **Results:** desktop table (sortable columns) ≥ 1024px; cards below.
- Tap targets ≥ 44px. Forms single-column on mobile.
- Mobile bottom tab bar respects `env(safe-area-inset-bottom)`.

### Content & formatting
- Currency: Indian format via `Intl.NumberFormat('en-IN')`. Compact: `₹18.5 L`, `₹1.2 Cr`. Full on hover/detail: `₹18,50,000`.
- CTC always **annual, INR**. Label "Annual CTC".
- Wallets truncated `0x12ab…9f3c` with copy button.
- Relative times ("3 days ago") with absolute on hover.
- Tone: direct, slightly bold, never corporate. Microcopy example: "No sign-up. No email. Just the number."

---

## 5. Pages — detailed specs

### 5.0 Home feed `/` (replaces the old landing page)
- Center: "Create post" bar, sort tabs **Hot / New / Top** (URL `?sort=`), trust select **Medium+ (default) / All / High only** (URL `?trust=`), "N low-trust posts hidden · show them", post cards, "Load more", "Show query".
- Post card: community + handle + time + kind tag (Salary/Review) → title → body (salary: big CTC, chips, trust badge, mini life bar; review: 4 rating chips + comment) → footer: vote pill, comment count, "Still accurate" (salaries), Share (copy link).
- Order is **stable while voting** (no reshuffle under the cursor); recomputed on sort/filter change.
- Left rail ≥ 1024px: Home, Salary search, Verify, communities list. Below that: horizontal community chips.
- Right rail ≥ 1280px: About card (pitch, live posts/comments/confirmations/block, Create, Verify) + House rules. Below that: a dismissible intro card at the top of the feed.
- **Authors always see their own new posts** in that tab (badge "Your post · visible to you"): a fresh-wallet post usually starts below Medium trust.
- Hot = `sign(score)·log10(max(|score|,1)) + createdAt/45 000 000` (12.5 h per order of magnitude). Votes rank posts; **votes never affect trust**.

### 5.1 (old) Landing — superseded by 5.0. The takedown diagram moved to `/verify`.
1. **Hero:** headline "Salaries no one can delete." Sub: "Anonymous salaries and workplace reviews, stored on Arkiv. No company can take them down. Anyone can query them." Big search input (company/role, opens ⌘K-style results) + CTA "Add your salary" + secondary "Verify it yourself →".
2. **Live stats strip** (count-up, from Arkiv): total entries, companies, confirmations, latest block. Each with a tiny "live" dot.
3. **Live feed:** last 8 entries as compact cards sliding in (refetch every 10s): company, role/level, city, ₹CTC, trust badge, "2 min ago".
4. **How it works — 3 cards:** *Stored on Arkiv* (no central DB) · *Verified by data, not identity* (trust score) · *Self-cleaning* (expiry + confirmations).
5. **"Try to take it down" section:** short copy + diagram: Web app / CLI / any client → Arkiv RPC (multiple endpoints) → Arkiv. CTA to `/verify`.
6. **Top companies grid** (6 cards) → `/company`.
7. Footer: GitHub repo, MIT, schema.md, friction.md, demo video, "Built for the CROPS Censorship Resistance track".

### 5.2 Salaries `/salaries` (the core page — make it excellent)
- **Filters:** Company (multi-select combobox), Role, Level, City (multi), YoE range slider (0–20), CTC range slider (₹0–1 Cr, log-ish steps), Trust: All / Medium+ / High only (default Medium+), Sort: newest / CTC high-low / trust.
- Filters sync to URL query params (shareable links).
- **Aggregate panel** (top of results): Median CTC (huge), p25–p75 range bar, entry count, histogram (Recharts, 8–12 bins), median YoE.
  - **k-anonymity rule:** if the filtered group has < 3 entries, don't show aggregates; show "Not enough data yet — add yours" CTA.
- **"Show query"** toggle under the aggregate panel.
- **Results:** table (desktop) / cards (mobile): company, role, level, city, YoE, CTC, trust badge, life bar (mini), posted date. Row click → `/entry?key=`.
- Empty state: illustration-free, typographic: "No salaries match. Loosen filters or be the first."
- Loading: skeleton rows matching final layout. Error: inline card with retry + "Switch RPC".

### 5.3 Companies `/companies`
- Search box + sort (most entries / highest median / best rated).
- Cards: monogram avatar (generated from initials + deterministic hue — no logos), name, industry, HQ city, entries count, median CTC, avg rating stars, % high-trust.

### 5.4 Community `/company?name=` (c/<slug>)
- Hued banner + community icon, `c/<slug>`, company · industry · HQ, "Create post". Stats (posts, median CTC, rating, % high-trust) in a right rail on desktop, a grid on mobile.
- Flag banner as before; "Show them" sets `?trust=all` for the community feed.
- Tabs: **Posts** (the feed scoped to this company) · **Salary bands** (matrix) · **Ratings** (rating bars).

Original company-profile spec, still applicable to the tabs:
- Header: monogram, name, industry, city, stats row (entries, median CTC, avg rating, % high-trust).
- **Flag banner** if > 30% of this company's entries are "Unusual" or "Burst": amber card "We detected a burst of low-trust entries for this company. They're hidden by default." + toggle to show. (This powers the Nimbus fraud demo — see §7.)
- Tabs: **Salaries** (bands by role × level as a matrix: median + count per cell; tap cell → filtered `/salaries`) · **Reviews** (rating bars for WLB, Management, Growth, Culture; review cards with short comment) · **Entries** (raw list).

### 5.5 Post `/post?key=` (`/entry?key=` is an alias)
- Full post card, then for salaries the "Is this still accurate?" card (life bar + confirm), then **comments**: composer (≤ 500 chars, live PII scanner, blocks submit), thread sorted Top/New, collapsible branches, inline Reply, per-comment vote pill, OP badge, comments from burst-flagged wallets hidden. Right rail: community card + trust breakdown (salaries).

Original entry spec, still applicable:
- Big CTC, role/level/city/YoE, company link.
- **Trust card:** score ring + 4-row breakdown (confirmations, range fit, wallet history, freshness) with points each, plus flags ("Unusual: 2.8× median", "Burst: 6 posts in 1h from this wallet").
- **Life bar** full size: created date, expiry date, days left.
- **"Still accurate" button** — confirms (and extends if supported). Disabled for the entry's own owner wallet, with tooltip "You can't confirm your own entry". After success: life bar refill animation + toast.
- **Confirmations list:** truncated wallets + times.
- **On-chain panel (collapsible):** entity key, owner, tx/block if available, raw attributes as a mono key–value list, "View on explorer", "Copy query for this entity".

### 5.6 Submit `/submit`
Stepper (3 steps, progress bar at top):
1. **Type:** "Salary" or "Review" (two big cards).
2. **Details:**
   - Salary: company (select from catalog), role, level, city, YoE (number), annual CTC (₹ input with live L/Cr preview), optional base salary.
   - Review: company, ratings 1–5 for WLB / Management / Growth / Culture (tap stars), optional comment ≤ 280 chars.
3. **Privacy check & post:**
   - Live PII scanner on the comment (`lib/pii.ts`): blocks submit if it detects emails, phone numbers (Indian 10-digit, +91), URLs, @handles; shows inline highlight + "Remove personal details to continue".
   - Info box: "What gets stored: [exact attribute list]. What never gets stored: your name, email, IP, device."
   - Wallet choice: **"Post with a fresh wallet (recommended)"** vs "Use connected wallet". (Wallet logic is the teammate's `useWallet()` — §6.)
   - Expiry note: "Your entry stays for ~18 months. Others can extend it by confirming."
   - Submit → pending state with step text ("Signing… Writing to Arkiv… Confirming…") → **On-chain receipt** (§4) + "View entry" + "Add another".

### 5.7 Verify `/verify` — "Don't trust us"
The page that wins the censorship-resistance argument.
1. **Intro:** "This site is just one window into the data. Close it and the data is still there."
2. **RPC endpoints:** list with live status (latency, latest block), currently-selected marker, "Use this".
3. **Query playground:** pick a preset (e.g., "All SDE-2 salaries in Hyderabad", "Nimbus Infotech entries", "Entries expiring this month"), shows the Arkiv query string, "Run" executes it live and shows raw results (mono, collapsible JSON).
4. **Use the CLI:** copyable install + example commands. **Hidden until real** — set `CLI_SNIPPETS` in `lib/constants.ts` (null = hidden). Never show judges commands that don't work.
5. **Use any HTTP client:** copyable `curl` JSON-RPC example. **Hidden until** `ARKIV_QUERY_METHOD` is set.
6. **Mirrors:** links to every deployment of the frontend (Vercel, IPFS gateway(s)). Only entries with `live: true` are shown; the section disappears when none are live.
Section numbers renumber themselves to match what's shown.
7. **Schema:** rendered summary of entity types + link to `/arkiv/schema.md` on GitHub.

---

## 6. Data contract (frontend ↔ Arkiv layer)

The UI **only** talks to the `DataSource` interface. Two implementations:
- `lib/data/mock/` — frontend builds this now, backed by the deterministic seed generator (§7). In-memory only.
- `lib/data/arkiv/` — **teammate builds this.** Same interface, real Arkiv reads/writes.

Selected by `NEXT_PUBLIC_DATA_SOURCE=mock|arkiv` in `lib/data/index.ts`. Production must be `arkiv`.

```ts
// lib/data/types.ts
export type Address = `0x${string}`;
export type EntityKey = `0x${string}`;

export type CompanyId = string;      // slug from catalog, e.g. "nimbus-infotech"
export type Role = string;           // from catalog
export type Level = string;          // from catalog
export type City = string;           // from catalog

export interface SalaryEntry {
  key: EntityKey;
  kind: 'salary';
  company: CompanyId;
  role: Role;
  level: Level;
  city: City;
  yoe: number;            // years of experience
  ctc: number;            // annual CTC in INR (integer rupees)
  baseSalary?: number;    // annual INR
  createdAt: number;      // ms epoch
  expiresAt: number;      // ms epoch (derived from Arkiv expiry)
  owner: Address;
}

export interface Review {
  key: EntityKey;
  kind: 'review';
  company: CompanyId;
  wlb: 1 | 2 | 3 | 4 | 5;
  management: 1 | 2 | 3 | 4 | 5;
  growth: 1 | 2 | 3 | 4 | 5;
  culture: 1 | 2 | 3 | 4 | 5;
  comment?: string;       // ≤ 280 chars, PII-checked
  createdAt: number;
  expiresAt: number;
  owner: Address;
}

export interface Confirmation {
  key: EntityKey;
  entryKey: EntityKey;
  createdAt: number;
  owner: Address;
}

export interface SalaryFilters {
  companies?: CompanyId[];
  roles?: Role[];
  levels?: Level[];
  cities?: City[];
  yoeMin?: number; yoeMax?: number;
  ctcMin?: number; ctcMax?: number;
  limit?: number;
}

/** Every read returns the Arkiv query string used, for the "Show query" UI. */
export interface QueryResult<T> { data: T; query: string; }

export interface WriteReceipt {
  key: EntityKey;
  txHash?: `0x${string}`;
  block?: number;
  expiresAt: number;
  owner: Address;
}

export interface NetworkStatus {
  rpcUrl: string;
  chainName: string;    // "Tiramisu"
  latestBlock: number;
  latencyMs: number;
  ok: boolean;
}

export interface DataSource {
  // reads
  searchSalaries(f: SalaryFilters): Promise<QueryResult<SalaryEntry[]>>;
  getReviews(company: CompanyId): Promise<QueryResult<Review[]>>;
  getConfirmations(entryKey: EntityKey): Promise<QueryResult<Confirmation[]>>;
  getConfirmationsFor(entryKeys: EntityKey[]): Promise<QueryResult<Confirmation[]>>;
  getStats(): Promise<{ entries: number; companies: number; confirmations: number; latestBlock: number }>;
  getNetworkStatus(rpcUrl?: string): Promise<NetworkStatus>;
  runRawQuery(query: string): Promise<unknown>; // for /verify playground

  // writes (require wallet)
  createSalary(input: Omit<SalaryEntry, 'key' | 'kind' | 'createdAt' | 'expiresAt' | 'owner'>): Promise<WriteReceipt>;
  createReview(input: Omit<Review, 'key' | 'kind' | 'createdAt' | 'expiresAt' | 'owner'>): Promise<WriteReceipt>;
  confirmEntry(entryKey: EntityKey): Promise<WriteReceipt>; // also extends expiry if Arkiv allows
}
```

*(Removed 2026-10-18: `getSalary`, `getRecent`, `getWalletActivity` — no page used them; `getPost` replaced `getSalary` and trust derives wallet history from the full dataset.)*

**Social additions (implemented in `lib/data/types.ts`, the source of truth):**
```ts
export type Flair = 'culture' | 'layoffs' | 'compensation' | 'workplace' | 'management' | 'interviews' | 'company-news' | 'ask';
export interface Discussion { key; kind: 'discussion'; company: CompanyId; flair: Flair; city?: City; title: string /* 8–140, PII-checked */; body?: string /* ≤ 3000, PII-checked */; createdAt; expiresAt; owner }
export type Post = Discussion | SalaryEntry | Review;   // discussions are the primary post type
// DataSource also gains: getDiscussions(company?) and createDiscussion(input). Stats gains `discussions`.
export type VoteDir = 'up' | 'down' | 'none';          // latest vote per (wallet, target) wins
export interface Vote { key; kind: 'vote'; targetKey: EntityKey; dir: VoteDir; createdAt; expiresAt; owner }
export interface Comment { key; kind: 'comment'; postKey: EntityKey; parentKey?: EntityKey; body: string /* ≤ 500, PII-checked */; createdAt; expiresAt; owner }

// DataSource gains:
getPost(key): Promise<QueryResult<Post | null>>;
getReviews(company?: CompanyId)                         // omit company → all reviews (feed)
getComments(postKey?: EntityKey): Promise<QueryResult<Comment[]>>;   // omit → all (feed counts)
getVotes(targetKeys?: EntityKey[]): Promise<QueryResult<Vote[]>>;    // omit → all
createComment(input: { postKey; parentKey?; body }): Promise<WriteReceipt>;
castVote(targetKey: EntityKey, dir: VoteDir): Promise<WriteReceipt>;
// Stats gains `comments`.
```
Vote direction is a **string** attribute (`dir`) because Arkiv numeric attributes are unsigned.

**Wallet hook (teammate provides; frontend mocks until then):**
```ts
// lib/wallet/useWallet.ts
export interface WalletState {
  address?: Address;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  isFresh: boolean;                 // true if a newly generated burner wallet
  connect(): Promise<void>;         // injected wallet (e.g. MetaMask)
  useFreshWallet(): Promise<void>;  // generate burner, fund via faucet if possible
  disconnect(): void;
}
```

Rules:
- Components never import from `lib/data/arkiv` or `lib/data/mock` directly — only `getDataSource()` and React Query hooks in `hooks/`.
- All hooks live in `hooks/` (`useSalaries`, `useAllSalaries`, `useTrustIndex`, `useCompany`, `useReviews`, `useAllReviews`, `useConfirmations`, `useStats`, `useNetworkStatus`; social: `useFeed`, `usePost`, `useComments`, `useAllVotes`, `useTallies`, `useCastVote` (optimistic), `useCreateComment` in `hooks/social.ts`).
- Voting/commenting/confirming without a wallet silently creates a per-tab fresh wallet ("anonymous identity"). Posting with a fresh wallet drops it afterwards so the next action gets a new one.
- Writes invalidate the relevant queries.
- If a contract change is needed, update `lib/data/types.ts` **and** tell the teammate; keep `/arkiv/schema.md` in sync.

---

## 7. Catalog & seed data (synthetic only)

`lib/catalog.ts` — **fictional** values; all dropdowns use these (no free text for company/role/level/city):

- **Companies** (slug, name, industry, HQ):
  - `nimbus-infotech` Nimbus Infotech — IT services — Hyderabad ← **the fraud story**
  - `kaveri-systems` Kaveri Systems — Product SaaS — Bengaluru
  - `godavari-labs` Godavari Labs — AI/ML — Hyderabad
  - `deccan-cloudworks` Deccan Cloudworks — Cloud infra — Pune
  - `sahyadri-software` Sahyadri Software — Fintech — Mumbai
  - `tungabhadra-tech` Tungabhadra Tech — IT services — Chennai
  - `vindhya-analytics` Vindhya Analytics — Data/analytics — Gurugram
  - `coromandel-digital` Coromandel Digital — E-commerce — Coimbatore
- **Roles:** Software Engineer, Frontend Engineer, Backend Engineer, Data Scientist, Data Analyst, QA Engineer, DevOps Engineer, Product Manager, Product Designer.
- **Levels:** Intern, L1 / SDE-1, L2 / SDE-2, L3 / Senior, L4 / Staff, Lead / Manager.
- **Cities:** Hyderabad, Bengaluru, Chennai, Pune, Mumbai, Gurugram, Noida, Coimbatore, Kochi, Remote.

`lib/seed/generate.ts` — **deterministic** (seeded PRNG, e.g. mulberry32) so mock data and the teammate's Arkiv seed script produce the same dataset:
- ~150 salary entries, ~60 reviews, ~120 confirmations, spread over the last ~16 months.
- Realistic CTC bands per level × company tier (e.g. SDE-1 ₹6–18 L, SDE-2 ₹14–35 L, Senior ₹25–60 L, Staff ₹45–90 L), with noise.
- **Planted fraud:** 1 wallet posts ~8 Nimbus Infotech entries within 1 hour, each 2.5–3.5× the median, 0 confirmations, plus 5-star reviews → must surface as "Unusual"/"Burst" and trigger the company flag banner.
- A few entries close to expiry (< 30 days) so the life bar and "Still accurate" demo are visible.
- ~20 synthetic wallets, deterministic addresses (not real keys).
- **Discussions** (generated after the social layer): 24 curated company-specific threads modelled on real forum topics (discrimination at an HO, bankruptcy fears, toxic culture, a manager fearing layoffs, hike % after 2 YOE…) **on fictional companies only**, plus 3 common threads per company; each with 2–9 topical comments, replies and votes. The fraud wallet also posts a glowing thread (hidden under Medium+). Never use real company names, even when the user's examples do (rule 5).
- **Social layer** (generated last so it never changes the data above): ~240 comments (threads + replies, concentrated on recent posts, all PII-free), ~900 votes (≈86% up on legit posts). The Nimbus burst gets 4–7 downvotes per post, self-upvotes from the fraud wallet, and comments calling it out.

Export the generator so the teammate's script can import it.

---

## 8. Core logic (pure functions, unit-tested)

### `lib/trust.ts` — trust score (0–100)
Input: the entry, peer entries (same company + role + level), confirmations for the entry, the owner wallet's activity.

| Component | Rule | Max |
|---|---|---|
| Confirmations | distinct confirming wallets, **excluding the owner**: `min(n, 5) × 8` | 40 |
| Range fit | needs ≥ 3 peers else 15 (neutral). `r = ctc / median(peers)`. `0.67 ≤ r ≤ 1.5` → 30; `0.5 ≤ r ≤ 2` → 15; else 0 and flag **Unusual (r×)** | 30 |
| Wallet history | wallet first seen ≥ 7 days before this entry → 15; ≥ 1 day → 8; else 0. **Burst:** > 3 entries for the same company within 24h → 0 and flag **Burst** | 15 |
| Freshness | age from last confirmation (or creation): < 6 mo → 15; < 12 mo → 10; else 5 | 15 |

Bands: **High ≥ 70**, **Medium 40–69**, **Low < 40**. Return `{ score, band, isNew, parts: {...}, flags: string[] }`.

**New-post grace (decided 2026-10-17):** a post under **72 h** old that scores Low **and has no Unusual/Burst flag** gets `isNew = true`. It shows a cyan "✦ New" badge instead of "Unusual" and passes the Medium+ filter. Without this, every honest fresh-wallet post (≈30 points: neutral range fit + 0 wallet age + fresh) would be hidden by default. Flagged posts (the Nimbus burst) get no grace.
Write tests for: neutral with few peers, outlier flagged, owner self-confirm ignored, burst detection, band boundaries.

> Note for the README / friction log: `createdAt` from attributes is self-reported; prefer chain-derived timestamps if the Arkiv layer can provide them.

### `lib/aggregate.ts`
`median`, `percentile(p)`, `histogram(values, bins)`, `groupMatrix(entries, 'role', 'level')`. Enforce **k ≥ 3** — return `null` for groups smaller than 3.

### `lib/format.ts`
`formatINRCompact(n)` → `₹18.5 L` / `₹1.2 Cr`; `formatINR(n)` → `₹18,50,000`; `truncateAddress`; `relativeTime`; `daysUntil`.

### `lib/social.ts`
`tallyVotes(votes, viewer?)` (latest per wallet, `none` clears, case-insensitive), `hotScore`, `sortPosts(posts, 'hot'|'new'|'top', tallies)`, `buildCommentTree(comments, 'top'|'new', tallies)` (orphans lift to top level), `commentCounts`. Tested in `tests/social.test.ts`.

### `lib/pii.ts`
`scanPII(text) → { ok: boolean, matches: { type, start, end }[] }` for emails, Indian phone numbers (10 digits starting 6–9, optional +91/0, spaces/dashes), URLs, `@handles`. Tested.

---

## 9. Project structure

```
/app
  layout.tsx            fonts, ThemeProvider, QueryProvider, Nav, MobileTabBar, Toaster, DemoBanner
  page.tsx              landing
  salaries/page.tsx
  companies/page.tsx
  company/page.tsx
  entry/page.tsx
  submit/page.tsx
  verify/page.tsx
  not-found.tsx
  globals.css           tokens + base styles
/components
  ui/                   shadcn generated
  layout/               Nav, MobileTabBar, Footer, StatusPill, RpcSwitcher, DemoBanner, ThemeToggle, CommandMenu
  salary/               SalaryTable, SalaryCard, Filters, FilterDrawer, AggregatePanel, Histogram, RangeBar, QueryReveal
  trust/                TrustBadge, TrustBreakdown, TrustRing
  entry/                LifeBar, ConfirmButton, OnChainPanel, Receipt
  company/              CompanyCard, CompanyHeader, SalaryMatrix, RatingBars, ReviewCard, FlagBanner, Monogram
  submit/               Stepper, TypeStep, SalaryForm, ReviewForm, PrivacyStep, WalletChoice
  landing/              Hero, LiveStats, LiveFeed, HowItWorks, TakedownDiagram
  common/               CopyButton, Mono, EmptyState, ErrorState, Skeletons, CountUp
/hooks                  React Query hooks (§6)
/lib
  data/types.ts, data/index.ts, data/mock/*, data/arkiv/* (teammate)
  wallet/*              (teammate; frontend stub until ready)
  catalog.ts, trust.ts, aggregate.ts, format.ts, pii.ts, constants.ts (RPCs, mirrors, CLI snippets)
  seed/generate.ts
/arkiv
  schema.md             (teammate owns)
  friction.md           (both append)
/cli                    (teammate)
/tests                  vitest
LICENSE                 MIT
README.md
```

---

## 10. Build order (execute in this sequence)

Commit after each step. Each step must leave the app runnable.

1. **Scaffold:** Next.js + TS strict + Tailwind v4 + shadcn init, `output: 'export'`, fonts, tokens, ThemeProvider, QueryProvider, MIT LICENSE, README skeleton, `/arkiv/schema.md` + `/arkiv/friction.md` stubs. Deploy to Vercel immediately.
2. **Contract + catalog + seed + mock source:** `types.ts`, `catalog.ts`, `seed/generate.ts`, mock `DataSource` (simulate 150–400ms latency and occasional writes). Demo banner.
3. **Pure logic + tests:** `format`, `aggregate`, `trust`, `pii` with vitest passing.
4. **Layout shell:** Nav, MobileTabBar, StatusPill (mock network status), Footer, CommandMenu.
5. **Salaries page** end-to-end (filters ↔ URL, aggregates, histogram, table/cards, trust badges, show-query). This is the most important page.
6. **Entry page** (trust breakdown, life bar, confirm, on-chain panel).
7. **Submit flow** (forms, PII check, wallet stub, receipt).
8. **Company + Companies pages** (matrix, ratings, flag banner for Nimbus).
9. **Landing page** (hero, live stats, live feed, how-it-works, takedown diagram).
10. **Verify page** (RPC list, query playground, CLI/curl snippets, mirrors).
11. **Integrate Arkiv:** switch `NEXT_PUBLIC_DATA_SOURCE=arkiv`, fix mismatches, log friction.
12. **Polish pass:** responsive audit at all breakpoints, empty/loading/error states everywhere, a11y, Lighthouse, copy review.
13. **Docs:** README complete (live URL, setup, env vars, wallet addresses, video link, pre-existing work disclosure if any).

If time is short, cut in this order (last first): Verify playground "Run" → command palette → companies list sorting → histogram. **Never cut:** salaries search, trust badge, life bar + confirm, receipt, show-query, Verify page basics, responsive.

---

## 11. Quality bar — "what impresses a judge"

- [ ] Opens fast on mobile; looks intentional at 360px.
- [ ] Within 10 seconds a judge sees: the "Live on Arkiv" pill, real Arkiv-backed numbers, a trust badge, a life bar, and the intro card's **Verify it yourself** + **Show on-chain details** switch (which reveals block numbers and queries everywhere). The demo video should flip that switch.
- [ ] Every number traces back to a query ("Show query", visible with on-chain details on).
- [ ] Fraud story works: Nimbus shows the flag banner; planted entries are hidden under "Medium+".
- [ ] Submitting produces an on-chain receipt with a working explorer link.
- [ ] Switching RPC works and is visible.
- [ ] No console errors; no layout shift on load; all images/icons have labels.
- [ ] Lighthouse (mobile): Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 95.
- [ ] Keyboard: everything reachable; visible focus ring (accent color, 2px offset).
- [ ] Every async view has skeleton, empty and error states.
- [ ] Dark and light both look designed, not inverted.

## 12. Do NOT build

User accounts, login, LinkedIn/Google sign-in, email collection, notifications, DMs, user profiles/karma pages, tokens/rewards, admin panel, any server or database, analytics that collect personal data, real company logos, Reddit's logo/colours/typeface.

*(Changed 2026-10-17: comments/threads and upvotes are now **in scope** — the product is a Reddit-style community. They're Arkiv entities like everything else, anonymous, PII-checked, and never affect trust scores.)*

---

## 13. README must include

- One-line pitch + screenshot/GIF.
- Live URL(s) + demo video link (≤ 3 min).
- **Why Arkiv** — what breaks on Postgres / IPFS / subgraph / own API; what we kept off Arkiv on purpose (aggregates computed client-side, no identities, no emails, no exact team names, frontend assets).
- Setup: `pnpm i`, `.env.local` vars (`NEXT_PUBLIC_DATA_SOURCE`, `NEXT_PUBLIC_ARKIV_RPC_URL`, etc. — never real keys in the repo), `pnpm dev`, `pnpm test`, `pnpm build`.
- Wallet addresses that created entities on Tiramisu.
- Links to `/arkiv/schema.md` and `/arkiv/friction.md`.
- Pre-existing work disclosure with baseline commit SHA (or "none").
- Roadmap: zkEmail-based "verified employee of domain" without revealing identity; IPFS-pinned frontend mirrors.
- License: MIT.
