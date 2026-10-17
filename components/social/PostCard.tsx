"use client";

import { Briefcase, Check, Flag, Loader2, MapPin, MessageSquare, Share2, Star } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { Money, TimeAgo } from "@/components/common";
import { LifeBar } from "@/components/entry/LifeBar";
import { TrustBadge } from "@/components/trust";
import { Card } from "@/components/ui/primitives";
import { useConfirmEntry } from "@/hooks/queries";
import { ensureIdentity } from "@/hooks/social";
import { useNow } from "@/hooks/useNow";
import { cityLabel, companyName, levelLabel, roleLabel } from "@/lib/catalog";
import { reviewAvg } from "@/lib/companyStats";
import type { Discussion, Post, Review, SalaryEntry } from "@/lib/data/types";
import { flairLabel } from "@/lib/constants";
import { formatINRCompact, formatYears } from "@/lib/format";
import type { Tally } from "@/lib/social";
import type { TrustResult } from "@/lib/trust";
import { isMyPost } from "@/lib/myPosts";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/wallet/useWallet";
import { CommunityIcon } from "./community";
import { Handle } from "./identity";
import { VoteControl } from "./VoteControl";

export const postHref = (key: string) => `/post/?key=${key}`;
export const communityHref = (company: string) => `/company/?name=${company}`;

const KIND_TAG: Record<Post["kind"], { label: string; cls: string }> = {
  discussion: { label: "Discussion", cls: "bg-accent/12 text-accent-ink ring-1 ring-accent/25" },
  salary: { label: "Package", cls: "bg-chain/12 text-chain ring-1 ring-chain/25" },
  review: { label: "Review", cls: "bg-accent-2/12 text-accent-ink ring-1 ring-accent-2/25" },
};

/** Topic chip for discussions. Links to the filtered community feed. */
export function FlairChip({ p }: { p: Discussion }) {
  return (
    <Link
      href={`/company/?name=${p.company}&flair=${p.flair}`}
      className="relative z-10 inline-flex h-6 items-center rounded-full bg-surface-2 px-2.5 text-[11px] font-medium text-text ring-1 ring-border hover:ring-accent/40"
    >
      {flairLabel(p.flair)}
    </Link>
  );
}

function DiscussionBody({ p, full, flagged }: { p: Discussion; full?: boolean; flagged?: boolean }) {
  return (
    <div className="flex flex-col gap-2.5">
      {p.body && (
        <p className={cn("whitespace-pre-wrap break-words text-[15px] leading-relaxed text-text/90", !full && "line-clamp-3")}>{p.body}</p>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <FlairChip p={p} />
        {p.city && (
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-surface-2 px-2.5 text-[11px] text-muted">
            <MapPin className="size-3" aria-hidden /> {cityLabel(p.city)} office
          </span>
        )}
      </div>
      {flagged && (
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-trust-low">
          <Flag className="size-3.5" aria-hidden /> From a wallet flagged for a posting burst
        </p>
      )}
    </div>
  );
}

function SalaryBody({ p, trust, big }: { p: SalaryEntry; trust?: TrustResult; big?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <p className={cn("whitespace-nowrap font-display font-medium leading-none tracking-tight", big ? "text-[clamp(2.125rem,10vw,3.5rem)]" : "text-[clamp(1.5rem,7vw,1.875rem)]")}>
          <span className="text-gradient">
            <Money value={p.ctc} />
          </span>
          <span className="ml-2 align-middle font-sans text-xs font-medium tracking-normal text-muted">/ yr</span>
        </p>
      </div>
      <ul className="flex flex-wrap gap-1.5 text-xs text-muted">
        <li className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1"><MapPin className="size-3" aria-hidden />{cityLabel(p.city)}</li>
        <li className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1"><Briefcase className="size-3" aria-hidden />{formatYears(p.yoe)} exp</li>
        {p.baseSalary != null && <li className="tabular rounded-full bg-surface-2 px-2.5 py-1">base {formatINRCompact(p.baseSalary)}</li>}
      </ul>
      <div className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-2">
        <TrustBadge trust={trust} size="sm" />
        <LifeBar expiresAt={p.expiresAt} size="xs" />
      </div>
    </div>
  );
}

const DIMS = [
  ["wlb", "WLB"],
  ["management", "Mgmt"],
  ["growth", "Growth"],
  ["culture", "Culture"],
] as const;

function ReviewBody({ p, flagged, full }: { p: Review; flagged?: boolean; full?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-1.5">
        {DIMS.map(([k, label]) => (
          <li key={k} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs">
            <span className="text-muted">{label}</span>
            <Star className="size-3 fill-star text-star" aria-hidden />
            <span className="tabular font-medium">{p[k]}</span>
          </li>
        ))}
      </ul>
      {p.comment && <p className={cn("text-[15px] leading-relaxed", !full && "line-clamp-4")}>{p.comment}</p>}
      {flagged && (
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-trust-low">
          <Flag className="size-3.5" aria-hidden /> From a wallet flagged for a posting burst
        </p>
      )}
    </div>
  );
}

function ConfirmPill({ p }: { p: SalaryEntry }) {
  const wallet = useWallet();
  const confirm = useConfirmEntry();
  const [done, setDone] = React.useState(false);
  const own = wallet.address?.toLowerCase() === p.owner.toLowerCase();
  if (own) return null;
  return (
    <button
      type="button"
      aria-label={done ? "Confirmed still accurate" : "Confirm this salary is still accurate"}
      disabled={confirm.isPending || done}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await ensureIdentity(wallet);
          await confirm.mutateAsync(p.key);
          setDone(true);
          toast.success("Confirmed on Arkiv — life bar refilled.");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Couldn't confirm");
        }
      }}
      className={cn(
        "relative z-10 inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors cursor-pointer disabled:cursor-default",
        done ? "text-trust-high" : "text-muted hover:bg-surface-2 hover:text-text",
      )}
    >
      {confirm.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
      <span className="hidden min-[400px]:inline">{done ? "Confirmed" : "Still accurate"}</span>
    </button>
  );
}

