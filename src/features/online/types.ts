import type { OnlineAuthoritativeSnapshot } from "@/server/rooms/authoritative-engine";

export type OnlineSnapshot = OnlineAuthoritativeSnapshot;

export type OpponentConnectionState = "connected" | "disconnected" | "left_match";
