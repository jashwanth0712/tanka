// Data contract between the UI and the Arkiv layer. See CLAUDE.md §6 and BACKEND_INTEGRATION.md.
// Any change here must be mirrored in /arkiv/schema.md and announced to the Arkiv-layer owner.

export type Address = `0x${string}`;
export type EntityKey = `0x${string}`;

export type CompanyId = string; // slug from catalog, e.g. "nimbus-infotech"
export type Role = string; // role id from catalog, e.g. "software-engineer"
export type Level = string; // level id from catalog, e.g. "sde-2"
export type City = string; // city id from catalog, e.g. "hyderabad"

export type Rating = 1 | 2 | 3 | 4 | 5;

export interface SalaryEntry {
  key: EntityKey;
  kind: "salary";
  company: CompanyId;
  role: Role;
  level: Level;
  city: City;
  yoe: number; // years of experience
  ctc: number; // annual CTC in INR (integer rupees)
  baseSalary?: number; // annual INR
  createdAt: number; // ms epoch
  expiresAt: number; // ms epoch (derived from Arkiv expiry)
  owner: Address;
}

export interface Review {
  key: EntityKey;
  kind: "review";
  company: CompanyId;
  wlb: Rating;
  management: Rating;
  growth: Rating;
  culture: Rating;
  comment?: string; // ≤ 280 chars, PII-checked
  createdAt: number;
  expiresAt: number;
  owner: Address;
}

export interface Confirmation {
  key: EntityKey;
  entryKey: EntityKey;
  createdAt: number;
  owner: Address;
}

export interface SalaryFilters {
  companies?: CompanyId[];
  roles?: Role[];
  levels?: Level[];
  cities?: City[];
  yoeMin?: number;
  yoeMax?: number;
  ctcMin?: number;
  ctcMax?: number;
  limit?: number;
}

/** Every read returns the Arkiv query string used, for the "Show query" UI. */
export interface QueryResult<T> {
  data: T;
  query: string;
}

export interface WriteReceipt {
  key: EntityKey;
  txHash?: `0x${string}`;
  block?: number;
  expiresAt: number;
  owner: Address;
}

export interface NetworkStatus {
  rpcUrl: string;
  chainName: string; // "Tiramisu"
  latestBlock: number;
  latencyMs: number;
  ok: boolean;
}

export interface Stats {
  entries: number;
  companies: number;
  confirmations: number;
  latestBlock: number;
}

export type SalaryInput = Omit<SalaryEntry, "key" | "kind" | "createdAt" | "expiresAt" | "owner">;
export type ReviewInput = Omit<Review, "key" | "kind" | "createdAt" | "expiresAt" | "owner">;

export interface DataSource {
  // reads
  searchSalaries(f: SalaryFilters): Promise<QueryResult<SalaryEntry[]>>;
  getSalary(key: EntityKey): Promise<QueryResult<SalaryEntry | null>>;
  getReviews(company: CompanyId): Promise<QueryResult<Review[]>>;
  getConfirmations(entryKey: EntityKey): Promise<QueryResult<Confirmation[]>>;
  getConfirmationsFor(entryKeys: EntityKey[]): Promise<QueryResult<Confirmation[]>>;
  getWalletActivity(
    owner: Address,
  ): Promise<QueryResult<{ firstSeenAt: number; entries: SalaryEntry[] }>>;
  getRecent(limit: number): Promise<QueryResult<SalaryEntry[]>>;
  getStats(): Promise<Stats>;
  getNetworkStatus(rpcUrl?: string): Promise<NetworkStatus>;
  runRawQuery(query: string): Promise<unknown>; // for /verify playground

  // writes (require wallet)
  createSalary(input: SalaryInput): Promise<WriteReceipt>;
  createReview(input: ReviewInput): Promise<WriteReceipt>;
  confirmEntry(entryKey: EntityKey): Promise<WriteReceipt>; // also extends expiry if Arkiv allows
}
