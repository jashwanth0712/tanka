// App-wide constants. Values marked TODO(arkiv) are placeholders the Arkiv-layer owner must confirm.

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
export const TITLE_MAX = 140; // discussion titles
export const BODY_MAX = 3000; // discussion bodies

export const FLAIRS: { id: import("./data/types").Flair; label: string }[] = [
  { id: "culture", label: "Culture" },
  { id: "layoffs", label: "Layoffs" },
  { id: "compensation", label: "Compensation" },
  { id: "workplace", label: "Workplace" },
  { id: "management", label: "Management" },
  { id: "interviews", label: "Interviews" },
  { id: "company-news", label: "Company news" },
  { id: "ask", label: "Ask" },
];
export const flairLabel = (id: string) => FLAIRS.find((f) => f.id === id)?.label ?? id;
export const isFlair = (id: string): id is import("./data/types").Flair => FLAIRS.some((f) => f.id === id);

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
export const REPO_URL = "https://github.com/rgmanisrivas-ai/tanka";
export const SCHEMA_URL = `${REPO_URL}/blob/main/arkiv/schema.md`;
export const FRICTION_URL = `${REPO_URL}/blob/main/arkiv/friction.md`;
export const DEMO_VIDEO_URL = ""; // TODO: demo video link (≤ 3 min)

/** Footer / Verify links are only rendered once they point somewhere real. */
export const REPO_IS_SET = !REPO_URL.includes("your-org");
export const FOOTER_LINKS = [
  { href: REPO_URL, label: "GitHub", show: REPO_IS_SET },
  { href: SCHEMA_URL, label: "schema.md", show: REPO_IS_SET },
  { href: FRICTION_URL, label: "friction.md", show: REPO_IS_SET },
  { href: DEMO_VIDEO_URL, label: "Demo video", show: DEMO_VIDEO_URL !== "" },
].filter((l) => l.show);

/**
 * Frontend mirrors. Only `live: true` entries are shown on /verify — never show a judge a dead link.
 * TODO(arkiv/deploy): set the real Vercel URL and IPFS CID, then flip `live`.
 */
export const MIRRORS: { label: string; url: string; kind: string; live: boolean }[] = [
  { label: "Vercel", url: "https://tankha.vercel.app", kind: "Primary", live: false },
  { label: "IPFS (ipfs.io gateway)", url: "https://ipfs.io/ipfs/<CID>", kind: "Mirror", live: false },
  { label: "IPFS (dweb.link gateway)", url: "https://<CID>.ipfs.dweb.link", kind: "Mirror", live: false },
];
export const LIVE_MIRRORS = MIRRORS.filter((m) => m.live);

/**
 * CLI commands for /verify. `null` hides the section until the CLI in /cli actually exists.
 * TODO(arkiv): fill with real, tested commands.
 * Example shape: { install: "git clone <repo> && cd tankha/cli && pnpm i", examples: ["pnpm tankha query '<query>'"] }
 */
export const CLI_SNIPPETS: { install: string; examples: string[] } | null = null;

/**
 * JSON-RPC method that runs an Arkiv query. `null` hides the curl section until confirmed.
 * TODO(arkiv): set the real method name (and adjust params shape in CURL_SNIPPET if needed).
 */
export const ARKIV_QUERY_METHOD: string | null = null;

export const CURL_SNIPPET = (rpc: string, method: string) => `curl -s ${rpc} \\
  -H 'content-type: application/json' \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "${method}",
    "params": ["project = \\"tankha\\" && type = \\"discussion\\" && flair = \\"layoffs\\""]
  }'`;
