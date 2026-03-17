import type { ReactNode } from "react";
import { ActionButton } from "@/components/ui/action-button";

type MenuActionButtonProps = {
  children: ReactNode;
  href?: string;
  disabled?: boolean;
};

export function MenuActionButton({ children, href, disabled = false }: MenuActionButtonProps) {
  return (
    <ActionButton
      href={href}
      disabled={disabled}
      variant="menu"
      size="lg"
      shape="xl"
      fullWidth
    >
      {children}
    </ActionButton>
  );
}
