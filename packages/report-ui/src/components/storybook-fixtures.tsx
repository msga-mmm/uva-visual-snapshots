import React, { useState } from "react";
import BaselineCurrentView from "./BaselineCurrentView";
import CrossBrowserView from "./CrossBrowserView";
import Sidebar from "./Sidebar";
import type {
  BrowserId,
  BrowserPair,
  CompareMode,
  CrossPairDiff,
  CrossStorySignal,
  FilterId,
  ReportEntry,
  StoryGroup,
} from "../types";

function svgDataUrl(label: string, fill: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600">` +
    `<rect width="960" height="600" fill="${fill}"/>` +
    `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ` +
    `font-family="Arial, sans-serif" font-size="42" fill="#ffffff">${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const sampleImages = {
  baseline: svgDataUrl("Baseline", "#2f4b7c"),
  current: svgDataUrl("Current", "#4f6d7a"),
  diffBase: svgDataUrl("Diff Base", "#23395d"),
  diffPixels: svgDataUrl("Diff Pixels", "rgba(255, 94, 58, 0.78)"),
  focusMask: svgDataUrl("Focus Mask", "rgba(255, 235, 59, 0.45)"),
  chromium: svgDataUrl("Chromium", "#1f7a8c"),
  firefox: svgDataUrl("Firefox", "#bf5f2f"),
  webkit: svgDataUrl("WebKit", "#5c4b8a"),
  crossOverlay: svgDataUrl("Overlay", "rgba(255, 0, 0, 0.4)"),
};

const chromiumEntry: ReportEntry = {
  key: "button--primary-chromium",
  snapshotKey: "button--primary",
  storyId: "button--primary",
  title: "Button",
  name: "Primary",
  browser: "chromium",
  status: "changed",
  baselineImage: sampleImages.baseline,
  currentImage: sampleImages.chromium,
  diffImage: sampleImages.diffPixels,
  mismatchPixels: 421,
  mismatchRatio: 0.0174,
  width: 960,
  height: 600,
};

const firefoxEntry: ReportEntry = {
  key: "button--primary-firefox",
  snapshotKey: "button--primary",
  storyId: "button--primary",
  title: "Button",
  name: "Primary",
  browser: "firefox",
  status: "unchanged",
  baselineImage: sampleImages.baseline,
  currentImage: sampleImages.firefox,
  mismatchPixels: 0,
  mismatchRatio: 0,
  width: 960,
  height: 600,
};

const webkitEntry: ReportEntry = {
  key: "button--primary-webkit",
  snapshotKey: "button--primary",
  storyId: "button--primary",
  title: "Button",
  name: "Primary",
  browser: "webkit",
  status: "missing_current",
  baselineImage: sampleImages.baseline,
  mismatchPixels: null,
  mismatchRatio: null,
  width: 960,
  height: 600,
};

const formChromiumEntry: ReportEntry = {
  key: "form--dense-chromium",
  snapshotKey: "form--dense",
  storyId: "form--dense",
  title: "Form",
  name: "Dense",
  browser: "chromium",
  status: "unchanged",
  baselineImage: sampleImages.baseline,
  currentImage: sampleImages.current,
  mismatchPixels: 0,
  mismatchRatio: 0,
  width: 960,
  height: 600,
};

const formFirefoxEntry: ReportEntry = {
  key: "form--dense-firefox",
  snapshotKey: "form--dense",
  storyId: "form--dense",
  title: "Form",
  name: "Dense",
  browser: "firefox",
  status: "dimension_mismatch",
  baselineImage: sampleImages.baseline,
  currentImage: sampleImages.firefox,
  mismatchPixels: null,
  mismatchRatio: null,
  width: 980,
  height: 620,
  notes: "980x620 vs 960x600",
};

function createStoryGroup(
  storyKey: string,
  label: string,
  status: StoryGroup["status"],
  entries: ReportEntry[],
): StoryGroup {
  const entriesByBrowser = Object.fromEntries(
    entries
      .filter(
        (entry): entry is ReportEntry & { browser: BrowserId } =>
          entry.browser === "chromium" || entry.browser === "firefox" || entry.browser === "webkit",
      )
      .map((entry) => [entry.browser, entry]),
  ) as StoryGroup["entriesByBrowser"];

  const browsers = entries
    .map((entry) => entry.browser)
    .filter(
      (browser): browser is BrowserId =>
        browser === "chromium" || browser === "firefox" || browser === "webkit",
    );

  return {
    storyKey,
    label,
    entriesByBrowser,
    browsers,
    entries,
    hasChanged: status === "changed",
    hasAttention: status === "attention",
    isUnchanged: status === "unchanged",
    status,
    browserHealth: (["chromium", "firefox", "webkit"] as BrowserId[]).map((browser) => {
      const entry = entriesByBrowser[browser] || null;
      return {
        browser,
        entry,
        hasCurrent: Boolean(entry?.currentImage),
      };
    }),
  };
}

export const sampleStoryGroups: StoryGroup[] = [
  createStoryGroup("button--primary", "Button / Primary", "changed", [
    chromiumEntry,
    firefoxEntry,
    webkitEntry,
  ]),
  createStoryGroup("form--dense", "Form / Dense", "attention", [
    formChromiumEntry,
    formFirefoxEntry,
  ]),
];

export const sampleCrossStorySignals: Record<string, CrossStorySignal> = {
  "button--primary": { state: "diff", worstRatio: 0.0213 },
  "form--dense": { state: "size", worstRatio: null },
};

export const sampleCrossPairDiffs: Partial<Record<string, CrossPairDiff>> = {
  cf: {
    status: "ready",
    message: "",
    mismatchPixels: 734,
    mismatchRatio: 0.0294,
    leftSrc: sampleImages.chromium,
    rightSrc: sampleImages.firefox,
    overlaySrc: sampleImages.crossOverlay,
  },
  cw: {
    status: "no_data",
    message: "Missing current image for WebKit",
    mismatchPixels: null,
    mismatchRatio: null,
    leftSrc: "",
    rightSrc: "",
    overlaySrc: "",
  },
};

export const sampleCrossPair: BrowserPair = { id: "cf", left: "chromium", right: "firefox" };

interface StoryFrameProps {
  children: React.ReactNode;
  width?: number;
}

export function StoryFrame({ children, width = 1200 }: StoryFrameProps) {
  return <div style={{ width, maxWidth: "100%", margin: "0 auto" }}>{children}</div>;
}

export function SidebarStoryHarness({
  initialCompareMode = "baseline_current",
  initialFilter = "all",
}: {
  initialCompareMode?: CompareMode;
  initialFilter?: FilterId;
}) {
  const [compareMode, setCompareMode] = useState<CompareMode>(initialCompareMode);
  const [activeFilter, setActiveFilter] = useState<FilterId>(initialFilter);
  const [selectedStoryKey, setSelectedStoryKey] = useState<string | null>(
    sampleStoryGroups[0]?.storyKey || null,
  );

  const selectedStory =
    sampleStoryGroups.find((story) => story.storyKey === selectedStoryKey) || null;

  return (
    <StoryFrame width={360}>
      <Sidebar
        compareMode={compareMode}
        setCompareMode={setCompareMode}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        visibleStories={sampleStoryGroups}
        selectedStory={selectedStory}
        setSelectedStoryKey={setSelectedStoryKey}
        crossStorySignals={sampleCrossStorySignals}
        summaryText="2 stories · 1 changed · 1 attention"
      />
    </StoryFrame>
  );
}

export function BaselineCurrentViewStoryHarness() {
  const [showDiff, setShowDiff] = useState(true);
  const [focusDiff, setFocusDiff] = useState(true);
  const [zapDiff, setZapDiff] = useState(false);

  return (
    <StoryFrame>
      <BaselineCurrentView
        selectedEntry={sampleStoryGroups[0]?.entriesByBrowser.chromium || null}
        metricsText="Changed · mismatch pixels: 421 · mismatch ratio: 1.740%"
        diffReady
        diffBaseSrc={sampleImages.diffBase}
        diffPixelsSrc={sampleImages.diffPixels}
        focusMaskSrc={sampleImages.focusMask}
        showDiff={showDiff}
        setShowDiff={setShowDiff}
        focusDiff={focusDiff}
        setFocusDiff={setFocusDiff}
        zapDiff={zapDiff}
        setZapDiff={setZapDiff}
        zapShowCurrent={false}
      />
    </StoryFrame>
  );
}

export function CrossBrowserViewStoryHarness() {
  const [activeCrossPairId, setActiveCrossPairId] = useState(sampleCrossPair.id);

  return (
    <StoryFrame>
      <CrossBrowserView
        activeCrossPair={sampleCrossPair}
        activeCrossDiff={sampleCrossPairDiffs.cf || null}
        activeCrossLeftSrc={sampleImages.chromium}
        activeCrossRightSrc={sampleImages.firefox}
        activeCrossPairId={activeCrossPairId}
        setActiveCrossPairId={setActiveCrossPairId}
        crossPairDiffs={sampleCrossPairDiffs}
        crossPairDiffsLoading={false}
      />
    </StoryFrame>
  );
}
