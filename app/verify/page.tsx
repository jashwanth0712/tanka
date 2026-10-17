"use client";

import { Check, ExternalLink, Loader2, Play, Server } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { CopyButton, LiveDot } from "@/components/common";
import { TakedownDiagram } from "@/components/landing";
import { RpcSwitcher } from "@/components/layout/StatusPill";
import { Button } from "@/components/ui/button";
import { Card, Textarea } from "@/components/ui/primitives";
import { useNetworkStatus } from "@/hooks/queries";
import { useRpcUrl } from "@/hooks/useRpc";
import { getDataSource } from "@/lib/data";
import { QUERY_PRESETS } from "@/lib/data/query";
import { CLI_SNIPPETS, CURL_SNIPPET, MIRRORS, RPC_ENDPOINTS, SCHEMA_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

function Section({ id, n, title, children, lead }: { id?: string; n: string; title: string; lead?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border py-10 sm:py-14">
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
        <div>
          <p className="text-xs font-bold text-accent-ink">{n}</p>
          <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h2>
          {lead && <p className="mt-2 text-sm text-muted">{lead}</p>}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="relative rounded-[12px] border border-border bg-bg/60">
      <pre tabIndex={0} aria-label={label} className="overflow-x-auto p-4 pr-12 font-mono text-xs leading-relaxed text-chain">
        <code>{code}</code>
      </pre>
      <CopyButton value={code} label={`Copy ${label}`} className="absolute right-2 top-2" />
    </div>
  );
}

function RpcStatusTable() {
  const selected = useRpcUrl();
  return (
    <div className="flex flex-col gap-4">
      <Card className="divide-y divide-border">
        {RPC_ENDPOINTS.map((e) => (
          <RpcRow key={e.url} url={e.url} label={e.label} selected={selected === e.url} />
        ))}
      </Card>
      <details className="glass rounded-[18px] p-4">
        <summary className="cursor-pointer text-sm font-semibold">Switch endpoint or add your own</summary>
        <div className="mt-4 max-w-md">
          <RpcSwitcher />
        </div>
      </details>
    </div>
  );
}

function RpcRow({ url, label, selected }: { url: string; label: string; selected: boolean }) {
  const { data, isLoading, isError } = useNetworkStatus(url);
  const ok = !isError && data?.ok;
  return (
    <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Server className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            {label}
            {selected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent-ink">
                <Check className="size-3" aria-hidden /> In use
              </span>
            )}
          </p>
          <p className="truncate font-mono text-xs text-muted">{url}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 pl-7 font-mono text-xs sm:pl-0">
        <span className={cn("inline-flex items-center gap-1.5", ok ? "text-trust-high" : isLoading ? "text-muted" : "text-danger")}>
          <LiveDot ok={!!ok || isLoading} /> {isLoading ? "checking" : ok ? `${data!.latencyMs} ms` : "unreachable"}
        </span>
        <span className="tabular text-chain">{ok ? `#${data!.latestBlock.toLocaleString("en-IN")}` : "—"}</span>
      </div>
    </div>
  );
}

