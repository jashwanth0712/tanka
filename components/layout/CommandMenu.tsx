"use client";

import { Command } from "cmdk";
import { Building2, Briefcase, MapPin, MessageSquare, Plus, Search, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/overlays";
import { useCommunities } from "@/hooks/communities";
import { CITIES, ROLES, cityLabel, companyName, levelLabel, parseLinkedInCompany, roleLabel } from "@/lib/catalog";
import { formatINRCompact, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const MenuContext = React.createContext<(open: boolean) => void>(() => {});
export const useCommandMenu = () => React.useContext(MenuContext);

export function CommandMenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const router = useRouter();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setSearch("");
    router.push(href);
  };

  const item =
    "flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] px-3 text-sm aria-selected:bg-surface-2 aria-selected:text-text";

  return (
    <MenuContext.Provider value={setOpen}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden">
          <DialogTitle className="sr-only">Search communities, posts, packages, roles and cities</DialogTitle>
          <Command label="Search" className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-border px-4">
              <Search className="size-4 text-muted" aria-hidden />
              <Command.Input
                autoFocus
                value={search}
                onValueChange={setSearch}
                placeholder="Search communities, posts, packages…"
                className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted"
              />
            </div>
            <Command.List className="max-h-[50vh] overflow-y-auto p-2">
              <Command.Empty className="p-6 text-center text-sm text-muted">Nothing matches. Paste a company&apos;s LinkedIn link to open its community.</Command.Empty>
              <LinkedInItem search={search} go={go} item={item} />
              <LiveResults go={go} item={item} />
              <Command.Group heading="Roles" className={groupCls}>
                {ROLES.map((r) => (
                  <Command.Item key={r.id} value={`role ${r.label}`} onSelect={() => go(`/salaries/?role=${r.id}`)} className={item}>
                    <Briefcase className="size-4 text-muted" aria-hidden />
                    {r.label}
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Cities" className={groupCls}>
                {CITIES.map((c) => (
                  <Command.Item key={c.id} value={`city ${c.label}`} onSelect={() => go(`/salaries/?city=${c.id}`)} className={item}>
                    <MapPin className="size-4 text-muted" aria-hidden />
                    {c.label}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </MenuContext.Provider>
  );
}

/** Pasting a LinkedIn company link opens (or starts) that company's community. */
function LinkedInItem({ search, go, item }: { search: string; go: (href: string) => void; item: string }) {
  const slug = /linkedin\.com/i.test(search) ? parseLinkedInCompany(search) : null;
  if (!slug) return null;
  return (
    <Command.Group forceMount heading="From your link" className={groupCls}>
      <Command.Item forceMount value={`linkedin ${search}`} onSelect={() => go(`/company/?name=${slug}`)} className={item}>
        <Plus className="size-4 text-muted" aria-hidden />
        <span className="flex-1">Open c/{slug} <span className="text-muted">· {companyName(slug)}</span></span>
      </Command.Item>
    </Command.Group>
  );
}

/** Communities, discussions and packages, read live from Arkiv. Mounted only while the menu is open. */
function LiveResults({ go, item }: { go: (href: string) => void; item: string }) {
  const { rows, discussions, salaries, isLoading } = useCommunities();
  const threads = React.useMemo(() => [...(discussions ?? [])].sort((a, b) => b.createdAt - a.createdAt).slice(0, 80), [discussions]);
  const packages = React.useMemo(() => [...(salaries ?? [])].sort((a, b) => b.createdAt - a.createdAt).slice(0, 80), [salaries]);
  return (
    <>
      <Command.Group heading="Communities" className={groupCls}>
        {rows.map((r) => (
          <Command.Item key={r.company.id} value={`community ${r.company.label} ${r.company.id} ${r.company.industry}`} onSelect={() => go(`/company/?name=${r.company.id}`)} className={item}>
            <Building2 className="size-4 text-muted" aria-hidden />
            <span className="flex-1">c/{r.company.id} <span className="text-muted">· {r.company.label}</span></span>
            <span className="text-xs text-muted">{r.threads} threads · {r.packages} packages</span>
          </Command.Item>
        ))}
      </Command.Group>
      {threads.length > 0 && (
        <Command.Group heading="Discussions" className={groupCls}>
          {threads.map((d) => (
            <Command.Item key={d.key} value={`discussion ${d.title} ${d.body ?? ""} ${companyName(d.company)} ${d.flair} ${d.key}`} onSelect={() => go(`/post/?key=${d.key}`)} className={item}>
              <MessageSquare className="size-4 shrink-0 text-muted" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{d.title}</span>
              <span className="shrink-0 text-xs text-muted">c/{d.company} · {relativeTime(d.createdAt)}</span>
            </Command.Item>
          ))}
        </Command.Group>
      )}
      {packages.length > 0 && (
        <Command.Group heading="Packages" className={groupCls}>
          {packages.map((s) => (
            <Command.Item key={s.key} value={`package ${companyName(s.company)} ${roleLabel(s.role)} ${levelLabel(s.level)} ${cityLabel(s.city)} ${s.ctc} ${s.key}`} onSelect={() => go(`/post/?key=${s.key}`)} className={item}>
              <Wallet className="size-4 shrink-0 text-muted" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{roleLabel(s.role)} · {levelLabel(s.level)} · {companyName(s.company)}</span>
              <span className="shrink-0 text-xs text-muted">{formatINRCompact(s.ctc)} · {cityLabel(s.city)}</span>
            </Command.Item>
          ))}
        </Command.Group>
      )}
      {isLoading && <p className="px-3 py-2 text-xs text-muted">Reading from Arkiv…</p>}
    </>
  );
}

const groupCls = cn(
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted",
);

export function SearchTrigger({ className, wide }: { className?: string; wide?: boolean }) {
  const open = useCommandMenu();
  return (
    <button
      type="button"
      onClick={() => open(true)}
      className={cn(
        "glass inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-text cursor-pointer",
        wide && "h-14 w-full rounded-[14px] px-4 text-base",
        className,
      )}
      aria-label="Search communities, posts and packages"
    >
      <Search className={wide ? "size-5" : "size-4"} aria-hidden />
      <span className={cn(!wide && "hidden xl:inline", wide && "flex-1 text-left")}>
        {wide ? "Search communities, posts or packages…" : "Search"}
      </span>
      <kbd className="hidden rounded border border-border bg-surface-2 px-1.5 font-mono text-[11px] sm:inline">⌘K</kbd>
    </button>
  );
}
