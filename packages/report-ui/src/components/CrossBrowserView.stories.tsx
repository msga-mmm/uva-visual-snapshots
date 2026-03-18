import type { Meta, StoryObj } from "@storybook/react";
import CrossBrowserView from "./CrossBrowserView";
import {
  CrossBrowserViewStoryHarness,
  StoryFrame,
  sampleCrossPair,
  sampleCrossPairDiffs,
  sampleImages,
} from "./storybook-fixtures";

const meta = {
  title: "Components/CrossBrowserView",
  component: CrossBrowserView,
} satisfies Meta<typeof CrossBrowserView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    activeCrossPair: sampleCrossPair,
    activeCrossDiff: sampleCrossPairDiffs.cf || null,
    activeCrossLeftSrc: sampleImages.chromium,
    activeCrossRightSrc: sampleImages.firefox,
    activeCrossPairId: sampleCrossPair.id,
    setActiveCrossPairId: () => {},
    crossPairDiffs: sampleCrossPairDiffs,
    crossPairDiffsLoading: false,
  },
  render: () => <CrossBrowserViewStoryHarness />,
};

export const NoComparableSnapshots: Story = {
  args: {
    activeCrossPair: sampleCrossPair,
    activeCrossDiff: sampleCrossPairDiffs.cw || null,
    activeCrossLeftSrc: sampleImages.chromium,
    activeCrossRightSrc: "",
    activeCrossPairId: "cw",
    setActiveCrossPairId: () => {},
    crossPairDiffs: sampleCrossPairDiffs,
    crossPairDiffsLoading: false,
  },
  render: () => (
    <StoryFrame>
      <CrossBrowserView
        activeCrossPair={sampleCrossPair}
        activeCrossDiff={sampleCrossPairDiffs.cw || null}
        activeCrossLeftSrc={sampleImages.chromium}
        activeCrossRightSrc=""
        activeCrossPairId="cw"
        setActiveCrossPairId={() => {}}
        crossPairDiffs={sampleCrossPairDiffs}
        crossPairDiffsLoading={false}
      />
    </StoryFrame>
  ),
};
