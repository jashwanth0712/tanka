# Backend integration guide — plugging Arkiv into Tankha

**Who this is for:** whoever builds the Arkiv / web3 layer.
**State of play:** the whole frontend is built and runs on an in-memory mock (`NEXT_PUBLIC_DATA_SOURCE=mock`). Every page, query string, trust score and receipt already works against it. Your job is to swap the mock for real Arkiv reads and writes **without touching any component**.

The UI only ever talks to one interface (`DataSource`) and one hook (`useWallet`). Implement those two, flip an env var, done.

---

## 1. The 10-minute map

| What | File | Who owns it |
|---|---|---|
| Data contract (types + `DataSource` interface) | [`lib/data/types.ts`](lib/data/types.ts) | shared — change only together |
| **Your Arkiv data source** (currently a stub that rejects) | [`lib/data/arkiv/index.ts`](lib/data/arkiv/index.ts) | **you** |
| Entity ⇄ app type mapping (attributes, payload) | [`lib/data/schema.ts`](lib/data/schema.ts) | shared — use it, don't re-invent it |
| Query strings shown in the UI ("Show query") | [`lib/data/query.ts`](lib/data/query.ts) | shared — fix syntax here if Arkiv differs |
| Wallet hook (stub generates random addresses) | [`lib/wallet/useWallet.tsx`](lib/wallet/useWallet.tsx) | **you** (replace two functions) |
| Wallet → data source bridge | [`lib/wallet/session.ts`](lib/wallet/session.ts) | shared |
| Selected RPC endpoint (user can switch at runtime) | [`lib/rpc.ts`](lib/rpc.ts) | shared |
| RPC list, explorer URLs, CLI/curl snippets, mirrors | [`lib/constants.ts`](lib/constants.ts) | **you** fill the `TODO(arkiv)` values |
| Deterministic seed dataset (import it in your seed script) | [`lib/seed/generate.ts`](lib/seed/generate.ts) | shared |
| Reference implementation of every method | [`lib/data/mock/index.ts`](lib/data/mock/index.ts) | frontend |
| Source switch | [`lib/data/index.ts`](lib/data/index.ts) | done |
| Entity schema doc | [`arkiv/schema.md`](arkiv/schema.md) | **you** (draft is in there) |
| Friction log | [`arkiv/friction.md`](arkiv/friction.md) | both |

Rule: components never import `lib/data/arkiv` or `lib/data/mock` directly. They go through `getDataSource()` and the hooks in `hooks/queries.ts`. You shouldn't need to edit anything under `app/`, `components/` or `hooks/`.

---

## 2. Run it

```bash
pnpm i
cp .env.example .env.local
# .env.local
NEXT_PUBLIC_DATA_SOURCE=arkiv
NEXT_PUBLIC_ARKIV_RPC_URL=https://<tiramisu rpc>
NEXT_PUBLIC_ARKIV_EXPLORER_URL=https://<explorer>
pnpm dev          # http://localhost:3000
pnpm test         # trust / aggregate / pii / format / query tests
pnpm build        # static export to ./out — must stay green
```

With `arkiv` selected and the stub still in place, every page shows its **error state** ("Couldn't load from Arkiv … Switch RPC"). That's expected, and it's the quickest way to see which methods you've wired up so far.

**Hard constraint: the app is a fully static export** (`output: 'export'` in `next.config.ts`). No API routes, server actions, middleware or server-side secrets. Everything you write runs **in the browser**, against a public RPC.

---

## 3. Implement `DataSource` (`lib/data/arkiv/index.ts`)

Signature: `createArkivDataSource(): DataSource`. It's created once, lazily, on the client.

### 3.1 Entity model (draft — confirm and finalise in `arkiv/schema.md`)

Every entity carries `project = "tankha"` and `v = 1` so we never collide with other apps on the shared testnet. Use `lib/data/schema.ts` to build and parse entities:

```ts
import { salaryToEntity, reviewToEntity, confirmationToEntity,
         entityToSalary, entityToReview, entityToConfirmation, type RawEntity } from "../schema";
```

