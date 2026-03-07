export type ReportStatus =
  | "changed"
  | "unchanged"
  | "missing_baseline"
  | "missing_current"
  | "dimension_mismatch"
  | "error";

export type StoryStatus = "changed" | "unchanged" | "attention";

export type FilterId = "all" | "changed" | "unchanged" | "attention";

export type BrowserId =
  | "chromium"
  | "firefox"
  | "webkit"
  | "google-chrome"
  | "microsoft-edge";

export type CompareMode = "baseline_current" | "cross_browser";

export interface ReportSummary {
  total: number;
  changed: number;
  unchanged: number;
  missingBaseline: number;
  missingCurrent: number;
  dimensionMismatch: number;
  errors: number;
}

export interface ReportEntry {
  key: string;
  snapshotKey?: string;
  storyId?: string;
  title?: string;
  name?: string;
  browser?: BrowserId | string;
  status: ReportStatus | string;
  baselineImage?: string;
  currentImage?: string;
  diffImage?: string;
  mismatchPixels?: number | null;
  mismatchRatio?: number | null;
  width?: number;
  height?: number;
  notes?: string;
  [key: string]: unknown;
}

export interface ReportData {
  summary: ReportSummary;
  entries: ReportEntry[];
}

export interface BrowserHealth {
  browser: BrowserId;
  entry: ReportEntry | null;
  hasCurrent: boolean;
}

export interface StoryGroup {
  storyKey: string;
  label: string;
  entriesByBrowser: Partial<Record<BrowserId, ReportEntry>>;
  browsers: BrowserId[];
  entries: ReportEntry[];
  hasChanged: boolean;
  hasAttention: boolean;
  isUnchanged: boolean;
  status: StoryStatus;
  browserHealth: BrowserHealth[];
}

export type CrossPairDiffStatus = "ready" | "dimension_mismatch" | "no_data" | "error";

export interface CrossPairDiff {
  status: CrossPairDiffStatus;
  message: string;
  mismatchPixels: number | null;
  mismatchRatio: number | null;
  leftSrc: string;
  rightSrc: string;
  overlaySrc: string;
}

export type CrossStorySignalState = "loading" | "diff" | "size" | "same" | "na";

export interface CrossStorySignal {
  state: CrossStorySignalState;
  worstRatio: number | null;
}

export interface BrowserPair {
  id: string;
  left: BrowserId;
  right: BrowserId;
}

export interface StorySummary {
  total: number;
  changed: number;
  unchanged: number;
  attention: number;
}
