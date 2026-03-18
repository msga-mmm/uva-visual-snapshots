import React from "react";
import clsx from "clsx";
import controls from "../styles/controls.module.css";
import styles from "./Sidebar.module.css";
import { browserLabel, filters } from "../constants";
import { fmtPercent } from "../utils/report";
import { BrowserChipContent } from "./BrowserIcon";
import type { CompareMode, CrossStorySignal, FilterId, StoryGroup } from "../types";

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
  const crossPillStateStyles = {
    diff: styles.diff,
    same: styles.same,
    size: styles.size,
    loading: styles.loading,
    na: styles.na,
  } as const;

  return (
    <aside className={styles.sidebar}>
      <h1>UVA Visual Snapshots Report</h1>
      <p className={styles.summary} id="summary">
        {summaryText}
      </p>
      <div className={styles.filters} id="compare-mode">
        <button
          type="button"
          className={clsx(controls.filter, compareMode === "baseline_current" && controls.active)}
          onClick={() => setCompareMode("baseline_current")}
        >
          Baseline vs Current
        </button>
        <button
          type="button"
          className={clsx(controls.filter, compareMode === "cross_browser" && controls.active)}
          onClick={() => setCompareMode("cross_browser")}
        >
          Cross-browser
        </button>
      </div>
      <div className={styles.filters} id="filters">
        {filters.map((filter: (typeof filters)[number]) => (
          <button
            key={filter.id}
            type="button"
            className={clsx(controls.filter, filter.id === activeFilter && controls.active)}
            onClick={() => setActiveFilter(filter.id)}
            data-filter={filter.id}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div id="list" className={styles.list}>
        {visibleStories.length === 0 ? (
          <p className={styles.empty}>No stories match this filter.</p>
        ) : (
          visibleStories.map((story: StoryGroup) => (
            <button
              key={story.storyKey}
              type="button"
              className={clsx(
                styles.item,
                story.storyKey === selectedStory?.storyKey && styles.active,
              )}
              data-key={story.storyKey}
              onClick={() => setSelectedStoryKey(story.storyKey)}
            >
              <span className={styles.itemHead}>
                <span className={styles.name}>{story.label}</span>
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
                        <span
                          className={clsx(styles.crossPill, crossPillStateStyles[signalState])}
                          title={signalTitle}
                        >
                          {signalLabel}
                        </span>
                      );
                    })()
                  : null}
              </span>
              <span className={styles.browserHealthRow}>
                {story.browserHealth.map((health: StoryGroup["browserHealth"][number]) => (
                  <span
                    key={health.browser}
                    className={clsx(styles.browserHealthChip, !health.hasCurrent && styles.muted)}
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
              <span className={clsx(styles.badge, story.status === "unchanged" && styles.ok)}>
                {story.status}
              </span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
