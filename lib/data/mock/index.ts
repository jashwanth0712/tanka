// In-memory mock DataSource backed by the deterministic seed. Simulates network latency and
// evaluates the same Arkiv query strings the real source sends, so "Show query" is honest in demo mode.

import { CHAIN_NAME, COMMENT_MAX_LEN, CONFIRM_EXTENDS_TO_MS, CONFIRMATION_TTL_MS, DEFAULT_RPC, ENTRY_TTL_MS } from "../../constants";
import { scanPII } from "../../pii";
import { commentToEntity, confirmationToEntity, reviewToEntity, salaryToEntity, voteToEntity } from "../schema";
import { COMPANIES } from "../../catalog";
import { generateSeed, entityKey, mulberry32, typicalCtc } from "../../seed/generate";
import { requireSigner } from "../../wallet/session";
import {
  commentsQuery,
  confirmationsForQuery,
  confirmationsQuery,
  entityQuery,
  votesQuery,
  recentQuery,
  reviewsQuery,
  salariesQuery,
  walletQuery,
  CONFIRMATIONS_OR_LIMIT,
} from "../query";
import type {
  Address,
  Comment,
  Confirmation,
  DataSource,
  EntityKey,
  NetworkStatus,
  Review,
  SalaryEntry,
  Vote,
  WriteReceipt,
} from "../types";
import { compileQuery, type Attrs } from "./queryEval";

const BLOCK_TIME_MS = 2000;
const GENESIS_MS = Date.UTC(2026, 0, 1);
const blockAt = (ts: number) => 1_000_000 + Math.floor((ts - GENESIS_MS) / BLOCK_TIME_MS);

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
const latency = () => sleep(150 + Math.random() * 250);

type AnyEntity = SalaryEntry | Review | Confirmation | Comment | Vote;

function draftOf(e: AnyEntity) {
  if (!("kind" in e)) return confirmationToEntity(e.entryKey, e.createdAt);
  switch (e.kind) {
    case "salary":
      return salaryToEntity(e, e.createdAt);
    case "review":
      return reviewToEntity(e, e.createdAt);
    case "comment":
      return commentToEntity(e, e.createdAt);
    case "vote":
      return voteToEntity(e.targetKey, e.dir, e.createdAt);
  }
}

/** Stored attributes plus the $key / $owner meta attributes queries can match on. */
function attrsOf(e: AnyEntity): Attrs {
  return { ...draftOf(e).attributes, $key: e.key.toLowerCase(), $owner: e.owner.toLowerCase() };
}

/** Shape the playground shows for raw results — mirrors what an Arkiv entity looks like. */
function rawEntity(e: AnyEntity) {
  const { attributes, payload } = draftOf(e);
  return {
    key: e.key.toLowerCase(),
    owner: e.owner.toLowerCase(),
    expiresAtBlock: blockAt("expiresAt" in e ? e.expiresAt : e.createdAt + CONFIRMATION_TTL_MS),
    attributes,
    ...(payload ? { payload } : {}),
  };
}

