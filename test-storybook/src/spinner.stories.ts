import type { Meta, StoryObj } from "@storybook/html";
import "./styles.css";

type SpinnerArgs = {
  label: string;
  size: "small" | "medium" | "large";
};

const meta: Meta<SpinnerArgs> = {
  title: "Components/Spinner",
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: { type: "radio" },
      options: ["small", "medium", "large"],
    },
  },
  render: ({ label, size }) => {
    const wrapper = document.createElement("div");
    wrapper.className = "spinner-wrapper";

    const spinner = document.createElement("div");
    spinner.className = `spinner spinner-${size}`;
    spinner.setAttribute("role", "status");
    spinner.setAttribute("aria-label", label);

    const text = document.createElement("p");
    text.className = "spinner-label";
    text.textContent = label;

    wrapper.append(spinner, text);
    return wrapper;
  },
};

export default meta;
type Story = StoryObj<SpinnerArgs>;

export const Loading: Story = {
  args: {
    label: "Loading data...",
    size: "medium",
  },
};
