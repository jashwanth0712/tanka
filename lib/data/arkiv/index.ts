// Arkiv-backed DataSource: every read is an `arkiv_query` against a Tiramisu RPC, every write is an
// Arkiv entity created by the active wallet. No other store exists. See /arkiv/schema.md.

import { createPublicClient, createWalletClient } from "@arkiv-network/sdk";
import { addr } from "@arkiv-network/sdk/attr";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { eq, runQuery, toRpcSelect, type Entity } from "@arkiv-network/sdk/query";
import { ExpirationTime, jsonToPayload } from "@arkiv-network/sdk/utils";
import { custom, http, type Chain, type Hex } from "viem";
import { CHAIN_NAME, ENTRY_TTL_MS } from "../../constants";
import { getRpcUrl } from "../../rpc";
import { requireSigner } from "../../wallet/session";
import {
  allOfTypeQuery,
  commentsQuery,
  confirmationsForQuery,
  confirmationsQuery,
  CONFIRMATIONS_OR_LIMIT,
  discussionsQuery,
  entityQuery,
  reviewsQuery,
  salariesQuery,
  votesQuery,
} from "../query";
import {
  commentToEntity,
  confirmationToEntity,
  discussionToEntity,
  entityToComment,
  entityToConfirmation,
  entityToDiscussion,
  entityToReview,
  entityToSalary,
  entityToVote,
  KEY_ATTRS,
  reviewToEntity,
  salaryToEntity,
  voteToEntity,
  type Attributes,
  type EntityDraft,
  type RawEntity,
} from "../schema";
import type {
  Address,
  DataSource,
  EntityKey,
  NetworkStatus,
  Post,
  QueryResult,
  Stats,
  WriteReceipt,
} from "../types";
import { toArkivAttrs } from "./codec";
import { checkComment, checkDiscussion, checkReview } from "../validate";

const TTL_DAYS = Math.round(ENTRY_TTL_MS / 86_400_000);
const PAGE = 200;
const FAUCET_URL = "https://hub.arkiv.network/faucet";

// ── clients ────────────────────────────────────────────────────────────────
const chainFor = (rpcUrl: string): Chain => ({ ...tiramisu, rpcUrls: { default: { http: [rpcUrl] } } });

const publicClients = new Map<string, ReturnType<typeof makePublic>>();
function makePublic(rpcUrl: string, timeout = 15_000) {
  return createPublicClient({ chain: chainFor(rpcUrl), transport: http(rpcUrl, { timeout, retryCount: 1 }) });
}
const publicClient = (rpcUrl = getRpcUrl()) => {
  let c = publicClients.get(rpcUrl);
  if (!c) publicClients.set(rpcUrl, (c = makePublic(rpcUrl)));
  return c;
};
type PublicClient = ReturnType<typeof publicClient>;

function walletClient() {
  const { address, signer } = requireSigner();
  const rpcUrl = getRpcUrl();
  if (!signer) throw new Error("This wallet can't sign. Reconnect it and try again.");
  const chain = chainFor(rpcUrl);
  const client =
    signer.kind === "local"
      ? createWalletClient({ chain, transport: http(rpcUrl), account: signer.account })
      : createWalletClient({ chain, transport: custom(signer.provider as never), account: address });
  return { client, address, pub: publicClient(rpcUrl) };
}

// ── time: Arkiv expires in blocks, the app thinks in ms ────────────────────
interface Timing { block: bigint; time: number; dur: number }
async function timing(c: PublicClient): Promise<Timing> {
  const t = await c.getBlockTiming();
  return { block: t.currentBlock, time: t.currentBlockTime, dur: t.blockDuration };
}
const blockToMs = (t: Timing, block: bigint) => (t.time + Number(block - t.block) * t.dur) * 1000;

// ── reading ────────────────────────────────────────────────────────────────
const decoder = new TextDecoder();

