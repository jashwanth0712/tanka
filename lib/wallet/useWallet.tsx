"use client";
// Wallet hook: an injected wallet (MetaMask) on Tiramisu, or a throwaway in-memory key.

import { tiramisu } from "@arkiv-network/sdk/chains";
import * as React from "react";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Address } from "../data/types";
import { setActiveSigner, type ArkivSigner } from "./session";

export interface WalletState {
  address?: Address;
  status: "disconnected" | "connecting" | "connected" | "error";
  isFresh: boolean; // true if a newly generated burner wallet
  error?: string;
  connect(): Promise<void>; // injected wallet (e.g. MetaMask)
  useFreshWallet(): Promise<void>; // generate an in-memory burner key
  disconnect(): void;
}

type Provider = Extract<ArkivSigner, { kind: "injected" }>["provider"];

// Fresh wallet: a throwaway key held in memory only (gone on reload, never persisted or logged).
// Tiramisu gas is paid in test GLM and the faucet needs a login, so a fresh wallet can't fund itself:
// the data source tells the user to fund it when the first write fails (see friction.md).
async function createFreshWallet(): Promise<{ address: Address; signer: ArkivSigner }> {
  const account = privateKeyToAccount(generatePrivateKey());
  return { address: account.address, signer: { kind: "local", account } };
}

async function connectInjected(): Promise<{ address: Address; signer: ArkivSigner }> {
  const provider = (window as unknown as { ethereum?: Provider }).ethereum;
  if (!provider) throw new Error("No browser wallet found. Install MetaMask, or use a fresh wallet.");
  const [address] = (await provider.request({ method: "eth_requestAccounts" })) as Address[];
  if (!address) throw new Error("No account selected in your wallet.");
  const chainId = `0x${tiramisu.id.toString(16)}`;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  } catch {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId,
          chainName: tiramisu.name,
          nativeCurrency: tiramisu.nativeCurrency,
          rpcUrls: tiramisu.rpcUrls.default.http,
          blockExplorerUrls: ["https://tiramisu.explorer.arkiv.network"],
        },
      ],
    });
  }
  return { address, signer: { kind: "injected", provider } };
}

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
