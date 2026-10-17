// Arkiv query strings. Shared by the mock and Arkiv data sources so the "Show query" UI always
// shows the exact string that produced the results.
//
// Syntax (TODO(arkiv): confirm against the SDK):  attr = "string"  |  attr >= 123  |  a && b  |  (a || b)
// Meta attributes: $key, $owner.

import { PROJECT_TAG } from "../constants";
import type { Address, CompanyId, EntityKey, SalaryFilters } from "./types";

export type EntityType = "salary" | "review" | "confirmation" | "comment" | "vote";

const str = (v: string) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

const base = (type: EntityType) => `project = ${str(PROJECT_TAG)} && type = ${str(type)}`;

const anyOf = (attr: string, values?: string[]) => {
  if (!values || values.length === 0) return null;
  if (values.length === 1) return `${attr} = ${str(values[0])}`;
  return `(${values.map((v) => `${attr} = ${str(v)}`).join(" || ")})`;
};

export function salariesQuery(f: SalaryFilters = {}): string {
  const parts = [
    base("salary"),
    anyOf("company", f.companies),
    anyOf("role", f.roles),
    anyOf("level", f.levels),
    anyOf("city", f.cities),
    f.yoeMin != null ? `yoe >= ${f.yoeMin}` : null,
    f.yoeMax != null ? `yoe <= ${f.yoeMax}` : null,
    f.ctcMin != null ? `ctc >= ${f.ctcMin}` : null,
    f.ctcMax != null ? `ctc <= ${f.ctcMax}` : null,
  ];
  return parts.filter(Boolean).join(" && ");
}

export const allOfTypeQuery = (type: EntityType) => base(type);
export const entityQuery = (key: EntityKey) => `$key = ${key}`;
export const reviewsQuery = (company?: CompanyId) =>
  company ? `${base("review")} && company = ${str(company)}` : base("review");
export const commentsQuery = (postKey?: EntityKey) =>
  postKey ? `${base("comment")} && postKey = ${str(postKey.toLowerCase())}` : base("comment");
export function votesQuery(targetKeys?: EntityKey[]): string {
  if (!targetKeys || targetKeys.length > CONFIRMATIONS_OR_LIMIT) return base("vote");
  return `${base("vote")} && ${anyOf("targetKey", targetKeys.map((k) => k.toLowerCase())) ?? "targetKey = \"\""}`;
}
export const confirmationsQuery = (entryKey: EntityKey) =>
  `${base("confirmation")} && entryKey = ${str(entryKey)}`;
export const walletQuery = (owner: Address) => `project = ${str(PROJECT_TAG)} && $owner = ${owner}`;

/** For many keys the OR-list gets long; above this we fetch all confirmations and filter client-side. */
export const CONFIRMATIONS_OR_LIMIT = 20;
export function confirmationsForQuery(keys: EntityKey[]): string {
  if (keys.length > CONFIRMATIONS_OR_LIMIT) return base("confirmation");
  return `${base("confirmation")} && ${anyOf("entryKey", keys) ?? "entryKey = \"\""}`;
}

export const recentQuery = (sinceMs: number) => `${base("salary")} && createdAt >= ${sinceMs}`;

/** Presets for the /verify playground. */
export const QUERY_PRESETS: { label: string; query: () => string }[] = [
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