| type | string attributes | numeric attributes | payload | lifetime |
|---|---|---|---|---|
| `salary` | project, type, company, role, level, city | v, yoe, ctc, base?, createdAt | — | `ENTRY_TTL_MS` (~18 mo) |
| `review` | project, type, company | v, wlb, management, growth, culture, createdAt | `{ comment? }` JSON | `ENTRY_TTL_MS` |
| `confirmation` | project, type, entryKey | v, createdAt | — | `CONFIRMATION_TTL_MS` |
| `comment` | project, type, postKey, parentKey? | v, createdAt | `{ body }` JSON (≤ 500 chars) | `ENTRY_TTL_MS` |
| `vote` | project, type, targetKey, **dir** (`up`/`down`/`none`) | v, createdAt | — | `ENTRY_TTL_MS` |

The app is a **Reddit-style community**: the home page is a feed of salary + review posts ranked by votes, each company is a community (`c/<slug>`), and posts have threaded comments. Votes and comments are ordinary Arkiv entities. `dir` is a string because Arkiv numeric annotations are unsigned. Votes are append-only: the client takes the **latest vote per (wallet, target)**, and `none` clears it. You never need to update or delete a vote entity.

- Catalog values are **slugs** (`nimbus-infotech`, `software-engineer`, `sde-2`, `hyderabad`) — see `lib/catalog.ts`.
- `entryKey` is stored **lower-cased**.
- `createdAt` is ms epoch and **self-reported**. If you can get a chain-derived timestamp (block of creation), prefer it and tell the frontend — trust scoring uses it.
- `RawEntity.expiresAt` is ms epoch. Convert from Arkiv's expiration block: `now + (expiresAtBlock - currentBlock) * blockTimeMs`.
- `typeof value === "number"` → numeric annotation, otherwise string annotation. All numbers are non-negative integers.

### 3.2 Reads

The UI shows the query you return in `QueryResult.query`. **Use the builders in `lib/data/query.ts`** so what we show is what you ran. If Arkiv's real syntax differs (operators, quoting, `$owner`/`$key` meta-attributes), fix it **once** in `query.ts` and update `tests/query.test.ts` and the mock evaluator (`lib/data/mock/queryEval.ts`).

| Method | Query builder | Notes |
|---|---|---|
| `searchSalaries(f)` | `salariesQuery(f)` | Return newest first. `f.limit` optional. Trust filtering and sorting happen client-side — don't do them here. Called with `{}` to load **all** live salaries (the trust index needs them; ~hundreds of entities is fine). |
| `getSalary(key)` | `entityQuery(key)` | Fetch by key. Return `data: null` if missing/expired — the page shows "Not found — or expired". |
| `getPost(key)` | `entityQuery(key)` | Salary **or** review by key (post page). Map by the `type` attribute. `null` if missing/expired. |
| `getReviews(company?)` | `reviewsQuery(company)` | Parse `payload.comment`. Newest first. **No `company` → every review** (the feed loads them all). |
| `getComments(postKey?)` | `commentsQuery(postKey)` | `entityToComment` (body is in the payload). No `postKey` → every comment (feed comment counts). Order doesn't matter; the client builds the tree. |
| `getVotes(targetKeys?)` | `votesQuery(targetKeys)` | `entityToVote`. No keys, or more than 20 → the builder returns "all votes"; filter client-side to `targetKeys` if given. Polled every ~20s. |
| `getConfirmations(entryKey)` | `confirmationsQuery(entryKey)` | Newest first. |
| `getConfirmationsFor(keys)` | `confirmationsForQuery(keys)` | Above `CONFIRMATIONS_OR_LIMIT` (20) keys the builder returns "all confirmations" — fetch that and **filter client-side** to `keys`. |
| `getWalletActivity(owner)` | `walletQuery(owner)` | `firstSeenAt` = earliest `createdAt` across that owner's salaries **and** confirmations. |
| `getRecent(limit)` | `recentQuery(sinceMs)` | Last ~90 days, newest first, sliced to `limit`. Polled every 10s by the landing feed. |
| `getStats()` | — | `entries` = live salaries + reviews, `companies` = distinct companies with salaries, `confirmations` = count, `latestBlock` = head block. Polled every 10s. |
| `getNetworkStatus(rpcUrl?)` | — | Ping **the given URL** (default: `getRpcUrl()`), measure latency, return head block. Never throw — return `ok: false`. Polled every 5s per endpoint by the status pill and `/verify`. Keep it cheap (e.g. `eth_blockNumber`). |
| `runRawQuery(query)` | — | Execute the user's raw string from the `/verify` playground and return entities as plain JSON (`{ key, owner, expiresAtBlock, attributes, payload? }` matches what the mock returns). Throw a readable `Error` on bad syntax — the message is shown to the user. |

