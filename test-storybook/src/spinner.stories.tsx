import React from "react";
import clsx from "clsx";
import type { Meta, StoryObj } from "@storybook/react-vite";
import "./styles.css";

type SpinnerProps = {
  label: string;
  size: "small" | "medium" | "large";
};

function Spinner({ label, size }: SpinnerProps): JSX.Element {
  return (
    <div className="spinner-wrapper">
      <div className={clsx("spinner", `spinner-${size}`)} role="status" aria-label={label} />
      <p className="spinner-label">{label}</p>
    </div>
  );
}

const meta: Meta<typeof Spinner> = {
  title: "Components/Spinner",
  component: Spinner,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: { type: "radio" },
      options: ["small", "medium", "large"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Loading: Story = {
  args: {
    label: "Loading data...",
    size: "medium",
  },
};
