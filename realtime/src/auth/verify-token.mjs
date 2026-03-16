import jwt from "jsonwebtoken";

function getRealtimeSecret() {
  return process.env.REALTIME_JWT_SECRET || process.env.AUTH_SECRET || "dev-realtime-secret";
}

export function verifyRoomToken(token) {
  const payload = jwt.verify(token, getRealtimeSecret(), {
    issuer: "knucklebones-web",
    audience: "knucklebones-realtime",
  });

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid token payload");
  }

  if (typeof payload.sub !== "string" || typeof payload.roomId !== "string") {
    throw new Error("Invalid token claims");
  }

  return {
    userId: payload.sub,
    roomId: payload.roomId,
  };
}
