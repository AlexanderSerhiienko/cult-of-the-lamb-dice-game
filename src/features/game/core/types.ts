export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

export type ColumnIndex = 0 | 1 | 2;

export type Column = DieValue[];

export type Board = [Column, Column, Column];

export const PLAYER = {
  PLAYER: "player",
  BOT: "bot",
} as const;

export type Player = (typeof PLAYER)[keyof typeof PLAYER];

export type Turn = Player;

export const GAME_STATUS = {
  IDLE: "idle",
  IN_PROGRESS: "in_progress",
  FINISHED: "finished",
} as const;

export type GameStatus = (typeof GAME_STATUS)[keyof typeof GAME_STATUS];

export const GAME_RESULT = {
  WIN: "win",
  LOSE: "lose",
  DRAW: "draw",
} as const;

export type GameResult = (typeof GAME_RESULT)[keyof typeof GAME_RESULT];

export type BoardsByPlayer = Record<Player, Board>;

export const GAME_PHASE = {
  IDLE: "idle",
  PLAYER_TURN: "player_turn",
  BOT_TURN: "bot_turn",
  FINISHED: "finished",
} as const;

export type GamePhase = (typeof GAME_PHASE)[keyof typeof GAME_PHASE];

export type GameWinner = Player | (typeof GAME_RESULT)["DRAW"];

export type PlayerScores = Record<Player, number>;

export const BOT_DIFFICULTY = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
} as const;

export type BotDifficulty = (typeof BOT_DIFFICULTY)[keyof typeof BOT_DIFFICULTY];

export const GAME_MODE = {
  PVB: "pvb",
  LOCAL_PVP: "local_pvp",
} as const;

export type GameMode = (typeof GAME_MODE)[keyof typeof GAME_MODE];
