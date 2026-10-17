"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { LiveDot } from "@/components/common";
import { OnchainSwitch } from "@/components/common/OnchainSwitch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import { useNetworkStatus } from "@/hooks/queries";
import { useOnchain } from "@/hooks/useOnchain";
import { useRpcState } from "@/hooks/useRpc";
import { CHAIN_NAME, RPC_ENDPOINTS } from "@/lib/constants";
import { addCustomRpc, isValidRpcUrl, removeCustomRpc, setRpcUrl } from "@/lib/rpc";
import { cn } from "@/lib/utils";

export function StatusPill({ className }: { className?: string }) {
  const { data, isError } = useNetworkStatus();
  const [onchain] = useOnchain();
  const down = isError || (data && !data.ok);
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors cursor-pointer",
          down ? "border-danger/50 bg-danger/10 text-danger" : "glass hover:bg-surface-2",
          className,
        )}
        aria-label="Live on Arkiv — network status and settings"
      >
        <LiveDot ok={!down} />
        {down ? (
          <span>
            RPC unreachable<span className="hidden sm:inline"> — switch endpoint</span>
          </span>
        ) : (
          <span className="tabular whitespace-nowrap">
            {!onchain && <span className="hidden min-[400px]:inline">Live</span>}
            {onchain && <span className="hidden xl:inline">{CHAIN_NAME}</span>}
            {onchain && <span className="hidden text-muted xl:inline"> · block </span>}
            {onchain && <span className="hidden font-mono text-chain min-[400px]:inline">#{data ? data.latestBlock.toLocaleString("en-IN") : "…"}</span>}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem]">
        <p className="text-sm font-semibold">Live on Arkiv</p>
        <p className="mb-3 text-xs text-muted">
          Every post, vote and comment is stored on the Arkiv network ({CHAIN_NAME}{data ? ` · block #${data.latestBlock.toLocaleString("en-IN")}` : ""}). No company can take it down.
        </p>
        <OnchainSwitch compact className="mb-3 -mx-2" />
        <RpcSwitcher />
      </PopoverContent>
    </Popover>
  );
}

function EndpointRow({ url, label, selected, removable }: { url: string; label: string; selected: boolean; removable?: boolean }) {
  const { data, isError, isLoading } = useNetworkStatus(url);
  const ok = !isError && data?.ok;
  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-[10px] border p-2.5",
        selected ? "border-accent/60 bg-accent/5" : "border-border",
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 flex-col items-start text-left cursor-pointer"
        onClick={() => {
          setRpcUrl(url);
          toast.success(`Switched to ${label}`);
        }}
        aria-pressed={selected}
      >
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {selected && <Check className="size-3.5 text-accent-ink" aria-label="Selected" />}
          {label}
        </span>
        <span className="w-full truncate font-mono text-[11px] text-muted">{url}</span>
      </button>
      <span className={cn("shrink-0 text-right font-mono text-[11px]", ok ? "text-trust-high" : isLoading ? "text-muted" : "text-danger")}>
        {isLoading ? "…" : ok ? `${data!.latencyMs}ms` : "down"}
      </span>
      {removable && (
        <button
          type="button"
          aria-label={`Remove ${url}`}
          className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-danger cursor-pointer"
          onClick={() => removeCustomRpc(url)}
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </li>
  );
}

export function RpcSwitcher() {
  const { selected, custom } = useRpcState();
  const [value, setValue] = React.useState("");
  const valid = isValidRpcUrl(value);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium">RPC endpoint</p>
        <p className="text-xs text-muted">If one endpoint is blocked, switch. The data is the same everywhere.</p>
      </div>
      <ul className="flex flex-col gap-2">
        {RPC_ENDPOINTS.map((e) => (
          <EndpointRow key={e.url} url={e.url} label={e.label} selected={selected === e.url} />
        ))}
        {custom.map((u) => (
          <EndpointRow key={u} url={u} label="Custom" selected={selected === u} removable />
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          addCustomRpc(value.trim());
          setValue("");
          toast.success("Custom RPC added and selected");
        }}
      >
        <label htmlFor="custom-rpc" className="sr-only">
          Custom RPC URL
        </label>
        <Input
          id="custom-rpc"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://your-node/rpc"
          className="h-9 font-mono text-xs sm:text-xs"
          inputMode="url"
          autoComplete="off"
        />
        <Button type="submit" size="icon-sm" variant="secondary" disabled={!valid} aria-label="Add custom RPC">
          <Plus />
        </Button>
      </form>
    </div>
  );
}
