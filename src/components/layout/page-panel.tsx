"use client";

import type { ReactNode } from "react";
import { PageBackLink } from "@/components/ui/page-back-link";

type PagePanelProps = {
  children: ReactNode;
  maxWidthClassName: string;
  panelClassName: string;
  backHref?: string;
  backLabel?: string;
  backInsetClassName?: string;
};

export function PagePanel({
  children,
  maxWidthClassName,
  panelClassName,
  backHref,
  backLabel = "Main menu",
  backInsetClassName = "left-4 top-4 sm:left-6 sm:top-6 md:left-8 md:top-8",
}: PagePanelProps) {
  return (
    <div className={`relative mx-auto ${maxWidthClassName}`}>
      {backHref ? (
        <div className={`pointer-events-none absolute z-10 ${backInsetClassName}`}>
          <div className="pointer-events-auto">
            <PageBackLink href={backHref} label={backLabel} variant="floating" />
          </div>
        </div>
      ) : null}
      <section className={panelClassName}>{children}</section>
    </div>
  );
}
