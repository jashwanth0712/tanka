# Tankha — project report

*Status as of 18 Oct 2026. Frontend complete and running on demo data; the Arkiv (web3) layer is not yet implemented — see [WEB3_TODO.md](WEB3_TODO.md).*

## 1. What it is

**Tankha** (Hindi/Urdu slang for "salary") is an anonymous, censorship-resistant **company forum**, styled like Reddit:

1. **Company-wise discussions (primary).** Threads such as "Layoffs in the data team this week?", "What % hike is realistic after 2 YOE?" or "Toxic culture in the Bengaluru office", each in its company's community (`c/kaveri-systems`).
2. **Salary packages (second).** Anonymous CTC posts, searchable and aggregated (median, p25–p75, histogram, role × level bands).
3. **Reviews (third).** 1–5 ratings for work-life balance, management, growth and culture.

Every post, vote, comment and confirmation is an **Arkiv entity**. There is no database and no backend server, and the frontend is a static bundle. So no company, legal notice or server shutdown can remove the content, and anyone can query it.

Built for the **CROPS Censorship Resistance** hackathon track.

## 2. What a user can do

| Feature | Where | Notes |
|---|---|---|
| Browse a ranked feed | `/` | Hot / New / Top; All · Discussions · Packages · Reviews; trust filter (Medium+ by default) |
| Join a company's community | `/company?name=` | Tabs: **Discussions** (topic chips) · **Packages** (salary bands + posts) · **Reviews** |
| Start a discussion | `/submit` | Topic, optional office city, title, details; live personal-details scanner blocks emails, phone numbers, links and @handles |
| Post a package or review | `/submit` | CTC input accepts "18.5 L" / "1.2 Cr"; zod-validated |
| Vote and comment | everywhere | Instant (optimistic) votes; threaded, collapsible comments with OP badge |
| Confirm a salary is "Still accurate" | post page / feed | Refills the post's ~18-month life bar and raises its trust score |
| Search packages | `/salaries` | Filters synced to the URL; k-anonymity (aggregates hidden below 3 entries) |
| Stay anonymous | — | No sign-up. A throwaway wallet per browser tab, shown as a pseudonym like "Calm Badger · d0b8"; "Start a new identity" any time |
| Verify it yourself | `/verify` | Live RPC endpoint status, switch RPC, query playground over raw entities, schema |

**On-chain details are opt-in.** By default the app reads like a social network. A "Show on-chain details" switch (profile menu, "Live" pill, home intro card) reveals the Arkiv query behind every list, raw entities, block numbers and wallet addresses.

## 3. Trust and moderation (all computed in the browser from Arkiv data)

- **Trust score 0–100** per salary post: confirmations by other wallets (max 40), fit with peers' median (max 30), wallet history with burst detection (max 15), and freshness (max 15). Bands: High ≥ 70, Medium 40–69, Low < 40.
- **Anti-poisoning:** burst-flagged posts are left out of peer medians, so a sybil burst can't make honest posts look "Unusual".
- **New-post grace:** unflagged posts under 72 h old show as "✦ New" instead of "Unusual" and stay visible.
- **Low-trust content hidden by default:** low-trust salaries, plus discussions, reviews and comments from wallets that posted flagged entries. One click shows them.
- **Votes rank posts but never affect trust**, because fresh wallets make votes cheap.
- **Demo fraud story:** one wallet posts 8 inflated Nimbus Infotech salaries within an hour, plus 5-star reviews and a hype thread. All of it is flagged, hidden, buried by downvotes and called out in comments, and the community shows a warning banner.

## 4. Architecture

```
Next.js 16 (static export, no server)
  └─ hooks/ (TanStack Query)          ← components never touch data directly
       └─ DataSource interface        lib/data/types.ts  (17 methods)
            ├─ mock   lib/data/mock/   in-memory, deterministic seed, runs the real query strings
            └─ arkiv  lib/data/arkiv/  ← NOT IMPLEMENTED (teammate)  → any Tiramisu RPC → Arkiv
```

- **Contract:** `lib/data/types.ts`. **Entity mapping:** `lib/data/schema.ts`. **Query strings:** `lib/data/query.ts`. The mock evaluates the same query strings (`lib/data/mock/queryEval.ts`), so "Show query" is honest even in demo mode.
- **Entity types (6):** `discussion`, `salary`, `review`, `comment`, `vote`, `confirmation`. All carry `project = "tankha"`. See [arkiv/schema.md](arkiv/schema.md).
- **Pure, tested logic:** `lib/trust.ts`, `lib/social.ts` (votes, Hot ranking, comment trees), `lib/aggregate.ts`, `lib/pii.ts`, `lib/format.ts`, `lib/pseudonym.ts`.
- **Seed:** `lib/seed/generate.ts` is deterministic and fictional-only: 159 salaries, 60 reviews, 49 discussions, 631 comments, 1,388 votes, 199 confirmations and 21 wallets. The Arkiv seed script should import it.
- **Stack:** Next.js 16 · React 19 · TypeScript (strict) · Tailwind v4 · Radix primitives · TanStack Query · react-hook-form + zod · motion · Recharts · cmdk · vaul · sonner · vitest.

