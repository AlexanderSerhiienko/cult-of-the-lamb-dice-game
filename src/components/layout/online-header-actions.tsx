import { HeaderActionButton } from "@/components/ui/header-action-button";

type OnlineHeaderActionsProps = {
  onLeaveMatch: () => void;
  isLeaving: boolean;
};

export function OnlineHeaderActions({ onLeaveMatch, isLeaving }: OnlineHeaderActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <HeaderActionButton onClick={onLeaveMatch} disabled={isLeaving}>
        {isLeaving ? "Leaving..." : "Leave match"}
      </HeaderActionButton>
    </div>
  );
}
