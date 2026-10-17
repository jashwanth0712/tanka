"use client";

import { Globe, Laptop, Terminal } from "lucide-react";
import { LiveDot } from "@/components/common";
import { RPC_ENDPOINTS } from "@/lib/constants";

/** Many clients → many RPC endpoints → one Arkiv. No server of ours in the picture. */
export function TakedownDiagram() {
  const clients = [
    { Icon: Globe, label: "This website", sub: "Vercel · IPFS mirrors" },
    { Icon: Terminal, label: "CLI", sub: "pnpm tankha query" },
    { Icon: Laptop, label: "Any client", sub: "curl · scripts · your app" },
  ];
  return (
    <figure aria-label="Many clients talk to many RPC endpoints, all reading the same Arkiv data" className="flex flex-col items-stretch gap-3">
      <ul className="grid grid-cols-3 gap-2 sm:gap-3">
        {clients.map(({ Icon, label, sub }) => (
          <li key={label} className="flex flex-col items-center gap-1 glass rounded-[18px] p-3 text-center">
            <Icon className="size-5 text-accent-ink" aria-hidden />
            <span className="text-sm font-semibold">{label}</span>
            <span className="hidden text-[11px] text-muted sm:block">{sub}</span>
          </li>
        ))}
      </ul>
      <Connector />
      <ul className="grid grid-cols-3 gap-2 sm:gap-3">
        {RPC_ENDPOINTS.map((r, i) => (
          <li key={r.url} className="flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 py-2 font-mono text-[11px] text-chain">
            <LiveDot className="size-1.5" /> RPC {i + 1}
          </li>
        ))}
      </ul>
      <Connector />
      <div className="rounded-[18px] bg-gradient-primary p-5 text-center text-accent-fg glow">
        <p className="font-display text-2xl font-extrabold">Arkiv</p>
        <p className="font-mono text-xs text-accent-fg/80">salary · review · comment · vote · confirmation</p>
      </div>
      <figcaption className="text-center text-xs text-muted">No server of ours sits in this picture.</figcaption>
    </figure>
  );
}

function Connector() {
  return (
    <div aria-hidden className="grid grid-cols-3">
      {[0, 1, 2].map((i) => (
        <span key={i} className="mx-auto h-6 w-px bg-gradient-to-b from-border via-accent/60 to-border" />
      ))}
    </div>
  );
}
