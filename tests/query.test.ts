import { describe, expect, it } from "vitest";
import { salariesQuery } from "@/lib/data/query";
import { compileQuery } from "@/lib/data/mock/queryEval";

describe("query builder + evaluator", () => {
  it("builds and evaluates filters", () => {
    const q = salariesQuery({ companies: ["a", "b"], yoeMin: 2, ctcMax: 3_000_000 });
    expect(q).toBe(
      'project = "tankha" && type = "salary" && (company = "a" || company = "b") && yoe >= 2 && ctc <= 3000000',
    );
    const p = compileQuery(q);
    const base = { project: "tankha", type: "salary", yoe: 3, ctc: 2_000_000 };
    expect(p({ ...base, company: "b" })).toBe(true);
    expect(p({ ...base, company: "c" })).toBe(false);
    expect(p({ ...base, company: "a", ctc: 4_000_000 })).toBe(false);
  });
  it("matches meta attributes with hex values", () => {
    expect(compileQuery("$key = 0xABC")({ $key: "0xabc" })).toBe(true);
  });
  it("rejects garbage", () => {
    expect(() => compileQuery("type = ")).toThrow();
  });
});
