// App-wide constants. Values marked TODO(arkiv) are placeholders the Arkiv-layer owner must confirm.

export const APP_NAME = "Tankha";
export const PROJECT_TAG = "tankha"; // `project` attribute namespacing every entity on the shared testnet
export const SCHEMA_VERSION = 1;

export const DATA_SOURCE = (process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock") as "mock" | "arkiv";

export const CHAIN_NAME = "Tiramisu";

/** ~18 months. Entries expire unless someone confirms them as still accurate. */
export const ENTRY_TTL_MS = 548 * 24 * 60 * 60 * 1000;
/** A confirmation resets the entry's expiry to now + this. */
export const CONFIRM_EXTENDS_TO_MS = ENTRY_TTL_MS;
/** Confirmations themselves live as long as a fresh entry. */
export const CONFIRMATION_TTL_MS = ENTRY_TTL_MS;

export const K_ANONYMITY = 3;
export const COMMENT_MAX = 280; // review comments
export const COMMENT_MAX_LEN = 500; // thread comments

export interface RpcEndpoint {
  url: string;
  label: string;
}

// TODO(arkiv): confirm the real Tiramisu endpoints.
export const RPC_ENDPOINTS: RpcEndpoint[] = [
  {
    url: process.env.NEXT_PUBLIC_ARKIV_RPC_URL || "https://tiramisu.hoodi.arkiv.network/rpc",
    label: "Arkiv public RPC",
  },
  { url: "https://rpc-2.tiramisu.example/rpc", label: "Community mirror (placeholder)" },
  { url: "https://rpc-3.tiramisu.example/rpc", label: "Volunteer node (placeholder)" },
];

export const DEFAULT_RPC = RPC_ENDPOINTS[0].url;

// TODO(arkiv): confirm explorer base URL and path formats.
export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_ARKIV_EXPLORER_URL || "https://explorer.tiramisu.hoodi.arkiv.network";
export const explorerEntityUrl = (key: string) => `${EXPLORER_URL}/entity/${key}`;
export const explorerTxUrl = (hash: string) => `${EXPLORER_URL}/tx/${hash}`;
export const explorerAddressUrl = (addr: string) => `${EXPLORER_URL}/address/${addr}`;

// TODO(arkiv): replace with the real repo + deployments.
export const REPO_URL = "https://github.com/your-org/tankha";
export const SCHEMA_URL = `${REPO_URL}/blob/main/arkiv/schema.md`;
export const FRICTION_URL = `${REPO_URL}/blob/main/arkiv/friction.md`;
export const DEMO_VIDEO_URL = "#"; // TODO: demo video link (≤ 3 min)

export const MIRRORS: { label: string; url: string; kind: string }[] = [
  { label: "Vercel", url: "https://tankha.vercel.app", kind: "Primary" },
  { label: "IPFS (ipfs.io gateway)", url: "https://ipfs.io/ipfs/<CID>", kind: "Mirror" },
  { label: "IPFS (dweb.link gateway)", url: "https://<CID>.ipfs.dweb.link", kind: "Mirror" },
];

// TODO(arkiv): teammate supplies the exact CLI + JSON-RPC shapes.
export const CLI_SNIPPETS = {
  install: "git clone " + "https://github.com/your-org/tankha && cd tankha/cli && pnpm i",
  examples: [
    `pnpm tankha query 'project = "tankha" && type = "salary" && company = "nimbus-infotech"'`,
    `pnpm tankha get <entity-key>`,
    `pnpm tankha stats`,
  ],
};

export const CURL_SNIPPET = (rpc: string) => `curl -s ${rpc} \\
  -H 'content-type: application/json' \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "arkiv_query",
    "params": ["project = \\"tankha\\" && type = \\"salary\\" && level = \\"sde-2\\""]
  }'`;
