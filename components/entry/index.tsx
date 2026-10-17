"use client";

import { CheckCircle2, ChevronDown, ExternalLink, Loader2, RefreshCcw } from "lucide-react";
import { motion } from "motion/react";
import * as React from "react";
import { toast } from "sonner";
import { CopyButton, Mono } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/overlays";
import { useConfirmEntry } from "@/hooks/queries";
import { entityQuery } from "@/lib/data/query";
import type { Address, EntityKey, WriteReceipt } from "@/lib/data/types";
import type { Attributes } from "@/lib/data/schema";
import { explorerEntityUrl, explorerTxUrl } from "@/lib/constants";
import { isMock } from "@/lib/data";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/wallet/useWallet";

export function ConfirmButton({ entryKey, owner, onConfirmed }: { entryKey: EntityKey; owner: Address; onConfirmed?: () => void }) {
  const wallet = useWallet();
  const confirm = useConfirmEntry();
  const isOwner = wallet.address?.toLowerCase() === owner.toLowerCase();
  const [done, setDone] = React.useState(false);

  const run = async () => {
    try {
      if (!wallet.address) await wallet.useFreshWallet();
      await confirm.mutateAsync(entryKey);
      setDone(true);
      toast.success("Confirmed on Arkiv — life bar refilled.");
      onConfirmed?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't confirm");
    }
  };

  const btn = (
    <Button
      size="lg"
      className="w-full sm:w-auto"
      onClick={run}
      disabled={isOwner || confirm.isPending || done}
      aria-describedby={isOwner ? "own-entry-hint" : undefined}
    >
      {confirm.isPending ? <Loader2 className="animate-spin" /> : done ? <CheckCircle2 /> : <RefreshCcw />}
      {confirm.isPending ? "Writing to Arkiv…" : done ? "Confirmed" : "Still accurate"}
    </Button>
  );

  return (
    <div className="flex flex-col gap-1.5">
      {isOwner ? (
        <Tooltip content="You can't confirm your own entry">
          <span tabIndex={0} className="inline-flex">{btn}</span>
        </Tooltip>
      ) : (
        btn
      )}
      <p id="own-entry-hint" className="text-xs text-muted">
        {isOwner
          ? "You can't confirm your own entry."
          : wallet.address
            ? "Signs a confirmation with your wallet and extends this entry's life."
            : "We'll create a fresh wallet for this — no sign-up."}
      </p>
    </div>
  );
}

export function OnChainPanel({
  entityKey,
  owner,
  expiresAt,
  attributes,
}: {
  entityKey: EntityKey;
  owner: Address;
  expiresAt: number;
  attributes: Attributes;
}) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  return (
    <div className="glass rounded-[18px]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-5 text-left cursor-pointer"
      >
        <span>
          <span className="block font-display text-lg font-medium">On-chain</span>
          <span className="block text-sm text-muted">The raw Arkiv entity behind this page.</span>
        </span>
        <ChevronDown className={cn("size-5 shrink-0 text-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div id={id} className="flex flex-col gap-4 border-t border-border p-5">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[140px_minmax(0,1fr)]">
            <dt className="text-muted">Entity key</dt>
            <dd className="min-w-0"><Mono value={entityKey} truncate={false} /></dd>
            <dt className="text-muted">Owner</dt>
            <dd className="min-w-0"><Mono value={owner} truncate={false} /></dd>
            <dt className="text-muted">Expires</dt>
            <dd>{formatDateTime(expiresAt)}</dd>
          </dl>
          <div>
            <p className="mb-2 text-sm font-medium">Attributes</p>
            <dl className="overflow-hidden rounded-[12px] border border-border bg-bg/60 font-mono text-xs">
              {Object.entries(attributes).map(([k, v]) => (
                <div key={k} className="flex gap-3 border-b border-border px-3 py-2 last:border-0">
                  <dt className="w-24 shrink-0 text-muted">{k}</dt>
                  <dd className={cn("min-w-0 break-all", typeof v === "number" ? "text-accent-ink" : "text-chain")}>
                    {typeof v === "number" ? v : `"${v}"`}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isMock && (
              <Button asChild variant="secondary" size="sm">
                <a href={explorerEntityUrl(entityKey)} target="_blank" rel="noreferrer">
                  <ExternalLink /> View on explorer
                </a>
              </Button>
            )}
            <span className="inline-flex items-center gap-1 rounded-[10px] border border-border pl-3 text-sm">
              Copy query for this entity <CopyButton value={entityQuery(entityKey)} label="Copy query for this entity" />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Receipt-style card shown after a write. */
export function Receipt({ receipt, kind }: { receipt: WriteReceipt; kind: string }) {
  const [printedAt] = React.useState(() => Date.now());
  const rows: [string, React.ReactNode][] = [
    ["Entity key", <Mono key="k" value={receipt.key} />],
    ...(receipt.txHash ? [["Tx hash", <Mono key="t" value={receipt.txHash} />] as [string, React.ReactNode]] : []),
    ...(receipt.block != null ? [["Block", <span key="b" className="font-mono text-chain">#{receipt.block.toLocaleString("en-IN")}</span>] as [string, React.ReactNode]] : []),
    ["Expires", <span key="e" className="font-mono">{formatDate(receipt.expiresAt)}</span>],
    ["Owner", <Mono key="o" value={receipt.owner} />],
  ];
  return (
    <motion.div
      initial={{ clipPath: "inset(0 0 100% 0)", opacity: 0.4 }}
      animate={{ clipPath: "inset(0 0 0% 0)", opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="receipt glass-strong mx-auto w-full max-w-md px-6 py-9 font-mono text-sm"
    >
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Tankha · Arkiv receipt</p>
        <CheckCircle2 className="mx-auto mt-3 size-10 text-trust-high" aria-hidden />
        <p className="mt-2 font-display text-2xl font-medium">Written to Arkiv</p>
        <p className="text-xs text-muted">{kind} · {formatDateTime(printedAt)}</p>
      </div>
      <div aria-hidden className="my-5 border-t border-dashed border-border" />
      <dl className="flex flex-col gap-2.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3">
            <dt className="text-xs uppercase tracking-wider text-muted">{k}</dt>
            <dd className="min-w-0 text-right">{v}</dd>
          </div>
        ))}
      </dl>
      <div aria-hidden className="my-5 border-t border-dashed border-border" />
      <div className="flex flex-col gap-2 font-sans">
        {isMock ? (
          <p className="text-center text-xs text-muted">Demo data — this receipt isn&apos;t on a real chain, so there&apos;s no explorer link.</p>
        ) : (
          <Button asChild variant="secondary" size="sm">
            <a href={receipt.txHash ? explorerTxUrl(receipt.txHash) : explorerEntityUrl(receipt.key)} target="_blank" rel="noreferrer">
              <ExternalLink /> View on explorer
            </a>
          </Button>
        )}
        <span className="inline-flex items-center justify-center gap-1 text-xs text-muted">
          Copy query <CopyButton value={entityQuery(receipt.key)} label="Copy query for this entity" />
        </span>
      </div>
      <p className="mt-4 text-center text-[11px] text-muted">No name. No email. No IP. Just the entity.</p>
    </motion.div>
  );
}
