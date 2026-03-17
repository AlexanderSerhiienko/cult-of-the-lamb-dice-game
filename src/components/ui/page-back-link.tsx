"use client";

import Link from "next/link";

type PageBackLinkProps = {
  href: string;
  label: string;
  variant?: "inline" | "overlay" | "floating";
};

export function PageBackLink({ href, label, variant = "inline" }: PageBackLinkProps) {
  const baseClassName =
    "inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-slate-200";

  if (variant === "overlay") {
    return (
      <Link
        href={href}
        className={`${baseClassName} rounded-full border border-slate-800/90 bg-slate-950/85 px-3 py-1.5 shadow-lg backdrop-blur`}
      >
        <span aria-hidden>&larr;</span>
        <span>{label}</span>
      </Link>
    );
  }

  if (variant === "floating") {
    return (
      <Link
        href={href}
        className={`${baseClassName} rounded-full border border-slate-800/80 bg-slate-950/80 px-2.5 py-1 text-xs shadow-lg backdrop-blur`}
      >
        <span aria-hidden>&larr;</span>
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <Link href={href} className={baseClassName}>
      <span aria-hidden>&larr;</span>
      <span>{label}</span>
    </Link>
  );
}
