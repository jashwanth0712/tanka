# Tankha — salaries no one can delete

> *Tankha* (Hindi/Urdu slang for "salary"). An anonymous, Reddit-style forum for company discussions, salary packages and reviews. Every post, vote, comment and "still accurate" confirmation is an **Arkiv** entity, so no company, legal notice or server shutdown can remove it, and anyone can query it.

**Live:** https://tankha-ten.vercel.app · **Repo:** https://github.com/jashwanth0712/tanka · **Demo video (≤ 3 min):** https://youtu.be/LFjiF_Wrf_Y · **Network:** Tiramisu testnet · **Tracks:** Censorship Resistance, Best Indian Use Case

## The problem

Millions of Indian tech and IT-services employees take jobs, accept offers and survive layoffs with almost no trustworthy information. The few places that hold it (company-review sites, forums, social posts) are centralised, so they fail in the ways that matter:

- **Takedowns.** A legal notice, an HR complaint or a sponsored-content deal removes a thread about layoffs, delayed appraisals or a toxic team. The people most harmed by silence are the ones who needed it: the next hire deciding whether to join, and the employee deciding whether to speak up.
- **Fear of being identified.** Posting a real salary or a criticism under a real name, or from an account that links to an email, risks the job. So people stay quiet, and data gets thin.
- **Fake and stale entries.** Anyone can post ten inflated salaries to make a company look generous, and a salary from 2021 sits there looking current.
- **No way to check.** Every site asks you to trust it. If it changes or deletes a number, nobody can tell.

## How Tankha solves it

| Problem | What Tankha does |
|---|---|
| Takedowns | There is no database and no backend. Every post, vote and comment is an entity on Arkiv. The frontend is a static bundle that anyone can mirror. |
| Fear of being identified | No sign-up, no email, no social login. A throwaway wallet signs each post, and the UI shows a pseudonym like "Calm Badger · d0b8". A client-side scanner blocks phone numbers, emails, links and handles before anything is written. Aggregates are hidden below 3 entries (k-anonymity). |
| Fake entries | A **trust score** (0–100) computed in the browser from Arkiv data only: confirmations from other wallets, fit with the peer median, wallet history with burst detection, and freshness. A planted sybil burst on one company (8 inflated salaries from one wallet in an hour) is flagged, hidden by default, and the community shows a warning. |
| Stale data | Entries expire after about 18 months. Anyone can press **Still accurate** to extend a salary's life, so only data people still vouch for stays on chain. |
| "Trust us" | Every list has a **Show query** toggle with the exact Arkiv query that produced it, and a Verify page that runs raw queries and checks live RPC status. You can reproduce any number without Tankha. |
| Closed catalog | Companies are open-ended: paste a company's LinkedIn page link and its community is created. Communities, the sidebar, search and ⌘K are built live from what is on Arkiv. |

## What we use Arkiv for

Each Arkiv feature is used for a specific job (details in [arkiv/schema.md](arkiv/schema.md)):

| Arkiv feature | Used for |
|---|---|
| Entities and attributes | Six entity types: `discussion`, `salary`, `review`, `comment`, `vote`, `confirmation`. Content that is not queried (titles, bodies, comments) lives in the JSON payload. Filters and joins live in attributes. |
| Typed attributes and range queries | `str` for company, role, level and city; `i32` for years of experience and CTC, so `ctc >= i32(2000000)` is a real range query; `u64` for timestamps; `key` for references (a comment's `post_key`, a vote's `target_key`). |
| Query language (`arkiv_query`) | Every list, search and filter in the app. The same string is shown in the UI. |
| Expiry | Every entity expires after about 18 months. This is our self-cleaning rule: stale salaries and old threads leave the chain by themselves. |
| `permissionlessExtension` flag | Set on salary entities, so any wallet can press "Still accurate" and extend a salary's life without being able to change it. |
| `readonly` flag | Set on every entity: nobody, the author included, can edit a post after others have voted, confirmed or replied to it. |
| `extendEntity` | The "Still accurate" button. It writes a confirmation entity and extends the salary. |
| `executeBatch` | Seeding 2,486 synthetic entities from 21 wallets in batches. |
| `arkiv_getBlockTiming` | Turns expiry blocks into "expires in 17 months". |
| Multiple wallets, no backend | Each post is signed by the user's wallet (MetaMask, or a throwaway in-memory key). The owner address on chain is the only identity. |

**Deliberately kept off Arkiv:** trust scores and aggregates (computed client-side so anyone can reproduce them), names, emails, IP addresses, and the frontend assets.

