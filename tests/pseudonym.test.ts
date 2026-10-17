import { describe, expect, it } from "vitest";
import { displayName, pseudonym } from "@/lib/pseudonym";

describe("pseudonym", () => {
  const a = "0x2af4c0ffee00000000000000000000000000" + "8fbe";
  it("is stable for the same wallet and case-insensitive", () => {
    expect(pseudonym(a)).toBe(pseudonym(a.toUpperCase().replace("0X", "0x")));
  });
  it("looks like 'Adjective Animal · last4'", () => {
    expect(displayName(a)).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+ · 8fbe$/);
  });
  it("differs across wallets", () => {
    const names = new Set(Array.from({ length: 50 }, (_, i) => pseudonym(`0x${(i * 7919).toString(16).padStart(8, "0")}${"0".repeat(32)}`)));
    expect(names.size).toBeGreaterThan(25);
  });
});
