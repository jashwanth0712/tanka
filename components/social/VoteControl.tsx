"use client";

import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import * as React from "react";
import { ensureIdentity, useCastVote } from "@/hooks/social";
import type { EntityKey, VoteDir } from "@/lib/data/types";
import { compactScore, type Tally } from "@/lib/social";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/wallet/useWallet";

/** ▲ score ▼ pill. Clicking your current vote again clears it. */
export function VoteControl({ targetKey, tally, size = "md" }: { targetKey: EntityKey; tally: Tally; size?: "sm" | "md" }) {
  const wallet = useWallet();
  const vote = useCastVote();
  const [busy, setBusy] = React.useState(false);

  const cast = async (e: React.MouseEvent, dir: "up" | "down") => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await ensureIdentity(wallet); // so the optimistic vote has an owner
      vote.mutate({ targetKey, dir: (tally.mine === dir ? "none" : dir) as VoteDir });
    } finally {
      setBusy(false);
    }
  };

  const up = tally.mine === "up";
  const down = tally.mine === "down";
  const icon = size === "sm" ? "size-4" : "size-5";
  return (
    <div
      className={cn(
        "relative z-10 inline-flex items-center rounded-full border transition-colors",
        up ? "border-transparent bg-gradient-primary glow" : down ? "border-transparent bg-accent-3" : "border-border bg-surface-2",
      )}
    >
      <button
        type="button"
        aria-label="Upvote"
        aria-pressed={up}
        onClick={(e) => cast(e, "up")}
        className={cn("grid place-items-center rounded-full transition-colors hover:bg-accent/15 cursor-pointer", size === "sm" ? "size-8" : "size-9", up ? "text-accent-fg hover:bg-white/20" : down ? "text-white/80 hover:text-white" : "text-muted hover:text-accent-ink")}
      >
        <ArrowBigUp className={cn(icon, up && "fill-current")} />
      </button>
      <span
        aria-label={`Score ${tally.score}`}
        className={cn("tabular min-w-6 text-center text-sm font-medium", up ? "text-accent-fg" : down ? "text-white" : "text-text")}
      >
        {compactScore(tally.score)}
      </span>
      <button
        type="button"
        aria-label="Downvote"
        aria-pressed={down}
        onClick={(e) => cast(e, "down")}
        className={cn("grid place-items-center rounded-full transition-colors hover:bg-accent-3/15 cursor-pointer", size === "sm" ? "size-8" : "size-9", down ? "text-white hover:bg-white/15" : up ? "text-accent-fg/70 hover:text-accent-fg" : "text-muted hover:text-accent-3")}
      >
        <ArrowBigDown className={cn(icon, down && "fill-current")} />
      </button>
    </div>
  );
}
