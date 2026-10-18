# Arkiv schema — Tankha

Network: **Tiramisu** testnet (chain ID 7738577). SDK: `@arkiv-network/sdk` 0.8.x. Code source of truth: [`lib/data/schema.ts`](../lib/data/schema.ts) (entity ⇄ type mapping), [`lib/data/query.ts`](../lib/data/query.ts) (query strings, built with the SDK's own combinators), [`lib/data/arkiv/`](../lib/data/arkiv) (reads and writes).

Every entity carries `project = str('tankha')` and `v = i32(1)`, so Tankha's entities can be selected out of the shared testnet.

## Attribute types

| App value | Arkiv type | Why |
|---|---|---|
| names, slugs, enums (`company`, `flair`, `dir`…) | `str` | equality and prefix index, ≤ 128 bytes |
| references to other entities (`post_key`, `parent_key`, `target_key`, `entry_key`) | `key` | typed pointer to a 32-byte entity key |
| counts and amounts (`yoe`, `ctc`, `base`, ratings, `v`) | `i32` | equality **and range** index → `ctc >= i32(2000000)` |
| `created_at` (ms epoch, self-reported) | `u64` | too big for `i32` |

## Creation flags and expiry

| Flag / setting | Value | Why |
|---|---|---|
| expiry | `ExpirationTime.fromDays(548)` (~18 months) on every entity | stale salaries and old threads leave the chain by themselves |
| `readonly` | `true` on every entity | nobody, the author included, can edit a post after the fact — only extend, transfer or delete |
| `permissionlessExtension` | `true` on **salary** entities only | any wallet can extend a salary's life, which is what "Still accurate" does. The extender can keep it alive but cannot change it |

## Entity types

### `salary`
| Attribute | Type | Example |
|---|---|---|
| project, type, v | str, str, i32 | `'tankha'`, `'salary'`, `1` |
| company / role / level / city | str | `'nimbus-infotech'` / `'software-engineer'` / `'sde-2'` / `'hyderabad'` |
| yoe | i32 | `4` |
| ctc | i32 | `1850000` (annual INR) |
| base | i32, optional | `1400000` |
| created_at | u64 | `1792000000000` |

Payload: none. Flags: `readonly`, `permissionlessExtension`.

### `review`
`company` (str), `wlb`, `management`, `growth`, `culture` (i32, 1–5), `created_at`. Payload JSON `{ "comment": "…" }` (optional, ≤ 280 chars, PII-checked client-side).

### `confirmation`
`entry_key` (key → the salary), `created_at`. Confirming also extends the salary's expiry to now + ~18 months (`extendEntity`, allowed because salaries are `permissionlessExtension`).

### `discussion` (primary post type)
`company` (str), `flair` (str: `culture` · `layoffs` · `compensation` · `workplace` · `management` · `interviews` · `company-news` · `ask`), `city` (str, optional), `created_at`. Payload JSON `{ "title": "…", "body": "…" }` (title 8–140 chars, body ≤ 3000, PII-checked).

### `comment`
`post_key` (key), `parent_key` (key, optional; absent for top-level), `created_at`. Payload JSON `{ "body": "…" }` (≤ 500 chars, PII-checked).

### `vote`
`target_key` (key → a post or a comment), `dir` (str: `up` / `down` / `none`), `created_at`. Append-only: clients take the latest vote per (owner, target). `dir` is a string so the stored value and the query read as plain words. Votes rank the feed; they never feed the trust score.

## Query examples (exact strings the app sends via `arkiv_query`)

```
project = str('tankha') AND type = str('salary') AND (company = str('a') OR company = str('b')) AND ctc >= i32(2000000)
project = str('tankha') AND type = str('review') AND company = str('kaveri-systems')
project = str('tankha') AND type = str('confirmation') AND entry_key = key(0x…)
project = str('tankha') AND type = str('discussion') AND flair = str('layoffs')
project = str('tankha') AND type = str('comment') AND post_key = key(0x…)
project = str('tankha') AND type = str('vote')
$key = key(0x…)
```

Run one yourself:

```bash
curl -s https://rpc.tiramisu.db-chain.testnet.arkiv.network -H 'content-type: application/json' -d '{
  "jsonrpc":"2.0","id":1,"method":"arkiv_query",
  "params":["project = str('"'"'tankha'"'"') AND type = str('"'"'discussion'"'"')",{"select":{"key":true,"attributes":true,"payload":true},"limit":"0x14"}]}'
```

## What is deliberately NOT on Arkiv
- Aggregates (medians, percentiles, histograms): computed client-side from the entities.
- Trust scores: computed client-side from entities only (reproducible by anyone).
- Names, emails, IPs, devices, exact team names, free-text company names.
- Frontend assets (static bundle on Vercel + IPFS).

## Naming note
Attribute names are lower-case `snake_case`: the Tiramisu node rejects upper-case letters even though the SDK validator accepts them (see [friction.md](friction.md)).
