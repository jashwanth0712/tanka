export type PIIType = "email" | "phone" | "url" | "handle";

export interface PIIMatch {
  type: PIIType;
  start: number;
  end: number;
  value: string;
}

export interface PIIResult {
  ok: boolean;
  matches: PIIMatch[];
}

const PATTERNS: { type: PIIType; re: RegExp }[] = [
  { type: "email", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  // URLs with a scheme or www., or bare domains with a common TLD
  {
    type: "url",
    re: /\b(?:https?:\/\/|www\.)[^\s]+|\b[a-z0-9-]+\.(?:com|in|io|org|net|co|dev|app|me|xyz|ai)(?:\/[^\s]*)?\b/gi,
  },
  // Indian mobile: optional +91 / 91 / 0 prefix, 10 digits starting 6–9, spaces/dashes allowed
  {
    type: "phone",
    re: /(?<![\d])(?:\+?91[\s-]?|0)?[6-9](?:[\s-]?\d){9}(?![\d])/g,
  },
  // @handles (not part of an email — emails are matched first and overlaps are dropped)
  { type: "handle", re: /(?<![A-Za-z0-9._%+-])@[A-Za-z0-9_](?:[A-Za-z0-9_.]{1,29})/g },
];

/** Detect personal details that would make an anonymous post identifying. */
export function scanPII(text: string): PIIResult {
  const found: PIIMatch[] = [];
  for (const { type, re } of PATTERNS) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (found.some((f) => start < f.end && end > f.start)) continue; // drop overlaps
      found.push({ type, start, end, value: m[0] });
    }
  }
  found.sort((a, b) => a.start - b.start);
  return { ok: found.length === 0, matches: found };
}

export const PII_LABEL: Record<PIIType, string> = {
  email: "Email address",
  phone: "Phone number",
  url: "Link",
  handle: "@handle",
};
