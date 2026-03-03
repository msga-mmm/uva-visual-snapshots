import React, { type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: ButtonVariant;
}

export function Button({
  label,
  variant = "primary",
  disabled = false,
  ...buttonProps
}: ButtonProps): JSX.Element {
  return (
    <button className={`btn btn-${variant}`} disabled={disabled} {...buttonProps}>
      {label}
    </button>
  );
}
