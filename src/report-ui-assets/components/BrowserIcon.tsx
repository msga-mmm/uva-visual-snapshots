import React from "react";
import "./BrowserIcon.css";
import { SiFirefoxbrowser, SiGooglechrome, SiSafari } from "react-icons/si";

const browserIconMap = new Map([
  ["chromium", SiGooglechrome],
  ["firefox", SiFirefoxbrowser],
  ["webkit", SiSafari],
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
