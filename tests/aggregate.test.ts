import { describe, expect, it } from "vitest";
import { groupMatrix, histogram, median, percentile, summarize } from "@/lib/aggregate";

describe("aggregate", () => {
  it("median and percentiles", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(percentile([10, 20, 30, 40, 50], 25)).toBe(20);
    expect(Number.isNaN(median([]))).toBe(true);
  });
  it("histogram puts every value in a bin", () => {
    const h = histogram([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5);
    expect(h).toHaveLength(5);
    expect(h.reduce((s, b) => s + b.count, 0)).toBe(10);
    expect(h[4].count).toBe(2);
  });
  it("enforces k-anonymity", () => {
    expect(summarize([1, 2])).toBeNull();
    expect(summarize([1, 2, 3])?.median).toBe(2);
  });
  it("groupMatrix hides small cells", () => {
    const rows = [
      { r: "a", c: "x", v: 1 },
      { r: "a", c: "x", v: 2 },
      { r: "a", c: "x", v: 3 },
      { r: "a", c: "y", v: 9 },
    ];
    const m = groupMatrix(rows, "r", "c", (e) => e.v);
    expect(m.get("a")?.get("x")).toEqual({ count: 3, median: 2 });
    expect(m.get("a")?.get("y")).toBeNull();
  });
});
