import { browserLabel } from "../constants";
import type { BrowserPair, ReportData, ReportEntry } from "../types";

export function readInlineReport(dataEl: HTMLElement | null): ReportData | null {
  try {
    return JSON.parse(dataEl?.textContent || "{}") as ReportData;
  } catch {
    return null;
  }
}

export function fmtPercent(value: number | null | undefined): string {
  if (typeof value !== "number") return "n/a";
  return (value * 100).toFixed(3) + "%";
}

export function normalizeSrc(src: string | null | undefined): string {
  if (!src) return "";
  if (/^[a-z]+:\/\//i.test(src) || src.startsWith("data:")) return src;
  return src.replace(/^\.\//, "");
}

export function entryLabel(entry: ReportEntry): string {
  return entry.title && entry.name
    ? entry.title + " / " + entry.name
    : entry.storyId || entry.snapshotKey || entry.key;
}

export function pairLabelText(pair: BrowserPair): string {
  return `${browserLabel[pair.left] || pair.left} <-> ${browserLabel[pair.right] || pair.right}`;
}