## Why this is only possible with Arkiv

The idea needs four things at once: data that **cannot be taken down**, that is **queryable by attribute** (company, role, CTC range), that **expires on its own**, and that **needs no operator to trust**. Each alternative gives up at least one:

| Alternative | What breaks |
|---|---|
| Postgres, Firebase or our own API | One legal notice, one unpaid bill or one change of heart and the data is gone. The operator can also quietly edit a salary. That is exactly the failure we are fixing. |
| Plain IPFS | Content-addressed blobs survive, but you cannot query them by company or CTC without building and trusting an indexer, and nothing ever expires. |
| A subgraph | Queryable, but someone runs the indexer and can stop or censor it, and data never expires, so stale salaries pile up forever. |
| A plain smart contract | Storage is expensive, there is no attribute query, no range filter and no expiry. |
| **Arkiv** | Queryable attributes with range filters, built-in expiry, entity flags (`readonly`, `permissionlessExtension`), open RPC endpoints that anyone can hit, and an owner on every entity. All of it with no server of ours in the path. |

Expiry and `permissionlessExtension` are the part we could not get elsewhere: they turn "this salary is still true" into something the community keeps alive by pressing one button.

## Known limits

- **Fresh wallets need test GLM.** Tiramisu gas is paid in test GLM and the faucet is login-gated, so a throwaway wallet cannot fund itself. Connect MetaMask, or fund the wallet from the faucet. Reading needs nothing. (Logged in [arkiv/friction.md](arkiv/friction.md).)
- **The public RPC rate-limits anonymous queries** per client. We cache and slow polling to stay inside it; heavy use can still hit the limit (the app shows a clear message).
- **A LinkedIn company link is a pointer, not proof of employment.** Private employment verification (zkEmail) is designed in [docs/zkemail-design.md](docs/zkemail-design.md) but not built.
- **`created_at` is self-reported**, so wallet-age and burst scoring can be gamed by a motivated attacker. A chain-derived, queryable creation time would fix it (see friction log).
- **All seeded data is synthetic.** The demo companies, people and wallets are fictional; this is a testnet prototype.

## Setup

```bash
pnpm i
cp .env.example .env.local   # never commit real keys
pnpm dev                     # http://localhost:3000
pnpm test                    # vitest: 69 tests (trust, social, pii, schema, query, LinkedIn links, data source…)
pnpm build                   # fully static export to ./out
```

| Env var | Values |
|---|---|
| `NEXT_PUBLIC_DATA_SOURCE` | `mock` (demo data, shows an amber banner) or `arkiv` (production) |
| `NEXT_PUBLIC_ARKIV_RPC_URL` | default Tiramisu RPC (`https://rpc.tiramisu.db-chain.testnet.arkiv.network`); users can switch at runtime |
| `NEXT_PUBLIC_ARKIV_EXPLORER_URL` | block explorer base URL (default `https://tiramisu.explorer.arkiv.network`) |
| `TANKHA_SEED_KEY` | **server-side only**, in `.env.local`. A funded Tiramisu key used by `pnpm seed` to fund and derive the 21 synthetic seed wallets. Never `NEXT_PUBLIC_*` |

**Seed Tiramisu with the synthetic dataset** (2,486 entities, 100 % fictional):

```bash
# 1. put a funded Tiramisu key in .env.local as TANKHA_SEED_KEY (test GLM from https://hub.arkiv.network/faucet)
pnpm seed --dry     # prints the 21 derived wallet addresses and entity counts
pnpm seed           # funds the wallets and writes everything in batched transactions
TANKHA_LIVE=1 pnpm vitest run tests/arkiv.live.test.ts   # optional live write/read round trip
```

**Writing from the app** needs a wallet with test GLM: connect MetaMask (the app adds the Tiramisu network), or use a throwaway in-memory wallet and fund it from the faucet. Reading needs nothing.

The Arkiv layer plugs in through one interface — see **[BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md)**.

Project overview and audit: **[PROJECT_REPORT.md](PROJECT_REPORT.md)** · Remaining web3 work: **[WEB3_TODO.md](WEB3_TODO.md)**.

## Arkiv

