export const emptyReport = {
  summary: {
    total: 0,
    changed: 0,
    unchanged: 0,
    missingBaseline: 0,
    missingCurrent: 0,
    dimensionMismatch: 0,
    errors: 0,
  },
  entries: [],
};

export const statusMap = {
  changed: "changed",
  unchanged: "unchanged",
  missing_baseline: "missing baseline",
  missing_current: "missing current",
  dimension_mismatch: "dimension mismatch",
  error: "error",
};

export const filters = [
  { id: "all", label: "All", include: () => true },
  { id: "changed", label: "Changed", include: (entry) => entry.status === "changed" },
  { id: "unchanged", label: "Unchanged", include: (entry) => entry.status === "unchanged" },
  {
    id: "attention",
    label: "Attention",
    include: (entry) =>
      entry.status === "missing_baseline" ||
      entry.status === "missing_current" ||
      entry.status === "dimension_mismatch" ||
      entry.status === "error",
  },
];

export const browserOrder = ["chromium", "firefox", "webkit"];

export const browserLabel = {
  chromium: "Chromium",
  firefox: "Firefox",
  webkit: "WebKit",
};

export const attentionStatuses = new Set([
  "missing_baseline",
  "missing_current",
  "dimension_mismatch",
  "error",
]);

export const browserPairs = [
  { id: "cf", left: "chromium", right: "firefox" },
  { id: "cw", left: "chromium", right: "webkit" },
  { id: "fw", left: "firefox", right: "webkit" },
];