### 3.3 Writes

All writes get the signer from the session bridge, never from React:

```ts
import { requireSigner } from "../../wallet/session";
const { address, signer } = requireSigner(); // throws "Connect a wallet…" if none
```

| Method | What to write | Return (`WriteReceipt`) |
|---|---|---|
| `createSalary(input)` | `salaryToEntity(input, Date.now())`, expiry `ENTRY_TTL_MS` | `{ key, txHash, block, expiresAt, owner }` |
| `createReview(input)` | `reviewToEntity(input, Date.now())` (comment goes in payload) | same |
| `confirmEntry(entryKey)` | `confirmationToEntity(entryKey, Date.now())` **and** extend the target entry so `expiresAt = max(current, now + CONFIRM_EXTENDS_TO_MS)` | `expiresAt` = the **entry's** new expiry (the life bar animates to it) |
| `createComment({ postKey, parentKey?, body })` | `commentToEntity(input, Date.now())`; reject empty, > 500 chars, PII (`scanPII`), or a missing post | standard receipt |
| `castVote(targetKey, dir)` | `voteToEntity(targetKey, dir, Date.now())` — always a **new** entity | standard receipt. The UI is optimistic, so keep this fast; don't wait for extra confirmations if Arkiv lets you return early. |

Voting, commenting and confirming call `ensureIdentity()` first, which calls `useFreshWallet()` if no signer exists. That makes **burner creation + funding the hot path for every first interaction**, so it has to be fast and must not pop a wallet UI.

Validation rules the mock enforces and you should too (they surface as toasts, so make the messages human):
- `confirmEntry`: reject when signer == entry owner → `"You can't confirm your own entry."`; reject duplicate confirmation from the same wallet; reject missing/expired entry.
- Inputs are already validated by zod (`lib/schemas.ts`) before the call. Don't trust that blindly — re-parse with `salarySchema` / `reviewSchema` if it's cheap.

**Can a non-owner extend an entity's expiry on Arkiv?** If not, options in order of preference: (a) Arkiv supports extension by anyone → just do it; (b) store the effective expiry as `max(entity expiry, latest confirmation + TTL)` and compute it client-side in `entityToSalary` (confirmations already live long enough); (c) only the owner can extend → log it in `friction.md` and we'll change the copy. Tell the frontend which one you chose.

### 3.4 RPC switching

The user can pick an RPC (or add a custom one) from the status pill or `/verify`. It's persisted in `localStorage` and exposed via `lib/rpc.ts`:

```ts
import { getRpcUrl, subscribeRpc } from "../../rpc";
let client = makeClient(getRpcUrl());
subscribeRpc(() => { client = makeClient(getRpcUrl()); });
```

The frontend already invalidates every React Query cache when the RPC changes, so all you need is to use the new endpoint on the next call.

---

## 4. Implement the wallet (`lib/wallet/useWallet.tsx`)

Replace just these two functions; keep the `WalletState` shape (components depend on it):

```ts
async function connectInjected(): Promise<{ address: Address; signer?: unknown }>
async function createFreshWallet(): Promise<{ address: Address; signer?: unknown }>
```

