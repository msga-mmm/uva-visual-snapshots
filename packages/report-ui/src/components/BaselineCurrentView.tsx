import React from "react";
import "./BaselineCurrentView.css";
import { normalizeSrc } from "../utils/report";
import type { ReportEntry } from "../types";

interface BaselineCurrentViewProps {
  selectedEntry: ReportEntry | null;
  metricsText: string;
  diffReady: boolean;
  diffBaseSrc: string;
  diffPixelsSrc: string;
  focusMaskSrc: string;
  showDiff: boolean;
  setShowDiff: React.Dispatch<React.SetStateAction<boolean>>;
  focusDiff: boolean;
  setFocusDiff: React.Dispatch<React.SetStateAction<boolean>>;
  zapDiff: boolean;
  setZapDiff: React.Dispatch<React.SetStateAction<boolean>>;
  zapShowCurrent: boolean;
}

export default function BaselineCurrentView({
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
}: BaselineCurrentViewProps) {
  return (
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
              onClick={() => setShowDiff((prev: boolean) => !prev)}
            >
              Show Diff Pixels
            </button>
            {showDiff ? (
              <button
                id="btn-focus-diff"
                className="btn btn-primary"
                type="button"
                aria-pressed={focusDiff ? "true" : "false"}
                onClick={() => setFocusDiff((prev: boolean) => !prev)}
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
                onClick={() => setZapDiff((prev: boolean) => !prev)}
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
              <img id="diff-base-img" alt="Baseline in diff panel" src={diffBaseSrc} />
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
  );
}
