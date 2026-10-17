// Arkiv-backed DataSource — OWNED BY THE ARKIV-LAYER TEAMMATE.
// This stub only exists so the app compiles with NEXT_PUBLIC_DATA_SOURCE=arkiv.
// Implementation guide: /BACKEND_INTEGRATION.md

import type { DataSource } from "../types";

const notReady = (method: string) => () =>
  Promise.reject(new Error(`Arkiv data source not implemented yet: ${method}()`));

export function createArkivDataSource(): DataSource {
  return {
    searchSalaries: notReady("searchSalaries"),
    getSalary: notReady("getSalary"),
    getPost: notReady("getPost"),
    getReviews: notReady("getReviews"),
    getComments: notReady("getComments"),
    getVotes: notReady("getVotes"),
    getConfirmations: notReady("getConfirmations"),
    getConfirmationsFor: notReady("getConfirmationsFor"),
    getWalletActivity: notReady("getWalletActivity"),
    getRecent: notReady("getRecent"),
    getStats: notReady("getStats"),
    getNetworkStatus: notReady("getNetworkStatus"),
    runRawQuery: notReady("runRawQuery"),
    createSalary: notReady("createSalary"),
    createReview: notReady("createReview"),
    confirmEntry: notReady("confirmEntry"),
    createComment: notReady("createComment"),
    castVote: notReady("castVote"),
  };
}
