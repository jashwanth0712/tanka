"use client";

import { SlidersHorizontal } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { MultiSelect, Segmented } from "@/components/ui/multi-select";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger, Slider } from "@/components/ui/overlays";
import {
  activeFilterCount,
  CTC_STOPS,
  DEFAULT_FILTERS,
  YOE_MAX,
  type SortKey,
  type UIFilters,
} from "@/hooks/useSalaryFilters";
import { CITIES, COMPANIES, LEVELS, ROLES } from "@/lib/catalog";
import { formatINRCompact } from "@/lib/format";
import type { TrustFilter } from "@/lib/trust";

const TRUST_OPTS: { value: TrustFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "medium", label: "Medium+" },
  { value: "high", label: "High only" },
];
export const SORT_OPTS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "ctc", label: "CTC ↓" },
  { value: "trust", label: "Trust" },
];

/** Filters body — draft state is applied live (sidebar) or on "Show results" (drawer). */
export function FilterFields({ value, onChange }: { value: UIFilters; onChange: (f: UIFilters) => void }) {
  const set = <K extends keyof UIFilters>(k: K, v: UIFilters[K]) => onChange({ ...value, [k]: v });
  const last = CTC_STOPS.length - 1;
  const ctcLabel = `${formatINRCompact(CTC_STOPS[value.ctc[0]])} – ${value.ctc[1] === last ? "₹1 Cr+" : formatINRCompact(CTC_STOPS[value.ctc[1]])}`;
  const yoeLabel = `${value.yoe[0]} – ${value.yoe[1] === YOE_MAX ? `${YOE_MAX}+` : value.yoe[1]} yrs`;

  return (
    <div className="flex flex-col gap-5">
      <MultiSelect label="Company" items={COMPANIES} value={value.companies} onChange={(v) => set("companies", v)} />
      <MultiSelect label="Role" items={ROLES} value={value.roles} onChange={(v) => set("roles", v)} />
      <MultiSelect label="Level" items={LEVELS} value={value.levels} onChange={(v) => set("levels", v)} />
      <MultiSelect label="City" items={CITIES} value={value.cities} onChange={(v) => set("cities", v)} />

      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">Experience</span>
          <span className="tabular text-muted">{yoeLabel}</span>
        </div>
        <Slider
          aria-label="Years of experience"
          min={0}
          max={YOE_MAX}
          step={1}
          minStepsBetweenThumbs={0}
          value={value.yoe}
          onValueChange={(v) => set("yoe", [v[0], v[1]])}
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">Annual CTC</span>
          <span className="tabular text-muted">{ctcLabel}</span>
        </div>
        <Slider
          aria-label="Annual CTC"
          min={0}
          max={last}
          step={1}
          value={value.ctc}
          onValueChange={(v) => set("ctc", [v[0], v[1]])}
        />
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium">Trust</span>
        <Segmented label="Trust filter" options={TRUST_OPTS} value={value.trust} onChange={(v) => set("trust", v)} />
      </div>
    </div>
  );
}

export function FilterDrawer({ value, onApply }: { value: UIFilters; onApply: (f: UIFilters) => void }) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const count = activeFilterCount(value);
  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (o) setDraft(value);
        setOpen(o);
      }}
    >
      <DrawerTrigger asChild>
        <Button variant="secondary" className="flex-1">
          <SlidersHorizontal /> Filters{count > 0 && <span className="tabular">({count})</span>}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <DrawerTitle className="font-display text-xl font-semibold">Filters</DrawerTitle>
          <Button variant="link" size="sm" onClick={() => setDraft({ ...DEFAULT_FILTERS, sort: draft.sort })}>
            Reset
          </Button>
        </div>
        <div className="overflow-y-auto px-4 pb-4">
          <FilterFields value={draft} onChange={setDraft} />
        </div>
        <div className="pb-safe border-t border-border p-4">
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              onApply(draft);
              setOpen(false);
            }}
          >
            Show results
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
