"use client";

import { ArrowLeft, Banknote, Check, EyeOff, Hourglass, KeyRound, Loader2, MessageSquareText, Plus, ShieldCheck, Wallet } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { Mono } from "@/components/common";
import { Receipt } from "@/components/entry";
import { ReviewDetails, SalaryDetails } from "@/components/submit/forms";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { useCreateReview, useCreateSalary } from "@/hooks/queries";
import { cityLabel, companyName, levelLabel, roleLabel } from "@/lib/catalog";
import type { WriteReceipt } from "@/lib/data/types";
import { STORED_FIELDS } from "@/lib/data/schema";
import { formatINRCompact } from "@/lib/format";
import { reviewSchema, salarySchema, type ReviewForm, type SalaryForm } from "@/lib/schemas";
import { rememberMyPost } from "@/lib/myPosts";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/wallet/useWallet";

type Kind = "salary" | "review";
type Step = 1 | 2 | 3 | 4;
const STEPS = ["Type", "Details", "Privacy & post"];
const PENDING = ["Signing…", "Writing to Arkiv…", "Confirming…"];

function Stepper({ step }: { step: Step }) {
  const current = Math.min(step, 3);
  return (
    <div className="mb-8">
      <div
        className="h-1.5 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-label="Progress"
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={current}
      >
        <motion.div className="h-full bg-gradient-primary" animate={{ width: `${step === 4 ? 100 : (current / 3) * 100}%` }} transition={{ duration: 0.3 }} />
      </div>
      <ol className="mt-3 grid grid-cols-3 gap-2 text-xs sm:text-sm">
        {STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={current === i + 1 ? "step" : undefined}
            className={cn("flex items-center gap-1.5", i + 1 <= current ? "font-medium text-text" : "text-muted", i === 2 && "justify-end text-right", i === 1 && "justify-center")}
          >
            <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border text-[11px]", i + 1 < current || step === 4 ? "border-transparent bg-gradient-primary text-accent-fg" : i + 1 === current ? "border-accent text-accent-ink" : "border-border")}>
              {i + 1 < current || step === 4 ? <Check className="size-3" /> : i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

function TypeStep({ onPick }: { onPick: (k: Kind) => void }) {
  const opts = [
    { k: "salary" as const, Icon: Banknote, title: "Salary", body: "Company, role, level, city, experience and annual CTC. Takes a minute." },
    { k: "review" as const, Icon: MessageSquareText, title: "Review", body: "Rate work-life balance, management, growth and culture. Short comment optional." },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {opts.map(({ k, Icon, title, body }) => (
        <button
          key={k}
          type="button"
          onClick={() => onPick(k)}
          className="glass group flex flex-col items-start gap-3 rounded-[18px] p-6 text-left transition-[border-color,transform] hover:-translate-y-0.5 hover:border-accent/50 cursor-pointer"
        >
          <span className="grid size-12 place-items-center rounded-[14px] bg-gradient-primary text-accent-fg glow">
            <Icon className="size-6" aria-hidden />
          </span>
          <span className="font-display text-2xl font-semibold">{title}</span>
          <span className="text-sm text-muted">{body}</span>
        </button>
      ))}
    </div>
  );
}

function WalletChoice({ value, onChange }: { value: "fresh" | "connected"; onChange: (v: "fresh" | "connected") => void }) {
  const opts = [
    { v: "fresh" as const, Icon: KeyRound, title: "Post with a fresh wallet", tag: "Recommended", body: "A brand-new address just for this post. Nothing links it to you or your other posts." },
    { v: "connected" as const, Icon: Wallet, title: "Use connected wallet", body: "Your existing wallet. Builds history (and trust) across posts — but they're linkable." },
  ];
  return (
    <div role="radiogroup" aria-label="Wallet" className="grid gap-3">
      {opts.map(({ v, Icon, title, tag, body }) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "glass flex items-start gap-3 rounded-[18px] p-4 text-left transition-colors cursor-pointer",
            value === v ? "border-accent bg-accent/5" : "border-border hover:border-muted/60",
          )}
        >
          <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2", value === v ? "border-accent" : "border-border")}>
            {value === v && <span className="size-2.5 rounded-full bg-gradient-primary" />}
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2 font-medium">
              <Icon className="size-4" aria-hidden /> {title}
              {tag && <span className="rounded-full bg-trust-high/15 px-2 py-0.5 text-[11px] font-medium text-trust-high">{tag}</span>}
            </span>
            <span className="mt-1 block text-sm text-muted">{body}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function Summary({ kind, salary, review }: { kind: Kind; salary?: SalaryForm; review?: ReviewForm }) {
  if (kind === "salary" && salary) {
    return (
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-medium">{companyName(salary.company)}</p>
          <p className="text-sm text-muted">
            {roleLabel(salary.role)} · {levelLabel(salary.level)} · {cityLabel(salary.city)} · {salary.yoe} yrs
          </p>
        </div>
        <p className="font-display text-3xl font-semibold">{formatINRCompact(salary.ctc)}</p>
      </div>
    );
  }
  if (review) {
    return (
      <div>
        <p className="font-medium">{companyName(review.company)}</p>
        <p className="tabular text-sm text-muted">
          WLB {review.wlb} · Mgmt {review.management} · Growth {review.growth} · Culture {review.culture}
        </p>
        {review.comment && <p className="mt-2 text-sm">“{review.comment}”</p>}
      </div>
    );
  }
  return null;
}

export default function SubmitPage() {
  const [step, setStep] = React.useState<Step>(1);
  const [kind, setKind] = React.useState<Kind>("salary");
  const [salary, setSalary] = React.useState<SalaryForm>();
  const [review, setReview] = React.useState<ReviewForm>();
  const [walletChoice, setWalletChoice] = React.useState<"fresh" | "connected">("fresh");
  const [pending, setPending] = React.useState<number | null>(null);
  const [receipt, setReceipt] = React.useState<WriteReceipt>();
  const wallet = useWallet();
  const createSalary = useCreateSalary();
  const createReview = useCreateReview();
  const topRef = React.useRef<HTMLDivElement>(null);

  const go = (s: Step) => {
    setStep(s);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const post = async () => {
    setPending(0);
    const ticker = setInterval(() => setPending((p) => (p == null ? p : Math.min(p + 1, PENDING.length - 1))), 700);
    try {
      if (walletChoice === "fresh") {
        if (!wallet.isFresh || !wallet.address) await wallet.useFreshWallet();
      } else if (!wallet.address || wallet.isFresh) {
        await wallet.connect();
      }
      // Re-validate right before writing — the same schema the form used.
      const r =
        kind === "salary"
          ? await createSalary.mutateAsync(salarySchema.parse(salary))
          : await createReview.mutateAsync(reviewSchema.parse(review));
      rememberMyPost(r.key);
      setReceipt(r);
      go(4);
      toast.success("Written to Arkiv");
      // A fresh wallet is single-use: drop it so the next post gets a new one.
      if (walletChoice === "fresh") wallet.disconnect();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't write to Arkiv");
    } finally {
      clearInterval(ticker);
      setPending(null);
    }
  };

  const reset = () => {
    setSalary(undefined);
    setReview(undefined);
    setReceipt(undefined);
    go(1);
  };

  return (
    <div ref={topRef} className="mx-auto max-w-2xl scroll-mt-20 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-6">
        <h1 className="text-4xl font-semibold sm:text-5xl">{step === 4 ? "Posted." : "Create a post"}</h1>
        <p className="mt-2 text-muted">No sign-up. No email. Just the number. It lands in the community feed for that company.</p>
      </header>
      <Stepper step={step} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {step === 1 && (
            <TypeStep
              onPick={(k) => {
                setKind(k);
                go(2);
              }}
            />
          )}

          {step === 2 && (
            <Card className="p-5 sm:p-8">
              <Button variant="ghost" size="sm" className="-ml-2 mb-4" onClick={() => go(1)}>
                <ArrowLeft /> {kind === "salary" ? "Salary" : "Review"}
              </Button>
              {kind === "salary" ? (
                <SalaryDetails defaults={salary} onNext={(v) => { setSalary(v); go(3); }} />
              ) : (
                <ReviewDetails defaults={review} onNext={(v) => { setReview(v); go(3); }} />
              )}
            </Card>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5">
              <Card className="p-5 sm:p-6">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-muted">You&apos;re posting</p>
                  <Button variant="link" size="sm" onClick={() => go(2)}>Edit</Button>
                </div>
                <Summary kind={kind} salary={salary} review={review} />
              </Card>

              <Card className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-medium"><ShieldCheck className="size-4 text-trust-high" aria-hidden /> What gets stored</p>
                  <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
                    {STORED_FIELDS[kind].map((f) => <li key={f}>· {f}</li>)}
                    <li>· the posting wallet address</li>
                  </ul>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-medium"><EyeOff className="size-4 text-accent-ink" aria-hidden /> What never gets stored</p>
                  <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
                    <li>· your name</li>
                    <li>· your email</li>
                    <li>· your IP address</li>
                    <li>· your device</li>
                  </ul>
                  {kind === "review" && (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-trust-high"><Check className="size-4" aria-hidden /> Comment passed the personal-details check</p>
                  )}
                </div>
              </Card>

              <div>
                <h2 className="mb-3 font-display text-xl font-semibold">Which wallet signs it?</h2>
                <WalletChoice value={walletChoice} onChange={setWalletChoice} />
                {wallet.address && walletChoice === "connected" && !wallet.isFresh && (
                  <p className="mt-2 text-sm text-muted">Connected: <Mono value={wallet.address} /></p>
                )}
              </div>

              <p className="flex items-start gap-2 rounded-[10px] border border-border bg-surface-2 p-3 text-sm text-muted">
                <Hourglass className="mt-0.5 size-4 shrink-0" aria-hidden />
                Your entry stays for ~18 months. Others can extend it by confirming.
              </p>

              <Button size="lg" onClick={post} disabled={pending != null} className="w-full">
                {pending != null ? (
                  <>
                    <Loader2 className="animate-spin" /> <span aria-live="polite">{PENDING[pending]}</span>
                  </>
                ) : (
                  <>Post to Arkiv</>
                )}
              </Button>
            </div>
          )}

          {step === 4 && receipt && (
            <div className="flex flex-col items-center gap-6">
              <Receipt receipt={receipt} kind={kind === "salary" ? "Salary entry" : "Review"} />
              <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
                <Button asChild className="flex-1">
                  <Link href={`/post/?key=${receipt.key}`}>View post</Link>
                </Button>
                <Button variant="secondary" className="flex-1" onClick={reset}>
                  <Plus /> Add another
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
