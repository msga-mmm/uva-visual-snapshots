import type { Meta, StoryObj } from "@storybook/react";
import BaselineCurrentView from "./BaselineCurrentView";
import {
  BaselineCurrentViewStoryHarness,
  StoryFrame,
  sampleImages,
  sampleStoryGroups,
} from "./storybook-fixtures";

const meta = {
  title: "Components/BaselineCurrentView",
  component: BaselineCurrentView,
} satisfies Meta<typeof BaselineCurrentView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    selectedEntry: sampleStoryGroups[0].entriesByBrowser.chromium || null,
    metricsText: "",
    diffReady: true,
    diffBaseSrc: sampleImages.diffBase,
    diffPixelsSrc: sampleImages.diffPixels,
    focusMaskSrc: sampleImages.focusMask,
    showDiff: true,
    setShowDiff: () => {},
    focusDiff: true,
    setFocusDiff: () => {},
    zapDiff: false,
    setZapDiff: () => {},
    zapShowCurrent: false,
  },
  render: () => <BaselineCurrentViewStoryHarness />,
};

export const MissingBaseline: Story = {
  args: {
    selectedEntry: sampleStoryGroups[0].entriesByBrowser.webkit || null,
    metricsText: "",
    diffReady: false,
    diffBaseSrc: "",
    diffPixelsSrc: "",
    focusMaskSrc: "",
    showDiff: false,
    setShowDiff: () => {},
    focusDiff: false,
    setFocusDiff: () => {},
    zapDiff: false,
    setZapDiff: () => {},
    zapShowCurrent: false,
  },
  render: () => (
    <StoryFrame>
      <BaselineCurrentView
        selectedEntry={{
          ...(sampleStoryGroups[0].entriesByBrowser.webkit as NonNullable<
            (typeof sampleStoryGroups)[number]["entriesByBrowser"]["webkit"]
          >),
          baselineImage: undefined,
          currentImage: sampleImages.webkit,
        }}
        metricsText="Missing baseline for this browser."
        diffReady={false}
        diffBaseSrc=""
        diffPixelsSrc=""
        focusMaskSrc=""
        showDiff={false}
        setShowDiff={() => {}}
        focusDiff={false}
        setFocusDiff={() => {}}
        zapDiff={false}
        setZapDiff={() => {}}
        zapShowCurrent={false}
      />
    </StoryFrame>
  ),
};
