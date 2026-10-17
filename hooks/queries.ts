"use client";
// All React Query hooks. Components never touch the data source directly.

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { getDataSource } from "@/lib/data";
import type {
  Address,
  CompanyId,
  EntityKey,
  Review,
  ReviewInput,
  SalaryEntry,
  SalaryFilters,
  SalaryInput,
} from "@/lib/data/types";
import { computeTrustIndex } from "@/lib/trust";
import { useRpcUrl } from "./useRpc";

export const qk = {
  salaries: (f: SalaryFilters) => ["salaries", f] as const,
  allSalaries: ["salaries", "all"] as const,
  salary: (key: string) => ["salary", key] as const,
  reviews: (company: string) => ["reviews", company] as const,
  allReviews: ["reviews", "all"] as const,
  confirmations: (key: string) => ["confirmations", key] as const,
  allConfirmations: ["confirmations", "all"] as const,
  wallet: (owner: string) => ["wallet", owner] as const,
  recent: (limit: number) => ["recent", limit] as const,
  stats: ["stats"] as const,
  network: (rpc: string) => ["network", rpc] as const,
};

const ds = () => getDataSource();

export function useSalaries(f: SalaryFilters) {
  return useQuery({
    queryKey: qk.salaries(f),
    queryFn: () => ds().searchSalaries(f),
    placeholderData: keepPreviousData,
  });
}

/** Every live salary — the basis for trust scores and company aggregates. */
export function useAllSalaries() {
  return useQuery({
    queryKey: qk.allSalaries,
    queryFn: () => ds().searchSalaries({}),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useSalary(key: EntityKey | undefined) {
  return useQuery({
    queryKey: qk.salary(key ?? ""),
    queryFn: () => ds().getSalary(key!),
    enabled: !!key,
  });
}

export function useReviews(company: CompanyId | undefined) {
  return useQuery({
    queryKey: qk.reviews(company ?? ""),
    queryFn: () => ds().getReviews(company!),
    enabled: !!company,
  });
}

export function useConfirmations(entryKey: EntityKey | undefined) {
  return useQuery({
    queryKey: qk.confirmations(entryKey ?? ""),
    queryFn: () => ds().getConfirmations(entryKey!),
    enabled: !!entryKey,
  });
}

export function useWalletActivity(owner: Address | undefined) {
  return useQuery({
    queryKey: qk.wallet(owner ?? ""),
    queryFn: () => ds().getWalletActivity(owner!),
    enabled: !!owner,
  });
}

export function useRecent(limit = 8) {
  return useQuery({ queryKey: qk.recent(limit), queryFn: () => ds().getRecent(limit), refetchInterval: 10_000 });
}

export function useStats() {
  return useQuery({ queryKey: qk.stats, queryFn: () => ds().getStats(), refetchInterval: 10_000 });
}

export function useNetworkStatus(rpcOverride?: string) {
  const selected = useRpcUrl();
  const rpc = rpcOverride ?? selected;
  return useQuery({
    queryKey: qk.network(rpc),
    queryFn: () => ds().getNetworkStatus(rpc),
    refetchInterval: 5_000,
    retry: 0,
  });
}

/**
 * Trust scores for every live entry, computed client-side from Arkiv data only
 * (all salaries + all confirmations). Shared cache across pages.
 */
export function useTrustIndex() {
  const all = useAllSalaries();
  const keys = React.useMemo(() => (all.data?.data ?? []).map((s) => s.key), [all.data]);
  const confs = useQuery({
    queryKey: [...qk.allConfirmations, keys.length],
    queryFn: () => ds().getConfirmationsFor(keys),
    enabled: keys.length > 0,
    staleTime: 30_000,
  });
  const index = React.useMemo(() => {
    if (!all.data || !confs.data) return undefined;
    return computeTrustIndex(all.data.data, confs.data.data);
  }, [all.data, confs.data]);
  return {
    index,
    all: all.data?.data,
    confirmations: confs.data?.data,
    queries: { salaries: all.data?.query, confirmations: confs.data?.query },
    isLoading: all.isLoading || confs.isLoading,
    isError: all.isError || confs.isError,
    error: all.error ?? confs.error,
    refetch: () => {
      all.refetch();
      confs.refetch();
    },
  };
}

export function useTrust(key: EntityKey | undefined) {
  const t = useTrustIndex();
  return { ...t, trust: key ? t.index?.get(key) : undefined };
}

/** Company view: its salaries (from the shared "all" cache) + reviews. */
export function useCompany(company: CompanyId | undefined) {
  const t = useTrustIndex();
  const reviews = useReviews(company);
  const salaries = React.useMemo<SalaryEntry[]>(
    () => (t.all ?? []).filter((s) => s.company === company),
    [t.all, company],
  );
  return { ...t, salaries, reviews };
}

/* ── Writes ─────────────────────────────────────────────────────────── */

export function useCreateSalary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SalaryInput) => ds().createSalary(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salaries"] });
      qc.invalidateQueries({ queryKey: ["recent"] });
      qc.invalidateQueries({ queryKey: qk.stats });
    },
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewInput) => ds().createReview(input),
    onSuccess: (_r, input) => {
      qc.invalidateQueries({ queryKey: qk.reviews(input.company) });
      qc.invalidateQueries({ queryKey: qk.stats });
    },
  });
}

export function useConfirmEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryKey: EntityKey) => ds().confirmEntry(entryKey),
    onSuccess: (_r, entryKey) => {
      qc.invalidateQueries({ queryKey: qk.confirmations(entryKey) });
      qc.invalidateQueries({ queryKey: qk.salary(entryKey) });
      qc.invalidateQueries({ queryKey: ["confirmations"] });
      qc.invalidateQueries({ queryKey: ["salaries"] });
      qc.invalidateQueries({ queryKey: qk.stats });
    },
  });
}

/** Every live review, grouped by company. One Arkiv query. */
export function useAllReviews() {
  const q = useQuery({ queryKey: qk.allReviews, queryFn: () => ds().getReviews(), staleTime: 30_000, refetchInterval: 30_000 });
  const byCompany = React.useMemo(() => {
    const m = new Map<string, Review[]>();
    for (const r of q.data?.data ?? []) m.set(r.company, [...(m.get(r.company) ?? []), r]);
    return m;
  }, [q.data]);
  return { ...q, all: q.data?.data, byCompany };
}
