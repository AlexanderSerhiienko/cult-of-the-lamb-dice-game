import type { GameStoreActions } from "@/features/game/store/types/game-store";
import type { OnlineSnapshot } from "@/features/online/types";

export function applySnapshotToGameStore(params: {
  snapshot: OnlineSnapshot;
  applyOnlineServerState: GameStoreActions["applyOnlineServerState"];
}) {
  const { snapshot, applyOnlineServerState } = params;

  applyOnlineServerState({
    seat1Board: snapshot.seat1Board,
    seat2Board: snapshot.seat2Board,
    currentRoll: snapshot.currentRoll,
    phase: snapshot.phase,
    seatScores: snapshot.seatScores,
    winner:
      snapshot.winner === "seat1"
        ? "player"
        : snapshot.winner === "seat2"
          ? "bot"
          : snapshot.winner,
    revision: snapshot.revision,
    turnUserId: snapshot.turnUserId,
  });
}

export function getOnlineSeat(snapshot: OnlineSnapshot, userId: string): 1 | 2 {
  return snapshot.players.seat1 === userId ? 1 : 2;
}
