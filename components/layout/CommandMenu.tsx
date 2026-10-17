"use client";

import { Command } from "cmdk";
import { Building2, Briefcase, MapPin, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/overlays";
import { CITIES, COMPANIES, ROLES } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const MenuContext = React.createContext<(open: boolean) => void>(() => {});
export const useCommandMenu = () => React.useContext(MenuContext);

export function CommandMenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
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
    router.push(href);
  };

  const item =
    "flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] px-3 text-sm aria-selected:bg-surface-2 aria-selected:text-text";

  return (
    <MenuContext.Provider value={setOpen}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden">
          <DialogTitle className="sr-only">Search companies, roles and cities</DialogTitle>
          <Command label="Search" className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-border px-4">
              <Search className="size-4 text-muted" aria-hidden />
              <Command.Input
                autoFocus
                placeholder="Company, role or city…"
                className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted"
              />
            </div>
            <Command.List className="max-h-[50vh] overflow-y-auto p-2">
              <Command.Empty className="p-6 text-center text-sm text-muted">Nothing in the catalog matches.</Command.Empty>
              <Command.Group heading="Communities" className={groupCls}>
                {COMPANIES.map((c) => (
                  <Command.Item key={c.id} value={`company ${c.label} ${c.industry}`} onSelect={() => go(`/company/?name=${c.id}`)} className={item}>
                    <Building2 className="size-4 text-muted" aria-hidden />
                    <span className="flex-1">c/{c.id} <span className="text-muted">· {c.label}</span></span>
                    <span className="text-xs text-muted">{c.industry}</span>
                  </Command.Item>
                ))}
              </Command.Group>
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

const groupCls = cn(
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted",
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
      aria-label="Search companies, roles and cities"
    >
      <Search className={wide ? "size-5" : "size-4"} aria-hidden />
      <span className={cn(!wide && "hidden xl:inline", wide && "flex-1 text-left")}>
        {wide ? "Search a company or role…" : "Search"}
      </span>
      <kbd className="hidden rounded border border-border bg-surface-2 px-1.5 font-mono text-[11px] sm:inline">⌘K</kbd>
    </button>
  );
}
