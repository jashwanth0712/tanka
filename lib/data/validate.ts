// Input checks shared by write paths. The same rules the mock source enforces.

import { BODY_MAX, COMMENT_MAX, COMMENT_MAX_LEN, TITLE_MAX } from "../constants";
import { scanPII } from "../pii";
import type { DiscussionInput, ReviewInput } from "./types";

export function checkDiscussion(input: DiscussionInput): { title: string; body?: string } {
  const title = input.title.trim();
  const body = input.body?.trim() || undefined;
  if (title.length < 8) throw new Error("Give the thread a title of at least 8 characters.");
  if (title.length > TITLE_MAX) throw new Error(`Keep the title under ${TITLE_MAX} characters.`);
  if (body && body.length > BODY_MAX) throw new Error(`Keep the text under ${BODY_MAX} characters.`);
  if (!scanPII(title).ok || (body && !scanPII(body).ok)) throw new Error("Remove personal details to continue.");
  return { title, body };
}

export function checkComment(raw: string): string {
  const body = raw.trim();
  if (!body) throw new Error("Write something first.");
  if (body.length > COMMENT_MAX_LEN) throw new Error(`Keep it under ${COMMENT_MAX_LEN} characters.`);
  if (!scanPII(body).ok) throw new Error("Remove personal details to continue.");
  return body;
}

export function checkReview(input: ReviewInput): string | undefined {
  const comment = input.comment?.trim() || undefined;
  if (comment && comment.length > COMMENT_MAX) throw new Error(`Keep the comment under ${COMMENT_MAX} characters.`);
  if (comment && !scanPII(comment).ok) throw new Error("Remove personal details to continue.");
  return comment;
}
