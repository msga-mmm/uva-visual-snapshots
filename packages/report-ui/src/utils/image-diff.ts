import { normalizeSrc } from "./report";
import type { CrossPairDiff } from "../types";

interface CompareResultBase {
  message: string;
  mismatchPixels: number | null;
  mismatchRatio: number | null;
}

interface CompareResult extends CompareResultBase {
  status: "dimension_mismatch" | "no_data";
}

interface SimpleCompareResult extends CompareResultBase {
  status: "ready" | "dimension_mismatch" | "no_data";
}

interface LoadedImageData {
  src: string;
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

interface ReadyCompareResult extends CompareResultBase {
  status: "ready";
  mismatchPixels: number;
  mismatchRatio: number;
  left: LoadedImageData;
  right: LoadedImageData;
}

async function loadImage(src: string | null | undefined): Promise<HTMLImageElement> {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load snapshot image."));
    image.src = normalizeSrc(src);
  });
}

function getCanvasContext(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not available in this browser.");
  }

  return context;
}

async function loadImageData(src: string | null | undefined): Promise<LoadedImageData> {
  const image = await loadImage(src);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const context = getCanvasContext(width, height);

  context.drawImage(image, 0, 0);

  return {
    src: normalizeSrc(src),
    width,
    height,
    data: context.getImageData(0, 0, width, height).data,
  };
}

async function compareLoadedImages(
  leftSrc: string | null | undefined,
  rightSrc: string | null | undefined,
): Promise<CompareResult | ReadyCompareResult> {
  if (!leftSrc || !rightSrc) {
    return {
      status: "no_data",
      message: "missing snapshot",
      mismatchPixels: null,
      mismatchRatio: null,
    };
  }

  const left = await loadImageData(leftSrc);
  const right = await loadImageData(rightSrc);

  if (left.width !== right.width || left.height !== right.height) {
    return {
      status: "dimension_mismatch",
      message: `${left.width}x${left.height} vs ${right.width}x${right.height}`,
      mismatchPixels: null,
      mismatchRatio: null,
    };
  }

  let mismatchPixels = 0;
  for (let i = 0; i < left.data.length; i += 4) {
    if (
      left.data[i] !== right.data[i] ||
      left.data[i + 1] !== right.data[i + 1] ||
      left.data[i + 2] !== right.data[i + 2] ||
      left.data[i + 3] !== right.data[i + 3]
    ) {
      mismatchPixels += 1;
    }
  }

  return {
    status: "ready",
    message: "",
    mismatchPixels,
    mismatchRatio: mismatchPixels / (left.width * left.height),
    left,
    right,
  };
}

export async function buildDiffOverlayBySrc(
  leftSrc: string | null | undefined,
  rightSrc: string | null | undefined,
): Promise<CrossPairDiff> {
  const result = await compareLoadedImages(leftSrc, rightSrc);
  if (result.status !== "ready") {
    return {
      status: result.status,
      message: result.message,
      mismatchPixels: result.mismatchPixels,
      mismatchRatio: result.mismatchRatio,
      leftSrc: normalizeSrc(leftSrc),
      rightSrc: normalizeSrc(rightSrc),
      overlaySrc: "",
    };
  }

  const overlayContext = getCanvasContext(result.left.width, result.left.height);
  const overlay = overlayContext.createImageData(result.left.width, result.left.height);

  for (let i = 0; i < result.left.data.length; i += 4) {
    if (
      result.left.data[i] !== result.right.data[i] ||
      result.left.data[i + 1] !== result.right.data[i + 1] ||
      result.left.data[i + 2] !== result.right.data[i + 2] ||
      result.left.data[i + 3] !== result.right.data[i + 3]
    ) {
      overlay.data[i] = 255;
      overlay.data[i + 1] = 0;
      overlay.data[i + 2] = 64;
      overlay.data[i + 3] = 245;
    } else {
      overlay.data[i] = 7;
      overlay.data[i + 1] = 9;
      overlay.data[i + 2] = 14;
      overlay.data[i + 3] = 82;
    }
  }
  overlayContext.putImageData(overlay, 0, 0);

  return {
    status: "ready",
    message: "",
    mismatchPixels: result.mismatchPixels,
    mismatchRatio: result.mismatchRatio,
    leftSrc: result.left.src,
    rightSrc: result.right.src,
    overlaySrc: overlayContext.canvas.toDataURL("image/png"),
  };
}

export async function compareImagesBySrc(
  leftSrc: string | null | undefined,
  rightSrc: string | null | undefined,
): Promise<SimpleCompareResult> {
  const result = await compareLoadedImages(leftSrc, rightSrc);
  return {
    status: result.status,
    message: result.message,
    mismatchPixels: result.mismatchPixels,
    mismatchRatio: result.mismatchRatio,
  };
}
