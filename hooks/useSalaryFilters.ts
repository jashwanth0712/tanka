"use client";
// Salaries filters <-> URL query params (shareable links).

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { isCity, isCompany, isLevel, isRole } from "@/lib/catalog";
import type { SalaryFilters } from "@/lib/data/types";
import type { TrustFilter } from "@/lib/trust";

export type SortKey = "newest" | "ctc" | "trust";

export interface UIFilters {
  companies: string[];
  roles: string[];
  levels: string[];
  cities: string[];
  yoe: [number, number]; // 0..20 (20 = 20+)
  ctc: [number, number]; // indexes into CTC_STOPS
  trust: TrustFilter;
  sort: SortKey;
}

/** Log-ish CTC slider steps (INR). Last stop = "no upper limit". */
export const CTC_STOPS = [
  0, 200_000, 400_000, 600_000, 800_000, 1_000_000, 1_200_000, 1_500_000, 1_800_000, 2_000_000, 2_500_000,
  3_000_000, 3_500_000, 4_000_000, 5_000_000, 6_000_000, 7_500_000, 9_000_000, 10_000_000,
];
export const YOE_MAX = 20;

export const DEFAULT_FILTERS: UIFilters = {
  companies: [],
  roles: [],
  levels: [],
  cities: [],
  yoe: [0, YOE_MAX],
  ctc: [0, CTC_STOPS.length - 1],
  trust: "medium",
  sort: "newest",
};

const list = (v: string | null, valid: (s: string) => boolean) => (v ? v.split(",").filter(valid) : []);
const range = (v: string | null, min: number, max: number): [number, number] => {
  const [a, b] = (v ?? "").split("-").map(Number);
  const lo = Number.isFinite(a) ? Math.max(min, Math.min(max, a)) : min;
  const hi = Number.isFinite(b) ? Math.max(lo, Math.min(max, b)) : max;
  return [lo, hi];
};
const ctcIndex = (rupees: number) => {
  const i = CTC_STOPS.findIndex((s) => s >= rupees);
  return i < 0 ? CTC_STOPS.length - 1 : i;
};

export function parseFilters(sp: URLSearchParams): UIFilters {
  const ctcRaw = sp.get("ctc");
  let ctc = DEFAULT_FILTERS.ctc;
  if (ctcRaw) {
    const [a, b] = ctcRaw.split("-").map(Number);
    ctc = [Number.isFinite(a) ? ctcIndex(a) : 0, Number.isFinite(b) ? ctcIndex(b) : CTC_STOPS.length - 1];
  }
  const trust = sp.get("trust");
  const sort = sp.get("sort");
  return {
    companies: list(sp.get("company"), isCompany),
    roles: list(sp.get("role"), isRole),
    levels: list(sp.get("level"), isLevel),
    cities: list(sp.get("city"), isCity),
    yoe: range(sp.get("yoe"), 0, YOE_MAX),
    ctc,
    trust: trust === "all" || trust === "high" ? trust : "medium",
    sort: sort === "ctc" || sort === "trust" ? sort : "newest",
  };
}

export function serializeFilters(f: UIFilters): string {
  const p = new URLSearchParams();
  if (f.companies.length) p.set("company", f.companies.join(","));
  if (f.roles.length) p.set("role", f.roles.join(","));
  if (f.levels.length) p.set("level", f.levels.join(","));
  if (f.cities.length) p.set("city", f.cities.join(","));
  if (f.yoe[0] !== 0 || f.yoe[1] !== YOE_MAX) p.set("yoe", `${f.yoe[0]}-${f.yoe[1]}`);
  if (f.ctc[0] !== 0 || f.ctc[1] !== CTC_STOPS.length - 1) p.set("ctc", `${CTC_STOPS[f.ctc[0]]}-${CTC_STOPS[f.ctc[1]]}`);
  if (f.trust !== "medium") p.set("trust", f.trust);
  if (f.sort !== "newest") p.set("sort", f.sort);
  return p.toString();
}

/** UI filters → data-contract filters (what's sent to Arkiv). Trust + sort stay client-side. */
export function toQueryFilters(f: UIFilters): SalaryFilters {
  const last = CTC_STOPS.length - 1;
  return {
    companies: f.companies.length ? f.companies : undefined,
    roles: f.roles.length ? f.roles : undefined,
    levels: f.levels.length ? f.levels : undefined,
    cities: f.cities.length ? f.cities : undefined,
    yoeMin: f.yoe[0] > 0 ? f.yoe[0] : undefined,
    yoeMax: f.yoe[1] < YOE_MAX ? f.yoe[1] : undefined,
    ctcMin: f.ctc[0] > 0 ? CTC_STOPS[f.ctc[0]] : undefined,
    ctcMax: f.ctc[1] < last ? CTC_STOPS[f.ctc[1]] : undefined,
  };
}

export function activeFilterCount(f: UIFilters) {
  return (
    (f.companies.length ? 1 : 0) +
    (f.roles.length ? 1 : 0) +
    (f.levels.length ? 1 : 0) +
    (f.cities.length ? 1 : 0) +
    (f.yoe[0] !== 0 || f.yoe[1] !== YOE_MAX ? 1 : 0) +
    (f.ctc[0] !== 0 || f.ctc[1] !== CTC_STOPS.length - 1 ? 1 : 0) +
    (f.trust !== "medium" ? 1 : 0)
  );
}

export function useSalaryFilters() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const spString = sp.toString();
  const filters = React.useMemo(() => parseFilters(new URLSearchParams(spString)), [spString]);

  const setFilters = React.useCallback(
    (next: UIFilters | ((f: UIFilters) => UIFilters)) => {
      const value = typeof next === "function" ? next(filters) : next;
      const qs = serializeFilters(value);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  return { filters, setFilters, reset: () => setFilters(DEFAULT_FILTERS) };
}
