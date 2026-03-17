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

function getSeatPerspective(params: {
  mySeat: 1 | 2;
  seat1Board: ReturnType<typeof useGameStore.getState>["seat1Board"];
  seat2Board: ReturnType<typeof useGameStore.getState>["seat2Board"];
  seatScores: ReturnType<typeof useGameStore.getState>["seatScores"];
}) {
  const { mySeat, seat1Board, seat2Board, seatScores } = params;

  if (mySeat === 1) {
    return {
      myBoard: seat1Board,
      opponentBoard: seat2Board,
      myScore: seatScores.seat1,
      opponentScore: seatScores.seat2,
      winningToken: "player" as const,
    };
  }

  return {
    myBoard: seat2Board,
    opponentBoard: seat1Board,
    myScore: seatScores.seat2,
    opponentScore: seatScores.seat1,
    winningToken: "bot" as const,
  };
}

function getSelectableOnlineColumns(params: {
  isMyTurn: boolean;
  interactionLocked: boolean;
  interactionBlocked: boolean;
  currentRoll: number | null;
  myBoard: ReturnType<typeof useGameStore.getState>["seat1Board"];
}) {
  const { isMyTurn, interactionLocked, interactionBlocked, currentRoll, myBoard } = params;

  if (!isMyTurn || interactionLocked || interactionBlocked || currentRoll === null) {
    return [];
  }

  return getAvailableColumns(myBoard);
}

function getOnlineResultText(params: {
  winner: ReturnType<typeof useGameStore.getState>["winner"];
  winningToken: "player" | "bot";
}) {
  const { winner, winningToken } = params;

  if (winner === "draw") {
    return "Draw";
  }

  return winner === winningToken ? "Victory" : "Defeat";
}

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
  const { myBoard, opponentBoard, myScore, opponentScore, winningToken } = getSeatPerspective({
    mySeat,
    seat1Board,
    seat2Board,
    seatScores,
  });
  const availableColumns = getSelectableOnlineColumns({
    isMyTurn,
    interactionLocked,
    interactionBlocked,
    currentRoll,
    myBoard,
  });
  const showMyDie = isMyTurn;
  const showOpponentDie = !isMyTurn && phase === GAME_PHASE.PLAYER_TURN;

  async function handleBackToMenu() {
    if (onlineRoomId) {
      await leaveRoom(onlineRoomId).catch(() => undefined);
    }
    router.push("/");
  }

  return (
    <section className="relative h-[calc(100vh-7.5rem)]">
      {statusBanner ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-4 pt-2">
          {statusBanner}
        </div>
      ) : null}
      <div className="grid h-full grid-cols-[220px_minmax(0,1fr)_220px] gap-5 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
        <GameSideRail
          scoreLabel="Your score"
          scoreValue={myScore}
          scoreTone={PLAYER.PLAYER}
          dieLabel="Your die"
          dieValue={showMyDie ? currentRoll : null}
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
          dieValue={showOpponentDie ? currentRoll : null}
          isActiveTurn={showOpponentDie}
        />
      </div>

      {phase === GAME_PHASE.FINISHED && winner ? (
        <GameResultModal
          isOpen
          resultText={getOnlineResultText({ winner, winningToken })}
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
