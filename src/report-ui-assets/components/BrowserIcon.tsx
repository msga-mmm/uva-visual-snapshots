import React from "react";
import "./BrowserIcon.css";
import { FaChrome, FaEdge, FaFirefoxBrowser, FaSafari } from "react-icons/fa";

const browserIconMap = new Map([
  ["chromium", FaChrome],
  ["google-chrome", FaChrome],
  ["microsoft-edge", FaEdge],
  ["firefox", FaFirefoxBrowser],
  ["webkit", FaSafari],
]);

export function BrowserIcon({ browser }) {
  const Icon = browserIconMap.get(browser);
  if (!Icon) {
    return null;
  }
  return <Icon className="browser-icon" aria-hidden="true" focusable="false" />;
}

export function BrowserChipContent({ entry, browser }) {
  return (
    <>
      <BrowserIcon browser={browser} />
      <span>{entry?.currentImage ? "ok" : "-"}</span>
    </>
  );
}
