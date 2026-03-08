export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

export type ColumnIndex = 0 | 1 | 2;

export type Column = DieValue[];

export type Board = [Column, Column, Column];

export type Player = "player" | "bot";

export type Turn = Player;

export type GameStatus = "idle" | "in_progress" | "finished";

export type GameResult = "win" | "lose" | "draw";

export type BoardsByPlayer = Record<Player, Board>;

export type GamePhase = "idle" | "player_turn" | "bot_turn" | "finished";

export type GameWinner = Player | "draw";

export type PlayerScores = Record<Player, number>;

export type BotDifficulty = "easy" | "medium" | "hard";
