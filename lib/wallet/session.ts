// Framework-free bridge between the wallet hook (React) and the data source (plain TS).
// The data source asks for the active signer here when it needs to write.
//
// TODO(arkiv): the Arkiv layer replaces `signer` with a real wallet client (e.g. viem WalletClient
// or the Arkiv SDK's client). The mock only needs `address`.

import type { Address } from "../data/types";

export interface ActiveSigner {
  address: Address;
  isFresh: boolean;
  /** Opaque handle for the real implementation (wallet client, account, etc.). Never logged. */
  signer?: unknown;
}

let active: ActiveSigner | null = null;
const listeners = new Set<() => void>();

export function setActiveSigner(s: ActiveSigner | null) {
  active = s;
  listeners.forEach((l) => l());
}

export function getActiveSigner(): ActiveSigner | null {
  return active;
}

export function requireSigner(): ActiveSigner {
  if (!active) throw new Error("Connect a wallet or create a fresh one before posting.");
  return active;
}

export function subscribeSigner(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
