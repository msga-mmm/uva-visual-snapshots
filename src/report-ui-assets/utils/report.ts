import { browserLabel } from "../constants";

export function readInlineReport(dataEl) {
  try {
    return JSON.parse(dataEl?.textContent || "{}");
  } catch {
    return null;
  }
}

export function fmtPercent(value) {
  if (typeof value !== "number") return "n/a";
  return (value * 100).toFixed(3) + "%";
}

export function normalizeSrc(src) {
  if (!src) return "";
  if (/^[a-z]+:\/\//i.test(src) || src.startsWith("data:")) return src;
  return src.replace(/^\.\//, "");
}

export function entryLabel(entry) {
  return entry.title && entry.name
    ? entry.title + " / " + entry.name
    : entry.storyId || entry.snapshotKey || entry.key;
}

export function pairLabelText(pair) {
  return `${browserLabel[pair.left] || pair.left} <-> ${browserLabel[pair.right] || pair.right}`;
}