function Playground() {
  const [query, setQuery] = React.useState(QUERY_PRESETS[0].query());
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<{ rows: unknown[]; ms: number } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    const t = performance.now();
    try {
      const rows = (await getDataSource().runRawQuery(query)) as unknown[];
      setResult({ rows, ms: Math.round(performance.now() - t) });
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Query failed");
      toast.error("Query failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Preset queries">
        {QUERY_PRESETS.map((p) => {
          const q = p.query();
          return (
            <button
              key={p.label}
              type="button"
              aria-pressed={query === q}
              onClick={() => {
                setQuery(q);
                setResult(null);
                setError(null);
              }}
              className={cn(
                "min-h-9 rounded-full border px-3 text-xs font-medium transition-colors cursor-pointer",
                query === q ? "border-accent bg-accent/10 text-text" : "border-border text-muted hover:text-text",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div>
        <label htmlFor="raw-query" className="mb-1.5 block text-sm font-medium">Arkiv query</label>
        <Textarea id="raw-query" value={query} onChange={(e) => setQuery(e.target.value)} spellCheck={false} className="min-h-24 font-mono text-xs text-chain sm:text-xs" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run} disabled={running || !query.trim()}>
          {running ? <Loader2 className="animate-spin" /> : <Play />} Run
        </Button>
        <CopyButton value={query} label="Copy query" />
        {result && (
          <span className="text-sm text-muted" aria-live="polite">
            <span className="tabular font-semibold text-text">{result.rows.length}</span> entities in {result.ms} ms
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="rounded-[10px] border border-danger/40 bg-danger/5 p-3 font-mono text-xs text-danger">
          {error}
        </p>
      )}
      {result && (
        <details open className="rounded-[12px] border border-border bg-bg/60">
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium">Raw results (JSON)</summary>
          <pre tabIndex={0} aria-label="Raw query results" className="max-h-[420px] overflow-auto border-t border-border p-4 font-mono text-[11px] leading-relaxed text-muted">
            {JSON.stringify(result.rows.slice(0, 50), null, 2)}
            {result.rows.length > 50 && `\n… ${result.rows.length - 50} more`}
          </pre>
        </details>
      )}
    </div>
  );
}

export default function VerifyPage() {
  const rpc = useRpcUrl();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="grid items-center gap-10 pb-10 sm:pb-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-ink">Don&apos;t trust us</p>
        <h1 className="mt-2 max-w-3xl text-4xl font-extrabold leading-[1.02] sm:text-6xl">This site is just <span className="text-gradient">one window</span> into the data.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Close it and the data is still there. Everything below lets you read Tankha&apos;s entries without this website — pick
          another RPC, run the queries yourself, use the CLI or plain curl. Posts, votes and comments are all just entities.
        </p>
        </div>
        <TakedownDiagram />
      </header>

      <Section id="rpc" n="01" title="RPC endpoints" lead="Live status of every endpoint we know. If one is blocked in your network, switch — the data is identical.">
        <RpcStatusTable />
      </Section>

      <Section n="02" title="Query playground" lead="Pick a preset or write your own. Results come straight from the selected RPC — the same entities this site renders.">
        <Playground />
      </Section>

      <Section n="03" title="Use the CLI" lead="A tiny Node CLI in this repo talks to Arkiv directly.">
        <div className="flex flex-col gap-3">
          <CodeBlock code={CLI_SNIPPETS.install} label="install command" />
          <CodeBlock code={CLI_SNIPPETS.examples.join("\n")} label="example commands" />
        </div>
      </Section>

      <Section n="04" title="Use any HTTP client" lead="Arkiv speaks JSON-RPC. No SDK required.">
        <CodeBlock code={CURL_SNIPPET(rpc)} label="curl command" />
      </Section>

      <Section n="05" title="Mirrors" lead="The frontend is a static bundle — the same build is pinned to IPFS.">
        <Card className="divide-y divide-border">
          {MIRRORS.map((m) => (
            <a key={m.url} href={m.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 p-4 hover:bg-surface-2/60">
              <span className="min-w-0">
                <span className="block font-medium">{m.label}</span>
                <span className="block truncate font-mono text-xs text-muted">{m.url}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
                {m.kind} <ExternalLink className="size-4" aria-hidden />
              </span>
            </a>
          ))}
        </Card>
      </Section>

      <Section n="06" title="Schema" lead="Five entity types. Every entity carries project = &quot;tankha&quot; so you can find them all.">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { t: "salary", a: ["company", "role", "level", "city", "yoe #", "ctc #", "base #?", "createdAt #"] },
            { t: "review", a: ["company", "wlb #", "management #", "growth #", "culture #", "createdAt #", "payload: comment"] },
            { t: "confirmation", a: ["entryKey", "createdAt #"] },
            { t: "comment", a: ["postKey", "parentKey?", "createdAt #", "payload: body"] },
            { t: "vote", a: ["targetKey", "dir (up/down/none)", "createdAt #"] },
          ].map((e) => (
            <Card key={e.t} className="p-4">
              <p className="font-mono text-sm font-semibold text-chain">type = &quot;{e.t}&quot;</p>
              <ul className="mt-3 flex flex-col gap-1 font-mono text-xs text-muted">
                {["project", "v #", ...e.a].map((a) => <li key={a}>{a}</li>)}
              </ul>
            </Card>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted"># = numeric attribute. Expiry is Arkiv&apos;s own entity expiration (~18 months), extended by confirmations.</p>
        <Button asChild variant="secondary" className="mt-4">
          <a href={SCHEMA_URL} target="_blank" rel="noreferrer"><ExternalLink /> Full schema.md</a>
        </Button>
      </Section>
    </div>
  );
}
