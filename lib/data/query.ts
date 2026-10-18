// Arkiv query strings, built with the SDK's own combinators so they are always valid Arkiv syntax.
// Shared by the mock and Arkiv data sources so the "Show query" UI always shows the exact string
// that produced the results.
//
// Syntax (verified against @arkiv-network/sdk 0.8):  attr = str('x')  |  attr >= i32(123)  |
//   key attrs: post_key = key(0x…)  |  a AND b  |  (a OR b).  System attrs: $key, $owner.

import { i32, key, str } from "@arkiv-network/sdk/attr";
import { and, eq, gte, lte, or, type Expression } from "@arkiv-network/sdk/query";
import { PROJECT_TAG } from "../constants";
import { KEY_ATTRS } from "./schema";
import type { CompanyId, EntityKey, SalaryFilters } from "./types";

export type EntityType = "salary" | "review" | "confirmation" | "comment" | "vote" | "discussion";

const base = (type: EntityType): Expression[] => [eq("project", str(PROJECT_TAG)), eq("type", str(type))];

const lit = (attr: string, v: string) =>
  KEY_ATTRS.has(attr) ? eq(attr, key(v.toLowerCase() as `0x${string}`)) : eq(attr, str(v));

const anyOf = (attr: string, values?: string[]): Expression | null =>
  values && values.length > 0 ? or(values.map((v) => lit(attr, v))) : null;

const render = (parts: (Expression | null)[]) => and(parts.filter((p): p is Expression => p !== null)).toString();

export function salariesQuery(f: SalaryFilters = {}): string {
  return render([
    ...base("salary"),
    anyOf("company", f.companies),
    anyOf("role", f.roles),
    anyOf("level", f.levels),
    anyOf("city", f.cities),
    f.yoeMin != null ? gte("yoe", i32(f.yoeMin)) : null,
    f.yoeMax != null ? lte("yoe", i32(f.yoeMax)) : null,
    f.ctcMin != null ? gte("ctc", i32(f.ctcMin)) : null,
    f.ctcMax != null ? lte("ctc", i32(f.ctcMax)) : null,
  ]);
}

export const allOfTypeQuery = (type: EntityType) => render(base(type));
export const entityQuery = (k: EntityKey) => eq("$key", key(k.toLowerCase() as `0x${string}`)).toString();
export const reviewsQuery = (company?: CompanyId) =>
  render([...base("review"), company ? lit("company", company) : null]);
export const discussionsQuery = (company?: CompanyId) =>
  render([...base("discussion"), company ? lit("company", company) : null]);
export const commentsQuery = (postKey?: EntityKey) =>
  render([...base("comment"), postKey ? lit("post_key", postKey) : null]);

/** Matches nothing: the key attribute can never hold the zero hash. */
const NO_KEY = `0x${"0".repeat(64)}`;

export function votesQuery(targetKeys?: EntityKey[]): string {
  if (!targetKeys || targetKeys.length > CONFIRMATIONS_OR_LIMIT) return render(base("vote"));
  return render([...base("vote"), anyOf("target_key", targetKeys.length ? targetKeys : [NO_KEY])]);
}
export const confirmationsQuery = (entryKey: EntityKey) =>
  render([...base("confirmation"), lit("entry_key", entryKey)]);

/** For many keys the OR-list gets long; above this we fetch all confirmations and filter client-side. */
export const CONFIRMATIONS_OR_LIMIT = 20;
export function confirmationsForQuery(keys: EntityKey[]): string {
  if (keys.length > CONFIRMATIONS_OR_LIMIT) return render(base("confirmation"));
  return render([...base("confirmation"), anyOf("entry_key", keys.length ? keys : [NO_KEY])]);
}


/** Presets for the /verify playground. */
export const QUERY_PRESETS: { label: string; query: () => string }[] = [
  { label: "Godavari Labs discussions", query: () => discussionsQuery("godavari-labs") },
  { label: "Every layoffs thread", query: () => render([...base("discussion"), lit("flair", "layoffs")]) },
  {
    label: "All SDE-2 salaries in Hyderabad",
    query: () => salariesQuery({ levels: ["sde-2"], cities: ["hyderabad"] }),
  },
  { label: "Nimbus Infotech entries", query: () => salariesQuery({ companies: ["nimbus-infotech"] }) },
  { label: "Salaries above ₹50 L", query: () => salariesQuery({ ctcMin: 5_000_000 }) },
  { label: "All reviews of Kaveri Systems", query: () => reviewsQuery("kaveri-systems") },
  { label: "Every confirmation", query: () => allOfTypeQuery("confirmation") },
  { label: "Every comment", query: () => allOfTypeQuery("comment") },
];
