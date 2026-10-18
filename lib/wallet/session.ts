// Framework-free bridge between the wallet hook (React) and the data source (plain TS).
// The data source asks for the active signer here when it needs to write.
//
// `signer` is how the Arkiv data source signs: a local viem account (fresh wallet, key held in
// memory only) or an injected EIP-1193 provider (MetaMask etc.). The mock only needs `address`.

import type { Account } from "viem";
import type { Address } from "../data/types";

export type ArkivSigner =
  | { kind: "local"; account: Account }
  | { kind: "injected"; provider: { request(args: { method: string; params?: unknown }): Promise<unknown> } };

export interface ActiveSigner {
  address: Address;
  isFresh: boolean;
  /** Never logged, never persisted. */
  signer?: ArkivSigner;
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
