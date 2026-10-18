# Tankha — salaries no one can delete

> *Tankha* (Hindi/Urdu slang for "salary"). A Reddit-style anonymous company forum: discussions first (layoffs, culture, hikes, policies), then salary packages and reviews. One community per company, votes and threaded comments. Every post, vote and comment is stored on **Arkiv**, so no company can take it down, and anyone can query it.

**Repo:** https://github.com/jashwanth0712/tanka · **Live:** https://tankha-ten.vercel.app · **IPFS mirror:** _TODO_ · **Demo video (≤ 3 min):** _TODO_

<!-- TODO: screenshot / GIF -->

## What it does

| Problem | Tankha |
|---|---|
| Reviews and salaries get taken down | Every entry is an Arkiv entity. No central DB. A static frontend you can mirror anywhere. |
| Data must stay queryable | Filter by company / role / level / city / experience / CTC. Every result set has a **Show query** toggle with the exact Arkiv query. |
| People fear being identified | No sign-up, email or social login. Optional fresh wallet per post. Client-side PII scanner on comments. k-anonymity (≥ 3) on all aggregates. |
| Fake entries | **Trust score** (0–100) computed only from Arkiv data: confirmations, fit with peer median, wallet history (+ burst detection), freshness. |
| Stale salaries mislead | Entries expire after ~18 months unless someone confirms them as **Still accurate**. |

## Why Arkiv

- **Postgres / Firebase / own API:** one legal notice or one unpaid bill and the data is gone. That's exactly the failure we're fixing.
- **Plain IPFS:** content-addressed blobs survive, but you can't *query* them by company or CTC without building and trusting an indexer.
- **A subgraph:** queryable, but someone runs the indexer, and data never expires — stale salaries would pile up forever.
- **Arkiv** gives us queryable attributes, built-in expiry (our "self-cleaning" rule), and many RPC endpoints any client can hit.

Deliberately **kept off Arkiv**: aggregates and trust scores (computed client-side, reproducible by anyone), identities, emails, exact team names, frontend assets.

## Setup

```bash
pnpm i
cp .env.example .env.local   # never commit real keys
pnpm dev                     # http://localhost:3000
pnpm test                    # vitest: 65 tests (trust, social, pii, schema, data source…)
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

None. Baseline commit: _TODO (first commit SHA)_.

## Roadmap

- zkEmail-based "verified employee of `<domain>`" badge without revealing identity. Not built yet; the design is in [docs/zkemail-design.md](docs/zkemail-design.md).
- IPFS-pinned frontend mirrors with an ENS/IPNS pointer.

## License

[MIT](LICENSE). All seeded data is synthetic: the demo companies, people and wallets are fictional.
