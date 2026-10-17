import { K_ANONYMITY } from "./constants";

/** Linear-interpolated percentile, p in [0, 100]. Returns NaN for empty input. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (Math.min(100, Math.max(0, p)) / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo);
}

export function median(values: number[]): number {
  return percentile(values, 50);
}

export interface Bin {
  start: number;
  end: number;
  count: number;
}

export function histogram(values: number[], bins = 10): Bin[] {
  if (values.length === 0 || bins < 1) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ start: min, end: max, count: values.length }];
  const width = (max - min) / bins;
  const out: Bin[] = Array.from({ length: bins }, (_, i) => ({
    start: min + i * width,
    end: min + (i + 1) * width,
    count: 0,
  }));
  for (const v of values) {
    const i = Math.min(bins - 1, Math.floor((v - min) / width));
    out[i].count++;
  }
  return out;
}

export interface Summary {
  count: number;
  median: number;
  p25: number;
  p75: number;
  min: number;
  max: number;
}

/** Summary stats, or null when fewer than K_ANONYMITY values (k-anonymity rule). */
export function summarize(values: number[], k = K_ANONYMITY): Summary | null {
  if (values.length < k) return null;
  return {
    count: values.length,
    median: median(values),
    p25: percentile(values, 25),
    p75: percentile(values, 75),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export interface MatrixCell {
  count: number;
  median: number;
}

/**
 * Group entries by two keys and summarise `value` per cell.
 * Cells with fewer than k entries are returned as null (k-anonymity).
 */
export function groupMatrix<T, R extends keyof T, C extends keyof T>(
  entries: T[],
  rowKey: R,
  colKey: C,
  value: (e: T) => number,
  k = K_ANONYMITY,
): Map<string, Map<string, MatrixCell | null>> {
  const groups = new Map<string, Map<string, number[]>>();
  for (const e of entries) {
    const r = String(e[rowKey]);
    const c = String(e[colKey]);
    if (!groups.has(r)) groups.set(r, new Map());
    const row = groups.get(r)!;
    if (!row.has(c)) row.set(c, []);
    row.get(c)!.push(value(e));
  }
  const out = new Map<string, Map<string, MatrixCell | null>>();
  for (const [r, row] of groups) {
    const cells = new Map<string, MatrixCell | null>();
    for (const [c, vals] of row) {
      cells.set(c, vals.length < k ? null : { count: vals.length, median: median(vals) });
    }
    out.set(r, cells);
  }
  return out;
}

/** Raw group counts (no k-anonymity) — used for "n entries" hints. */
export function groupCounts<T>(entries: T[], key: (e: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of entries) m.set(key(e), (m.get(key(e)) ?? 0) + 1);
  return m;
}
