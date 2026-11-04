import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "quiet";
};

export function Button({ variant = "primary", ...props }: ButtonProps) {
  return <button className={`button button-${variant}`} {...props} />;
}
