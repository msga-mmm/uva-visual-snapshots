import React from "react";
import {
  attentionStatuses,
  browserLabel,
  browserOrder,
  browserPairs,
  emptyReport,
  filters,
  statusMap,
} from "../constants.js";
import { buildDiffOverlayBySrc, compareImagesBySrc } from "../utils/image-diff.js";
import { entryLabel, fmtPercent, normalizeSrc, pairLabelText } from "../utils/report.js";
import type {
  BrowserId,
  BrowserPair,
  CompareMode,
  CrossPairDiff,
  CrossStorySignal,
  FilterId,
  ReportData,
  ReportEntry,
  StoryGroup,
  StoryStatus,
  StorySummary,
} from "../types.js";

interface UseReportAppStateOptions {
  initialReport: ReportData;
  hasInlineReport: boolean;
}

type CrossPairDiffMap = Partial<Record<string, CrossPairDiff>>;
type CrossStorySignalMap = Record<string, CrossStorySignal>;
type FocusMaskCache = Record<string, string>;

function isBrowserId(value: string): value is BrowserId {
  return browserOrder.includes(value as BrowserId);
}

export function useReportAppState({ initialReport, hasInlineReport }: UseReportAppStateOptions) {
  const [report, setReport] = React.useState<ReportData>(initialReport);
  const [compareMode, setCompareMode] = React.useState<CompareMode>("baseline_current");
  const [activeFilter, setActiveFilter] = React.useState<FilterId>("all");
  const [selectedStoryKey, setSelectedStoryKey] = React.useState<string | null>(null);
  const [activeStoryBrowser, setActiveStoryBrowser] = React.useState<BrowserId | null>(null);
  const [crossPairDiffs, setCrossPairDiffs] = React.useState<CrossPairDiffMap>({});
  const [crossPairDiffsLoading, setCrossPairDiffsLoading] = React.useState(false);
  const [activeCrossPairId, setActiveCrossPairId] = React.useState(browserPairs[0].id);
  const [crossStorySignals, setCrossStorySignals] = React.useState<CrossStorySignalMap>({});
  const [showDiff, setShowDiff] = React.useState(true);
  const [focusDiff, setFocusDiff] = React.useState(false);
  const [zapDiff, setZapDiff] = React.useState(false);
  const [zapShowCurrent, setZapShowCurrent] = React.useState(false);
  const [focusMaskSrc, setFocusMaskSrc] = React.useState("");
  const focusMaskCacheRef = React.useRef<FocusMaskCache>({});

  React.useEffect(() => {
    if (hasInlineReport) {
      return;
    }

    let cancelled = false;
    fetch("/report-data.json", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : emptyReport))
      .then((nextReport) => {
        if (!cancelled) {
          setReport(nextReport || emptyReport);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReport(emptyReport);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasInlineReport]);

  const allEntries = React.useMemo(
    (): ReportEntry[] => (Array.isArray(report.entries) ? report.entries : []),
    [report],
  );

  const storyGroups = React.useMemo<StoryGroup[]>(() => {
    const byStory = new Map<string, Pick<StoryGroup, "storyKey" | "label" | "entriesByBrowser">>();
    for (const entry of allEntries) {
      const snapshotKey = entry.snapshotKey || entry.key;
      const browser: BrowserId =
        typeof entry.browser === "string" && isBrowserId(entry.browser)
          ? entry.browser
          : "chromium";
      const existing = byStory.get(snapshotKey);
      if (existing) {
        existing.entriesByBrowser[browser] = entry;
      } else {
        byStory.set(snapshotKey, {
          storyKey: snapshotKey,
          label: entryLabel(entry),
          entriesByBrowser: { [browser]: entry },
        });
      }
    }

    const stories = [...byStory.values()].map((story) => {
      const browsers = browserOrder.filter((browser: BrowserId) => story.entriesByBrowser[browser]);
      const entries = browsers
        .map((browser: BrowserId) => story.entriesByBrowser[browser])
        .filter((entry): entry is ReportEntry => Boolean(entry));
      const hasChanged = entries.some((entry: ReportEntry) => entry.status === "changed");
      const hasAttention = entries.some((entry: ReportEntry) =>
        attentionStatuses.has(entry.status),
      );
      const isUnchanged =
        entries.length > 0 && entries.every((entry: ReportEntry) => entry.status === "unchanged");
      const status: StoryStatus = hasChanged ? "changed" : hasAttention ? "attention" : "unchanged";
      const browserHealth = browserOrder.map((browser: BrowserId) => ({
        browser,
        entry: story.entriesByBrowser[browser] || null,
        hasCurrent: Boolean(story.entriesByBrowser[browser]?.currentImage),
      }));
      return {
        ...story,
        browsers,
        entries,
        hasChanged,
        hasAttention,
        isUnchanged,
        status,
        browserHealth,
      };
    });

    stories.sort((a, b) => a.label.localeCompare(b.label));
    return stories;
  }, [allEntries]);

  const visibleStories = React.useMemo<StoryGroup[]>(() => {
    const active = filters.find((item) => item.id === activeFilter) || filters[0];
    if (active.id === "all") return storyGroups;
    if (active.id === "changed") return storyGroups.filter((story: StoryGroup) => story.hasChanged);
    if (active.id === "unchanged") {
      return storyGroups.filter((story: StoryGroup) => story.isUnchanged);
    }
    return storyGroups.filter((story: StoryGroup) => story.hasAttention);
  }, [storyGroups, activeFilter]);

  React.useEffect(() => {
    if (visibleStories.length === 0) {
      setSelectedStoryKey(null);
      return;
    }
    if (!visibleStories.some((story: StoryGroup) => story.storyKey === selectedStoryKey)) {
      setSelectedStoryKey(visibleStories[0].storyKey);
    }
  }, [visibleStories, selectedStoryKey]);

  const selectedStory = React.useMemo<StoryGroup | null>(() => {
    if (selectedStoryKey) {
      const match = visibleStories.find((story: StoryGroup) => story.storyKey === selectedStoryKey);
      if (match) return match;
    }
    return visibleStories[0] || null;
  }, [selectedStoryKey, visibleStories]);

  React.useEffect(() => {
    if (!selectedStory || selectedStory.browsers.length === 0) {
      setActiveStoryBrowser(null);
      return;
    }
    if (!activeStoryBrowser || !selectedStory.browsers.includes(activeStoryBrowser)) {
      setActiveStoryBrowser(selectedStory.browsers[0]);
    }
  }, [selectedStory, activeStoryBrowser]);

  React.useEffect(() => {
    if (compareMode === "cross_browser") {
      setShowDiff(true);
      setFocusDiff(false);
      setZapDiff(false);
    }
  }, [compareMode]);

  const selectedEntry = React.useMemo<ReportEntry | null>(() => {
    if (!selectedStory) return null;
    if (activeStoryBrowser && selectedStory.entriesByBrowser[activeStoryBrowser]) {
      return selectedStory.entriesByBrowser[activeStoryBrowser] || null;
    }
    const fallbackBrowser = selectedStory.browsers[0];
    return fallbackBrowser ? selectedStory.entriesByBrowser[fallbackBrowser] || null : null;
  }, [selectedStory, activeStoryBrowser]);

  React.useEffect(() => {
    if (compareMode !== "cross_browser") {
      setCrossPairDiffs({});
      setCrossPairDiffsLoading(false);
      return;
    }

    let cancelled = false;
    setCrossPairDiffsLoading(true);

    async function buildSelectedStoryDiffs() {
      if (!selectedStory) {
        setCrossPairDiffs({});
        setCrossPairDiffsLoading(false);
        return;
      }

      const next: CrossPairDiffMap = {};
      for (const pair of browserPairs) {
        const leftSrc = selectedStory.entriesByBrowser[pair.left]?.currentImage;
        const rightSrc = selectedStory.entriesByBrowser[pair.right]?.currentImage;
        try {
          next[pair.id] = await buildDiffOverlayBySrc(leftSrc, rightSrc);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          next[pair.id] = {
            status: "error",
            message,
            mismatchPixels: null,
            mismatchRatio: null,
            leftSrc: normalizeSrc(leftSrc),
            rightSrc: normalizeSrc(rightSrc),
            overlaySrc: "",
          };
        }
      }

      if (!cancelled) {
        setCrossPairDiffs(next);
        setCrossPairDiffsLoading(false);
      }
    }

    void buildSelectedStoryDiffs();
    return () => {
      cancelled = true;
    };
  }, [compareMode, selectedStory]);

  React.useEffect(() => {
    if (compareMode !== "cross_browser") {
      setCrossStorySignals({});
      return;
    }

    let cancelled = false;
    const loading: CrossStorySignalMap = {};
    for (const story of visibleStories) {
      loading[story.storyKey] = { state: "loading", worstRatio: null };
    }
    setCrossStorySignals(loading);

    async function computeSignals() {
      const next: CrossStorySignalMap = {};
      for (const story of visibleStories) {
        let hasDiff = false;
        let comparableCount = 0;
        let hasDimensionMismatch = false;
        let worstRatio = 0;

        for (const pair of browserPairs) {
          const leftSrc = story.entriesByBrowser[pair.left]?.currentImage;
          const rightSrc = story.entriesByBrowser[pair.right]?.currentImage;
          try {
            const result = await compareImagesBySrc(leftSrc, rightSrc);
            if (result.status === "dimension_mismatch") {
              hasDimensionMismatch = true;
              continue;
            }
            if (result.status === "ready") {
              comparableCount += 1;
              if (typeof result.mismatchRatio === "number") {
                worstRatio = Math.max(worstRatio, result.mismatchRatio);
              }
              if ((result.mismatchRatio || 0) > 0) {
                hasDiff = true;
                break;
              }
            }
          } catch {
            // Ignore compare failures for list indicator; card view still exposes detailed errors.
          }
        }

        next[story.storyKey] = {
          state: hasDiff
            ? "diff"
            : hasDimensionMismatch
              ? "size"
              : comparableCount > 0
                ? "same"
                : "na",
          worstRatio: comparableCount > 0 ? worstRatio : null,
        };
      }

      if (!cancelled) {
        setCrossStorySignals(next);
      }
    }

    void computeSignals();
    return () => {
      cancelled = true;
    };
  }, [compareMode, visibleStories]);

  React.useEffect(() => {
    setZapShowCurrent(false);
  }, [selectedEntry?.key, zapDiff, showDiff]);

  React.useEffect(() => {
    if (
      !showDiff ||
      !zapDiff ||
      !selectedEntry ||
      !selectedEntry.baselineImage ||
      !selectedEntry.currentImage
    ) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setZapShowCurrent((prev: boolean) => !prev);
    }, 500);
    return () => window.clearInterval(timer);
  }, [showDiff, zapDiff, selectedEntry]);

  React.useEffect(() => {
    let cancelled = false;

    async function buildFocusMask(diffSrc: string | null | undefined): Promise<string> {
      const normalized = normalizeSrc(diffSrc);
      if (!normalized) return "";
      const cache = focusMaskCacheRef.current;
      if (cache[normalized]) {
        return cache[normalized];
      }

      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const next = new Image();
        next.onload = () => resolve(next);
        next.onerror = () => reject(new Error("Failed to load diff image for focus mask."));
        next.src = normalized;
      });

      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      const readCanvas = document.createElement("canvas");
      readCanvas.width = width;
      readCanvas.height = height;
      const readCtx = readCanvas.getContext("2d");
      if (!readCtx) return "";
      readCtx.drawImage(image, 0, 0);

      const source = readCtx.getImageData(0, 0, width, height).data;
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext("2d");
      if (!maskCtx) return "";
      const mask = maskCtx.createImageData(width, height);

      for (let i = 0; i < source.length; i += 4) {
        const r = source[i];
        const g = source[i + 1];
        const b = source[i + 2];
        const a = source[i + 3];
        const isDiffPixel =
          a > 0 && (Math.abs(r - g) > 28 || Math.abs(r - b) > 28 || Math.abs(g - b) > 28);

        if (isDiffPixel) {
          mask.data[i + 3] = 0;
        } else {
          mask.data[i] = 0;
          mask.data[i + 1] = 0;
          mask.data[i + 2] = 0;
          mask.data[i + 3] = 170;
        }
      }

      maskCtx.putImageData(mask, 0, 0);
      const maskSrc = maskCanvas.toDataURL("image/png");
      cache[normalized] = maskSrc;
      return maskSrc;
    }

    if (!showDiff || !focusDiff || !selectedEntry?.diffImage) {
      setFocusMaskSrc("");
      return undefined;
    }

    buildFocusMask(selectedEntry.diffImage)
      .then((src) => {
        if (!cancelled) {
          setFocusMaskSrc(src || "");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFocusMaskSrc("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [showDiff, focusDiff, selectedEntry?.diffImage]);

  const summary = React.useMemo<StorySummary>(() => {
    const next: StorySummary = {
      total: storyGroups.length,
      changed: 0,
      unchanged: 0,
      attention: 0,
    };
    for (const story of storyGroups) {
      if (story.hasChanged) next.changed += 1;
      if (story.isUnchanged) next.unchanged += 1;
      if (story.hasAttention) next.attention += 1;
    }
    return next;
  }, [storyGroups]);

  const summaryText =
    String(summary.total || 0) +
    " stories · " +
    String(summary.changed || 0) +
    " changed · " +
    String(summary.unchanged || 0) +
    " unchanged · " +
    String(summary.attention || 0) +
    " attention";

  const selectedIndex =
    selectedStory && visibleStories.length > 0
      ? visibleStories.findIndex((story) => story.storyKey === selectedStory.storyKey)
      : -1;

  const metaText =
    selectedStory && selectedEntry && selectedIndex >= 0
      ? "Story " +
        String(selectedIndex + 1) +
        "/" +
        String(visibleStories.length) +
        " · " +
        (selectedEntry.browser ? selectedEntry.browser + " · " : "") +
        selectedStory.storyKey
      : "";

  const entryStatusLabel =
    selectedEntry && selectedEntry.status in statusMap
      ? statusMap[selectedEntry.status as keyof typeof statusMap]
      : selectedEntry?.status || "";

  const metricsText = selectedEntry
    ? "Mode: " +
      (compareMode === "cross_browser" ? "cross-browser" : "baseline vs current") +
      (compareMode === "cross_browser"
        ? " · Matrix compares Chromium <-> Firefox, Chromium <-> WebKit, Firefox <-> WebKit for all visible stories."
        : " · Status: " +
          entryStatusLabel +
          " · mismatch pixels: " +
          String(
            typeof selectedEntry.mismatchPixels === "number" ? selectedEntry.mismatchPixels : "n/a",
          ) +
          " · mismatch ratio: " +
          fmtPercent(selectedEntry.mismatchRatio) +
          " · size: " +
          String(
            selectedEntry.width && selectedEntry.height
              ? selectedEntry.width + "x" + selectedEntry.height
              : "n/a",
          ) +
          (selectedEntry.notes ? " · " + selectedEntry.notes : ""))
    : allEntries.length === 0
      ? "Run report command to generate report entries."
      : "";

  const diffReady =
    !!selectedEntry &&
    !!selectedEntry.baselineImage &&
    (showDiff ? !!selectedEntry.currentImage && !!selectedEntry.diffImage : true);
  const diffBaseSrc =
    selectedEntry && selectedEntry.baselineImage
      ? normalizeSrc(
          showDiff && zapDiff && zapShowCurrent && selectedEntry.currentImage
            ? selectedEntry.currentImage
            : selectedEntry.baselineImage,
        )
      : "";
  const diffPixelsSrc =
    showDiff && selectedEntry?.diffImage ? normalizeSrc(selectedEntry.diffImage) : "";
  const activeCrossPair: BrowserPair =
    browserPairs.find((pair: BrowserPair) => pair.id === activeCrossPairId) || browserPairs[0];
  const activeCrossDiff = crossPairDiffs[activeCrossPair.id] || null;
  const activeCrossLeftSrc = activeCrossDiff?.leftSrc || "";
  const activeCrossRightSrc = activeCrossDiff?.rightSrc || "";
  const emptyTitle =
    allEntries.length === 0
      ? "No snapshot entries found in report"
      : "No stories match the selected filter";

  return {
    compareMode,
    setCompareMode,
    activeFilter,
    setActiveFilter,
    selectedStoryKey,
    setSelectedStoryKey,
    activeStoryBrowser,
    setActiveStoryBrowser,
    crossPairDiffs,
    crossPairDiffsLoading,
    activeCrossPairId,
    setActiveCrossPairId,
    crossStorySignals,
    showDiff,
    setShowDiff,
    focusDiff,
    setFocusDiff,
    zapDiff,
    setZapDiff,
    zapShowCurrent,
    focusMaskSrc,
    visibleStories,
    selectedStory,
    selectedEntry,
    summaryText,
    metaText,
    metricsText,
    diffReady,
    diffBaseSrc,
    diffPixelsSrc,
    activeCrossPair,
    activeCrossDiff,
    activeCrossLeftSrc,
    activeCrossRightSrc,
    emptyTitle,
    browserLabel,
    pairLabelText,
  };
}
