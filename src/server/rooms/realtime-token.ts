import jwt from "jsonwebtoken";

export type RealtimeRoomTokenPayload = {
  sub: string;
  roomId: string;
};

function getRealtimeSecret(): string {
  return process.env.REALTIME_JWT_SECRET ?? process.env.AUTH_SECRET ?? "dev-realtime-secret";
}

export function signRealtimeRoomToken(payload: RealtimeRoomTokenPayload): string {
  return jwt.sign(payload, getRealtimeSecret(), {
    expiresIn: "10m",
    issuer: "knucklebones-web",
    audience: "knucklebones-realtime",
  });
}
