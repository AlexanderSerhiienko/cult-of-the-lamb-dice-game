import Link from "next/link";
import type { ReactNode } from "react";

type MenuActionButtonProps = {
  children: ReactNode;
  href?: string;
  disabled?: boolean;
};

export function MenuActionButton({ children, href, disabled = false }: MenuActionButtonProps) {
  if (href && !disabled) {
    return (
      <Link
        href={href}
        className="flex w-full items-center justify-center rounded-xl bg-violet-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-300"
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled
      className="flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm font-semibold text-slate-500"
    >
      {children}
    </button>
  );
}
