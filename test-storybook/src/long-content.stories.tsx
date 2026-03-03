import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import "./styles.css";

function LongContent(): JSX.Element {
  return (
    <section className="long-scroll-frame">
      <h3>Long Content with Visible Scrollbar</h3>
      {Array.from({ length: 24 }, (_, index) => (
        <p key={index}>
          Paragraph {index + 1}: This intentionally long story overflows a fixed viewport so a
          scrollbar is always visible for cross-browser snapshot testing.
        </p>
      ))}
    </section>
  );
}

const meta: Meta<typeof LongContent> = {
  title: "Layout/Long Content",
  component: LongContent,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof LongContent>;

export const Scrollable: Story = {};
