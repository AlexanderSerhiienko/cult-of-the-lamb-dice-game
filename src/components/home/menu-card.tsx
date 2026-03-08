import type { ReactNode } from "react";

type MenuCardProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function MenuCard({ title, description, children }: MenuCardProps) {
  return (
    <section className="mx-auto max-w-2xl space-y-8 rounded-2xl border border-slate-700 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/40 md:p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100 md:text-4xl">{title}</h1>
        <p className="text-sm text-slate-300/85 md:text-base">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
