"use client";
// Communities, derived from live Arkiv entities: the demo companies plus every company that has at least
// one discussion, package or review (including ones created by pasting a LinkedIn company page link).

import * as React from "react";
import { COMPANIES, resolveCompany, type Company } from "@/lib/catalog";
import { useAllReviews, useAllSalaries } from "./queries";
import { useAllDiscussions } from "./social";

export interface CommunityRow {
  company: Company;
  threads: number;
  packages: number;
  reviews: number;
  /** ms epoch of the newest post, 0 when empty. */
  lastActive: number;
}

export const activityOf = (r: CommunityRow) => r.threads * 3 + r.packages + r.reviews;

/** Lightweight on purpose (three list queries, no trust index): the sidebar and ⌘K use it on every page. */
export function useCommunities() {
  const threads = useAllDiscussions();
  const salaries = useAllSalaries();
  const reviews = useAllReviews();

  const rows = React.useMemo<CommunityRow[]>(() => {
    const m = new Map<string, CommunityRow>();
    const row = (id: string) => {
      let r = m.get(id);
      if (!r) {
        const company = resolveCompany(id);
        if (!company) return null;
        r = { company, threads: 0, packages: 0, reviews: 0, lastActive: 0 };
        m.set(id, r);
      }
      return r;
    };
    for (const c of COMPANIES) row(c.id);
    for (const d of threads.data?.data ?? []) {
      const r = row(d.company);
      if (r) { r.threads++; r.lastActive = Math.max(r.lastActive, d.createdAt); }
    }
    for (const s of salaries.data?.data ?? []) {
      const r = row(s.company);
      if (r) { r.packages++; r.lastActive = Math.max(r.lastActive, s.createdAt); }
    }
    for (const v of reviews.all ?? []) {
      const r = row(v.company);
      if (r) { r.reviews++; r.lastActive = Math.max(r.lastActive, v.createdAt); }
    }
    return [...m.values()].sort((a, b) => activityOf(b) - activityOf(a) || b.lastActive - a.lastActive || a.company.label.localeCompare(b.company.label));
  }, [threads.data, salaries.data, reviews.all]);

  return {
    rows,
    discussions: threads.data?.data,
    salaries: salaries.data?.data,
    isLoading: threads.isLoading || salaries.isLoading || reviews.isLoading,
    isError: threads.isError || salaries.isError || reviews.isError,
  };
}