export function createMockDataSource(): DataSource {
  const seed = generateSeed();
  const salaries: SalaryEntry[] = [...seed.salaries];
  const reviews: Review[] = [...seed.reviews];
  const confirmations: Confirmation[] = [...seed.confirmations];
  const comments: Comment[] = [...seed.comments];
  const votes: Vote[] = [...seed.votes];
  const rng = mulberry32(Date.now() & 0xffffffff);

  const alive = <T extends { expiresAt?: number }>(xs: T[]) =>
    xs.filter((x) => x.expiresAt == null || x.expiresAt > Date.now());

  const run = <T extends AnyEntity>(xs: T[], query: string) => {
    const pred = compileQuery(query);
    return xs.filter((x) => pred(attrsOf(x))).map((x) => ({ ...x })); // copies: callers never share mutable state
  };

  const txHash = () => entityKey(rng) as `0x${string}`;

  // "Occasional writes": every ~30s someone (a seed wallet) posts, so the live feed moves in demo mode.
  let lastSim = Date.now();
  const simulateActivity = () => {
    const now = Date.now();
    if (now - lastSim < 25_000 + rng() * 15_000) return;
    lastSim = now;
    const template = salaries[Math.floor(rng() * salaries.length)];
    if (template.owner === seed.fraudWallet) return;
    const pick = <T,>(xs: T[]) => xs[Math.floor(rng() * xs.length)];
    salaries.unshift({
      ...template,
      key: entityKey(rng),
      ctc: Math.round((typicalCtc(template.company, template.role, template.level) * (0.8 + rng() * 0.4)) / 10_000) * 10_000,
      yoe: Math.max(0, template.yoe + Math.round(rng() * 2 - 1)),
      baseSalary: undefined,
      createdAt: now,
      expiresAt: now + ENTRY_TTL_MS,
      owner: pick(seed.wallets),
    });
  };

  return {
    async searchSalaries(f) {
      await latency();
      const query = salariesQuery(f);
      let data = run(alive(salaries), query).sort((a, b) => b.createdAt - a.createdAt);
      if (f.limit) data = data.slice(0, f.limit);
      return { data, query };
    },

    async getSalary(key) {
      await latency();
      const query = entityQuery(key);
      const data = run(salaries, query)[0] ?? null;
      return { data, query };
    },

    async getPost(key) {
      await latency();
      const query = entityQuery(key);
      const data = run(salaries, query)[0] ?? run(reviews, query)[0] ?? null;
      return { data, query };
    },

    async getComments(postKey) {
      await latency();
      const query = commentsQuery(postKey);
      return { data: run(alive(comments), query), query };
    },

    async getVotes(targetKeys) {
      await latency();
      const query = votesQuery(targetKeys);
      let data = run(alive(votes), query);
      if (targetKeys && !query.includes("targetKey")) {
        const set = new Set(targetKeys.map((k) => k.toLowerCase()));
        data = data.filter((v) => set.has(v.targetKey.toLowerCase()));
      }
      return { data, query };
    },

    async getReviews(company) {
      await latency();
      const query = reviewsQuery(company);
      return { data: run(alive(reviews), query).sort((a, b) => b.createdAt - a.createdAt), query };
    },

    async getConfirmations(entryKey) {
      await latency();
      const query = confirmationsQuery(entryKey);
      return { data: run(confirmations, query).sort((a, b) => b.createdAt - a.createdAt), query };
    },

    async getConfirmationsFor(keys) {
      await latency();
      const query = confirmationsForQuery(keys);
      let data = run(confirmations, query);
      if (keys.length > CONFIRMATIONS_OR_LIMIT) {
        const set = new Set(keys.map((k) => k.toLowerCase()));
        data = data.filter((c) => set.has(c.entryKey.toLowerCase()));
      }
      return { data, query };
    },

    async getWalletActivity(owner: Address) {
      await latency();
      const query = walletQuery(owner);
      const entries = run(salaries, query);
      const confs = run(confirmations, query);
      const firstSeenAt = Math.min(Date.now(), ...entries.map((e) => e.createdAt), ...confs.map((c) => c.createdAt));
      return { data: { firstSeenAt, entries }, query };
    },

    async getRecent(limit) {
      simulateActivity();
      await latency();
      const since = Date.now() - 90 * 24 * 3_600_000;
      const query = recentQuery(since);
      const data = run(alive(salaries), query)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
      return { data, query };
    },

    async getStats() {
      await latency();
      const live = alive(salaries);
      return {
        entries: live.length + alive(reviews).length,
        companies: new Set(live.map((s) => s.company)).size || COMPANIES.length,
        confirmations: confirmations.length,
        comments: alive(comments).length,
        latestBlock: blockAt(Date.now()),
      };
    },

    async getNetworkStatus(rpcUrl = DEFAULT_RPC): Promise<NetworkStatus> {
      const started = performance.now();
      await sleep(30 + Math.random() * 90);
      const ok = /^https?:\/\/[^\s]+$/i.test(rpcUrl) && !/offline|blocked/i.test(rpcUrl);
      return {
        rpcUrl,
        chainName: CHAIN_NAME,
        latestBlock: blockAt(Date.now()),
        latencyMs: Math.round(performance.now() - started),
        ok,
      };
    },

    async runRawQuery(query) {
      await latency();
      const pred = compileQuery(query);
      const all: AnyEntity[] = [...alive(salaries), ...alive(reviews), ...confirmations, ...alive(comments), ...alive(votes)];
      return all.filter((e) => pred(attrsOf(e))).map(rawEntity);
    },

    async createSalary(input) {
      const { address } = requireSigner();
      await sleep(700 + Math.random() * 600);
      const now = Date.now();
      const entry: SalaryEntry = {
        ...input,
        key: entityKey(rng),
        kind: "salary",
        createdAt: now,
        expiresAt: now + ENTRY_TTL_MS,
        owner: address,
      };
      salaries.unshift(entry);
      return { key: entry.key, txHash: txHash(), block: blockAt(now), expiresAt: entry.expiresAt, owner: address };
    },

    async createReview(input) {
      const { address } = requireSigner();
      await sleep(700 + Math.random() * 600);
      const now = Date.now();
      const review: Review = {
        ...input,
        key: entityKey(rng),
        kind: "review",
        createdAt: now,
        expiresAt: now + ENTRY_TTL_MS,
        owner: address,
      };
      reviews.unshift(review);
      return { key: review.key, txHash: txHash(), block: blockAt(now), expiresAt: review.expiresAt, owner: address };
    },

    async confirmEntry(entryKey: EntityKey): Promise<WriteReceipt> {
      const { address } = requireSigner();
      const entry = salaries.find((s) => s.key.toLowerCase() === entryKey.toLowerCase());
      if (!entry) throw new Error("Entry not found — it may have expired.");
      if (entry.owner.toLowerCase() === address.toLowerCase())
        throw new Error("You can't confirm your own entry.");
      if (confirmations.some((c) => c.entryKey === entry.key && c.owner.toLowerCase() === address.toLowerCase()))
        throw new Error("This wallet already confirmed this entry.");
      await sleep(600 + Math.random() * 500);
      const now = Date.now();
      const conf: Confirmation = { key: entityKey(rng), entryKey: entry.key, createdAt: now, owner: address };
      confirmations.unshift(conf);
      entry.expiresAt = Math.max(entry.expiresAt, now + CONFIRM_EXTENDS_TO_MS);
      return { key: conf.key, txHash: txHash(), block: blockAt(now), expiresAt: entry.expiresAt, owner: address };
    },

    async createComment(input) {
      const { address } = requireSigner();
      const body = input.body.trim();
      if (!body) throw new Error("Write something first.");
      if (body.length > COMMENT_MAX_LEN) throw new Error(`Keep it under ${COMMENT_MAX_LEN} characters.`);
      if (!scanPII(body).ok) throw new Error("Remove personal details to continue.");
      const post = [...salaries, ...reviews].find((p) => p.key.toLowerCase() === input.postKey.toLowerCase());
      if (!post) throw new Error("That post no longer exists — it may have expired.");
      await sleep(500 + Math.random() * 400);
      const now = Date.now();
      const c: Comment = {
        key: entityKey(rng),
        kind: "comment",
        postKey: post.key,
        parentKey: input.parentKey,
        body,
        createdAt: now,
        expiresAt: now + ENTRY_TTL_MS,
        owner: address,
      };
      comments.push(c);
      return { key: c.key, txHash: txHash(), block: blockAt(now), expiresAt: c.expiresAt, owner: address };
    },

    async castVote(targetKey, dir) {
      const { address } = requireSigner();
      await sleep(250 + Math.random() * 250);
      const now = Date.now();
      const v: Vote = { key: entityKey(rng), kind: "vote", targetKey, dir, createdAt: now, expiresAt: now + ENTRY_TTL_MS, owner: address };
      votes.push(v);
      return { key: v.key, txHash: txHash(), block: blockAt(now), expiresAt: v.expiresAt, owner: address };
    },
  };
}

