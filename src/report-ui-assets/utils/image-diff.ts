import { normalizeSrc } from "./report";

async function loadImage(src) {
  return await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load snapshot image."));
    image.src = normalizeSrc(src);
  });
}

export async function buildDiffOverlayBySrc(leftSrc, rightSrc) {
  if (!leftSrc || !rightSrc) {
    return {
      status: "no_data",
      message: "missing snapshot",
      mismatchPixels: null,
      mismatchRatio: null,
      leftSrc: normalizeSrc(leftSrc),
      rightSrc: normalizeSrc(rightSrc),
      overlaySrc: "",
    };
  }

  const leftImage = await loadImage(leftSrc);
  const rightImage = await loadImage(rightSrc);
  const leftWidth = leftImage.naturalWidth || leftImage.width;
  const leftHeight = leftImage.naturalHeight || leftImage.height;
  const rightWidth = rightImage.naturalWidth || rightImage.width;
  const rightHeight = rightImage.naturalHeight || rightImage.height;
  if (leftWidth !== rightWidth || leftHeight !== rightHeight) {
    return {
      status: "dimension_mismatch",
      message: `${leftWidth}x${leftHeight} vs ${rightWidth}x${rightHeight}`,
      mismatchPixels: null,
      mismatchRatio: null,
      leftSrc: normalizeSrc(leftSrc),
      rightSrc: normalizeSrc(rightSrc),
      overlaySrc: "",
    };
  }

  const width = leftWidth;
  const height = leftHeight;
  const leftCanvas = document.createElement("canvas");
  leftCanvas.width = width;
  leftCanvas.height = height;
  const rightCanvas = document.createElement("canvas");
  rightCanvas.width = width;
  rightCanvas.height = height;
  const leftCtx = leftCanvas.getContext("2d");
  const rightCtx = rightCanvas.getContext("2d");
  if (!leftCtx || !rightCtx) {
    throw new Error("Canvas is not available in this browser.");
  }
  leftCtx.drawImage(leftImage, 0, 0);
  rightCtx.drawImage(rightImage, 0, 0);
  const leftData = leftCtx.getImageData(0, 0, width, height).data;
  const rightData = rightCtx.getImageData(0, 0, width, height).data;

  const overlayCanvas = document.createElement("canvas");
  overlayCanvas.width = width;
  overlayCanvas.height = height;
  const overlayCtx = overlayCanvas.getContext("2d");
  if (!overlayCtx) {
    throw new Error("Canvas is not available in this browser.");
  }
  const overlay = overlayCtx.createImageData(width, height);
  let mismatchPixels = 0;

  for (let i = 0; i < leftData.length; i += 4) {
    if (
      leftData[i] !== rightData[i] ||
      leftData[i + 1] !== rightData[i + 1] ||
      leftData[i + 2] !== rightData[i + 2] ||
      leftData[i + 3] !== rightData[i + 3]
    ) {
      mismatchPixels += 1;
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
  overlayCtx.putImageData(overlay, 0, 0);

  return {
    status: "ready",
    message: "",
    mismatchPixels,
    mismatchRatio: mismatchPixels / (width * height),
    leftSrc: normalizeSrc(leftSrc),
    rightSrc: normalizeSrc(rightSrc),
    overlaySrc: overlayCanvas.toDataURL("image/png"),
  };
}

export async function compareImagesBySrc(leftSrc, rightSrc) {
  if (!leftSrc || !rightSrc) {
    return { status: "no_data", message: "missing snapshot", mismatchPixels: null, mismatchRatio: null };
  }

  const leftImage = await loadImage(leftSrc);
  const rightImage = await loadImage(rightSrc);
  const leftWidth = leftImage.naturalWidth || leftImage.width;
  const leftHeight = leftImage.naturalHeight || leftImage.height;
  const rightWidth = rightImage.naturalWidth || rightImage.width;
  const rightHeight = rightImage.naturalHeight || rightImage.height;
  if (leftWidth !== rightWidth || leftHeight !== rightHeight) {
    return {
      status: "dimension_mismatch",
      message: `${leftWidth}x${leftHeight} vs ${rightWidth}x${rightHeight}`,
      mismatchPixels: null,
      mismatchRatio: null,
    };
  }

  const width = leftWidth;
  const height = leftHeight;
  const leftCanvas = document.createElement("canvas");
  leftCanvas.width = width;
  leftCanvas.height = height;
  const rightCanvas = document.createElement("canvas");
  rightCanvas.width = width;
  rightCanvas.height = height;
  const leftCtx = leftCanvas.getContext("2d");
  const rightCtx = rightCanvas.getContext("2d");
  if (!leftCtx || !rightCtx) {
    throw new Error("Canvas is not available in this browser.");
  }
  leftCtx.drawImage(leftImage, 0, 0);
  rightCtx.drawImage(rightImage, 0, 0);
  const leftData = leftCtx.getImageData(0, 0, width, height).data;
  const rightData = rightCtx.getImageData(0, 0, width, height).data;

  let mismatchPixels = 0;
  for (let i = 0; i < leftData.length; i += 4) {
    if (
      leftData[i] !== rightData[i] ||
      leftData[i + 1] !== rightData[i + 1] ||
      leftData[i + 2] !== rightData[i + 2] ||
      leftData[i + 3] !== rightData[i + 3]
    ) {
      mismatchPixels += 1;
    }
  }
  return {
    status: "ready",
    message: "",
    mismatchPixels,
    mismatchRatio: mismatchPixels / (width * height),
  };
}
