import type { ReactNode } from "react";

type SectionCardProps = {
  children: ReactNode;
  className?: string;
};

export function SectionCard({ children, className = "" }: SectionCardProps) {
  return (
    <div className={`w-full rounded-xl border border-slate-700/80 bg-slate-900/70 p-4 ${className}`}>
      {children}
    </div>
  );
}
