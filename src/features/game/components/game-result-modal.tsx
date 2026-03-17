import Link from "next/link";
import type { ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import { ActionButton } from "@/components/ui/action-button";

type GameResultModalProps = {
  isOpen: boolean;
  resultText: string;
  playerScore: number;
  botScore: number;
  onRematch: () => void;
  onClose: () => void;
  actionLabel?: string;
  actionHref?: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  details?: ReactNode;
};

export function GameResultModal({
  isOpen,
  resultText,
  playerScore,
  botScore,
  onRematch,
  onClose,
  actionLabel = "Rematch",
  actionHref,
  secondaryActionLabel,
  secondaryActionHref,
  details,
}: GameResultModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      contentClassName="max-w-sm border-violet-500/40 animate-modal-pop"
    >
      <h2 className="text-xl font-bold text-violet-200">{resultText}</h2>
      <p className="mt-2 text-sm text-slate-300">
        Final score: {playerScore} - {botScore}
      </p>
      {details ? <div className="mt-4">{details}</div> : null}
      <div className="mt-4 space-y-3">
        {actionHref ? (
          <Link
            href={actionHref}
            className="block w-full rounded-md bg-violet-400 px-4 py-2.5 text-center text-base font-semibold text-slate-950 transition hover:bg-violet-300"
          >
            {actionLabel}
          </Link>
        ) : (
          <ActionButton
            onClick={onRematch}
            variant="menu"
            size="md"
            fullWidth
            className="text-base"
          >
            {actionLabel}
          </ActionButton>
        )}

        {secondaryActionHref ? (
          <Link
            href={secondaryActionHref}
            className="block w-full rounded-md border border-slate-600 bg-slate-900 px-4 py-2.5 text-center text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
          >
            {secondaryActionLabel}
          </Link>
        ) : null}
      </div>
    </Modal>
  );
}
