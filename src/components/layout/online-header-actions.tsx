import Link from "next/link";

type OnlineHeaderActionsProps = {
  onLeaveMatch: () => void;
  isLeaving: boolean;
};

export function OnlineHeaderActions({ onLeaveMatch, isLeaving }: OnlineHeaderActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onLeaveMatch}
        disabled={isLeaving}
        className="rounded-md border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60"
      >
        {isLeaving ? "Leaving..." : "Leave match"}
      </button>
      <Link
        href="/"
        className="rounded-md border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800 active:scale-[0.98]"
      >
        Main menu
      </Link>
    </div>
  );
}
