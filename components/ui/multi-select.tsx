"use client";

import { Command } from "cmdk";
import { Check, ChevronsUpDown, X } from "lucide-react";
import * as React from "react";
import type { CatalogItem } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./overlays";

/** Multi-select combobox (Popover + cmdk) over a catalog list. */
export function MultiSelect({
  label,
  items,
  value,
  onChange,
  placeholder = "Any",
}: {
  label: string;
  items: CatalogItem[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const selected = items.filter((i) => value.includes(i.id));

  return (
    <div>
      <span id={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-labelledby={id}
          className="flex min-h-11 w-full items-center gap-2 rounded-[10px] border border-border bg-surface-2 px-3 py-1.5 text-left text-sm hover:border-muted/50 cursor-pointer"
        >
          <span className="flex min-w-0 flex-1 flex-wrap gap-1">
            {selected.length === 0 && <span className="text-muted">{placeholder}</span>}
            {selected.length > 0 && selected.length <= 2 &&
              selected.map((s) => (
                <span key={s.id} className="rounded-md bg-surface px-1.5 py-0.5 text-xs font-medium">
                  {s.label}
                </span>
              ))}
            {selected.length > 2 && <span className="font-medium">{selected.length} selected</span>}
          </span>
          {selected.length > 0 ? (
            <span
              role="button"
              tabIndex={0}
              aria-label={`Clear ${label}`}
              className="rounded p-0.5 text-muted hover:text-text"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange([]);
                }
              }}
            >
              <X className="size-4" />
            </span>
          ) : (
            <ChevronsUpDown className="size-4 text-muted" aria-hidden />
          )}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-56 p-0">
          <Command label={label}>
            {items.length > 7 && (
              <Command.Input
                placeholder={`Search ${label.toLowerCase()}…`}
                className="h-11 w-full border-b border-border bg-transparent px-3 text-base outline-none placeholder:text-muted sm:text-sm"
              />
            )}
            <Command.List className="max-h-64 overflow-y-auto p-1">
              <Command.Empty className="p-3 text-sm text-muted">No match.</Command.Empty>
              {items.map((i) => {
                const on = value.includes(i.id);
                return (
                  <Command.Item
                    key={i.id}
                    value={i.label}
                    onSelect={() => toggle(i.id)}
                    className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2 text-sm aria-selected:bg-surface-2"
                  >
                    <span
                      className={cn(
                        "grid size-4 place-items-center rounded border",
                        on ? "border-transparent bg-gradient-primary text-accent-fg" : "border-border",
                      )}
                      aria-hidden
                    >
                      {on && <Check className="size-3" />}
                    </span>
                    <span className="sr-only">{on ? "Selected: " : ""}</span>
                    {i.label}
                  </Command.Item>
                );
              })}
            </Command.List>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Segmented control (radio group). */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-[10px] border border-border bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-9 rounded-[7px] px-2 text-xs font-medium transition-colors cursor-pointer",
            value === o.value ? "bg-gradient-soft text-text ring-1 ring-accent/40" : "text-muted hover:text-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
