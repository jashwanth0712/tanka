import { describe, expect, it } from "vitest";
import { daysUntil, formatINR, formatINRCompact, formatYears, relativeTime, truncateAddress, DAY } from "@/lib/format";

describe("format", () => {
  it("formats INR in Indian grouping", () => {
    expect(formatINR(1850000)).toBe("₹18,50,000");
    expect(formatINR(999)).toBe("₹999");
  });
  it("formats compact lakh / crore", () => {
    expect(formatINRCompact(1850000)).toBe("₹18.5 L");
    expect(formatINRCompact(12000000)).toBe("₹1.2 Cr");
    expect(formatINRCompact(100000)).toBe("₹1 L");
    expect(formatINRCompact(85000)).toBe("₹85,000");
  });
  it("truncates addresses", () => {
    expect(truncateAddress("0x12ab34cd56ef7890aabbccddeeff00112233" + "9f3c")).toBe("0x12ab…9f3c");
  });
  it("computes days until and relative time", () => {
    const now = 1_700_000_000_000;
    expect(daysUntil(now + 10 * DAY + 5, now)).toBe(10);
    expect(daysUntil(now - 2 * DAY, now)).toBe(-2);
    expect(relativeTime(now - 3 * DAY, now)).toBe("3 days ago");
    expect(relativeTime(now - 10_000, now)).toBe("just now");
  });
  it("pluralises years", () => {
    expect(formatYears(1)).toBe("1 yr");
    expect(formatYears(0)).toBe("0 yrs");
    expect(formatYears(4)).toBe("4 yrs");
  });
});
