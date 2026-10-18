// Live test against Tiramisu. Skipped unless TANKHA_LIVE=1 and TANKHA_SEED_KEY holds a funded key:
//   TANKHA_LIVE=1 pnpm vitest run tests/arkiv.live.test.ts   (key from .env.local)
import { describe, expect, it } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createArkivDataSource } from "@/lib/data/arkiv";
import { setActiveSigner } from "@/lib/wallet/session";

const key = process.env.TANKHA_SEED_KEY as `0x${string}` | undefined;
const live = process.env.TANKHA_LIVE === "1" && !!key;

const as = (k: `0x${string}`) => {
  const account = privateKeyToAccount(k);
  setActiveSigner({ address: account.address, isFresh: true, signer: { kind: "local", account } });
  return account.address;
};

describe.skipIf(!live)("Arkiv data source on Tiramisu", () => {
  const ds = createArkivDataSource();

  it("reports network status", async () => {
    const s = await ds.getNetworkStatus();
    expect(s.ok).toBe(true);
    expect(s.latestBlock).toBeGreaterThan(0);
  });

  it("writes a discussion and reads it back", async () => {
    as(key!);
    const title = `Live test thread ${Date.now()}`;
    const r = await ds.createDiscussion({ company: "kaveri-systems", flair: "ask", title, body: "Synthetic test post." });
    expect(r.key).toMatch(/^0x[0-9a-f]{64}$/);
    expect(r.expiresAt).toBeGreaterThan(Date.now() + 500 * 86_400_000);
    const got = await ds.getPost(r.key);
    expect(got.data?.kind).toBe("discussion");
    const list = await ds.getDiscussions("kaveri-systems");
    expect(list.data.some((d) => d.key === r.key && d.title === title)).toBe(true);
    expect(list.query).toContain("type = str('discussion')");
  }, 60_000);

  it("votes, comments, confirms (from another wallet) and extends", async () => {
    const owner = as(key!);
    const salary = await ds.createSalary({ company: "kaveri-systems", role: "software-engineer", level: "sde-2", city: "bengaluru", yoe: 4, ctc: 2_800_000 });
    const comment = await ds.createComment({ postKey: salary.key, body: "Synthetic comment." });
    await ds.castVote(salary.key, "up");

    // a second wallet confirms; it needs gas, so the owner funds it directly
    const other = generatePrivateKey();
    const { createWalletClient } = await import("@arkiv-network/sdk");
    const { tiramisu } = await import("@arkiv-network/sdk/chains");
    const { http, parseEther } = await import("viem");
    const funder = createWalletClient({ chain: tiramisu, transport: http(), account: privateKeyToAccount(key!) });
    await funder.sendTransaction({ to: privateKeyToAccount(other).address, value: parseEther("0.01") });
    as(other);
    const conf = await ds.confirmEntry(salary.key);
    expect(conf.expiresAt).toBeGreaterThan(salary.expiresAt - 1);

    const confs = await ds.getConfirmations(salary.key);
    expect(confs.data.length).toBe(1);
    expect((await ds.getComments(salary.key)).data[0].key).toBe(comment.key);
    expect((await ds.getVotes([salary.key])).data[0].dir).toBe("up");
    expect(owner).toBeTruthy();
    await expect(ds.confirmEntry(salary.key)).rejects.toThrow(/already confirmed/);
  }, 120_000);
});
