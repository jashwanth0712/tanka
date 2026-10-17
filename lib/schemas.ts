// zod schemas — validate in the form AND right before writing to Arkiv.
import { z } from "zod";
import { isCity, isCompany, isLevel, isRole } from "./catalog";
import { COMMENT_MAX } from "./constants";
import { scanPII } from "./pii";

const catalog = (check: (s: string) => boolean, what: string) =>
  z.string({ error: `Pick a ${what}` }).refine(check, `Pick a ${what} from the list`);

export const salarySchema = z
  .object({
    company: catalog(isCompany, "company"),
    role: catalog(isRole, "role"),
    level: catalog(isLevel, "level"),
    city: catalog(isCity, "city"),
    yoe: z.number({ error: "Enter years of experience" }).int("Whole years only").min(0).max(45),
    ctc: z
      .number({ error: "Enter your annual CTC" })
      .int()
      .min(50_000, "That's below ₹50,000 a year — enter annual CTC")
      .max(200_000_000, "That's above ₹20 Cr — double-check the number"),
    baseSalary: z.number().int().min(0).optional(),
  })
  .refine((v) => v.baseSalary == null || v.baseSalary <= v.ctc, {
    path: ["baseSalary"],
    message: "Base can't be more than total CTC",
  });

const rating = z.literal([1, 2, 3, 4, 5], { error: "Tap a rating" });

export const reviewSchema = z.object({
  company: catalog(isCompany, "company"),
  wlb: rating,
  management: rating,
  growth: rating,
  culture: rating,
  comment: z
    .string()
    .max(COMMENT_MAX, `Keep it under ${COMMENT_MAX} characters`)
    .refine((t) => scanPII(t).ok, "Remove personal details to continue")
    .optional(),
});

export type SalaryForm = z.infer<typeof salarySchema>;
export type ReviewForm = z.infer<typeof reviewSchema>;

/** "18.5 L", "1.2cr", "18,50,000" → rupees. Returns NaN when unparseable. */
export function parseINR(input: string): number {
  const s = input.trim().toLowerCase().replace(/[₹,\s]/g, "");
  if (!s) return NaN;
  const m = /^(\d+(?:\.\d+)?)(l|lac|lakh|lakhs|cr|crore|crores|k)?$/.exec(s);
  if (!m) return NaN;
  const n = Number(m[1]);
  const unit = m[2];
  if (!unit) return Math.round(n);
  if (unit === "k") return Math.round(n * 1_000);
  if (unit.startsWith("l")) return Math.round(n * 100_000);
  return Math.round(n * 10_000_000);
}
