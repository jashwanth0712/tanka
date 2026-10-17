const LAKH = 100_000;
const CRORE = 10_000_000;

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

/** ₹18,50,000 */
export function formatINR(n: number): string {
  return `₹${inr.format(Math.round(n))}`;
}

/** ₹18.5 L / ₹1.2 Cr / ₹85,000 */
export function formatINRCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= CRORE) return `${sign}₹${oneDecimal.format(abs / CRORE)} Cr`;
  if (abs >= LAKH) return `${sign}₹${oneDecimal.format(abs / LAKH)} L`;
  return `${sign}₹${inr.format(Math.round(abs))}`;
}

/** 0x12ab…9f3c */
export function truncateAddress(addr: string, head = 4, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= 2 + head + tail + 1) return addr;
  return `${addr.slice(0, 2 + head)}…${addr.slice(-tail)}`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** "3 days ago" / "in 2 months" */
export function relativeTime(ts: number, now: number = Date.now()): string {
  const diff = ts - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < MINUTE) return "just now";
  if (abs < HOUR) return rtf.format(Math.round(diff / MINUTE), "minute");
  if (abs < DAY) return rtf.format(Math.round(diff / HOUR), "hour");
  if (abs < 30 * DAY) return rtf.format(Math.round(diff / DAY), "day");
  if (abs < 365 * DAY) return rtf.format(Math.round(diff / (30 * DAY)), "month");
  return rtf.format(Math.round(diff / (365 * DAY)), "year");
}

/** Whole days until `ts` (negative when past). */
export function daysUntil(ts: number, now: number = Date.now()): number {
  return Math.floor((ts - now) / DAY);
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNumber(n: number): string {
  return inr.format(n);
}
