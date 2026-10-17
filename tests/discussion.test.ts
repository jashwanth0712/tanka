import { describe, expect, it } from "vitest";
import { discussionsQuery } from "@/lib/data/query";
import { compileQuery } from "@/lib/data/mock/queryEval";
import { discussionToEntity, entityToDiscussion } from "@/lib/data/schema";
import type { Address, EntityKey } from "@/lib/data/types";
import { scanPII } from "@/lib/pii";
import { discussionSchema } from "@/lib/schemas";
import { generateSeed } from "@/lib/seed/generate";

describe("discussions", () => {
  it("round-trips through the entity schema", () => {
    const input = { company: "kaveri-systems", flair: "compensation" as const, city: "bengaluru", title: "What % hike after 2 YOE?", body: "Asking for the next cycle." };
    const draft = discussionToEntity(input, 1_000);
    expect(draft.attributes).toMatchObject({ type: "discussion", company: "kaveri-systems", flair: "compensation", city: "bengaluru", createdAt: 1_000 });
    expect(draft.payload).toEqual({ title: input.title, body: input.body });
    const back = entityToDiscussion({ key: "0xab" as EntityKey, owner: "0xcd" as Address, expiresAt: 9, attributes: draft.attributes, payload: draft.payload });
    expect(back).toMatchObject({ ...input, kind: "discussion", createdAt: 1_000 });
  });

  it("query builder matches by company", () => {
    const p = compileQuery(discussionsQuery("godavari-labs"));
    expect(p({ project: "tankha", type: "discussion", company: "godavari-labs" })).toBe(true);
    expect(p({ project: "tankha", type: "discussion", company: "kaveri-systems" })).toBe(false);
  });

  it("validation blocks short titles and personal details", () => {
    const ok = { company: "kaveri-systems", flair: "culture", title: "Toxic culture in the Bengaluru office" };
    expect(discussionSchema.safeParse(ok).success).toBe(true);
    expect(discussionSchema.safeParse({ ...ok, title: "help" }).success).toBe(false);
    expect(discussionSchema.safeParse({ ...ok, body: "ping me at someone@example.com" }).success).toBe(false);
    expect(discussionSchema.safeParse({ ...ok, flair: "gossip" }).success).toBe(false);
  });

  it("seeds lively, PII-free threads on fictional companies, with the fraud thread", () => {
    const seed = generateSeed({ now: 1_800_000_000_000 });
    expect(seed.discussions.length).toBeGreaterThanOrEqual(20);
    const keys = new Set(seed.discussions.map((d) => d.key));
    const threadComments = seed.comments.filter((c) => keys.has(c.postKey));
    expect(threadComments.length).toBeGreaterThan(seed.discussions.length * 3);
    for (const d of seed.discussions) {
      expect(scanPII(d.title).ok).toBe(true);
      if (d.body) expect(scanPII(d.body).ok).toBe(true);
    }
    expect(seed.discussions.some((d) => d.owner === seed.fraudWallet)).toBe(true);
    // Real company names never appear in seed data (hackathon rule 5).
    const text = JSON.stringify(seed.discussions).toLowerCase();
    for (const real of ["google", "amazon", "zoho", "oracle", "infosys", "tcs", "wipro", "microsoft"]) expect(text).not.toContain(real);
  });

  it("existing seed data is unchanged by the discussion layer (determinism)", () => {
    const a = generateSeed({ now: 1_800_000_000_000 });
    expect(a.salaries[0].key).toBe(generateSeed({ now: 1_800_000_000_000 }).salaries[0].key);
  });
});
