import { describe, expect, it } from "vitest";
import { salariesQuery } from "@/lib/data/query";
import { compileQuery } from "@/lib/data/mock/queryEval";

describe("query builder + evaluator", () => {
  it("builds and evaluates filters", () => {
    const q = salariesQuery({ companies: ["a", "b"], yoeMin: 2, ctcMax: 3_000_000 });
    expect(q).toBe(
      "project = str('tankha') AND type = str('salary') AND (company = str('a') OR company = str('b')) AND yoe >= i32(2) AND ctc <= i32(3000000)",
    );
    const p = compileQuery(q);
    const base = { project: "tankha", type: "salary", yoe: 3, ctc: 2_000_000 };
    expect(p({ ...base, company: "b" })).toBe(true);
    expect(p({ ...base, company: "c" })).toBe(false);
    expect(p({ ...base, company: "a", ctc: 4_000_000 })).toBe(false);
  });
  it("matches key attributes case-insensitively", () => {
    const k = `0x${"AB".repeat(32)}`;
    expect(compileQuery(`$key = key(${k.toLowerCase()})`)({ $key: k })).toBe(true);
  });
  it("handles quotes and NOT", () => {
    expect(compileQuery("name = str('it''s') AND NOT flag = str('x')")({ name: "it's", flag: "y" })).toBe(true);
  });
  it("rejects garbage", () => {
    expect(() => compileQuery("type = ")).toThrow();
  });
});
