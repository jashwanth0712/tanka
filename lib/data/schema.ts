// Canonical mapping between app types and Arkiv entities. Mirrors /arkiv/schema.md.
// The Arkiv data source should use these instead of hand-rolling attribute lists.
//
// String attributes → Arkiv string annotations; number attributes → numeric annotations.
// Arkiv numeric annotations are unsigned integers, so every number here is a non-negative integer.

import { PROJECT_TAG, SCHEMA_VERSION } from "../constants";
import type {
  Address,
  Comment,
  CommentInput,
  Confirmation,
  EntityKey,
  Rating,
  Review,
  ReviewInput,
  SalaryEntry,
  SalaryInput,
  Vote,
  VoteDir,
} from "./types";

export type AttrValue = string | number;
export type Attributes = Record<string, AttrValue>;

/** What gets written to Arkiv for one entity. */
export interface EntityDraft {
  attributes: Attributes;
  /** JSON payload (UTF-8). Only data that doesn't need to be queryable. */
  payload?: Record<string, unknown>;
}

/** What the Arkiv layer reads back, before mapping to app types. */
export interface RawEntity {
  key: EntityKey;
  owner: Address;
  expiresAt: number; // ms epoch, derived from the entity's expiration block
  attributes: Attributes;
  payload?: Record<string, unknown>;
}

const common = (type: string, createdAt: number) => ({
  project: PROJECT_TAG,
  type,
  v: SCHEMA_VERSION,
  createdAt,
});

export function salaryToEntity(input: SalaryInput, createdAt: number): EntityDraft {
  return {
    attributes: {
      ...common("salary", createdAt),
      company: input.company,
      role: input.role,
      level: input.level,
      city: input.city,
      yoe: Math.round(input.yoe),
      ctc: Math.round(input.ctc),
      ...(input.baseSalary != null ? { base: Math.round(input.baseSalary) } : {}),
    },
  };
}

export function reviewToEntity(input: ReviewInput, createdAt: number): EntityDraft {
  return {
    attributes: {
      ...common("review", createdAt),
      company: input.company,
      wlb: input.wlb,
      management: input.management,
      growth: input.growth,
      culture: input.culture,
    },
    payload: input.comment ? { comment: input.comment } : undefined,
  };
}

export function confirmationToEntity(entryKey: EntityKey, createdAt: number): EntityDraft {
  return { attributes: { ...common("confirmation", createdAt), entryKey: entryKey.toLowerCase() } };
}

const num = (a: Attributes, k: string) => Number(a[k]);
const str = (a: Attributes, k: string) => String(a[k] ?? "");

export function entityToSalary(e: RawEntity): SalaryEntry {
  const a = e.attributes;
  return {
    key: e.key,
    kind: "salary",
    company: str(a, "company"),
    role: str(a, "role"),
    level: str(a, "level"),
    city: str(a, "city"),
    yoe: num(a, "yoe"),
    ctc: num(a, "ctc"),
    baseSalary: a.base != null ? num(a, "base") : undefined,
    createdAt: num(a, "createdAt"),
    expiresAt: e.expiresAt,
    owner: e.owner,
  };
}

export function entityToReview(e: RawEntity): Review {
  const a = e.attributes;
  const comment = typeof e.payload?.comment === "string" ? e.payload.comment : undefined;
  return {
    key: e.key,
    kind: "review",
    company: str(a, "company"),
    wlb: num(a, "wlb") as Rating,
    management: num(a, "management") as Rating,
    growth: num(a, "growth") as Rating,
    culture: num(a, "culture") as Rating,
    comment,
    createdAt: num(a, "createdAt"),
    expiresAt: e.expiresAt,
    owner: e.owner,
  };
}

export function entityToConfirmation(e: RawEntity): Confirmation {
  return {
    key: e.key,
    entryKey: str(e.attributes, "entryKey") as EntityKey,
    createdAt: num(e.attributes, "createdAt"),
    owner: e.owner,
  };
}

/** Attributes exactly as stored, for the on-chain panel. */
export function salaryAttributes(s: SalaryEntry): Attributes {
  return salaryToEntity(s, s.createdAt).attributes;
}

/** Plain-language list for the submit privacy step. */
export const STORED_FIELDS = {
  salary: ["company", "role", "level", "city", "years of experience", "annual CTC", "base salary (optional)", "posting time"],
  review: ["company", "4 ratings (1–5)", "comment (optional, ≤ 280 chars)", "posting time"],
  comment: ["the post it replies to", "your comment text (≤ 500 chars)", "posting time"],
};

export function commentToEntity(input: CommentInput, createdAt: number): EntityDraft {
  return {
    attributes: {
      ...common("comment", createdAt),
      postKey: input.postKey.toLowerCase(),
      ...(input.parentKey ? { parentKey: input.parentKey.toLowerCase() } : {}),
    },
    payload: { body: input.body },
  };
}

/** Vote direction is a string attribute: Arkiv numeric annotations can't be negative. */
export function voteToEntity(targetKey: EntityKey, dir: VoteDir, createdAt: number): EntityDraft {
  return { attributes: { ...common("vote", createdAt), targetKey: targetKey.toLowerCase(), dir } };
}

export function entityToComment(e: RawEntity): Comment {
  const a = e.attributes;
  return {
    key: e.key,
    kind: "comment",
    postKey: str(a, "postKey") as EntityKey,
    parentKey: a.parentKey ? (str(a, "parentKey") as EntityKey) : undefined,
    body: typeof e.payload?.body === "string" ? e.payload.body : "",
    createdAt: num(a, "createdAt"),
    expiresAt: e.expiresAt,
    owner: e.owner,
  };
}

export function entityToVote(e: RawEntity): Vote {
  const dir = str(e.attributes, "dir");
  return {
    key: e.key,
    kind: "vote",
    targetKey: str(e.attributes, "targetKey") as EntityKey,
    dir: dir === "up" || dir === "down" ? dir : "none",
    createdAt: num(e.attributes, "createdAt"),
    expiresAt: e.expiresAt,
    owner: e.owner,
  };
}

/** Attributes exactly as stored, for any post (on-chain panel). */
export function postAttributes(p: SalaryEntry | Review): Attributes {
  return p.kind === "salary" ? salaryToEntity(p, p.createdAt).attributes : reviewToEntity(p, p.createdAt).attributes;
}
