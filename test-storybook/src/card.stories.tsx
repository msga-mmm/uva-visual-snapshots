import React from "react";
import clsx from "clsx";
import type { Meta, StoryObj } from "@storybook/react-vite";
import "./styles.css";

type CardProps = {
  title: string;
  body: string;
  highlighted: boolean;
};

function Card({ title, body, highlighted }: CardProps): JSX.Element {
  return (
    <article className={clsx("card", highlighted && "card-highlighted")}>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

const meta: Meta<typeof Card> = {
  title: "Components/Card",
  component: Card,
  tags: ["autodocs"],
  argTypes: {
    highlighted: {
      control: { type: "boolean" },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

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
