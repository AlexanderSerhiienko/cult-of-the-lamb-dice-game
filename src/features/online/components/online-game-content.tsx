"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { GAME_PHASE, PLAYER } from "@/features/game/core/types";
import { getAvailableColumns } from "@/features/game/core/rules";
import { BoardsStack } from "@/features/game/components/boards-stack";
import { GameResultModal } from "@/features/game/components/game-result-modal";
import { GameSideRail } from "@/features/game/components/game-side-rail";
import { leaveRoom } from "@/features/online/api";
import { useGameStore } from "@/features/game/store/use-game-store";

type OnlineGameContentProps = {
  mySeat: 1 | 2;
  userId: string;
  onSelectColumn: (column: 0 | 1 | 2) => void;
  statusBanner?: ReactNode;
  interactionBlocked?: boolean;
};

export function OnlineGameContent({
  mySeat,
  userId,
  onSelectColumn,
  statusBanner,
  interactionBlocked = false,
}: OnlineGameContentProps) {
  const router = useRouter();
  const phase = useGameStore((state) => state.phase);
  const seatScores = useGameStore((state) => state.seatScores);
  const seat1Board = useGameStore((state) => state.seat1Board);
  const seat2Board = useGameStore((state) => state.seat2Board);
  const currentRoll = useGameStore((state) => state.currentRoll);
  const winner = useGameStore((state) => state.winner);
  const interactionLocked = useGameStore((state) => state.interactionLocked);
  const turnUserId = useGameStore((state) => state.onlineTurnUserId);
  const onlineRoomId = useGameStore((state) => state.onlineRoomId);

  const isMyTurn = turnUserId === userId && phase === GAME_PHASE.PLAYER_TURN;
  const myBoard = mySeat === 1 ? seat1Board : seat2Board;
  const opponentBoard = mySeat === 1 ? seat2Board : seat1Board;
  const myScore = mySeat === 1 ? seatScores.seat1 : seatScores.seat2;
  const opponentScore = mySeat === 1 ? seatScores.seat2 : seatScores.seat1;
  const availableColumns =
    isMyTurn && !interactionLocked && !interactionBlocked && currentRoll !== null ? getAvailableColumns(myBoard) : [];

  async function handleBackToMenu() {
    if (onlineRoomId) {
      await leaveRoom(onlineRoomId).catch(() => undefined);
    }
    router.push("/");
  }

  return (
    <section className="h-[calc(100vh-7.5rem)]">
      {statusBanner}
      <div className="grid h-full grid-cols-[220px_minmax(0,1fr)_220px] gap-5 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
        <GameSideRail
          scoreLabel="Your score"
          scoreValue={myScore}
          scoreTone={PLAYER.PLAYER}
          dieLabel="Your die"
          dieValue={isMyTurn ? currentRoll : null}
          isActiveTurn={isMyTurn}
        />

        <BoardsStack
          upperBoard={opponentBoard}
          lowerBoard={myBoard}
          phase={phase}
          upperBoardTitle="Opponent board"
          lowerBoardTitle="Your board"
          upperAvailableColumns={[]}
          lowerAvailableColumns={[...availableColumns]}
          onSelectColumn={onSelectColumn}
          upperBoardSelectable={false}
        />

        <GameSideRail
          scoreLabel="Opponent score"
          scoreValue={opponentScore}
          scoreTone={PLAYER.BOT}
          dieLabel="Opponent die"
          dieValue={!isMyTurn && phase === GAME_PHASE.PLAYER_TURN ? currentRoll : null}
          isActiveTurn={!isMyTurn && phase === GAME_PHASE.PLAYER_TURN}
        />
      </div>

      {phase === GAME_PHASE.FINISHED && winner ? (
        <GameResultModal
          isOpen
          resultText={
            winner === "draw"
              ? "Draw"
              : winner === (mySeat === 1 ? "player" : "bot")
                ? "Victory"
                : "Defeat"
          }
          playerScore={myScore}
          botScore={opponentScore}
          onRematch={handleBackToMenu}
          onClose={() => undefined}
          actionLabel="Back to menu"
        />
      ) : null}
    </section>
  );
}
