import React from "react";
import clsx from "clsx";
import controls from "../styles/controls.module.css";
import styles from "./CrossBrowserView.module.css";
import { browserPairs, browserLabel } from "../constants";
import { fmtPercent, pairLabelText } from "../utils/report";
import { BrowserIcon } from "./BrowserIcon";
import type { BrowserPair, CrossPairDiff } from "../types";

interface CrossBrowserViewProps {
  activeCrossPair: BrowserPair;
  activeCrossDiff: CrossPairDiff | null;
  activeCrossLeftSrc: string;
  activeCrossRightSrc: string;
  activeCrossPairId: string;
  setActiveCrossPairId: React.Dispatch<React.SetStateAction<string>>;
  crossPairDiffs: Partial<Record<string, CrossPairDiff>>;
  crossPairDiffsLoading: boolean;
}

export default function CrossBrowserView({
  activeCrossPair,
  activeCrossDiff,
  activeCrossLeftSrc,
  activeCrossRightSrc,
  activeCrossPairId,
  setActiveCrossPairId,
  crossPairDiffs,
  crossPairDiffsLoading,
}: CrossBrowserViewProps) {
  return (
    <>
      <section className={styles.images}>
        <article className={styles.card}>
          <h3>{browserLabel[activeCrossPair.left] || activeCrossPair.left}</h3>
          <div className={styles.viewport}>
            {activeCrossLeftSrc ? (
              <img
                alt={`${browserLabel[activeCrossPair.left] || activeCrossPair.left} snapshot`}
                src={activeCrossLeftSrc}
              />
            ) : (
              <p className={styles.empty}>No current image for this browser.</p>
            )}
          </div>
        </article>

        <article className={styles.card}>
          <h3>{browserLabel[activeCrossPair.right] || activeCrossPair.right}</h3>
          <div className={styles.viewport}>
            {activeCrossRightSrc ? (
              <img
                alt={`${browserLabel[activeCrossPair.right] || activeCrossPair.right} snapshot`}
                src={activeCrossRightSrc}
              />
            ) : (
              <p className={styles.empty}>No current image for this browser.</p>
            )}
          </div>
        </article>
      </section>

      <section className={styles.diff}>
        <div className={styles.diffHead}>
          <h3>Cross-browser Diff</h3>
          <div className={styles.diffControls}>
            {browserPairs.map((pair: BrowserPair) => {
              const pairDiff = crossPairDiffs[pair.id];
              return (
                <button
                  key={pair.id}
                  type="button"
                  className={clsx(
                    controls.filter,
                    styles.pairFilter,
                    pair.id === activeCrossPairId && controls.active,
                  )}
                  onClick={() => setActiveCrossPairId(pair.id)}
                >
                  <span className={styles.pairLabel}>
                    <BrowserIcon browser={pair.left} />
                    <span className={styles.pairSep}>&harr;</span>
                    <BrowserIcon browser={pair.right} />
                  </span>
                  {pairDiff?.status === "ready" ? (
                    <span className={styles.pairRatio}>{fmtPercent(pairDiff.mismatchRatio)}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <p className={styles.metrics}>
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
        <div className={styles.viewport}>
          {activeCrossDiff?.status === "ready" && activeCrossDiff.leftSrc ? (
            <div id="cross-diff-stage" className={styles.diffStage}>
              <img
                id="cross-diff-base-img"
                alt={`${pairLabelText(activeCrossPair)} base`}
                src={activeCrossDiff.leftSrc}
              />
              {activeCrossDiff.overlaySrc ? (
                <img
                  id="cross-diff-overlay-img"
                  className={styles.layer}
                  alt=""
                  aria-hidden="true"
                  src={activeCrossDiff.overlaySrc}
                />
              ) : null}
            </div>
          ) : (
            <p className={styles.empty}>No generated cross-browser diff image for this pair.</p>
          )}
        </div>
      </section>
    </>
  );
}
