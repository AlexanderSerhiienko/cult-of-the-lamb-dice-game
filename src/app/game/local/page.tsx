import { GAME_MODE } from "@/features/game/core/types";
import { GameModePage } from "@/features/game/components/game-mode-page";

export default function LocalGamePage() {
  return <GameModePage mode={GAME_MODE.LOCAL_PVP} />;
}
