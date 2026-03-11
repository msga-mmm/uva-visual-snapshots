import React from "react";
import "./styles/app.css";
import "./styles/controls.css";
import Sidebar from "./components/Sidebar.js";
import BaselineCurrentView from "./components/BaselineCurrentView.js";
import CrossBrowserView from "./components/CrossBrowserView.js";
import { useReportAppState } from "./hooks/useReportAppState.js";
import type { ReportData } from "./types.js";

interface AppProps {
  initialReport: ReportData;
  hasInlineReport: boolean;
}

export default function App({ initialReport, hasInlineReport }: AppProps) {
  const state = useReportAppState({ initialReport, hasInlineReport });
  const {
    compareMode,
    setCompareMode,
    activeFilter,
    setActiveFilter,
    visibleStories,
    selectedStory,
    setSelectedStoryKey,
    crossStorySignals,
    summaryText,
    emptyTitle,
    metaText,
    activeStoryBrowser,
    setActiveStoryBrowser,
    browserLabel,
    activeCrossPair,
    activeCrossDiff,
    activeCrossLeftSrc,
    activeCrossRightSrc,
    activeCrossPairId,
    setActiveCrossPairId,
    crossPairDiffs,
    crossPairDiffsLoading,
    selectedEntry,
    metricsText,
    diffReady,
    diffBaseSrc,
    diffPixelsSrc,
    focusMaskSrc,
    showDiff,
    setShowDiff,
    focusDiff,
    setFocusDiff,
    zapDiff,
    setZapDiff,
    zapShowCurrent,
  } = state;

  return (
    <div className="layout">
      <Sidebar
        compareMode={compareMode}
        setCompareMode={setCompareMode}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        visibleStories={visibleStories}
        selectedStory={selectedStory}
        setSelectedStoryKey={setSelectedStoryKey}
        crossStorySignals={crossStorySignals}
        summaryText={summaryText}
      />

      <main className="main">
        <div className="title-row">
          <div>
            <h2 id="story-title">{selectedStory ? selectedStory.label : emptyTitle}</h2>
            <span className="meta" id="story-meta">
              {metaText}
            </span>
          </div>
          {compareMode === "baseline_current" &&
          selectedStory &&
          selectedStory.browsers.length > 0 ? (
            <div className="filters" id="story-browser-filters">
              {selectedStory.browsers.map((browser: keyof typeof browserLabel) => (
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
          <BaselineCurrentView
            selectedEntry={selectedEntry}
            metricsText={metricsText}
            diffReady={diffReady}
            diffBaseSrc={diffBaseSrc}
            diffPixelsSrc={diffPixelsSrc}
            focusMaskSrc={focusMaskSrc}
            showDiff={showDiff}
            setShowDiff={setShowDiff}
            focusDiff={focusDiff}
            setFocusDiff={setFocusDiff}
            zapDiff={zapDiff}
            setZapDiff={setZapDiff}
            zapShowCurrent={zapShowCurrent}
          />
        ) : (
          <CrossBrowserView
            activeCrossPair={activeCrossPair}
            activeCrossDiff={activeCrossDiff}
            activeCrossLeftSrc={activeCrossLeftSrc}
            activeCrossRightSrc={activeCrossRightSrc}
            activeCrossPairId={activeCrossPairId}
            setActiveCrossPairId={setActiveCrossPairId}
            crossPairDiffs={crossPairDiffs}
            crossPairDiffsLoading={crossPairDiffsLoading}
          />
        )}
      </main>
    </div>
  );
}
