"use client";

import { useEffect, useRef } from "react";

type UseRouteLeaveParams = {
  pathname: string;
  isInScope: (path: string) => boolean;
  onLeave: () => void;
};

export function useRouteLeave({ pathname, isInScope, onLeave }: UseRouteLeaveParams): void {
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    const wasInScope = isInScope(previousPathname);
    const isCurrentlyInScope = isInScope(pathname);

    if (wasInScope && !isCurrentlyInScope) {
      onLeave();
    }

    previousPathnameRef.current = pathname;
  }, [isInScope, onLeave, pathname]);
}
