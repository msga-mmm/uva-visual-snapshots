import type { Meta, StoryObj } from "@storybook/html";
import "./styles.css";

const meta: Meta = {
  title: "Layout/Long Content",
  tags: ["autodocs"],
  render: () => {
    const container = document.createElement("section");
    container.className = "long-scroll-frame";

    const heading = document.createElement("h3");
    heading.textContent = "Long Content with Visible Scrollbar";
    container.appendChild(heading);

    for (let index = 1; index <= 24; index += 1) {
      const paragraph = document.createElement("p");
      paragraph.textContent =
        `Paragraph ${index}: This intentionally long story overflows a fixed viewport ` +
        "so a scrollbar is always visible for cross-browser snapshot testing.";
      container.appendChild(paragraph);
    }

    return container;
  },
};

export default meta;
type Story = StoryObj;

export const Scrollable: Story = {};
