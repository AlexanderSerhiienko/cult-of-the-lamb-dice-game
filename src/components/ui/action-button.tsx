import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ActionButtonVariant =
  | "menu"
  | "header"
  | "headerSecondary"
  | "accent"
  | "neutral"
  | "authPrimary"
  | "authSecondary";

type ActionButtonSize = "sm" | "md" | "lg";
type ActionButtonShape = "md" | "xl" | "full";

type SharedActionButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  shape?: ActionButtonShape;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
};

type ActionButtonProps = SharedActionButtonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "disabled" | "className">;

const VARIANT_CLASS: Record<ActionButtonVariant, string> = {
  menu: "bg-violet-400 text-slate-950 hover:bg-violet-300",
  header: "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700",
  headerSecondary: "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900",
  accent: "border-emerald-500/60 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30",
  neutral: "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900",
  authPrimary: "border-emerald-500/60 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25",
  authSecondary: "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800",
};

const SIZE_CLASS: Record<ActionButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs font-medium",
  md: "px-4 py-2 text-sm font-semibold",
  lg: "px-4 py-3 text-sm font-semibold",
};

const SHAPE_CLASS: Record<ActionButtonShape, string> = {
  md: "rounded-md",
  xl: "rounded-xl",
  full: "rounded-full",
};

function getActionButtonClassName(params: {
  variant: ActionButtonVariant;
  size: ActionButtonSize;
  shape: ActionButtonShape;
  fullWidth: boolean;
  disabled: boolean;
  className: string;
}) {
  const { variant, size, shape, fullWidth, disabled, className } = params;

  return [
    "inline-flex items-center justify-center border text-center transition active:scale-[0.98]",
    fullWidth ? "w-full" : "",
    SHAPE_CLASS[shape],
    SIZE_CLASS[size],
    disabled
      ? "cursor-not-allowed border-slate-800 bg-slate-950 text-slate-500 opacity-60"
      : `cursor-pointer ${VARIANT_CLASS[variant]}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function ActionButton({
  children,
  href,
  variant = "neutral",
  size = "md",
  shape = "md",
  fullWidth = false,
  disabled = false,
  className = "",
  type = "button",
  ...props
}: ActionButtonProps) {
  const resolvedClassName = getActionButtonClassName({
    variant,
    size,
    shape,
    fullWidth,
    disabled,
    className,
  });

  if (href && !disabled) {
    return (
      <Link href={href} className={resolvedClassName}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} className={resolvedClassName} {...props}>
      {children}
    </button>
  );
}
