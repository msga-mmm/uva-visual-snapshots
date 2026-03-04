const rootNode = document.getElementById("app");
const dataEl = document.getElementById("report-data");
const emptyReport = {
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

function readInlineReport() {
  try {
    return JSON.parse(dataEl?.textContent || "{}");
  } catch {
    return null;
  }
}

const inlineReport = readInlineReport();
const initialReport = inlineReport || emptyReport;

const statusMap = {
  changed: "changed",
  unchanged: "unchanged",
  missing_baseline: "missing baseline",
  missing_current: "missing current",
  dimension_mismatch: "dimension mismatch",
  error: "error",
};

const filters = [
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
const browserOrder = ["chromium", "firefox", "webkit"];
const browserLabel = {
  chromium: "Chromium",
  firefox: "Firefox",
  webkit: "WebKit",
};
const attentionStatuses = new Set(["missing_baseline", "missing_current", "dimension_mismatch", "error"]);
const browserPairs = [
  { id: "cf", left: "chromium", right: "firefox" },
  { id: "cw", left: "chromium", right: "webkit" },
  { id: "fw", left: "firefox", right: "webkit" },
];

const fmtPercent = (value) => {
  if (typeof value !== "number") return "n/a";
  return (value * 100).toFixed(3) + "%";
};

const normalizeSrc = (src) => {
  if (!src) return "";
  if (/^[a-z]+:\/\//i.test(src) || src.startsWith("data:")) return src;
  return src.replace(/^\.\//, "");
};

const entryLabel = (entry) =>
  entry.title && entry.name
    ? entry.title + " / " + entry.name
    : entry.storyId || entry.snapshotKey || entry.key;

const pairLabelText = (pair) =>
  `${browserLabel[pair.left] || pair.left} <-> ${browserLabel[pair.right] || pair.right}`;

const browserIconMap = new Map();

function BrowserIcon({ browser }) {
  const Icon = browserIconMap.get(browser);
  if (Icon) {
    return <Icon className="browser-icon" aria-hidden="true" focusable="false" />;
  }
  return null;
}

const browserChipContent = (entry, browser) => (
  <>
    <BrowserIcon browser={browser} />
    <span>{entry?.currentImage ? "ok" : "-"}</span>
  </>
);

async function buildDiffOverlayBySrc(leftSrc, rightSrc) {
  if (!leftSrc || !rightSrc) {
    return {
      status: "no_data",
      message: "missing snapshot",
      mismatchPixels: null,
      mismatchRatio: null,
      leftSrc: normalizeSrc(leftSrc),
      rightSrc: normalizeSrc(rightSrc),
      overlaySrc: "",
    };
  }
  const loadImage = async (src) =>
    await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to load snapshot image."));
      image.src = normalizeSrc(src);
    });

  const leftImage = await loadImage(leftSrc);
  const rightImage = await loadImage(rightSrc);
  const leftWidth = leftImage.naturalWidth || leftImage.width;
  const leftHeight = leftImage.naturalHeight || leftImage.height;
  const rightWidth = rightImage.naturalWidth || rightImage.width;
  const rightHeight = rightImage.naturalHeight || rightImage.height;
  if (leftWidth !== rightWidth || leftHeight !== rightHeight) {
    return {
      status: "dimension_mismatch",
      message: `${leftWidth}x${leftHeight} vs ${rightWidth}x${rightHeight}`,
      mismatchPixels: null,
      mismatchRatio: null,
      leftSrc: normalizeSrc(leftSrc),
      rightSrc: normalizeSrc(rightSrc),
      overlaySrc: "",
    };
  }

  const width = leftWidth;
  const height = leftHeight;
  const leftCanvas = document.createElement("canvas");
  leftCanvas.width = width;
  leftCanvas.height = height;
  const rightCanvas = document.createElement("canvas");
  rightCanvas.width = width;
  rightCanvas.height = height;
  const leftCtx = leftCanvas.getContext("2d");
  const rightCtx = rightCanvas.getContext("2d");
  if (!leftCtx || !rightCtx) {
    throw new Error("Canvas is not available in this browser.");
  }
  leftCtx.drawImage(leftImage, 0, 0);
  rightCtx.drawImage(rightImage, 0, 0);
  const leftData = leftCtx.getImageData(0, 0, width, height).data;
  const rightData = rightCtx.getImageData(0, 0, width, height).data;

  const overlayCanvas = document.createElement("canvas");
  overlayCanvas.width = width;
  overlayCanvas.height = height;
  const overlayCtx = overlayCanvas.getContext("2d");
  if (!overlayCtx) {
    throw new Error("Canvas is not available in this browser.");
  }
  const overlay = overlayCtx.createImageData(width, height);
  let mismatchPixels = 0;

  for (let i = 0; i < leftData.length; i += 4) {
    if (
      leftData[i] !== rightData[i] ||
      leftData[i + 1] !== rightData[i + 1] ||
      leftData[i + 2] !== rightData[i + 2] ||
      leftData[i + 3] !== rightData[i + 3]
    ) {
      mismatchPixels += 1;
      overlay.data[i] = 255;
      overlay.data[i + 1] = 0;
      overlay.data[i + 2] = 64;
      overlay.data[i + 3] = 245;
    } else {
      // Dim unchanged pixels so changed regions remain easy to spot.
      overlay.data[i] = 7;
      overlay.data[i + 1] = 9;
      overlay.data[i + 2] = 14;
      overlay.data[i + 3] = 82;
    }
  }
  overlayCtx.putImageData(overlay, 0, 0);

  return {
    status: "ready",
    message: "",
    mismatchPixels,
    mismatchRatio: mismatchPixels / (width * height),
    leftSrc: normalizeSrc(leftSrc),
    rightSrc: normalizeSrc(rightSrc),
    overlaySrc: overlayCanvas.toDataURL("image/png"),
  };
}

async function compareImagesBySrc(leftSrc, rightSrc) {
  if (!leftSrc || !rightSrc) {
    return { status: "no_data", message: "missing snapshot", mismatchPixels: null, mismatchRatio: null };
  }
  const loadImage = async (src) =>
    await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to load snapshot image."));
      image.src = normalizeSrc(src);
    });

  const leftImage = await loadImage(leftSrc);
  const rightImage = await loadImage(rightSrc);
  const leftWidth = leftImage.naturalWidth || leftImage.width;
  const leftHeight = leftImage.naturalHeight || leftImage.height;
  const rightWidth = rightImage.naturalWidth || rightImage.width;
  const rightHeight = rightImage.naturalHeight || rightImage.height;
  if (leftWidth !== rightWidth || leftHeight !== rightHeight) {
    return {
      status: "dimension_mismatch",
      message: `${leftWidth}x${leftHeight} vs ${rightWidth}x${rightHeight}`,
      mismatchPixels: null,
      mismatchRatio: null,
    };
  }

  const width = leftWidth;
  const height = leftHeight;
  const leftCanvas = document.createElement("canvas");
  leftCanvas.width = width;
  leftCanvas.height = height;
  const rightCanvas = document.createElement("canvas");
  rightCanvas.width = width;
  rightCanvas.height = height;
  const leftCtx = leftCanvas.getContext("2d");
  const rightCtx = rightCanvas.getContext("2d");
  if (!leftCtx || !rightCtx) {
    throw new Error("Canvas is not available in this browser.");
  }
  leftCtx.drawImage(leftImage, 0, 0);
  rightCtx.drawImage(rightImage, 0, 0);
  const leftData = leftCtx.getImageData(0, 0, width, height).data;
  const rightData = rightCtx.getImageData(0, 0, width, height).data;

  let mismatchPixels = 0;
  for (let i = 0; i < leftData.length; i += 4) {
    if (
      leftData[i] !== rightData[i] ||
      leftData[i + 1] !== rightData[i + 1] ||
      leftData[i + 2] !== rightData[i + 2] ||
      leftData[i + 3] !== rightData[i + 3]
    ) {
      mismatchPixels += 1;
    }
  }
  return {
    status: "ready",
    message: "",
    mismatchPixels,
    mismatchRatio: mismatchPixels / (width * height),
  };
}

