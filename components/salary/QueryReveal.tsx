"use client";

import { ChevronDown, Code2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { CopyButton } from "@/components/common";
import { cn } from "@/lib/utils";

/** "Show query" toggle — reveals the exact Arkiv query behind a result set. */
export function QueryReveal({ queries, className, note }: { queries: (string | undefined)[]; className?: string; note?: string }) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const list = queries.filter(Boolean) as string[];
  return (
    <div className={cn("text-sm", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md px-1 font-medium text-muted hover:text-text cursor-pointer"
      >
        <Code2 className="size-4" aria-hidden /> {open ? "Hide query" : "Show query"}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 flex flex-col gap-2">
              {list.length === 0 && <p className="text-muted">Loading…</p>}
              {list.map((q) => (
                <div key={q} className="flex items-start gap-2 rounded-[12px] border border-border bg-bg/60 p-3">
                  <code className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed text-chain">{q}</code>
                  <CopyButton value={q} label="Copy query" />
                </div>
              ))}
              <p className="text-xs text-muted">
                {note ?? "Run this against any Arkiv RPC — you'll get the same entities. Aggregates and trust are computed in your browser."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
