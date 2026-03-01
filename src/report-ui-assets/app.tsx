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

const fmtPercent = (value) => {
  if (typeof value !== "number") return "n/a";
  return (value * 100).toFixed(3) + "%";
};

const normalizeSrc = (src) => {
  if (!src) return "";
  return src.startsWith("/") ? src : "/" + src;
};

const entryLabel = (entry) =>
  entry.title && entry.name ? entry.title + " / " + entry.name : entry.storyId || entry.key;

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
  const [activeFilter, setActiveFilter] = React.useState("all");
  const [selectedKey, setSelectedKey] = React.useState(null);
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

  const visibleEntries = React.useMemo(() => {
    const active = filters.find((item) => item.id === activeFilter) || filters[0];
    return allEntries.filter(active.include);
  }, [allEntries, activeFilter]);

  React.useEffect(() => {
    if (visibleEntries.length === 0) {
      setSelectedKey(null);
      return;
    }
    if (!visibleEntries.some((entry) => entry.key === selectedKey)) {
      setSelectedKey(visibleEntries[0].key);
    }
  }, [visibleEntries, selectedKey]);

  const selectedEntry = React.useMemo(() => {
    if (selectedKey) {
      const match = allEntries.find((entry) => entry.key === selectedKey);
      if (match) return match;
    }
    return visibleEntries[0] || null;
  }, [allEntries, selectedKey, visibleEntries]);

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

  const summary = report.summary || {};
  const summaryText =
    String(summary.total || 0) +
    " total · " +
    String(summary.changed || 0) +
    " changed · " +
    String(summary.unchanged || 0) +
    " unchanged";

  const selectedIndex =
    selectedEntry && visibleEntries.length > 0
      ? visibleEntries.findIndex((entry) => entry.key === selectedEntry.key)
      : -1;

  const metaText =
    selectedEntry && selectedIndex >= 0
      ? "Entry " +
        String(selectedIndex + 1) +
        "/" +
        String(visibleEntries.length) +
        " · " +
        selectedEntry.key
      : "";

  const metricsText = selectedEntry
    ? "Status: " +
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
      (selectedEntry.notes ? " · " + selectedEntry.notes : "")
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

  const emptyTitle =
    allEntries.length === 0
      ? "No snapshot entries found in report"
      : "No snapshots match the selected filter";

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>UVA Visual Snapshots Report</h1>
        <p className="summary" id="summary">
          {summaryText}
        </p>
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
          {visibleEntries.length === 0 ? (
            <p className="empty">No snapshots match this filter.</p>
          ) : (
            visibleEntries.map((entry) => (
              <button
                key={entry.key}
                type="button"
                className={entry.key === selectedEntry?.key ? "item active" : "item"}
                data-key={entry.key}
                onClick={() => setSelectedKey(entry.key)}
              >
                <span className="name">{entryLabel(entry)}</span>
                <span className={entry.status === "unchanged" ? "badge ok" : "badge"}>
                  {statusMap[entry.status] || entry.status}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="main">
        <div className="title-row">
          <div>
            <h2 id="story-title">{selectedEntry ? entryLabel(selectedEntry) : emptyTitle}</h2>
            <span className="meta" id="story-meta">
              {metaText}
            </span>
          </div>
        </div>

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
      </main>
    </div>
  );
}

async function bootstrap() {
  try {
    const [reactMod, reactDomMod] = await Promise.all([
      import("https://esm.sh/react@18.3.1"),
      import("https://esm.sh/react-dom@18.3.1/client"),
    ]);
    React = reactMod.default || reactMod;
    createRoot = reactDomMod.createRoot;
  } catch (error) {
    renderBootstrapError(error);
    return;
  }

  if (rootNode) {
    createRoot(rootNode).render(<App />);
  }
}

void bootstrap();
