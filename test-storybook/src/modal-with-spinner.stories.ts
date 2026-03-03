import type { Meta, StoryObj } from "@storybook/html";
import "./styles.css";

type ModalWithSpinnerArgs = {
  buttonLabel: string;
  title: string;
  spinnerLabel: string;
};

const meta: Meta<ModalWithSpinnerArgs> = {
  title: "Interactions/Modal With Spinner",
  tags: ["autodocs"],
  render: ({ buttonLabel, title, spinnerLabel }) => {
    const root = document.createElement("div");
    root.className = "modal-demo";

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "btn btn-primary";
    openButton.textContent = buttonLabel;
    openButton.setAttribute("aria-expanded", "false");
    openButton.setAttribute("data-modal-open", "true");

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.setAttribute("aria-hidden", "true");

    const dialog = document.createElement("section");
    dialog.className = "modal-panel";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", title);

    const heading = document.createElement("h3");
    heading.className = "modal-title";
    heading.textContent = title;

    const body = document.createElement("div");
    body.className = "modal-body";

    const spinnerWrapper = document.createElement("div");
    spinnerWrapper.className = "spinner-wrapper";

    const spinner = document.createElement("div");
    spinner.className = "spinner spinner-large";
    spinner.setAttribute("role", "status");
    spinner.setAttribute("aria-label", spinnerLabel);

    const spinnerText = document.createElement("p");
    spinnerText.className = "spinner-label";
    spinnerText.textContent = spinnerLabel;

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "btn btn-secondary";
    closeButton.textContent = "Close";
    closeButton.setAttribute("data-modal-close", "true");

    spinnerWrapper.append(spinner, spinnerText);
    body.appendChild(spinnerWrapper);
    dialog.append(heading, body, closeButton);
    overlay.appendChild(dialog);
    root.append(openButton, overlay);

    return root;
  },
};

export default meta;
type Story = StoryObj<ModalWithSpinnerArgs>;

export const Default: Story = {
  args: {
    buttonLabel: "Open modal",
    title: "Processing request",
    spinnerLabel: "Loading...",
  },
  play: async ({ canvasElement }) => {
    const openButton = canvasElement.querySelector<HTMLButtonElement>(
      "button[data-modal-open='true']",
    );
    const closeButton = canvasElement.querySelector<HTMLButtonElement>(
      "button[data-modal-close='true']",
    );
    const overlay = canvasElement.querySelector<HTMLElement>(".modal-overlay");
    const root = canvasElement.querySelector<HTMLElement>(".modal-demo");

    if (!overlay || !root || !openButton || !closeButton) {
      throw new Error("Modal story nodes were not rendered.");
    }

    let previousFocus: HTMLElement | null = null;

    const openModal = () => {
      previousFocus =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      openButton.setAttribute("aria-expanded", "true");
      closeButton.focus();
    };

    const closeModal = () => {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      openButton.setAttribute("aria-expanded", "false");
      if (previousFocus) {
        previousFocus.focus();
      }
    };

    openButton.addEventListener("click", openModal);
    closeButton.addEventListener("click", closeModal);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeModal();
      }
    });
    root.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && overlay.classList.contains("is-open")) {
        closeModal();
      }
    });

    openButton.click();
  },
};
