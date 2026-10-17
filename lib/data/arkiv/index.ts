// Arkiv-backed DataSource — OWNED BY THE ARKIV-LAYER TEAMMATE.
// This stub only exists so the app compiles with NEXT_PUBLIC_DATA_SOURCE=arkiv.
// Implementation guide: /BACKEND_INTEGRATION.md

import type { DataSource } from "../types";

const notReady = (method: string) => () =>
  Promise.reject(new Error(`Arkiv data source not implemented yet: ${method}()`));

export function createArkivDataSource(): DataSource {
  return {
    searchSalaries: notReady("searchSalaries"),
    getPost: notReady("getPost"),
    getReviews: notReady("getReviews"),
    getDiscussions: notReady("getDiscussions"),
    getComments: notReady("getComments"),
    getVotes: notReady("getVotes"),
    getConfirmations: notReady("getConfirmations"),
    getConfirmationsFor: notReady("getConfirmationsFor"),
    getStats: notReady("getStats"),
    getNetworkStatus: notReady("getNetworkStatus"),
    runRawQuery: notReady("runRawQuery"),
    createSalary: notReady("createSalary"),
    createReview: notReady("createReview"),
    createDiscussion: notReady("createDiscussion"),
    confirmEntry: notReady("confirmEntry"),
    createComment: notReady("createComment"),
    castVote: notReady("castVote"),
  };
}
