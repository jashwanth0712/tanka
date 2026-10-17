"use client";

import { Blocks } from "lucide-react";
import { useOnchain } from "@/hooks/useOnchain";
import { cn } from "@/lib/utils";

/** "Show on-chain details" switch — reveals queries, raw entities, block numbers and raw addresses. */
export function OnchainSwitch({ className, compact }: { className?: string; compact?: boolean }) {
  const [on, setOn] = useOnchain();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn(!on)}
      className={cn("flex w-full items-center gap-3 rounded-[12px] p-2 text-left hover:bg-surface-2 cursor-pointer", className)}
    >
      <Blocks className="size-4 shrink-0 text-muted" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">Show on-chain details</span>
        {!compact && <span className="block text-xs text-muted">Queries, raw Arkiv entities, block numbers and wallet addresses.</span>}
      </span>
      <span aria-hidden className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", on ? "bg-gradient-primary" : "bg-surface-2 ring-1 ring-border")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-[var(--surface-solid)] shadow transition-[left]", on ? "left-[18px]" : "left-0.5")} />
      </span>
    </button>
  );
}