function plainAttributes(a: Entity["attributes"]): Attributes {
  const out: Attributes = {};
  for (const [k, v] of Object.entries(a ?? {})) {
    const val = (v as { value: unknown }).value;
    out[k] = typeof val === "bigint" ? Number(val) : String(val) === val ? (KEY_ATTRS.has(k) ? val.toLowerCase() : val) : (val as number);
  }
  return out;
}

function toRaw(e: Entity, t: Timing): RawEntity {
  let payload: Record<string, unknown> | undefined;
  if (e.payload && e.payload.length > 0) {
    try {
      payload = JSON.parse(decoder.decode(e.payload));
    } catch {
      payload = undefined;
    }
  }
  return {
    key: e.key!.toLowerCase() as EntityKey,
    owner: e.owner!.toLowerCase() as Address,
    expiresAt: blockToMs(t, e.expiresAt!),
    attributes: plainAttributes(e.attributes),
    payload,
  };
}

const RATE_LIMITED =
  "The public Arkiv RPC has rate-limited this browser (anonymous query budget). Wait a minute, or add an RPC that has an API key under the Live pill.";
const friendly = (e: unknown) => {
  const msg = explain(e);
  return /ANON_COST_LIMITED|budget exhausted/i.test(msg) ? new Error(RATE_LIMITED) : e instanceof Error ? e : new Error(msg);
};

/** Walk every page of a query. `payload` only when the type needs it. */
async function fetchAllRaw(c: PublicClient, query: string, payload: boolean): Promise<{ raws: RawEntity[]; block: bigint }> {
  const select = toRpcSelect(
    payload
      ? { key: true, owner: true, expiresAt: true, attributes: true, payload: true }
      : { key: true, owner: true, expiresAt: true, attributes: true },
  );
  const entities: Entity[] = [];
  let cursor: string | undefined;
  let block = 0n;
  const [t] = await Promise.all([
    timing(c),
    (async () => {
      do {
        const r = await runQuery(c, { query, select, limit: PAGE, cursor });
        entities.push(...r.entities);
        block = r.blockNumber;
        cursor = r.cursor;
      } while (cursor);
    })(),
  ]);
  return { raws: entities.map((e) => toRaw(e, t)), block };
}

// The public RPC meters anonymous queries, and the feed needs every entity of several types. Share one
// fetch per query between all hooks for CACHE_MS, and drop it after any write so the UI stays honest.
const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; p: ReturnType<typeof fetchAllRaw> }>();
function fetchAll(c: PublicClient, query: string, payload: boolean, fresh = false) {
  const k = `${getRpcUrl()}|${payload}|${query}`;
  const hit = cache.get(k);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.p;
  const p = fetchAllRaw(c, query, payload).catch((e) => {
    cache.delete(k);
    throw friendly(e);
  });
  cache.set(k, { at: Date.now(), p });
  return p;
}

async function read<T>(query: string, payload: boolean, map: (e: RawEntity) => T): Promise<QueryResult<T[]>> {
  const { raws } = await fetchAll(publicClient(), query, payload);
  return { data: raws.map(map), query };
}

const byNewest = <T extends { createdAt: number }>(xs: T[]) => xs.sort((a, b) => b.createdAt - a.createdAt);

// ── writing ────────────────────────────────────────────────────────────────
const explain = (e: unknown) => {
  const x = e as { shortMessage?: string; message?: string };
  return x.shortMessage ?? x.message ?? "Transaction failed";
};

/** Turns an opaque node failure into something actionable when the wallet simply has no gas. */
async function withGasHint<T>(pub: PublicClient, address: Address, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    let broke = false;
    try {
      broke = (await pub.getBalance({ address })) === 0n;
    } catch {
      /* keep the original error */
    }
    if (broke)
      throw new Error(`This wallet has no test GLM to pay for the transaction. Get some at ${FAUCET_URL} (address ${address}).`);
    throw new Error(explain(e));
  }
}

