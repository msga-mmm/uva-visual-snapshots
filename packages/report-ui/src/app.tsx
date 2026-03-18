import React from "react";
import clsx from "clsx";
import appStyles from "./styles/app.module.css";
import controls from "./styles/controls.module.css";
import Sidebar from "./components/Sidebar";
import BaselineCurrentView from "./components/BaselineCurrentView";
import CrossBrowserView from "./components/CrossBrowserView";
import { useReportAppState } from "./hooks/useReportAppState";
import type { ReportData } from "./types";

interface AppProps {
  initialReport: ReportData;
}

export default function App({ initialReport }: AppProps) {
  const state = useReportAppState({ initialReport });
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
    <div className={appStyles.layout}>
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

      <main className={appStyles.main}>
        <div className={appStyles.titleRow}>
          <div>
            <h2 id="story-title">{selectedStory ? selectedStory.label : emptyTitle}</h2>
            <span className={appStyles.meta} id="story-meta">
              {metaText}
            </span>
          </div>
          {compareMode === "baseline_current" &&
          selectedStory &&
          selectedStory.browsers.length > 0 ? (
            <div className={appStyles.filters} id="story-browser-filters">
              {selectedStory.browsers.map((browser: keyof typeof browserLabel) => (
                <button
                  key={browser}
                  type="button"
                  className={clsx(
                    controls.filter,
                    browser === activeStoryBrowser && controls.active,
                  )}
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
