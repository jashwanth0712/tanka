# Tankha — salaries no one can delete

> *Tankha* (Hindi/Urdu slang for "salary"). A Reddit-style anonymous company forum: discussions first (layoffs, culture, hikes, policies), then salary packages and reviews. One community per company, votes and threaded comments. Every post, vote and comment is stored on **Arkiv**, so no company can take it down, and anyone can query it.

**Live:** _TODO — Vercel URL_ · **IPFS mirror:** _TODO_ · **Demo video (≤ 3 min):** _TODO_

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
| `NEXT_PUBLIC_ARKIV_RPC_URL` | default Tiramisu RPC; users can switch at runtime |
| `NEXT_PUBLIC_ARKIV_EXPLORER_URL` | block explorer base URL |

The Arkiv layer plugs in through one interface — see **[BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md)**.

Project overview and audit: **[PROJECT_REPORT.md](PROJECT_REPORT.md)** · Remaining web3 work: **[WEB3_TODO.md](WEB3_TODO.md)**.

## Arkiv

- Schema: [`arkiv/schema.md`](arkiv/schema.md)
- Friction log: [`arkiv/friction.md`](arkiv/friction.md)
- Wallet addresses that created entities on Tiramisu: _TODO (seed wallets + fraud-demo wallet)_

## Architecture

```
Next.js (static export) ──► DataSource interface ──► mock (in-memory seed)   [NEXT_PUBLIC_DATA_SOURCE=mock]
                                                └──► Arkiv SDK ──► any Tiramisu RPC   [=arkiv]
```

- `lib/data/types.ts` — the contract. `lib/data/schema.ts` — entity ⇄ type mapping. `lib/data/query.ts` — query strings.
- `lib/trust.ts`, `lib/aggregate.ts`, `lib/pii.ts`, `lib/format.ts` — pure, unit-tested logic.
- `lib/seed/generate.ts` — deterministic synthetic dataset (fictional companies only), including a planted sybil burst on *Nimbus Infotech* that the trust score catches.

## Pre-existing work

None. Baseline commit: _TODO (first commit SHA)_.

## Roadmap

- zkEmail-based "verified employee of `<domain>`" badge without revealing identity.
- IPFS-pinned frontend mirrors with an ENS/IPNS pointer.

## License

[MIT](LICENSE). All data shown is synthetic: companies, people and wallets are fictional.