async function createEntity(draft: EntityDraft, opts: { permissionlessExtension?: boolean } = {}): Promise<WriteReceipt> {
  const { client, address, pub } = walletClient();
  const body = draft.payload;
  const res = await withGasHint(pub, address, () =>
    client.createEntity({
      attributes: toArkivAttrs(draft.attributes),
      payload: body ? jsonToPayload(body) : new Uint8Array(),
      contentType: body ? "application/json" : "application/octet-stream",
      expires: ExpirationTime.fromDays(TTL_DAYS),
      // Posts are immutable once written (no one, owner included, can edit a salary after the fact).
      flags: { readonly: true, permissionlessExtension: !!opts.permissionlessExtension },
    }),
  );
  cache.clear();
  const [t, rcpt] = await Promise.all([
    timing(pub),
    pub.getTransactionReceipt({ hash: res.txHash }).catch(() => undefined),
  ]);
  return {
    key: res.entityKey.toLowerCase() as EntityKey,
    txHash: res.txHash,
    block: rcpt ? Number(rcpt.blockNumber) : undefined,
    expiresAt: blockToMs(t, res.expiresAt),
    owner: address,
  };
}

async function entityExists(pub: PublicClient, key: EntityKey) {
  const { raws } = await fetchAll(pub, entityQuery(key), false, true);
  return raws[0] ?? null;
}

