import type { Meta, StoryObj } from "@storybook/react";
import { BrowserChipContent, BrowserIcon } from "./BrowserIcon";
import { sampleStoryGroups, StoryFrame } from "./storybook-fixtures";

const meta = {
  title: "Components/BrowserIcon",
  component: BrowserIcon,
} satisfies Meta<typeof BrowserIcon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Chromium: Story = {
  args: {
    browser: "chromium",
  },
};

export const ChipWithCurrentImage: Story = {
  args: {
    browser: "chromium",
  },
  render: () => (
    <StoryFrame width={180}>
      <span className="browser-health-chip">
        <BrowserChipContent
          browser="chromium"
          entry={sampleStoryGroups[0]?.entriesByBrowser.chromium || null}
        />
      </span>
    </StoryFrame>
  ),
};
