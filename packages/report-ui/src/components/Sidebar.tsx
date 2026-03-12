import React from "react";
import "./Sidebar.css";
import { browserLabel, filters } from "../constants";
import { fmtPercent } from "../utils/report";
import { BrowserChipContent } from "./BrowserIcon";
import type {
  CompareMode,
  CrossStorySignal,
  FilterId,
  StoryGroup,
} from "../types";

interface SidebarProps {
  compareMode: CompareMode;
  setCompareMode: React.Dispatch<React.SetStateAction<CompareMode>>;
  activeFilter: FilterId;
  setActiveFilter: React.Dispatch<React.SetStateAction<FilterId>>;
  visibleStories: StoryGroup[];
  selectedStory: StoryGroup | null;
  setSelectedStoryKey: React.Dispatch<React.SetStateAction<string | null>>;
  crossStorySignals: Record<string, CrossStorySignal>;
  summaryText: string;
}

export default function Sidebar({
  compareMode,
  setCompareMode,
  activeFilter,
  setActiveFilter,
  visibleStories,
  selectedStory,
  setSelectedStoryKey,
  crossStorySignals,
  summaryText,
}: SidebarProps) {
  return (
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
        {filters.map((filter: (typeof filters)[number]) => (
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
          visibleStories.map((story: StoryGroup) => (
            <button
              key={story.storyKey}
              type="button"
              className={story.storyKey === selectedStory?.storyKey ? "item active" : "item"}
              data-key={story.storyKey}
              onClick={() => setSelectedStoryKey(story.storyKey)}
            >
              <span className="item-head">
                <span className="name">{story.label}</span>
                {compareMode === "cross_browser"
                  ? (() => {
                      const signal = crossStorySignals[story.storyKey] || {
                        state: "na",
                        worstRatio: null,
                      };
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
                  : null}
              </span>
              <span className="browser-health-row">
                {story.browserHealth.map((health: StoryGroup["browserHealth"][number]) => (
                  <span
                    key={health.browser}
                    className={
                      health.hasCurrent ? "browser-health-chip" : "browser-health-chip muted"
                    }
                    title={
                      (browserLabel[health.browser] || health.browser) +
                      " · " +
                      (health.hasCurrent
                        ? "current snapshot available"
                        : "current snapshot missing")
                    }
                  >
                    <BrowserChipContent entry={health.entry} browser={health.browser} />
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
  );
}
