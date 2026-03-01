export type ButtonVariant = "primary" | "secondary";

export interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  disabled?: boolean;
}

export function createButton({
  label,
  variant = "primary",
  disabled = false,
}: ButtonProps): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = label;
  button.disabled = disabled;
  button.className = `btn btn-${variant}`;
  return button;
}
