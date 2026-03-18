import type { Meta, StoryObj } from "@storybook/react";
import Sidebar from "./Sidebar";
import {
  SidebarStoryHarness,
  sampleCrossStorySignals,
  sampleStoryGroups,
} from "./storybook-fixtures";

const meta = {
  title: "Components/Sidebar",
  component: Sidebar,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Sidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const BaselineCurrent: Story = {
  args: {
    compareMode: "baseline_current",
    setCompareMode: () => {},
    activeFilter: "all",
    setActiveFilter: () => {},
    visibleStories: sampleStoryGroups,
    selectedStory: sampleStoryGroups[0],
    setSelectedStoryKey: () => {},
    crossStorySignals: sampleCrossStorySignals,
    summaryText: "2 stories · 1 changed · 1 attention",
  },
  render: () => <SidebarStoryHarness />,
};

export const CrossBrowser: Story = {
  args: {
    compareMode: "cross_browser",
    setCompareMode: () => {},
    activeFilter: "all",
    setActiveFilter: () => {},
    visibleStories: sampleStoryGroups,
    selectedStory: sampleStoryGroups[0],
    setSelectedStoryKey: () => {},
    crossStorySignals: sampleCrossStorySignals,
    summaryText: "2 stories · 1 changed · 1 attention",
  },
  render: () => <SidebarStoryHarness initialCompareMode="cross_browser" />,
};
