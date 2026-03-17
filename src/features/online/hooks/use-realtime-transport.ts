"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { fetchRealtimeRoomToken } from "@/features/online/api";

export type RealtimeTransportState =
  | "idle"
  | "loading_token"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

export function useRealtimeTransport(params: {
  roomId: string;
  enabled: boolean;
  onSocketReady: (socket: Socket) => () => void | undefined;
}) {
  const { roomId, enabled, onSocketReady } = params;
  const socketRef = useRef<Socket | null>(null);
  const [transportState, setTransportState] = useState<RealtimeTransportState>("idle");
  const [transportError, setTransportError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let disposed = false;
    let cleanupSocketHandlers: () => void | undefined = () => undefined;

    void (async () => {
      try {
        setTransportState("loading_token");
        const { token, realtimeUrl } = await fetchRealtimeRoomToken(roomId);
        if (disposed) {
          return;
        }

        setTransportState("connecting");
        const socket = io(realtimeUrl, {
          transports: ["websocket"],
          auth: { token },
        });
        socketRef.current = socket;

        socket.on("connect_error", (connectError: Error) => {
          setTransportState("reconnecting");
          setTransportError(connectError.message || "Failed to connect realtime service");
        });

        socket.on("connect", () => {
          setTransportError(null);
          setTransportState("connected");
        });

        socket.on("disconnect", () => {
          setTransportState("reconnecting");
        });

        cleanupSocketHandlers = onSocketReady(socket);
      } catch (setupError) {
        if (!disposed) {
          setTransportState("disconnected");
          setTransportError(setupError instanceof Error ? setupError.message : "Socket setup failed");
        }
      }
    })();

    return () => {
      disposed = true;
      cleanupSocketHandlers();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setTransportState("idle");
    };
  }, [enabled, onSocketReady, roomId]);

  return {
    socketRef,
    transportState: enabled ? transportState : "idle",
    transportError: enabled ? transportError : null,
  };
}
