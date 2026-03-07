import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import { emptyReport } from "./constants";
import { readInlineReport } from "./utils/report";

const rootNode = document.getElementById("app");
const dataEl = document.getElementById("report-data");
const inlineReport = readInlineReport(dataEl);
const initialReport = inlineReport || emptyReport;

function renderBootstrapError(error) {
  if (!rootNode) {
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  rootNode.innerHTML =
    "<main style='font-family: system-ui, sans-serif; padding: 16px; line-height: 1.5'>" +
    "<h1 style='margin: 0 0 8px; font-size: 1.1rem'>Report UI failed to load</h1>" +
    "<p style='margin: 0 0 8px'>The bundled report UI could not be initialized.</p>" +
    "<p style='margin: 0'><code>" +
    message.replace(/</g, "&lt;") +
    "</code></p>" +
    "</main>";
}

try {
  if (rootNode) {
    createRoot(rootNode).render(
      <App initialReport={initialReport} hasInlineReport={Boolean(inlineReport)} />,
    );
  }
} catch (error) {
  renderBootstrapError(error);
}