export function PostCard({
  post,
  trust,
  tally,
  comments,
  flagged,
  showCommunity = true,
  full,
  index = 0,
}: {
  post: Post;
  trust?: TrustResult;
  tally: Tally;
  comments: number;
  flagged?: boolean;
  showCommunity?: boolean;
  full?: boolean;
  index?: number;
}) {
  const now = useNow();
  const reduce = useReducedMotion();
  const href = postHref(post.key);
  const lowTrust = post.kind === "salary" ? trust?.band === "low" && !trust.isNew : flagged;
  const tag = KIND_TAG[post.kind];

  const Title = full ? "h1" : "h2";
  const body = (
    <Card className={cn("relative transition-[border-color,transform,box-shadow] duration-200", !full && "hover:-translate-y-0.5 hover:border-accent/35", lowTrust && "border-trust-low/40")}>
      <div className={cn("flex flex-col gap-3", full ? "p-5 sm:p-7" : "p-4 sm:p-5")}>
        <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          {showCommunity && (
            <Link href={communityHref(post.company)} className="relative z-10 inline-flex items-center gap-1.5 font-medium text-text hover:underline">
              <CommunityIcon company={post.company} size={20} />
              c/{post.company}
            </Link>
          )}
          {showCommunity && <span aria-hidden>·</span>}
          <Handle address={post.owner} />
          <span aria-hidden>·</span>
          <TimeAgo ts={post.createdAt} now={now} />
          {isMyPost(post.key) && (
            <span className="rounded-full bg-trust-high/12 px-2 py-0.5 text-[11px] font-medium text-trust-high" title="New posts start with low trust until others confirm them. You always see your own.">
              Your post · visible to you
            </span>
          )}
          <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium", tag.cls)}>{tag.label}</span>
        </header>

        <Title
          className={cn(
            "break-words font-sans font-medium tracking-normal",
            post.kind === "discussion" ? (full ? "text-xl leading-snug sm:text-2xl" : "text-base leading-snug sm:text-lg") : full ? "text-xl sm:text-2xl" : "text-base sm:text-lg",
          )}
        >
          {full ? (
            post.kind === "discussion" ? post.title : post.kind === "salary" ? `${roleLabel(post.role)} · ${levelLabel(post.level)} at ${companyName(post.company)}` : `Review of ${companyName(post.company)}`
          ) : (
            <Link href={href} className="after:absolute after:inset-0 after:content-['']">
              {post.kind === "discussion" ? post.title : post.kind === "salary" ? `${roleLabel(post.role)} · ${levelLabel(post.level)}` : `${reviewAvg(post).toFixed(1)}★ — ${companyName(post.company)}`}
            </Link>
          )}
        </Title>

        {post.kind === "discussion" ? (
          <DiscussionBody p={post} full={full} flagged={flagged} />
        ) : post.kind === "salary" ? (
          <SalaryBody p={post} trust={trust} big={full} />
        ) : (
          <ReviewBody p={post} flagged={flagged} full={full} />
        )}

        <footer className="-mb-1 flex flex-wrap items-center gap-1 pt-1">
          <VoteControl targetKey={post.key} tally={tally} size="sm" />
          <Link
            href={full ? "#comments" : `${href}#comments`}
            className="relative z-10 inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-muted hover:bg-surface-2 hover:text-text"
          >
            <MessageSquare className="size-4" aria-hidden />
            <span className="tabular">{comments}</span>
            <span className="hidden min-[400px]:inline">comment{comments === 1 ? "" : "s"}</span>
          </Link>
          {post.kind === "salary" && !full && <ConfirmPill p={post} />}
          <button
            type="button"
            aria-label="Copy link to post"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                await navigator.clipboard.writeText(new URL(href, window.location.origin).toString());
                toast.success("Link copied");
              } catch {
                toast.error("Couldn't copy link");
              }
            }}
            className="relative z-10 ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-muted hover:bg-surface-2 hover:text-text cursor-pointer"
          >
            <Share2 className="size-4" aria-hidden />
            <span className="hidden sm:inline">Share</span>
          </button>
        </footer>
      </div>
    </Card>
  );

  if (full) return body;
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 10) * 0.03, ease: [0.22, 1, 0.36, 1] }}
    >
      {body}
    </motion.li>
  );
}

export function PostSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <span className="size-5 animate-pulse rounded-full bg-surface-2" />
        <span className="h-3 w-40 animate-pulse rounded bg-surface-2" />
      </div>
      <div className="mt-4 h-5 w-64 animate-pulse rounded bg-surface-2" />
      <div className="mt-4 h-9 w-40 animate-pulse rounded bg-surface-2" />
      <div className="mt-5 flex gap-2">
        <span className="h-9 w-28 animate-pulse rounded-full bg-surface-2" />
        <span className="h-9 w-24 animate-pulse rounded-full bg-surface-2" />
      </div>
    </Card>
  );
}
