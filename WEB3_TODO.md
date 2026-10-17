# Web3 / Arkiv — what's left to do

*For whoever builds the Arkiv layer. The frontend is done and runs on demo data; everything below is backend/web3 work. **How** to do each item is in [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md). This file is the checklist.*

> ⚠️ **Deadline: 18 October 2026 (today).** The repo's commit SHA is recorded at the deadline (CLAUDE.md §0).
> ⚠️ **The repo has no GitHub remote yet.** Nothing has been pushed, and the rules require a **public, MIT-licensed** repo. Create it and push `main` first, so the recorded SHA exists. Never force-push or rewrite pushed history.

---

## P0 — required to submit (judging gates)

### 1. Implement the Arkiv data source — `lib/data/arkiv/index.ts`
Today every method is a stub that rejects. Implement all **17** against the Arkiv SDK on Tiramisu. Use `lib/data/schema.ts` (entity ⇄ type mapping) and `lib/data/query.ts` (query strings) rather than re-inventing them.

**Reads (11)**
- [ ] `searchSalaries(filters)`: called with `{}` to load **all** salaries (the trust index needs them)
- [ ] `getPost(key)`: discussion, salary or review by key; `null` if missing or expired
- [ ] `getDiscussions(company?)`: no company → every thread
- [ ] `getReviews(company?)`: no company → every review
- [ ] `getComments(postKey?)`: no key → every comment
- [ ] `getVotes(targetKeys?)`: over 20 keys → fetch all and filter client-side
- [ ] `getConfirmations(entryKey)` · `getConfirmationsFor(keys)`
- [ ] `getStats()`: entries, companies, confirmations, comments, discussions, latestBlock
- [ ] `getNetworkStatus(rpcUrl?)`: never throw; return `ok: false`. Polled every 5s per endpoint.
- [ ] `runRawQuery(query)`: for the `/verify` playground; throw readable errors

**Writes (6)**, all using `requireSigner()` from `lib/wallet/session.ts`
- [ ] `createDiscussion`: title 8–140 chars, body ≤ 3000, reject PII (`scanPII`)
- [ ] `createSalary` · `createReview`
- [ ] `createComment`: ≤ 500 chars, reject PII and missing posts
- [ ] `castVote(targetKey, dir)`: always a **new** entity (`up` / `down` / `none`); keep it fast, because the UI is optimistic
- [ ] `confirmEntry(entryKey)`: reject own entry and duplicates, and **extend the entry's expiry** (see item 4)

Every read returns `{ data, query }`. The `query` must be the string you actually ran; the UI shows it under "Show query".

### 2. Real wallets — `lib/wallet/useWallet.tsx`
- [ ] `createFreshWallet()`: in-memory burner key (e.g. viem `generatePrivateKey`), funded so it can write. This runs on **every user's first vote, comment or confirm**, so it must be fast and must not pop a wallet UI.
- [ ] `connectInjected()`: MetaMask or another injected wallet, switching or adding the Tiramisu chain.
- [ ] Never persist, log, or write private keys into attributes or payloads.
- [ ] If Tiramisu has no programmatic faucet, log it in `arkiv/friction.md` immediately. The fresh-wallet story depends on it.

### 3. Confirm the query syntax
- [ ] Check the assumed syntax (`attr = "x" && n >= 1 && (a || b)`, plus `$key` / `$owner`) against the SDK.
- [ ] If it differs, fix it once in `lib/data/query.ts`, then update `lib/data/mock/queryEval.ts` and `tests/query.test.ts`.

### 4. Decide expiry extension on confirm
Confirming should push the salary's expiry to `max(current, now + ~18 months)`. Pick one, then tell the frontend:
- [ ] (a) Arkiv lets a non-owner extend → just do it.
- [ ] (b) It doesn't → compute effective expiry as `max(entity expiry, latest confirmation + TTL)` inside `entityToSalary`.
- [ ] (c) Only the owner can extend → log it in friction.md, and the "Still accurate" copy changes.

### 5. Seed Tiramisu with the demo dataset (`/cli`)
- [ ] A script that imports `generateSeed()` from `lib/seed/generate.ts` (159 salaries, 60 reviews, 49 discussions, 631 comments, 1,388 votes, 199 confirmations).
- [ ] One real keypair per seed wallet (keys in a **gitignored** `.env.local` or file only).
- [ ] Write order: posts → confirmations → discussions → comments (parents before replies) → votes, mapping seed keys to real keys.
- [ ] Backdate `createdAt` and set expiry to `expiresAt − now`. The fraud wallet's 8 Nimbus posts must land **within one hour**.
- [ ] Afterwards, check that `/company?name=nimbus-infotech` shows the warning banner, the burst is hidden under Medium+, and honest Nimbus posts are **not** flagged.

### 6. Configure and switch production to Arkiv
- [ ] `lib/constants.ts` → `RPC_ENDPOINTS`: at least **2 real** Tiramisu endpoints. The RPC switch is a demo moment.
- [ ] `EXPLORER_URL` and the `explorer*Url` path formats.
- [ ] Production env: `NEXT_PUBLIC_DATA_SOURCE=arkiv` and `NEXT_PUBLIC_ARKIV_RPC_URL`. The amber "Demo data" banner must disappear.
- [ ] Finalise `arkiv/schema.md` (remove the "DRAFT" note) to match what's really on chain.

### 7. Deploy and fill in the submission bits
- [ ] Deploy to **Vercel** (static export, `pnpm build` → `out/`), publicly reachable until **23 Oct**.
- [ ] `README.md`: live URL, demo video (≤ 3 min), **wallet addresses used on Tiramisu**, baseline commit SHA, screenshot.
- [ ] `lib/constants.ts`: set `REPO_URL` and `DEMO_VIDEO_URL`. The footer and Verify links appear automatically once they're real.

---

## P1 — makes the censorship-resistance pitch land

- [ ] **IPFS mirror:** pin `out/` and set `MIRRORS[].live = true` with the real CID. The section appears on `/verify`. (`scripts/flatten-prefetch.mjs` already makes the build IPFS-safe.)
- [ ] **CLI** in `/cli` (query / get / stats), then set `CLI_SNIPPETS` in `lib/constants.ts`. Its section on `/verify` stays hidden until then.
- [ ] **JSON-RPC method** for queries: set `ARKIV_QUERY_METHOD` to reveal the curl example on `/verify`. Only set it once the command works when copy-pasted.
- [ ] **friction.md:** add dated Arkiv-side entries (SDK, RPC, expiry, faucet, query-syntax surprises).
- [ ] **Demo video:** flip "Show on-chain details" on screen, switch RPC, start a discussion, vote, confirm a salary and show the receipt with a real explorer link.

## P2 — after the hackathon

- [ ] Chain-derived timestamps instead of self-reported `createdAt` (strengthens trust scoring).
- [ ] An `IN (…)` operator or pagination, so the feed doesn't load every entity.
- [ ] Weight votes and confirmations by wallet history (sybil resistance).
- [ ] An upsert or update for votes instead of append-only entities.
- [ ] zkEmail "verified employee of <domain>" badge (README roadmap).

---

## Done on the frontend (for reference — no web3 work needed)

Contract and types, entity schema mapping, query builders, mock data source (spec + 10 integration tests), deterministic seed, trust and social logic (65 tests in total), all pages and flows, RPC switcher, on-chain details toggle, placeholder gating, accessibility and responsive audits. See [PROJECT_REPORT.md](PROJECT_REPORT.md).
