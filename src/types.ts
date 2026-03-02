export interface StoryEntry {
  id: string;
  title: string;
  name: string;
}

export interface SnapshotRecord extends StoryEntry {
  fileName: string;
  status: "ok" | "failed";
  error?: string;
}

export interface SnapshotManifest {
  storybookUrl: string;
  createdAt: string;
  viewport: {
    width: number;
    height: number;
  };
  stories: SnapshotRecord[];
}

export interface CaptureOptions {
  storybookUrl: string;
  outputDir: string;
  browser: "chromium" | "firefox" | "webkit";
  width: number;
  height: number;
  headless: boolean;
  fullPage: boolean;
  targetSelector: string;
  storyIds?: string[];
}

export type DiffStatus =
  | "changed"
  | "unchanged"
  | "missing_baseline"
  | "missing_current"
  | "dimension_mismatch"
  | "error";

export interface CompareEntry {
  key: string;
  storyId?: string;
  title?: string;
  name?: string;
  status: DiffStatus;
  notes?: string;
  mismatchPixels?: number;
  mismatchRatio?: number;
  baselineImage?: string;
  currentImage?: string;
  diffImage?: string;
  width?: number;
  height?: number;
}

export interface CompareSummary {
  total: number;
  changed: number;
  unchanged: number;
  missingBaseline: number;
  missingCurrent: number;
  dimensionMismatch: number;
  errors: number;
}

export interface CompareReportData {
  generatedAt: string;
  baselineDir: string;
  currentDir: string;
  diffRatioThreshold: number;
  pixelThreshold: number;
  summary: CompareSummary;
  entries: CompareEntry[];
}

export interface CompareOptions {
  baselineDir: string;
  currentDir: string;
  reportDir: string;
  diffRatioThreshold: number;
  pixelThreshold: number;
}

export interface ReportServerOptions {
  reportDir: string;
  port: number;
}
