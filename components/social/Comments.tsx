"use client";

import { Loader2, MessageSquare } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { TimeAgo } from "@/components/common";
import { PIIScanner } from "@/components/submit/fields";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/primitives";
import { useCreateComment } from "@/hooks/social";
import { useNow } from "@/hooks/useNow";
import { COMMENT_MAX_LEN } from "@/lib/constants";
import type { Address, EntityKey } from "@/lib/data/types";
import { scanPII } from "@/lib/pii";
import { buildCommentTree, tallyFor, type CommentNode, type Tally } from "@/lib/social";
import { cn } from "@/lib/utils";
import type { Comment } from "@/lib/data/types";
import { Handle } from "./identity";
import { VoteControl } from "./VoteControl";

export function CommentComposer({
  postKey,
  parentKey,
  autoFocus,
  onDone,
  placeholder = "Add to the discussion — anonymously.",
}: {
  postKey: EntityKey;
  parentKey?: EntityKey;
  autoFocus?: boolean;
  onDone?: () => void;
  placeholder?: string;
}) {
  const [text, setText] = React.useState("");
  const create = useCreateComment();
  const id = React.useId();
  const clean = scanPII(text).ok;
  const ok = text.trim().length > 0 && text.length <= COMMENT_MAX_LEN && clean;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!ok) return;
        try {
          await create.mutateAsync({ postKey, parentKey, body: text.trim() });
          setText("");
          toast.success("Comment written to Arkiv");
          onDone?.();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Couldn't post comment");
        }
      }}
    >
      <label htmlFor={id} className="sr-only">{parentKey ? "Reply" : "Comment"}</label>
      <Textarea
        id={id}
        value={text}
        autoFocus={autoFocus}
        maxLength={COMMENT_MAX_LEN}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className={cn(parentKey ? "min-h-20" : "min-h-24")}
      />
      <PIIScanner text={text} />
      <div className="flex items-center justify-between gap-2">
        <span className={cn("tabular text-xs", text.length > COMMENT_MAX_LEN - 40 ? "text-trust-low" : "text-muted")}>
          {text.length}/{COMMENT_MAX_LEN}
        </span>
        <div className="flex gap-2">
          {onDone && (
            <Button type="button" variant="ghost" size="sm" onClick={onDone}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={!ok || create.isPending}>
            {create.isPending && <Loader2 className="animate-spin" />}
            {create.isPending ? "Writing…" : parentKey ? "Reply" : "Comment"}
          </Button>
        </div>
      </div>
    </form>
  );
}

const MAX_DEPTH = 5;

function CommentItem({
  node,
  depth,
  postKey,
  opAddress,
  tallies,
  now,
  hidden,
}: {
  node: CommentNode;
  depth: number;
  postKey: EntityKey;
  opAddress: Address;
  tallies: Map<string, Tally>;
  now: number;
  hidden: Set<string>;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [replying, setReplying] = React.useState(false);
  const c = node.comment;
  const isHidden = hidden.has(c.owner.toLowerCase());
  return (
    <li className="relative">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand thread" : "Collapse thread"}
          className="group flex w-5 shrink-0 flex-col items-center pt-1 cursor-pointer"
        >
          <span className="text-[11px] leading-none text-muted group-hover:text-text">{collapsed ? "+" : "−"}</span>
          {!collapsed && <span className="mt-1 w-px flex-1 bg-border group-hover:bg-accent" />}
        </button>
        <div className="min-w-0 flex-1 pb-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <Handle address={c.owner} op={c.owner.toLowerCase() === opAddress.toLowerCase()} />
            <span aria-hidden>·</span>
            <TimeAgo ts={c.createdAt} now={now} />
            {collapsed && node.descendants > 0 && <span>({node.descendants} more)</span>}
          </div>
          {!collapsed && (
            <>
              {isHidden ? (
                <p className="mt-1 text-sm italic text-muted">Hidden — from a wallet flagged for a posting burst.</p>
              ) : (
                <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{c.body}</p>
              )}
              <div className="mt-1 flex items-center gap-1">
                <VoteControl targetKey={c.key} tally={tallyFor(tallies, c.key)} size="sm" />
                <button
                  type="button"
                  onClick={() => setReplying((r) => !r)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-text cursor-pointer"
                >
                  <MessageSquare className="size-3.5" aria-hidden /> Reply
                </button>
              </div>
              {replying && (
                <div className="mt-2">
                  <CommentComposer postKey={postKey} parentKey={c.key} autoFocus onDone={() => setReplying(false)} placeholder="Write a reply…" />
                </div>
              )}
              {node.children.length > 0 && (
                <ul className={cn("mt-2", depth >= MAX_DEPTH && "-ml-7")}>
                  {node.children.map((child) => (
                    <CommentItem
                      key={child.comment.key}
                      node={child}
                      depth={depth + 1}
                      postKey={postKey}
                      opAddress={opAddress}
                      tallies={tallies}
                      now={now}
                      hidden={hidden}
                    />
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
}

export function CommentThread({
  postKey,
  opAddress,
  comments,
  tallies,
  hiddenWallets,
}: {
  postKey: EntityKey;
  opAddress: Address;
  comments: Comment[];
  tallies: Map<string, Tally>;
  hiddenWallets: Set<string>;
}) {
  const [sort, setSort] = React.useState<"top" | "new">("top");
  const now = useNow();
  const tree = React.useMemo(() => buildCommentTree(comments, sort, tallies), [comments, sort, tallies]);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">
          {comments.length} comment{comments.length === 1 ? "" : "s"}
        </h2>
        <label className="flex items-center gap-2 text-xs text-muted">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "top" | "new")}
            className="h-9 rounded-full border border-border bg-surface px-3 text-xs font-semibold text-text cursor-pointer"
          >
            <option value="top">Top</option>
            <option value="new">New</option>
          </select>
        </label>
      </div>
      {tree.length === 0 ? (
        <p className="text-sm text-muted">No comments yet. Start the discussion.</p>
      ) : (
        <ul>
          {tree.map((n) => (
            <CommentItem key={n.comment.key} node={n} depth={0} postKey={postKey} opAddress={opAddress} tallies={tallies} now={now} hidden={hiddenWallets} />
          ))}
        </ul>
      )}
    </div>
  );
}
