import React from "react";
import clsx from "clsx";
import controls from "../styles/controls.module.css";
import styles from "./BaselineCurrentView.module.css";
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
      <section className={styles.images}>
        <article className={styles.card}>
          <h3>Baseline</h3>
          <div className={styles.viewport}>
            {selectedEntry?.baselineImage ? (
              <img
                id="baseline-img"
                alt="Baseline snapshot"
                src={normalizeSrc(selectedEntry.baselineImage)}
              />
            ) : (
              <p className={styles.empty} id="baseline-empty">
                No baseline image for this entry.
              </p>
            )}
          </div>
        </article>

        <article className={styles.card}>
          <h3>Current</h3>
          <div className={styles.viewport}>
            {selectedEntry?.currentImage ? (
              <img
                id="current-img"
                alt="Current snapshot"
                src={normalizeSrc(selectedEntry.currentImage)}
              />
            ) : (
              <p className={styles.empty} id="current-empty">
                No current image for this entry.
              </p>
            )}
          </div>
        </article>
      </section>

      <section className={styles.diff}>
        <div className={styles.diffHead}>
          <h3>Diff</h3>
          <div className={styles.diffControls}>
            <button
              id="btn-toggle-diff"
              className={clsx(controls.btn, controls.btnPrimary)}
              type="button"
              aria-pressed={showDiff ? "true" : "false"}
              onClick={() => setShowDiff((prev: boolean) => !prev)}
            >
              Show Diff Pixels
            </button>
            {showDiff ? (
              <button
                id="btn-focus-diff"
                className={clsx(controls.btn, controls.btnPrimary)}
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
                className={clsx(controls.btn, controls.btnPrimary)}
                type="button"
                aria-pressed={zapDiff ? "true" : "false"}
                onClick={() => setZapDiff((prev: boolean) => !prev)}
              >
                Zap
              </button>
            ) : null}
          </div>
        </div>

        <p className={styles.metrics} id="metrics">
          {metricsText}
        </p>
        <div className={styles.viewport}>
          {diffReady ? (
            <div id="diff-stage" className={styles.diffStage}>
              <img id="diff-base-img" alt="Baseline in diff panel" src={diffBaseSrc} />
              {showDiff && diffPixelsSrc ? (
                <img
                  id="diff-pixels-img"
                  className={clsx(
                    styles.layer,
                    zapDiff && (zapShowCurrent ? styles.zapRed : styles.zapGreen),
                  )}
                  alt=""
                  aria-hidden="true"
                  src={diffPixelsSrc}
                />
              ) : null}
              {showDiff && focusDiff && focusMaskSrc ? (
                <img
                  id="diff-focus-mask-img"
                  className={styles.layer}
                  alt=""
                  aria-hidden="true"
                  src={focusMaskSrc}
                />
              ) : null}
            </div>
          ) : (
            <p className={styles.empty} id="diff-empty">
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