## 5. Design

Apple-like, premium and corporate-friendly. Neutral greys with **one emerald accent**, frosted-glass cards over soft blurred colour fields, **Poppins** at 400–600 on a 15px base, and dark and light themes. Mobile-first: a bottom tab bar (Home · Packages · Post · Communities · Search), filters in a bottom drawer, and no sideways panning down to 280px. The full token table and rules are in CLAUDE.md §4.

## 6. Quality checks (all passing at the time of writing)

| Check | Result |
|---|---|
| Unit + integration tests (vitest) | **65 passing**: trust, social, aggregate, PII, format, query evaluator, schema round-trips, seed invariants (fraud story, no PII, no real company names), and end-to-end mock data-source behaviour |
| TypeScript strict + ESLint (Next + React Compiler rules) | 0 errors, 0 warnings |
| Static build | 9 routes, all prerendered |
| Accessibility (axe-core, WCAG 2 A/AA) | 0 violations: dark + light, 390px + 1440px, 6 pages |
| Responsive overflow audit | 0 issues across 49 page/width combinations; touch emulation on 4 phones; 280–440px checked |
| Browser flows (Playwright) | 27/27: voting (optimistic and persisted), comments and replies, PII blocking, sorting, fraud toggle, posting packages and discussions end to end, deep links, `/entry` alias |

## 7. Code audit (18 Oct 2026)

Ran **knip** (unused files, exports and dependencies) and a manual check that every feature is wired end to end.

**Removed (redundant or dead)**
- 3 data-source methods no page used (`getSalary`, `getRecent`, `getWalletActivity`) and their query builders. `getPost` covers single-post reads, and trust derives wallet history from the full dataset. That's three fewer methods for the Arkiv implementation.
- Leftover components from earlier designs (`SectionHeading`, `Monogram`, `ReviewCard`, `Badge`, `Separator`, unused overlay re-exports), 4 hooks nothing called, and unused helpers (`postTitle`, `isSalary`, `groupCounts`, `formatNumber`, `salaryAttributes`).
- Duplicate logic: two identical "initials on a hue" avatar components merged into `CommunityIcon`.
- 4 unused npm packages (`@radix-ui/react-progress`, `-select`, `-separator`, `-toggle`).

**Fixed (wiring)**
- The demo "someone just posted" simulation only ran inside a method nothing called any more, so the feed had gone static. It now rides on the feed's 30-second refresh.
- The Communities directory ignored discussions. It now shows each community's thread count and sorts by "Most active".
- Placeholder links no longer render: the GitHub, schema.md, friction.md and demo-video links (fake repo / `#`), explorer links in demo mode, and the CLI, curl and mirror sections on `/verify`. Each appears automatically once the real value is set in `lib/constants.ts`.
- `prettier` is now wired through `pnpm format`, and `serve` is pinned in `pnpm start`.

**Kept on purpose** (knip reports them as unused): the `entityTo*` mappers, `RawEntity`, `getRpcUrl`, `subscribeSigner` and the seed exports. They're the API the Arkiv implementation is meant to call.

## 8. Known limitations

- **Not on Arkiv yet.** Production must set `NEXT_PUBLIC_DATA_SOURCE=arkiv`. Until the Arkiv layer exists, that mode shows "Couldn't load from Arkiv" everywhere.
- **Wallets are simulated.** The anonymous identity is a random address with no keys. Real burner wallets and funding are part of the web3 work.
- **`createdAt` is self-reported**, and wallet age only sees unexpired data. Both weaken trust scoring slightly (logged in [arkiv/friction.md](arkiv/friction.md)).
- **Sybil limits:** fresh wallets can vote freely and can confirm a post their other wallet made. Votes are kept out of trust for this reason.
- **The feed loads everything** and ranks client-side, so anyone can reproduce the order. That's fine for hundreds or low thousands of entities; beyond that it needs pagination.
- **The catalog is fictional and fixed:** 8 companies, 9 roles, 6 levels and 10 cities, per hackathon rule 5 (no real company names).

## 9. Run it

```bash
pnpm i
pnpm dev          # http://localhost:3000 (demo data)
pnpm test         # 65 tests
pnpm build        # static export → ./out
pnpm start        # serve ./out locally
```

Related docs: [CLAUDE.md](CLAUDE.md) (full spec) · [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md) (how to implement the Arkiv layer) · [WEB3_TODO.md](WEB3_TODO.md) (what's left) · [arkiv/schema.md](arkiv/schema.md) · [arkiv/friction.md](arkiv/friction.md).
