import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ActionButton } from "@/components/ui/action-button";

type HeaderActionButtonProps = {
  children: ReactNode;
  variant?: "default" | "secondary";
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export function HeaderActionButton({
  children,
  variant = "default",
  disabled = false,
  className = "",
  ...props
}: HeaderActionButtonProps) {
  return (
    <ActionButton
      disabled={disabled}
      variant={variant === "default" ? "header" : "headerSecondary"}
      size="sm"
      shape="xl"
      className={className}
      {...props}
    >
      {children}
    </ActionButton>
  );
}
