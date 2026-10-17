import { describe, expect, it } from "vitest";
import { scanPII } from "@/lib/pii";

const types = (t: string) => scanPII(t).matches.map((m) => m.type);

describe("scanPII", () => {
  it("passes clean text", () => {
    expect(scanPII("Good team, slow appraisals. 3 rounds of interviews.").ok).toBe(true);
  });
  it("detects emails without double-counting as handle", () => {
    expect(types("mail me at someone@example.com")).toEqual(["email"]);
  });
  it("detects Indian phone numbers in many shapes", () => {
    expect(types("call 9876543210")).toEqual(["phone"]);
    expect(types("call +91 98765 43210")).toEqual(["phone"]);
    expect(types("call 098765-43210")).toEqual(["phone"]);
    expect(types("id 1234567890")).toEqual([]); // doesn't start 6–9
  });
  it("detects URLs and handles", () => {
    expect(types("see https://foo.bar/x")).toEqual(["url"]);
    expect(types("see www.something.org")).toEqual(["url"]);
    expect(types("ping @some_person on X")).toEqual(["handle"]);
  });
  it("returns positions", () => {
    const r = scanPII("hi @abc");
    expect(r.matches[0]).toMatchObject({ start: 3, end: 7 });
  });
});
