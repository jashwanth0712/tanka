"use client";

import { KeyRound, Moon, RefreshCw, Sun, UserRound, Wallet } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import { toast } from "sonner";
import { Mono } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import { useMounted } from "@/hooks/useNow";
import { truncateAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/wallet/useWallet";

export function hueOf(s: string) {
  let h = 0;
  for (const c of s.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

/** Deterministic avatar from a wallet address — two-tone, no faces, no names. */
export function IdentityAvatar({ address, size = 20, className }: { address?: string; size?: number; className?: string }) {
  if (!address) {
    return (
      <span
        aria-hidden
        className={cn("inline-grid shrink-0 place-items-center rounded-full bg-surface-2 text-muted ring-1 ring-border", className)}
        style={{ width: size, height: size }}
      >
        <UserRound style={{ width: size * 0.55, height: size * 0.55 }} />
      </span>
    );
  }
  const h = hueOf(address);
  const h2 = (h + 140) % 360;
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rounded-full", !address && "bg-surface-2", className)}
      style={{
        width: size,
        height: size,
        background: address ? `conic-gradient(from ${h}deg, oklch(0.72 0.14 ${h}), oklch(0.62 0.13 ${h2}), oklch(0.72 0.14 ${h}))` : undefined,
      }}
    />
  );
}

export function Handle({ address, op, className }: { address: string; op?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <IdentityAvatar address={address} size={16} />
      <span className="text-xs font-medium tabular">{truncateAddress(address)}</span>
      {op && <span className="rounded-full bg-gradient-primary px-1.5 text-[10px] font-semibold text-accent-fg">OP</span>}
    </span>
  );
}

/** Nav chip: the anonymous identity this tab signs votes/comments with. */
export function IdentityChip() {
  const wallet = useWallet();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const dark = !mounted || resolvedTheme === "dark";
  return (
    <Popover>
      <PopoverTrigger
        className="glass grid size-9 place-items-center rounded-full hover:bg-surface-2 cursor-pointer"
        aria-label={wallet.address ? `Your anonymous identity ${truncateAddress(wallet.address)}` : "Your anonymous identity"}
      >
        {wallet.address ? <IdentityAvatar address={wallet.address} size={22} /> : <UserRound className="size-4 text-muted" aria-hidden />}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="text-sm font-medium">Your anonymous identity</p>
        {wallet.address ? (
          <div className="mt-3 flex items-center gap-2 rounded-[10px] border border-border p-2.5">
            <IdentityAvatar address={wallet.address} size={28} />
            <div className="min-w-0">
              <Mono value={wallet.address} />
              <p className="text-xs text-muted">{wallet.isFresh ? "Fresh wallet · this tab only" : "Connected wallet"}</p>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted">None yet. One is created the first time you vote, comment or confirm — no sign-up.</p>
        )}
        <p className="mt-3 text-xs text-muted">
          Votes and comments are signed by this address. It isn&apos;t linked to your name, email or device, and it&apos;s forgotten when you close the tab.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              wallet.disconnect();
              await wallet.useFreshWallet();
              toast.success("New anonymous identity");
            }}
          >
            {wallet.address ? <RefreshCw /> : <KeyRound />} {wallet.address ? "Start a new identity" : "Create identity"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => wallet.connect().then(() => toast.success("Wallet connected"))}>
            <Wallet /> Connect a wallet instead
          </Button>
          <Button variant="ghost" size="sm" className="sm:hidden" onClick={() => setTheme(dark ? "light" : "dark")}>
            {dark ? <Sun /> : <Moon />} {dark ? "Light theme" : "Dark theme"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
