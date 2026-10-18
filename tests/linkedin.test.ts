import { describe, expect, it } from "vitest";
import { isCompany, parseLinkedInCompany, resolveCompany } from "@/lib/catalog";

describe("LinkedIn company links", () => {
  it("reads the company slug from a page URL", () => {
    expect(parseLinkedInCompany("https://www.linkedin.com/company/Acme-Robotics/about/?trk=x")).toBe("acme-robotics");
    expect(parseLinkedInCompany("linkedin.com/company/acme")).toBe("acme");
    expect(parseLinkedInCompany("https://in.linkedin.com/company/acme-corp#top")).toBe("acme-corp");
  });
  it("rejects personal profiles and non-LinkedIn links", () => {
    expect(parseLinkedInCompany("https://www.linkedin.com/in/some-person")).toBeNull();
    expect(parseLinkedInCompany("https://example.com/company/acme")).toBeNull();
    expect(parseLinkedInCompany("")).toBeNull();
  });
  it("accepts any valid slug as a company, with a readable name", () => {
    expect(isCompany("acme-robotics")).toBe(true);
    expect(isCompany("Not A Slug!")).toBe(false);
    expect(resolveCompany("acme-robotics")?.label).toBe("Acme Robotics");
    expect(resolveCompany("nimbus-infotech")?.label).toBe("Nimbus Infotech");
  });
});