- `connectInjected` — injected wallet (MetaMask etc.), switch/add the Tiramisu chain if needed.
- `createFreshWallet` — generate a burner **in memory** (e.g. viem `generatePrivateKey` + `privateKeyToAccount`), fund it from the faucet if there's a programmatic one; otherwise surface a clear error. **Never** persist the key to localStorage, never log it, never put it in an attribute or payload.
- Whatever you return as `signer` is passed through `setActiveSigner()` and handed back to your data source by `requireSigner()`. It's opaque to the UI.
- The submit flow drops a fresh wallet right after posting (one wallet per post), so a burner is single-use by design.

If a fresh wallet can't be funded on Tiramisu, say so in `friction.md` — the "post with a fresh wallet" story is a headline feature, so we need to know early.

---

## 5. Seed Tiramisu with the demo dataset

The mock and the real chain should show the **same** data, including the Nimbus Infotech fraud story judges are meant to see.

```ts
import { generateSeed } from "../lib/seed/generate";
const seed = generateSeed({ now: Date.now() }); // { wallets, fraudWallet, salaries, reviews, confirmations }
```

- The seed also returns `comments` and `votes`. Post them after the posts they reference, mapping `postKey` / `parentKey` / `targetKey` from seed keys to real keys. Parents must be written before their replies.
- 20 synthetic wallets + 1 fraud wallet. The addresses in the seed are **fake** — generate one real keypair per seed wallet in your script (keys in `.env.local` or a gitignored file only) and map seed address → real account. Write the real addresses into `README.md`.
- Post entries with their seed `createdAt` (backdated) and an expiry of `expiresAt - now`.
- The fraud wallet must post its 8 Nimbus entries **within one hour** of each other and its 4 five-star reviews right after. Don't add confirmations to them.
- Post confirmations **after** the entries they reference (they need the real entity key — keep a seedKey → realKey map).
- 4 entries are planted < 30 days from expiry. If Arkiv can't backdate, just set their expiry to 4–27 days from now.
- Put the script in `/cli` and make it idempotent-ish (skip if `project = "tankha"` entities already exist, or tag the run).

Sanity checks after seeding (all should hold — they're what `tests/trust.test.ts` asserts on the generator):
- `/company?name=nimbus-infotech` shows the amber **flag banner**.
- `/salaries` with the default **Medium+** filter hides 8 Nimbus entries; "All" shows them as **Unusual** with Burst flags.
- Honest Nimbus entries are **not** flagged (burst entries are excluded from peer medians).
- A few entries show a red, almost-empty life bar.

---

## 6. Things in `lib/constants.ts` you need to fill

Search for `TODO(arkiv)`:
- `RPC_ENDPOINTS` — at least 2 real Tiramisu endpoints (the RPC switcher is a demo moment).
- `EXPLORER_URL` and the `explorer*Url` path formats.
- `REPO_URL`, `MIRRORS` (Vercel + IPFS CID once pinned), `DEMO_VIDEO_URL`.
- `CLI_SNIPPETS` and `CURL_SNIPPET` — exact install/usage commands and the JSON-RPC method name for queries.

---

## 7. Definition of done

- [ ] `NEXT_PUBLIC_DATA_SOURCE=arkiv pnpm dev` — every page loads real data, no console errors.
- [ ] Demo banner gone (it only shows in mock mode).
- [ ] Status pill shows the live Tiramisu block; switching RPC works; a dead custom RPC turns the pill red.
- [ ] Submit salary → receipt with real key, tx hash, block, working explorer link.
- [ ] "Still accurate" on someone else's entry → confirmation written, life bar refills, trust score rises.
- [ ] `/verify` playground "Run" returns raw entities from the chain.
- [ ] Upvote on the feed → vote entity written, score sticks after refresh. Comment + reply on a post → both appear in the thread after refetch.
- [ ] Nimbus fraud story reproduces on chain (§5).
- [ ] `pnpm test` and `pnpm build` green. `arkiv/schema.md` final. Friction logged with dates.
- [ ] No private keys anywhere in the repo, logs, attributes or payloads.

## 8. If you need to change the contract

Edit `lib/data/types.ts`, the mock (`lib/data/mock/index.ts`) and `arkiv/schema.md` in the same commit, and tell the frontend. The mock is the executable spec: if a behaviour isn't clear from this doc, the mock is what the UI was built against.
