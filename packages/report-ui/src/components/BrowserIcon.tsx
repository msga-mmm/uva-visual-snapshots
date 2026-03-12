import React from "react";
import "./BrowserIcon.css";
import type { IconType } from "react-icons";
import { SiFirefoxbrowser, SiGooglechrome, SiSafari } from "react-icons/si";
import type { BrowserId, ReportEntry } from "../types";

const browserIconMap: Record<BrowserId, IconType> = {
  chromium: SiGooglechrome,
  firefox: SiFirefoxbrowser,
  webkit: SiSafari,
};

interface BrowserIconProps {
  browser: BrowserId;
}

export function BrowserIcon({ browser }: BrowserIconProps) {
  const Icon = browserIconMap[browser];
  if (!Icon) {
    return null;
  }
  return <Icon className="browser-icon" aria-hidden focusable="false" />;
}

interface BrowserChipContentProps {
  entry: ReportEntry | null;
  browser: BrowserId;
}

export function BrowserChipContent({ entry, browser }: BrowserChipContentProps) {
  return (
    <>
      <BrowserIcon browser={browser} />
      <span>{entry?.currentImage ? "ok" : "-"}</span>
    </>
  );
}
