import { createPublicClient, createWalletClient } from "@arkiv-network/sdk";
import { addr, str } from "@arkiv-network/sdk/attr";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { and, eq, runQuery, toRpcSelect } from "@arkiv-network/sdk/query";
import { http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(process.env.TANKHA_SEED_KEY as Hex);
const pub = createPublicClient({ chain: tiramisu, transport: http() });
const w = createWalletClient({ chain: tiramisu, transport: http(), account });
const query = and(eq("project", str("tankha")), eq("$owner", addr(account.address))).toString();
const r = await runQuery(pub, { query, select: toRpcSelect({ key: true, attributes: true }), limit: 200 });
for (const e of r.entities) console.log(e.key, (e.attributes as any).type.value);
if (process.argv.includes("--delete") && r.entities.length) {
  const res = await w.executeBatch({ deletes: r.entities.map((e) => ({ entityKey: e.key! })) });
  console.log("deleted", res.deletedEntities.length, res.txHash);
}
