// Seeds Tiramisu with the synthetic Tankha dataset (lib/seed/generate.ts), 100% fictional.
//
//   pnpm seed                 write everything (needs a funded TANKHA_SEED_KEY in .env.local)
//   pnpm seed --dry           print the plan and wallet addresses, write nothing
//   pnpm seed --force         write even if Tankha entities already exist on chain
//
// Seed wallet keys are derived from TANKHA_SEED_KEY (keccak256(master ‖ index)), so the addresses are
// reproducible and no extra secret file exists. The master key funds them; keys stay in .env.local.

import { createPublicClient, createWalletClient } from "@arkiv-network/sdk";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { runQuery, toRpcSelect } from "@arkiv-network/sdk/query";
import { ExpirationTime, jsonToPayload } from "@arkiv-network/sdk/utils";
import { concat, http, keccak256, parseEther, toHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { toArkivAttrs } from "../lib/data/arkiv/codec.ts";
import { allOfTypeQuery } from "../lib/data/query.ts";
import {
  commentToEntity,
  confirmationToEntity,
  discussionToEntity,
  reviewToEntity,
  salaryToEntity,
  voteToEntity,
  type EntityDraft,
} from "../lib/data/schema.ts";
import { generateSeed } from "../lib/seed/generate.ts";

const RPC = process.env.NEXT_PUBLIC_ARKIV_RPC_URL || "https://rpc.tiramisu.db-chain.testnet.arkiv.network";
const FUND_EACH = process.env.SEED_FUND_EACH ?? "0.03"; // GLM sent to each seed wallet
const BATCH = Number(process.env.SEED_BATCH ?? 25);
const dry = process.argv.includes("--dry");
const force = process.argv.includes("--force");

const masterKey = process.env.TANKHA_SEED_KEY as Hex | undefined;
if (!masterKey) throw new Error("Set TANKHA_SEED_KEY in .env.local");

const chain = { ...tiramisu, rpcUrls: { default: { http: [RPC] } } };
const pub = createPublicClient({ chain, transport: http(RPC) });
const master = privateKeyToAccount(masterKey);
const seed = generateSeed();

// seed wallet i → deterministic account
const accountFor = (i: number) => privateKeyToAccount(keccak256(concat([masterKey, toHex(i, { size: 4 })])));
const allWallets = [...seed.wallets, seed.fraudWallet];
const accounts = new Map(allWallets.map((w, i) => [w.toLowerCase(), accountFor(i)]));
const clientFor = (owner: string) =>
  createWalletClient({ chain, transport: http(RPC), account: accounts.get(owner.toLowerCase())! });

console.log(`master  ${master.address}`);
console.log(`wallets (${allWallets.length}):`);
for (const [i, w] of allWallets.entries()) console.log(`  ${i === allWallets.length - 1 ? "fraud-demo" : `seed-${i}`.padEnd(10)} ${accounts.get(w.toLowerCase())!.address}`);
const total = seed.salaries.length + seed.reviews.length + seed.discussions.length + seed.confirmations.length + seed.comments.length + seed.votes.length;
console.log(`entities: ${total} (salaries ${seed.salaries.length}, reviews ${seed.reviews.length}, discussions ${seed.discussions.length}, confirmations ${seed.confirmations.length}, comments ${seed.comments.length}, votes ${seed.votes.length})`);
if (dry) process.exit(0);

type Item = { owner: string; seedKey: string; draft: EntityDraft; expiresAt: number; permissionlessExtension?: boolean };
const realKey = new Map<string, Hex>(); // seed key → on-chain key
const rk = (k: string) => realKey.get(k) ?? k;
const now = Date.now();

async function ensureFunded() {
  const each = parseEther(FUND_EACH);
  const wallet = createWalletClient({ chain, transport: http(RPC), account: master });
  for (const acct of accounts.values()) {
    if ((await pub.getBalance({ address: acct.address })) >= each / 2n) continue;
    const hash = await wallet.sendTransaction({ to: acct.address, value: each });
    await pub.waitForTransactionReceipt({ hash });
    process.stdout.write(".");
  }
  console.log("\nwallets funded");
}

async function writeBatch(owner: string, chunk: Item[]): Promise<void> {
  const client = clientFor(owner);
  try {
    const res = await client.executeBatch({
      creates: chunk.map((it) => ({
        attributes: toArkivAttrs(it.draft.attributes),
        payload: it.draft.payload ? jsonToPayload(it.draft.payload) : new Uint8Array(),
        contentType: it.draft.payload ? "application/json" : "application/octet-stream",
        // whole blocks (2 s), at least a day left
        expires: ExpirationTime.fromSeconds(Math.max(86_400, Math.round((it.expiresAt - now) / 2000) * 2)),
        flags: { readonly: true, permissionlessExtension: !!it.permissionlessExtension },
      })),
    });
    chunk.forEach((it, i) => realKey.set(it.seedKey, res.createdEntities[i].toLowerCase() as Hex));
  } catch (e) {
    if (chunk.length === 1) throw e;
    const mid = Math.ceil(chunk.length / 2);
    console.log(`\nbatch of ${chunk.length} failed (${(e as Error).message.slice(0, 80)}); splitting`);
    await writeBatch(owner, chunk.slice(0, mid));
    await writeBatch(owner, chunk.slice(mid));
  }
}

async function phase(name: string, items: Item[]) {
  const byOwner = new Map<string, Item[]>();
  for (const it of items) byOwner.set(it.owner.toLowerCase(), [...(byOwner.get(it.owner.toLowerCase()) ?? []), it]);
  let done = 0;
  await Promise.all(
    [...byOwner].map(async ([owner, list]) => {
      for (let i = 0; i < list.length; i += BATCH) {
        await writeBatch(owner, list.slice(i, i + BATCH));
        done += Math.min(BATCH, list.length - i);
        process.stdout.write(`\r${name}: ${done}/${items.length}   `);
      }
    }),
  );
  console.log();
}

{
  const r = await runQuery(pub, { query: allOfTypeQuery("salary"), select: toRpcSelect({ key: true }), limit: 1 });
  if (r.entities.length > 0 && !force) {
    console.log("Tankha entities already exist on chain. Re-run with --force to add another copy.");
    process.exit(1);
  }
}

console.log(`funding ${accounts.size} wallets with ${FUND_EACH} GLM each…`);
await ensureFunded();

// 1) posts
await phase("posts", [
  ...seed.salaries.map((s): Item => ({ owner: s.owner, seedKey: s.key, draft: salaryToEntity(s, s.createdAt), expiresAt: s.expiresAt, permissionlessExtension: true })),
  ...seed.reviews.map((s): Item => ({ owner: s.owner, seedKey: s.key, draft: reviewToEntity(s, s.createdAt), expiresAt: s.expiresAt })),
  ...seed.discussions.map((s): Item => ({ owner: s.owner, seedKey: s.key, draft: discussionToEntity(s, s.createdAt), expiresAt: s.expiresAt })),
]);

// 2) confirmations
await phase("confirmations", seed.confirmations.map((c): Item => ({
  owner: c.owner, seedKey: c.key, draft: confirmationToEntity(rk(c.entryKey) as `0x${string}`, c.createdAt), expiresAt: c.createdAt + 548 * 86_400_000,
})));

// 3) comments, parents before replies
const depth = new Map<string, number>();
const byKey = new Map(seed.comments.map((c) => [c.key, c]));
const depthOf = (k: string): number => depth.get(k) ?? (depth.set(k, byKey.get(k)!.parentKey ? 1 + depthOf(byKey.get(k)!.parentKey!) : 0), depth.get(k)!);
const maxDepth = Math.max(0, ...seed.comments.map((c) => depthOf(c.key)));
for (let d = 0; d <= maxDepth; d++) {
  await phase(`comments L${d}`, seed.comments.filter((c) => depthOf(c.key) === d).map((c): Item => ({
    owner: c.owner,
    seedKey: c.key,
    draft: commentToEntity({ postKey: rk(c.postKey) as `0x${string}`, parentKey: c.parentKey ? (rk(c.parentKey) as `0x${string}`) : undefined, body: c.body }, c.createdAt),
    expiresAt: c.expiresAt,
  })));
}

// 4) votes
await phase("votes", seed.votes.map((v): Item => ({ owner: v.owner, seedKey: v.key, draft: voteToEntity(rk(v.targetKey) as `0x${string}`, v.dir, v.createdAt), expiresAt: v.expiresAt })));

console.log("\nDone. Seed wallet addresses (put these in README.md):");
for (const a of accounts.values()) console.log(a.address);
