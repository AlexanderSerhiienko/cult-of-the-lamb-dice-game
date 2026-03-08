import type { ButtonHTMLAttributes, ReactNode } from "react";

type HeaderActionButtonProps = {
  children: ReactNode;
  variant?: "default" | "secondary";
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

const variantClass = {
  default: "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700",
  secondary: "border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800",
};

export function HeaderActionButton({
  children,
  variant = "default",
  disabled = false,
  className = "",
  ...props
}: HeaderActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
        disabled
          ? "cursor-not-allowed border-slate-700 bg-slate-900 text-slate-500"
          : variantClass[variant]
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
