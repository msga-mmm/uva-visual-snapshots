import React from "react";
import "./CrossBrowserView.css";
import { browserPairs, browserLabel } from "../constants";
import { fmtPercent, pairLabelText } from "../utils/report";
import { BrowserIcon } from "./BrowserIcon";

export default function CrossBrowserView({
  activeCrossPair,
  activeCrossDiff,
  activeCrossLeftSrc,
  activeCrossRightSrc,
  activeCrossPairId,
  setActiveCrossPairId,
  crossPairDiffs,
  crossPairDiffsLoading,
}) {
  return (
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
                  className={pair.id === activeCrossPairId ? "filter active pair-filter" : "filter pair-filter"}
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
  );
}
