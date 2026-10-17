"use client";
// Wallet hook — FRONTEND STUB. The Arkiv-layer teammate replaces the internals of
// `connectInjected` and `createFreshWallet` (see BACKEND_INTEGRATION.md §4). The shape of
// WalletState must stay the same; components depend on it.

import * as React from "react";
import type { Address } from "../data/types";
import { setActiveSigner } from "./session";

export interface WalletState {
  address?: Address;
  status: "disconnected" | "connecting" | "connected" | "error";
  isFresh: boolean; // true if a newly generated burner wallet
  error?: string;
  connect(): Promise<void>; // injected wallet (e.g. MetaMask)
  useFreshWallet(): Promise<void>; // generate burner, fund via faucet if possible
  disconnect(): void;
}

function randomAddress(): Address {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

// ── Replace these two with real implementations ─────────────────────────
async function connectInjected(): Promise<{ address: Address; signer?: unknown }> {
  await new Promise((r) => setTimeout(r, 500));
  return { address: randomAddress() };
}
async function createFreshWallet(): Promise<{ address: Address; signer?: unknown }> {
  await new Promise((r) => setTimeout(r, 400));
  return { address: randomAddress() };
}
// ────────────────────────────────────────────────────────────────────────

const WalletContext = React.createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = React.useState<Address>();
  const [status, setStatus] = React.useState<WalletState["status"]>("disconnected");
  const [isFresh, setIsFresh] = React.useState(false);
  const [error, setError] = React.useState<string>();

  const run = React.useCallback(async (fresh: boolean) => {
    setStatus("connecting");
    setError(undefined);
    try {
      const res = fresh ? await createFreshWallet() : await connectInjected();
      setActiveSigner({ address: res.address, isFresh: fresh, signer: res.signer });
      setAddress(res.address);
      setIsFresh(fresh);
      setStatus("connected");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet error");
      setStatus("error");
      throw e;
    }
  }, []);

  const value = React.useMemo<WalletState>(
    () => ({
      address,
      status,
      isFresh,
      error,
      connect: () => run(false),
      useFreshWallet: () => run(true),
      disconnect: () => {
        setActiveSigner(null);
        setAddress(undefined);
        setIsFresh(false);
        setStatus("disconnected");
      },
    }),
    [address, status, isFresh, error, run],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = React.useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
