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
  browser?: string;
  status: string;
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

export interface StoryGroup {
  storyKey: string;
  label: string;
  entriesByBrowser: Record<string, ReportEntry | null>;
  browsers: string[];
  entries: ReportEntry[];
  hasChanged: boolean;
  hasAttention: boolean;
  isUnchanged: boolean;
  status: string;
  browserHealth: Array<{
    browser: string;
    entry: ReportEntry | null;
    hasCurrent: boolean;
  }>;
}

export interface CrossPairDiff {
  status: string;
  message: string;
  mismatchPixels: number | null;
  mismatchRatio: number | null;
  leftSrc: string;
  rightSrc: string;
  overlaySrc: string;
}

export interface CrossStorySignal {
  state: string;
  worstRatio: number | null;
}