- Schema: [`arkiv/schema.md`](arkiv/schema.md)
- Friction log: [`arkiv/friction.md`](arkiv/friction.md)
- Wallet addresses that created entities on Tiramisu (all synthetic data, written by `pnpm seed`):
  - Funding / test wallet: [`0xbE7e4832ca221489AfaD8A533CF9205661E2b929`](https://tiramisu.explorer.arkiv.network/address/0xbE7e4832ca221489AfaD8A533CF9205661E2b929)
  - Fraud-demo wallet (posts the sybil burst on Nimbus Infotech): [`0x9105142b991caB0aa181FB0DE9B46Bc624b56308`](https://tiramisu.explorer.arkiv.network/address/0x9105142b991caB0aa181FB0DE9B46Bc624b56308)
  - 20 seed wallets:
    - `0x50443cE01Bb64364ECc4452f99e733632B0e55DC`
    - `0x3F8F65F5274BFafdBE02cC2A440b3db000E1b29D`
    - `0x8FcBEE3d96Efa94440068c7392d137A0D9378e60`
    - `0xD52A2b46e6beE6B1C8dEF062Ce6b64eBC2312F74`
    - `0x18E971C226F818A76aBB7Ed8d5014e3a22e48127`
    - `0x9D7d6B40dFb654cAdeec58a57F9C3e5d67B389f7`
    - `0x724aDE56DFFC2b58D6b89B634619bFc6Ff34beE5`
    - `0x11F9B538A29cCaB1dD3383ef6F29E6AF994771AC`
    - `0xEb2248E37cf582DA367913E547020337502Eb92F`
    - `0x5E1A97F08C5167ad3086eEf900efA55152A1CF5c`
    - `0x68feA0F6eBBA2aD49A99a9e1d75c73fB9f50A157`
    - `0xE60E649B4a903b78537314F5B4Bc9d2aF171df04`
    - `0xAdA57b5A31100215Ff4Cc72D8F8Cd37ca4c83576`
    - `0x795733782FF13B3cAfecE0B904BC892C9F5F02F5`
    - `0x24dD623eA4d63f2aB751697EdC26DE8f4a4C82b8`
    - `0x0A686F40F1a96aA30411E43c663d516143614bCb`
    - `0x609405E35D31F4255bEF01B1E64Cd67b7F8DE25f`
    - `0xcF1Eff91bb8e1C52E9121B0Cc3338347756A5595`
    - `0xCc23c4c24a0813c2c186cE582210c2D5cA6C15A3`
    - `0x15c6147d7E4A1345711125E01394285C272A5150`
- How each Arkiv feature is used: typed attributes (`str`, `i32` range queries, `u64`, `key` references), per-entity expiry, `readonly` and `permissionlessExtension` creation flags, batched writes with `executeBatch`, `extendEntity` for "Still accurate", `arkiv_query` for every list, `arkiv_getBlockTiming` for expiry times. See [arkiv/schema.md](arkiv/schema.md).

## Architecture

```
Next.js (static export) ──► DataSource interface ──► mock (in-memory seed)   [NEXT_PUBLIC_DATA_SOURCE=mock]
                                                └──► Arkiv SDK ──► any Tiramisu RPC   [=arkiv]
```

- `lib/data/types.ts` — the contract. `lib/data/schema.ts` — entity ⇄ type mapping. `lib/data/query.ts` — query strings.
- `lib/trust.ts`, `lib/aggregate.ts`, `lib/pii.ts`, `lib/format.ts` — pure, unit-tested logic.
- `lib/seed/generate.ts` — deterministic synthetic dataset (fictional companies only), including a planted sybil burst on *Nimbus Infotech* that the trust score catches.

## Companies and identity

Companies are open-ended. To post, you paste the company's **LinkedIn page link** (`linkedin.com/company/<name>`); the app reads only the company name from it, in your browser. The first post creates that company's community. The eight demo companies are shortcuts. This is a pointer to a public company page, not proof that you work there.

Tankha deliberately does **not** sign people in with LinkedIn or ask for a personal profile link. That would tie every post to a real identity, and a pasted profile URL proves nothing without sign-in (and LinkedIn does not tell third parties where someone works). Employment verification that keeps people anonymous is the zkEmail design in [docs/zkemail-design.md](docs/zkemail-design.md).

## Pre-existing work

None. The project was started on 17 October 2026, inside the 9–18 October build window. First commit: `56f1aa2`.

## Roadmap

- zkEmail-based "verified employee of `<domain>`" badge without revealing identity. Not built yet; the design is in [docs/zkemail-design.md](docs/zkemail-design.md).
- IPFS-pinned frontend mirrors with an ENS/IPNS pointer.

## License

[MIT](LICENSE). All seeded data is synthetic: the demo companies, people and wallets are fictional.
