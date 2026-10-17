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

## Query examples

```
project = "tankha" && type = "salary" && level = "sde-2" && city = "hyderabad"
project = "tankha" && type = "salary" && (company = "a" || company = "b") && ctc >= 2000000
project = "tankha" && type = "review" && company = "kaveri-systems"
project = "tankha" && type = "confirmation" && entryKey = "0x…"
project = "tankha" && $owner = 0x…
$key = 0x…
```

## What is deliberately NOT on Arkiv
- Aggregates (medians, percentiles, histograms) — computed client-side from the entities.
- Trust scores — computed client-side from entities only (reproducible by anyone).
- Names, emails, IPs, devices, exact team names, free-text company names.
- Frontend assets (static bundle on Vercel + IPFS).
