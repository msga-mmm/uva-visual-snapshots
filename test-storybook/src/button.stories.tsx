import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import "./styles.css";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
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
};

export default meta;
type Story = StoryObj<typeof Button>;

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
