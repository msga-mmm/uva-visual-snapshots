import type { Meta, StoryObj } from "@storybook/html";
import { createButton } from "./button";
import "./styles.css";

const meta: Meta = {
  title: "Components/Button",
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: { type: "radio" },
      options: ["primary", "secondary"],
    },
    disabled: {
      control: { type: "boolean" },
    },
  },
  render: (args) => createButton(args),
};

export default meta;
type Story = StoryObj;

export const Primary: Story = {
  args: {
    label: "Primary Button",
    variant: "primary",
    disabled: false,
  },
};

export const Secondary: Story = {
  args: {
    label: "Secondary Button",
    variant: "secondary",
    disabled: false,
  },
};

export const Disabled: Story = {
  args: {
    label: "Disabled Button",
    variant: "primary",
    disabled: true,
  },
};
