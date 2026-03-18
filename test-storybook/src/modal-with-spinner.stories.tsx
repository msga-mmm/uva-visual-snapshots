import React from "react";
import clsx from "clsx";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";
import "./styles.css";

type ModalWithSpinnerArgs = {
  buttonLabel: string;
  title: string;
  spinnerLabel: string;
};

function ModalWithSpinner({ buttonLabel, title, spinnerLabel }: ModalWithSpinnerArgs): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const openModal = (): void => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsOpen(true);
  };

  const closeModal = (): void => {
    setIsOpen(false);
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  };

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="modal-demo">
      <button
        ref={openButtonRef}
        type="button"
        className="btn btn-primary"
        aria-expanded={isOpen}
        data-modal-open="true"
        onClick={openModal}
      >
        {buttonLabel}
      </button>

      <div
        className={clsx("modal-overlay", isOpen && "is-open")}
        aria-hidden={!isOpen}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeModal();
          }
        }}
      >
        <section className="modal-panel" role="dialog" aria-modal="true" aria-label={title}>
          <h3 className="modal-title">{title}</h3>

          <div className="modal-body">
            <div className="spinner-wrapper">
              <div className="spinner spinner-large" role="status" aria-label={spinnerLabel} />
              <p className="spinner-label">{spinnerLabel}</p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            className="btn btn-secondary"
            data-modal-close="true"
            onClick={closeModal}
          >
            Close
          </button>
        </section>
      </div>
    </div>
  );
}

const meta: Meta<typeof ModalWithSpinner> = {
  title: "Interactions/Modal With Spinner",
  component: ModalWithSpinner,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof ModalWithSpinner>;

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

    if (!openButton) {
      throw new Error("Modal open button was not rendered.");
    }

    openButton.click();
  },
};
