import { median } from "./aggregate";
import { K_ANONYMITY } from "./constants";
import type { CompanyId, Review, SalaryEntry } from "./data/types";
import type { TrustResult } from "./trust";

export interface CompanyStats {
  entries: number;
  medianCtc: number | null; // null under k-anonymity
  avgRating: number | null;
  reviewCount: number;
  highTrustPct: number | null;
  flaggedPct: number;
  /** Wallets that posted flagged (Unusual/Burst) entries for this company. */
  flaggedWallets: Set<string>;
}

export const isFlagged = (t?: TrustResult) => !!t && t.flags.length > 0;

export function reviewAvg(r: Review) {
  return (r.wlb + r.management + r.growth + r.culture) / 4;
}

export function companyStats(
  company: CompanyId,
  salaries: SalaryEntry[],
  trust: Map<string, TrustResult> | undefined,
  reviews: Review[] = [],
): CompanyStats {
  const mine = salaries.filter((s) => s.company === company);
  const flagged = mine.filter((s) => isFlagged(trust?.get(s.key)));
  const flaggedWallets = new Set(flagged.map((s) => s.owner.toLowerCase()));
  const clean = mine.filter((s) => trust?.get(s.key)?.band !== "low");
  const cleanReviews = reviews.filter((r) => !flaggedWallets.has(r.owner.toLowerCase()));
  const high = mine.filter((s) => trust?.get(s.key)?.band === "high").length;
  return {
    entries: mine.length,
    medianCtc: clean.length >= K_ANONYMITY ? median(clean.map((s) => s.ctc)) : null,
    avgRating: cleanReviews.length ? cleanReviews.reduce((a, r) => a + reviewAvg(r), 0) / cleanReviews.length : null,
    reviewCount: cleanReviews.length,
    highTrustPct: mine.length && trust ? Math.round((high / mine.length) * 100) : null,
    flaggedPct: mine.length ? flagged.length / mine.length : 0,
    flaggedWallets,
  };
}

/** Company flag banner threshold (CLAUDE.md §5.4). */
export const FLAG_THRESHOLD = 0.3;
