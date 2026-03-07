import type {
  BrowserId,
  BrowserPair,
  FilterId,
  ReportData,
  ReportEntry,
  ReportStatus,
} from "./types.js";

interface ReportFilter {
  id: FilterId;
  label: string;
  include: (entry: ReportEntry) => boolean;
}

export const emptyReport: ReportData = {
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

export const statusMap: Record<ReportStatus, string> = {
  changed: "changed",
  unchanged: "unchanged",
  missing_baseline: "missing baseline",
  missing_current: "missing current",
  dimension_mismatch: "dimension mismatch",
  error: "error",
};

export const filters: ReportFilter[] = [
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

export const browserOrder: BrowserId[] = ["chromium", "firefox", "webkit"];

export const browserLabel: Record<BrowserId, string> = {
  chromium: "Chromium",
  firefox: "Firefox",
  webkit: "WebKit",
};

export const attentionStatuses = new Set<string>([
  "missing_baseline",
  "missing_current",
  "dimension_mismatch",
  "error",
]);

export const browserPairs: BrowserPair[] = [
  { id: "cf", left: "chromium", right: "firefox" },
  { id: "cw", left: "chromium", right: "webkit" },
  { id: "fw", left: "firefox", right: "webkit" },
];
