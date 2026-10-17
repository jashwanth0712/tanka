# Friction log

Dated log of real problems hit while building on Arkiv. Both frontend and Arkiv-layer entries go here. Newest first.

## 2026-10-17 — frontend (social layer)

- **New posts start "Unusual" (resolved).** Under the original formula, a fresh-wallet post with no peer group scores 30, below Medium, so honest new posts were hidden. Resolved with a 72 h "New" grace period for unflagged posts (see `isNew` in `lib/trust.ts`). Flagged bursts get no grace.
- **Votes are sybil-cheap.** Any tab can mint a fresh wallet and vote. We kept votes out of the trust score entirely for that reason, so they only affect ranking. A real deployment would weight votes by wallet history, or cap per-wallet influence.
- **Votes are append-only entities.** Every vote change is a new entity, and the latest one per (wallet, target) wins. That's simple and needs no updates or deletes, but the vote set only grows (until expiry). A per-(wallet, target) upsert would be nicer if Arkiv supports owner updates cheaply.
- **Feed = load everything.** The feed pulls every salary, review, comment and vote, then ranks client-side so anyone can reproduce the order. Fine at hackathon scale (hundreds of entities). It needs pagination or a time window beyond a few thousand.

## 2026-10-17 — frontend

- **Self-reported timestamps.** `createdAt` is an attribute the poster writes, so it can be backdated or forward-dated. Trust scoring (wallet age, burst detection, freshness) leans on it. We'd prefer a chain-derived creation time (block of creation) exposed on read; until then it's a known weakness.
- **Wallet history only sees unexpired data.** "Wallet first seen" is computed from live entities. Once a wallet's oldest entries expire, it looks younger than it is. Expiry is a feature, so this is a trade-off, not a bug — noted for the README.
- **Peer-median poisoning.** First version of range-fit let a sybil burst drag the peer median up, which flagged *honest* entries as "Unusual 0.4×". Fixed by excluding Burst-flagged entries from peer medians (two-pass, since burst detection doesn't depend on peers). Not Arkiv-specific, but anyone building reputation on open data will hit it.
- **Bulk confirmation lookups.** Fetching confirmations for ~150 entries with an OR-list makes a very long query string. Above 20 keys we fetch all `confirmation` entities and filter client-side. Would love an `IN (…)` operator or similar.
- **Query syntax unconfirmed.** The UI shows query strings in an assumed `attr = "x" && n >= 1` syntax with `$key` / `$owner` meta-attributes. Needs confirming against the SDK (see `lib/data/query.ts`).
- **Burner wallets vs. confirmations.** Fresh wallets are single-use (good for anonymity), which also means a poster can confirm their own entry from a second burner. "Owner can't confirm" only stops the naive case. Confirmations from wallets with no history currently count fully; weighting confirmations by the confirmer's wallet age would be the next step (not in the spec'd trust formula yet).
- **Next 16 static export + prefetch.** The export writes segment-prefetch payloads as `route/__next.route/__PAGE__.txt`, but the client requests `route/__next.route.__PAGE__.txt` → 404 on every static host (would also hit IPFS). Fixed with a `postbuild` script (`scripts/flatten-prefetch.mjs`) that writes the dotted copies.
- **Static export.** No server means no place for secrets, so the "fresh wallet" flow must fund burners from the browser. Depends on whether Tiramisu has a programmatic faucet.
