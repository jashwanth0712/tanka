"use client";

import { ShieldAlert, ShieldCheck, Star } from "lucide-react";
import * as React from "react";
import { Input, NativeSelect } from "@/components/ui/primitives";
import { COMPANIES, companyName, isDemoCompany, linkedInCompanyUrl, parseLinkedInCompany } from "@/lib/catalog";
import { formatINR, formatINRCompact } from "@/lib/format";
import { PII_LABEL, scanPII } from "@/lib/pii";
import { parseINR } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-danger">
      {message}
    </p>
  );
}

/** ₹ input accepting "1850000", "18,50,000", "18.5 L", "1.2 Cr" with a live preview. */
export function MoneyInput({
  id,
  value,
  onChange,
  invalid,
  describedBy,
  placeholder = "e.g. 18.5 L or 18,50,000",
}: {
  id: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
}) {
  const [text, setText] = React.useState(value != null ? String(value) : "");
  const parsed = parseINR(text);
  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden>
          ₹
        </span>
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="pl-7 tabular"
          onChange={(e) => {
            setText(e.target.value);
            const n = parseINR(e.target.value);
            onChange(Number.isFinite(n) ? n : undefined);
          }}
        />
      </div>
      <p className="mt-1.5 min-h-5 text-sm text-muted" aria-live="polite">
        {text && Number.isFinite(parsed) ? (
          <>
            <span className="font-display text-base font-medium text-text">{formatINRCompact(parsed)}</span>
            <span className="tabular"> · {formatINR(parsed)} per year</span>
          </>
        ) : text ? (
          "Type a number like 1850000 or 18.5 L"
        ) : null}
      </p>
    </div>
  );
}

export function StarRating({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value?: number;
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void;
  error?: string;
}) {
  const id = React.useId();
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span id={id} className="text-sm font-medium">
          {label}
        </span>
        <div role="radiogroup" aria-labelledby={id} className="flex">
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => onChange(n)}
              className="grid size-11 place-items-center rounded-md transition-transform hover:scale-110 cursor-pointer"
            >
              <Star
                className={cn("size-6", value != null && n <= value ? "fill-star text-star" : "text-border")}
                aria-hidden
              />
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-right text-sm text-danger">{error}</p>}
    </div>
  );
}

/** Live PII highlight under a comment box. */
export function PIIScanner({ text }: { text: string }) {
  const res = React.useMemo(() => scanPII(text), [text]);
  if (!text) return null;
  if (res.ok) {
    return (
      <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-trust-high">
        <ShieldCheck className="size-4" aria-hidden /> No personal details detected
      </p>
    );
  }
  const parts: React.ReactNode[] = [];
  let i = 0;
  res.matches.forEach((m, n) => {
    if (m.start > i) parts.push(text.slice(i, m.start));
    parts.push(
      <mark key={n} className="rounded bg-danger/20 px-0.5 text-danger" title={PII_LABEL[m.type]}>
        {text.slice(m.start, m.end)}
      </mark>,
    );
    i = m.end;
  });
  if (i < text.length) parts.push(text.slice(i));
  const kinds = [...new Set(res.matches.map((m) => PII_LABEL[m.type]))];
  return (
    <div role="alert" className="mt-2 rounded-[10px] border border-danger/40 bg-danger/5 p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium text-danger">
        <ShieldAlert className="size-4" aria-hidden /> Remove personal details to continue
      </p>
      <p className="mt-1 text-xs text-muted">Found: {kinds.join(", ")}</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm">{parts}</p>
    </div>
  );
}

/**
 * Company = a LinkedIn company page link (`linkedin.com/company/<name>`), parsed in the browser.
 * Nothing is fetched from LinkedIn and no personal profile is involved; the demo companies are shortcuts.
 */
export function CompanyPicker({
  id = "f-company",
  value,
  onChange,
  invalid,
  describedBy,
}: {
  id?: string;
  value: string | undefined;
  onChange: (slug: string) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [text, setText] = React.useState(value && !isDemoCompany(value) ? linkedInCompanyUrl(value) : "");
  const parsed = text ? parseLinkedInCompany(text) : null;
  return (
    <div className="flex flex-col gap-2">
      <Input
        id={id}
        type="url"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        value={text}
        placeholder="https://www.linkedin.com/company/your-company"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseLinkedInCompany(e.target.value) ?? "");
        }}
      />
      <p className="min-h-5 text-sm text-muted" aria-live="polite">
        {text && parsed ? (
          <>
            <ShieldCheck className="mr-1 inline size-4 text-accent-ink" aria-hidden />
            Posting in <span className="font-medium text-text">c/{parsed}</span> · {companyName(parsed)}
          </>
        ) : text ? (
          "That doesn't look like a company page. Open the company on LinkedIn and copy the link."
        ) : (
          "Open the company on LinkedIn and paste its page link. We read only the company name from it."
        )}
      </p>
      <NativeSelect
        aria-label="Or choose a demo company"
        value={value && isDemoCompany(value) ? value : ""}
        onChange={(e) => {
          setText("");
          onChange(e.target.value);
        }}
      >
        <option value="">Or choose a demo company…</option>
        {COMPANIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
