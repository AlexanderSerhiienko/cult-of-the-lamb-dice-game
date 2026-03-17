import type { GameStoreActions } from "@/features/game/store/types/game-store";
import type { OnlineSnapshot } from "@/features/online/types";

export function applySnapshotToGameStore(params: {
  snapshot: OnlineSnapshot;
  applyOnlineServerState: GameStoreActions["applyOnlineServerState"];
}) {
  const { snapshot, applyOnlineServerState } = params;

  applyOnlineServerState({
    playerBoard: snapshot.playerBoard,
    botBoard: snapshot.botBoard,
    currentRoll: snapshot.currentRoll,
    phase: snapshot.phase,
    scores: snapshot.scores,
    winner: snapshot.winner,
    revision: snapshot.revision,
    turnUserId: snapshot.turnUserId,
  });
}

export function getOnlineSeat(snapshot: OnlineSnapshot, userId: string): 1 | 2 {
  return snapshot.players.seat1 === userId ? 1 : 2;
}
