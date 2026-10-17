# Arkiv schema — Tankha

> **Status: DRAFT written by the frontend.** The Arkiv-layer owner must confirm attribute types, query syntax and expiry mechanics, then remove this note. Code source of truth: [`lib/data/schema.ts`](../lib/data/schema.ts), [`lib/data/query.ts`](../lib/data/query.ts).

Network: **Tiramisu** testnet. All entities are namespaced with `project = "tankha"` and versioned with `v = 1`.

## Entity types

### `salary`
| Attribute | Kind | Example | Notes |
|---|---|---|---|
| project | string | `"tankha"` | namespace |
| type | string | `"salary"` | |
| v | numeric | `1` | schema version |
| company | string | `"nimbus-infotech"` | catalog slug |
| role | string | `"software-engineer"` | catalog slug |
| level | string | `"sde-2"` | catalog slug |
| city | string | `"hyderabad"` | catalog slug |
| yoe | numeric | `4` | whole years |
| ctc | numeric | `1850000` | annual INR, integer rupees |
| base | numeric (optional) | `1400000` | annual INR |
| createdAt | numeric | `1792000000000` | ms epoch, self-reported |

Payload: none. Expiry: ~18 months (548 days), extended by confirmations.

### `review`
| Attribute | Kind | Example |
|---|---|---|
| project, type, v | | `"tankha"`, `"review"`, `1` |
| company | string | `"kaveri-systems"` |
| wlb, management, growth, culture | numeric | `1`–`5` |
| createdAt | numeric | ms epoch |

Payload: JSON `{ "comment": "…" }` (optional, ≤ 280 chars, PII-checked client-side). Expiry: ~18 months.

### `confirmation`
| Attribute | Kind | Example |
|---|---|---|
| project, type, v | | `"tankha"`, `"confirmation"`, `1` |
| entryKey | string | `"0xabc…"` (lower-case entity key of the salary) |
| createdAt | numeric | ms epoch |

Payload: none. Expiry: ~18 months. Writing a confirmation also extends the target salary to `max(current expiry, now + 18 months)` — **TODO(arkiv): confirm a non-owner can extend.**

### `discussion` (primary post type)
| Attribute | Kind | Example |
|---|---|---|
| project, type, v | | `"tankha"`, `"discussion"`, `1` |
| company | string | `"godavari-labs"` |
| flair | string | `"culture"` · `"layoffs"` · `"compensation"` · `"workplace"` · `"management"` · `"interviews"` · `"company-news"` · `"ask"` |
| city | string (optional) | `"hyderabad"` (office the thread is about) |
| createdAt | numeric | ms epoch |

Payload: JSON `{ "title": "…", "body": "…" }` (title 8–140 chars, body optional ≤ 3000; both PII-checked). Expiry: ~18 months.

### `comment`
| Attribute | Kind | Example |
|---|---|---|
| project, type, v | | `"tankha"`, `"comment"`, `1` |
| postKey | string | `"0xabc…"` (lower-case key of the salary/review post) |
| parentKey | string (optional) | `"0xdef…"` (lower-case key of the parent comment; absent for top-level) |
| createdAt | numeric | ms epoch |

Payload: JSON `{ "body": "…" }` (≤ 500 chars, PII-checked). Expiry: ~18 months.

### `vote`
| Attribute | Kind | Example |
|---|---|---|
| project, type, v | | `"tankha"`, `"vote"`, `1` |
| targetKey | string | `"0xabc…"` (a post or a comment) |
| dir | string | `"up"` / `"down"` / `"none"` (clears) |
| createdAt | numeric | ms epoch |

Append-only: clients take the latest vote per (owner, targetKey). `dir` is a string because numeric attributes are unsigned. Votes rank the feed. **They never feed the trust score.**

## Query examples

```
project = "tankha" && type = "salary" && level = "sde-2" && city = "hyderabad"
project = "tankha" && type = "salary" && (company = "a" || company = "b") && ctc >= 2000000
project = "tankha" && type = "review" && company = "kaveri-systems"
project = "tankha" && type = "confirmation" && entryKey = "0x…"
project = "tankha" && type = "discussion" && company = "godavari-labs"
project = "tankha" && type = "discussion" && flair = "layoffs"
project = "tankha" && type = "comment" && postKey = "0x…"
project = "tankha" && type = "vote"
project = "tankha" && $owner = 0x…
$key = 0x…
```

## What is deliberately NOT on Arkiv
- Aggregates (medians, percentiles, histograms) — computed client-side from the entities.
- Trust scores — computed client-side from entities only (reproducible by anyone).
- Names, emails, IPs, devices, exact team names, free-text company names.
- Frontend assets (static bundle on Vercel + IPFS).
