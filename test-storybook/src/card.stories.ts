import type { Meta, StoryObj } from "@storybook/html";
import "./styles.css";

type CardArgs = {
  title: string;
  body: string;
  highlighted: boolean;
};

const meta: Meta<CardArgs> = {
  title: "Components/Card",
  tags: ["autodocs"],
  argTypes: {
    highlighted: {
      control: { type: "boolean" },
    },
  },
  render: ({ title, body, highlighted }) => {
    const container = document.createElement("article");
    container.className = `card${highlighted ? " card-highlighted" : ""}`;

    const heading = document.createElement("h3");
    heading.textContent = title;

    const paragraph = document.createElement("p");
    paragraph.textContent = body;

    container.append(heading, paragraph);
    return container;
  },
};

export default meta;
type Story = StoryObj<CardArgs>;

export const Default: Story = {
  args: {
    title: "Visual Snapshot Target",
    body: "Use this story to verify your screenshot capture and diff behavior.",
    highlighted: false,
  },
};

export const Highlighted: Story = {
  args: {
    title: "Highlighted Card",
    body: "A second variation helps verify that multiple stories are captured.",
    highlighted: true,
  },
};