function renderBootstrapError(error) {
  if (!rootNode) {
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  rootNode.innerHTML =
    "<main style='font-family: system-ui, sans-serif; padding: 16px; line-height: 1.5'>" +
    "<h1 style='margin: 0 0 8px; font-size: 1.1rem'>Report UI failed to load</h1>" +
    "<p style='margin: 0 0 8px'>React modules could not be loaded from CDN.</p>" +
    "<p style='margin: 0'><code>" +
    message.replace(/</g, "&lt;") +
    "</code></p>" +
    "</main>";
}

let React;
let createRoot;

function App() {
  const [report, setReport] = React.useState(initialReport);
  const [compareMode, setCompareMode] = React.useState("baseline_current");
  const [activeFilter, setActiveFilter] = React.useState("all");
  const [selectedStoryKey, setSelectedStoryKey] = React.useState(null);
  const [activeStoryBrowser, setActiveStoryBrowser] = React.useState(null);
  const [crossPairDiffs, setCrossPairDiffs] = React.useState({});
  const [crossPairDiffsLoading, setCrossPairDiffsLoading] = React.useState(false);
  const [activeCrossPairId, setActiveCrossPairId] = React.useState(browserPairs[0].id);
  const [crossStorySignals, setCrossStorySignals] = React.useState({});
  const [showDiff, setShowDiff] = React.useState(true);
  const [focusDiff, setFocusDiff] = React.useState(false);
  const [zapDiff, setZapDiff] = React.useState(false);
  const [zapShowCurrent, setZapShowCurrent] = React.useState(false);
  const [focusMaskSrc, setFocusMaskSrc] = React.useState("");
  const focusMaskCacheRef = React.useRef({});

  React.useEffect(() => {
    if (inlineReport) {
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
  }, []);

  const allEntries = React.useMemo(
    () => (Array.isArray(report.entries) ? report.entries : []),
    [report],
  );

  const storyGroups = React.useMemo(() => {
    const byStory = new Map();
    for (const entry of allEntries) {
      const snapshotKey = entry.snapshotKey || entry.key;
      const browser =
        typeof entry.browser === "string" && browserOrder.includes(entry.browser)
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
      const browsers = browserOrder.filter((browser) => story.entriesByBrowser[browser]);
      const entries = browsers
        .map((browser) => story.entriesByBrowser[browser])
        .filter(Boolean);
      const hasChanged = entries.some((entry) => entry.status === "changed");
      const hasAttention = entries.some((entry) => attentionStatuses.has(entry.status));
      const isUnchanged = entries.length > 0 && entries.every((entry) => entry.status === "unchanged");
      const status = hasChanged ? "changed" : hasAttention ? "attention" : "unchanged";
      const browserHealth = browserOrder.map((browser) => ({
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

  const visibleStories = React.useMemo(() => {
    const active = filters.find((item) => item.id === activeFilter) || filters[0];
    if (active.id === "all") {
      return storyGroups;
    }
    if (active.id === "changed") {
      return storyGroups.filter((story) => story.hasChanged);
    }
    if (active.id === "unchanged") {
      return storyGroups.filter((story) => story.isUnchanged);
    }
    return storyGroups.filter((story) => story.hasAttention);
  }, [storyGroups, activeFilter]);

  React.useEffect(() => {
    if (visibleStories.length === 0) {
      setSelectedStoryKey(null);
      return;
    }
    if (!visibleStories.some((story) => story.storyKey === selectedStoryKey)) {
      setSelectedStoryKey(visibleStories[0].storyKey);
    }
  }, [visibleStories, selectedStoryKey]);

  const selectedStory = React.useMemo(() => {
    if (selectedStoryKey) {
      const match = visibleStories.find((story) => story.storyKey === selectedStoryKey);
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

  const selectedEntry = React.useMemo(() => {
    if (!selectedStory) {
      return null;
    }
    if (activeStoryBrowser && selectedStory.entriesByBrowser[activeStoryBrowser]) {
      return selectedStory.entriesByBrowser[activeStoryBrowser];
    }
    const fallbackBrowser = selectedStory.browsers[0];
    return fallbackBrowser ? selectedStory.entriesByBrowser[fallbackBrowser] : null;
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
      const next = {};
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
    const loading = {};
    for (const story of visibleStories) {
      loading[story.storyKey] = { state: "loading", worstRatio: null };
    }
    setCrossStorySignals(loading);

    async function computeSignals() {
      const next = {};
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
      setZapShowCurrent((prev) => !prev);
    }, 500);
    return () => window.clearInterval(timer);
  }, [showDiff, zapDiff, selectedEntry]);

  React.useEffect(() => {
    let cancelled = false;

    async function buildFocusMask(diffSrc) {
      const normalized = normalizeSrc(diffSrc);
      if (!normalized) return "";
      const cache = focusMaskCacheRef.current;
      if (cache[normalized]) {
        return cache[normalized];
      }

      const image = await new Promise((resolve, reject) => {
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

  const summary = React.useMemo(() => {
    const next = {
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

  const metricsText = selectedEntry
    ? "Mode: " +
      (compareMode === "cross_browser" ? "cross-browser" : "baseline vs current") +
      (compareMode === "cross_browser"
        ? " · Matrix compares Chromium <-> Firefox, Chromium <-> WebKit, Firefox <-> WebKit for all visible stories."
        : " · Status: " +
          (statusMap[selectedEntry.status] || selectedEntry.status) +
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
  const activeCrossPair = browserPairs.find((pair) => pair.id === activeCrossPairId) || browserPairs[0];
  const activeCrossDiff = crossPairDiffs[activeCrossPair.id] || null;
  const activeCrossLeftSrc = activeCrossDiff?.leftSrc || "";
  const activeCrossRightSrc = activeCrossDiff?.rightSrc || "";

  const emptyTitle =
    allEntries.length === 0
      ? "No snapshot entries found in report"
      : "No stories match the selected filter";

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>UVA Visual Snapshots Report</h1>
        <p className="summary" id="summary">
          {summaryText}
        </p>
        <div className="filters" id="compare-mode">
          <button
            type="button"
            className={compareMode === "baseline_current" ? "filter active" : "filter"}
            onClick={() => setCompareMode("baseline_current")}
          >
            Baseline vs Current
          </button>
          <button
            type="button"
            className={compareMode === "cross_browser" ? "filter active" : "filter"}
            onClick={() => setCompareMode("cross_browser")}
          >
            Cross-browser
          </button>
        </div>
        <div className="filters" id="filters">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={filter.id === activeFilter ? "filter active" : "filter"}
              onClick={() => setActiveFilter(filter.id)}
              data-filter={filter.id}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div id="list" className="list">
          {visibleStories.length === 0 ? (
            <p className="empty">No stories match this filter.</p>
          ) : (
            visibleStories.map((story) => (
              <button
                key={story.storyKey}
                type="button"
                className={story.storyKey === selectedStory?.storyKey ? "item active" : "item"}
                data-key={story.storyKey}
                onClick={() => setSelectedStoryKey(story.storyKey)}
              >
                <span className="item-head">
                  <span className="name">{story.label}</span>
                  {compareMode === "cross_browser" ? (
                    (() => {
                      const signal = crossStorySignals[story.storyKey] || { state: "na", worstRatio: null };
                      const signalState = signal.state || "na";
                      const signalLabel =
                        signalState === "diff"
                          ? `CB diff ${fmtPercent(signal.worstRatio)}`
                          : signalState === "same"
                            ? "CB same"
                            : signalState === "size"
                              ? "CB size"
                              : signalState === "loading"
                                ? "CB ..."
                                : "CB n/a";
                      const signalTitle =
                        signalState === "diff"
                          ? "Cross-browser diff detected"
                          : signalState === "same"
                            ? "No cross-browser diff detected"
                            : signalState === "size"
                              ? "Cross-browser dimension mismatch"
                              : signalState === "loading"
                                ? "Computing cross-browser diff signal"
                                : "Cross-browser diff not available";
                      return (
                        <span className={`cross-pill ${signalState}`} title={signalTitle}>
                          {signalLabel}
                        </span>
                      );
                    })()
                  ) : null}
                </span>
                <span className="browser-health-row">
                  {story.browserHealth.map((health) => (
                    <span
                      key={health.browser}
                      className={health.hasCurrent ? "browser-health-chip" : "browser-health-chip muted"}
                      title={
                        (browserLabel[health.browser] || health.browser) +
                        " · " +
                        (health.hasCurrent ? "current snapshot available" : "current snapshot missing")
                      }
                    >
                      {browserChipContent(health.entry, health.browser)}
                    </span>
                  ))}
                </span>
                <span className={story.status === "unchanged" ? "badge ok" : "badge"}>
                  {story.status}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="main">
        <div className="title-row">
          <div>
            <h2 id="story-title">{selectedStory ? selectedStory.label : emptyTitle}</h2>
            <span className="meta" id="story-meta">
              {metaText}
            </span>
          </div>
          {compareMode === "baseline_current" && selectedStory && selectedStory.browsers.length > 0 ? (
            <div className="filters" id="story-browser-filters">
              {selectedStory.browsers.map((browser) => (
                <button
                  key={browser}
                  type="button"
                  className={browser === activeStoryBrowser ? "filter active" : "filter"}
                  onClick={() => setActiveStoryBrowser(browser)}
                >
                  {browserLabel[browser] || browser}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {compareMode === "baseline_current" ? (
          <>
            <section className="images">
              <article className="card">
                <h3>Baseline</h3>
                <div className="viewport">
                  {selectedEntry?.baselineImage ? (
                    <img
                      id="baseline-img"
                      alt="Baseline snapshot"
                      src={normalizeSrc(selectedEntry.baselineImage)}
                    />
                  ) : (
                    <p className="empty" id="baseline-empty">
                      No baseline image for this entry.
                    </p>
                  )}
                </div>
              </article>

              <article className="card">
                <h3>Current</h3>
                <div className="viewport">
                  {selectedEntry?.currentImage ? (
                    <img
                      id="current-img"
                      alt="Current snapshot"
                      src={normalizeSrc(selectedEntry.currentImage)}
                    />
                  ) : (
                    <p className="empty" id="current-empty">
                      No current image for this entry.
                    </p>
                  )}
                </div>
              </article>
            </section>

            <section className="diff">
              <div className="diff-head">
                <h3>Diff</h3>
                <div className="diff-controls">
                  <button
                    id="btn-toggle-diff"
                    className="btn btn-primary"
                    type="button"
                    aria-pressed={showDiff ? "true" : "false"}
                    onClick={() => setShowDiff((prev) => !prev)}
                  >
                    Show Diff Pixels
                  </button>
                  {showDiff ? (
                    <button
                      id="btn-focus-diff"
                      className="btn btn-primary"
                      type="button"
                      aria-pressed={focusDiff ? "true" : "false"}
                      onClick={() => setFocusDiff((prev) => !prev)}
                    >
                      Focus Diff
                    </button>
                  ) : null}
                  {showDiff ? (
                    <button
                      id="btn-zap-diff"
                      className="btn btn-primary"
                      type="button"
                      aria-pressed={zapDiff ? "true" : "false"}
                      onClick={() => setZapDiff((prev) => !prev)}
                    >
                      Zap
                    </button>
                  ) : null}
                </div>
              </div>

              <p className="metrics" id="metrics">
                {metricsText}
              </p>
              <div className="viewport">
                {diffReady ? (
                  <div id="diff-stage" className="diff-stage">
                    <img id="diff-base-img" alt="Baseline image in diff panel" src={diffBaseSrc} />
                    {showDiff && diffPixelsSrc ? (
                      <img
                        id="diff-pixels-img"
                        className={
                          "layer" + (zapDiff ? (zapShowCurrent ? " zap-red" : " zap-green") : "")
                        }
                        alt=""
                        aria-hidden="true"
                        src={diffPixelsSrc}
                      />
                    ) : null}
                    {showDiff && focusDiff && focusMaskSrc ? (
                      <img
                        id="diff-focus-mask-img"
                        className="layer"
                        alt=""
                        aria-hidden="true"
                        src={focusMaskSrc}
                      />
                    ) : null}
                  </div>
                ) : (
                  <p className="empty" id="diff-empty">
                    {showDiff
                      ? "No generated diff image for this entry."
                      : "No baseline image for this entry."}
                  </p>
                )}
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="images">
              <article className="card">
                <h3>{browserLabel[activeCrossPair.left] || activeCrossPair.left}</h3>
                <div className="viewport">
                  {activeCrossLeftSrc ? (
                    <img alt={`${browserLabel[activeCrossPair.left] || activeCrossPair.left} snapshot`} src={activeCrossLeftSrc} />
                  ) : (
                    <p className="empty">No current image for this browser.</p>
                  )}
                </div>
              </article>

              <article className="card">
                <h3>{browserLabel[activeCrossPair.right] || activeCrossPair.right}</h3>
                <div className="viewport">
                  {activeCrossRightSrc ? (
                    <img
                      alt={`${browserLabel[activeCrossPair.right] || activeCrossPair.right} snapshot`}
                      src={activeCrossRightSrc}
                    />
                  ) : (
                    <p className="empty">No current image for this browser.</p>
                  )}
                </div>
              </article>
            </section>

            <section className="diff">
              <div className="diff-head">
                <h3>Cross-browser Diff</h3>
                <div className="diff-controls">
                  {browserPairs.map((pair) => {
                    const pairDiff = crossPairDiffs[pair.id];
                    return (
                      <button
                        key={pair.id}
                        type="button"
                        className={pair.id === activeCrossPair.id ? "filter active pair-filter" : "filter pair-filter"}
                        onClick={() => setActiveCrossPairId(pair.id)}
                      >
                        <span className="pair-label">
                          <BrowserIcon browser={pair.left} />
                          <span className="pair-sep">&harr;</span>
                          <BrowserIcon browser={pair.right} />
                        </span>
                        {pairDiff?.status === "ready" ? (
                          <span className="pair-ratio">{fmtPercent(pairDiff.mismatchRatio)}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="metrics">
                {crossPairDiffsLoading
                  ? "Computing selected story cross-browser diffs..."
                  : activeCrossDiff?.status === "ready"
                    ? `${pairLabelText(activeCrossPair)} · mismatch pixels: ${String(
                        activeCrossDiff.mismatchPixels,
                      )} · mismatch ratio: ${fmtPercent(activeCrossDiff.mismatchRatio)}`
                  : activeCrossDiff?.status === "dimension_mismatch"
                      ? `${pairLabelText(activeCrossPair)} · size mismatch: ${activeCrossDiff.message || "n/a"}`
                      : `No comparable snapshots for ${pairLabelText(activeCrossPair)}.`}
              </p>
              <div className="viewport">
                {activeCrossDiff?.status === "ready" && activeCrossDiff.leftSrc ? (
                  <div id="cross-diff-stage" className="diff-stage">
                    <img
                      id="cross-diff-base-img"
                      alt={`${pairLabelText(activeCrossPair)} base image`}
                      src={activeCrossDiff.leftSrc}
                    />
                    {activeCrossDiff.overlaySrc ? (
                      <img
                        id="cross-diff-overlay-img"
                        className="layer"
                        alt=""
                        aria-hidden="true"
                        src={activeCrossDiff.overlaySrc}
                      />
                    ) : null}
                  </div>
                ) : (
                  <p className="empty">No generated cross-browser diff image for this pair.</p>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

async function bootstrap() {
  try {
    const [reactMod, reactDomMod, iconsMod] = await Promise.all([
      import("https://esm.sh/react@18.3.1"),
      import("https://esm.sh/react-dom@18.3.1/client"),
      import("https://esm.sh/react-icons@5.5.0/si?deps=react@18.3.1"),
    ]);
    React = reactMod.default || reactMod;
    createRoot = reactDomMod.createRoot;
    browserIconMap.set("chromium", iconsMod.SiGooglechrome || null);
    browserIconMap.set("firefox", iconsMod.SiFirefoxbrowser || null);
    browserIconMap.set("webkit", iconsMod.SiSafari || null);
  } catch (error) {
    renderBootstrapError(error);
    return;
  }

  if (rootNode) {
    createRoot(rootNode).render(<App />);
  }
}

void bootstrap();
