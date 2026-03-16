import Link from "next/link";
import { Modal } from "@/components/ui/modal";

type GameResultModalProps = {
  isOpen: boolean;
  resultText: string;
  playerScore: number;
  botScore: number;
  onRematch: () => void;
  onClose: () => void;
  actionLabel?: string;
  actionHref?: string;
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
      {actionHref ? (
        <Link
          href={actionHref}
          className="mt-4 block w-full rounded-md bg-violet-400 px-4 py-2.5 text-center text-base font-semibold text-slate-950 transition hover:bg-violet-300"
        >
          {actionLabel}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onRematch}
          className="mt-4 w-full rounded-md bg-violet-400 px-4 py-2.5 text-base font-semibold text-slate-950 transition hover:bg-violet-300"
        >
          {actionLabel}
        </button>
      )}
    </Modal>
  );
}