// ── the DataSource ─────────────────────────────────────────────────────────
export function createArkivDataSource(): DataSource {
  return {
    async searchSalaries(f) {
      const query = salariesQuery(f);
      const r = await read(query, false, entityToSalary);
      let data = byNewest(r.data);
      if (f.limit) data = data.slice(0, f.limit);
      return { data, query };
    },

    async getPost(key): Promise<QueryResult<Post | null>> {
      let query: string;
      try {
        query = entityQuery(key);
      } catch {
        return { data: null, query: `$key = ${key}` };
      }
      const { raws } = await fetchAll(publicClient(), query, true);
      const e = raws[0];
      if (!e || e.attributes.project !== "tankha") return { data: null, query };
      switch (e.attributes.type) {
        case "discussion": return { data: entityToDiscussion(e), query };
        case "salary": return { data: entityToSalary(e), query };
        case "review": return { data: entityToReview(e), query };
        default: return { data: null, query };
      }
    },

    async getReviews(company) {
      const r = await read(reviewsQuery(company), true, entityToReview);
      return { data: byNewest(r.data), query: r.query };
    },

    async getDiscussions(company) {
      const r = await read(discussionsQuery(company), true, entityToDiscussion);
      return { data: byNewest(r.data), query: r.query };
    },

    getComments: (postKey) => read(commentsQuery(postKey), true, entityToComment),

    async getVotes(targetKeys) {
      const r = await read(votesQuery(targetKeys), false, entityToVote);
      if (targetKeys && targetKeys.length > CONFIRMATIONS_OR_LIMIT) {
        const set = new Set(targetKeys.map((k) => k.toLowerCase()));
        r.data = r.data.filter((v) => set.has(v.targetKey.toLowerCase()));
      }
      return r;
    },

    async getConfirmations(entryKey) {
      const r = await read(confirmationsQuery(entryKey), false, entityToConfirmation);
      return { data: byNewest(r.data), query: r.query };
    },

    async getConfirmationsFor(keys) {
      const r = await read(confirmationsForQuery(keys), false, entityToConfirmation);
      if (keys.length > CONFIRMATIONS_OR_LIMIT) {
        const set = new Set(keys.map((k) => k.toLowerCase()));
        r.data = r.data.filter((c) => set.has(c.entryKey.toLowerCase()));
      }
      return r;
    },

    async getStats(): Promise<Stats> {
      const c = publicClient();
      // Same queries (and payload flags) the feed uses, so these are cache hits once the feed has loaded.
      const [t, salary, review, discussion, confirmation, comment] = await Promise.all([
        timing(c),
        fetchAll(c, allOfTypeQuery("salary"), false),
        fetchAll(c, allOfTypeQuery("review"), true),
        fetchAll(c, allOfTypeQuery("discussion"), true),
        fetchAll(c, allOfTypeQuery("confirmation"), false),
        fetchAll(c, allOfTypeQuery("comment"), true),
      ]);
      return {
        entries: salary.raws.length + review.raws.length + discussion.raws.length,
        companies: new Set(salary.raws.map((e) => e.attributes.company)).size,
        confirmations: confirmation.raws.length,
        comments: comment.raws.length,
        discussions: discussion.raws.length,
        latestBlock: Number(t.block),
      };
    },

    async getNetworkStatus(rpcUrl = getRpcUrl()): Promise<NetworkStatus> {
      const started = performance.now();
      try {
        const t = await timing(makePublic(rpcUrl, 5_000));
        return { rpcUrl, chainName: CHAIN_NAME, latestBlock: Number(t.block), latencyMs: Math.round(performance.now() - started), ok: true };
      } catch {
        return { rpcUrl, chainName: CHAIN_NAME, latestBlock: 0, latencyMs: Math.round(performance.now() - started), ok: false };
      }
    },

    async runRawQuery(query) {
      const c = publicClient();
      const select = toRpcSelect({ key: true, owner: true, expiresAt: true, attributes: true, payload: true });
      let r;
      try {
        r = await runQuery(c, { query, select, limit: PAGE });
      } catch (e) {
        throw new Error(explain(e));
      }
      const t = await timing(c);
      return r.entities.map((e) => {
        const raw = toRaw(e, t);
        return { key: raw.key, owner: raw.owner, expiresAtBlock: Number(e.expiresAt), attributes: raw.attributes, ...(raw.payload ? { payload: raw.payload } : {}) };
      });
    },

    // writes ----------------------------------------------------------------
    createSalary: (input) => createEntity(salaryToEntity(input, Date.now()), { permissionlessExtension: true }),

    createReview(input) {
      const comment = checkReview(input);
      return createEntity(reviewToEntity({ ...input, comment }, Date.now()));
    },

    createDiscussion(input) {
      const { title, body } = checkDiscussion(input);
      return createEntity(discussionToEntity({ ...input, title, body }, Date.now()));
    },

    async createComment(input) {
      const body = checkComment(input.body);
      const { pub } = walletClient();
      if (!(await entityExists(pub, input.postKey))) throw new Error("That post no longer exists — it may have expired.");
      return createEntity(commentToEntity({ ...input, body }, Date.now()));
    },

    castVote: (targetKey, dir) => createEntity(voteToEntity(targetKey, dir, Date.now())),

    async confirmEntry(entryKey) {
      const { client, address, pub } = walletClient();
      const entry = await entityExists(pub, entryKey);
      if (!entry || entry.attributes.type !== "salary") throw new Error("Entry not found — it may have expired.");
      if (entry.owner.toLowerCase() === address.toLowerCase()) throw new Error("You can't confirm your own entry.");
      const dupe = await fetchAll(pub, `${confirmationsQuery(entryKey)} AND ${eq("$owner", addr(address))}`, false, true);
      if (dupe.raws.length > 0) throw new Error("This wallet already confirmed this entry.");

      const receipt = await createEntity(confirmationToEntity(entryKey, Date.now()));

      // Refill the life bar. Salaries are created with permissionlessExtension, so any wallet may do this.
      let expiresAt = entry.expiresAt;
      if (entry.expiresAt < Date.now() + ENTRY_TTL_MS - 2 * 86_400_000) {
        try {
          const ext = await client.extendEntity({ entityKey: entryKey as Hex, expires: ExpirationTime.fromDays(TTL_DAYS) });
          expiresAt = blockToMs(await timing(pub), ext.expiresAt);
        } catch {
          /* confirmation is recorded either way; the entry just keeps its current expiry */
        }
      }
      return { ...receipt, expiresAt };
    },
  };
}
