"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { fetchRealtimeRoomToken } from "@/features/online/api";

export const REALTIME_TRANSPORT_STATE = {
  IDLE: "idle",
  LOADING_TOKEN: "loading_token",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  DISCONNECTED: "disconnected",
} as const;

export type RealtimeTransportState =
  (typeof REALTIME_TRANSPORT_STATE)[keyof typeof REALTIME_TRANSPORT_STATE];

export function useRealtimeTransport(params: {
  roomId: string;
  enabled: boolean;
  onSocketReady: (socket: Socket) => () => void | undefined;
}) {
  const { roomId, enabled, onSocketReady } = params;
  const socketRef = useRef<Socket | null>(null);
  const [transportState, setTransportState] = useState<RealtimeTransportState>(REALTIME_TRANSPORT_STATE.IDLE);
  const [transportError, setTransportError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let disposed = false;
    let cleanupSocketHandlers: () => void | undefined = () => undefined;

    void (async () => {
      try {
        setTransportState(REALTIME_TRANSPORT_STATE.LOADING_TOKEN);
        const { token, realtimeUrl } = await fetchRealtimeRoomToken(roomId);
        if (disposed) {
          return;
        }

        setTransportState(REALTIME_TRANSPORT_STATE.CONNECTING);
        const socket = io(realtimeUrl, {
          transports: ["websocket"],
          auth: { token },
        });
        socketRef.current = socket;

        socket.on("connect_error", (connectError: Error) => {
          setTransportState(REALTIME_TRANSPORT_STATE.RECONNECTING);
          setTransportError(connectError.message || "Failed to connect realtime service");
        });

        socket.on("connect", () => {
          setTransportError(null);
          setTransportState(REALTIME_TRANSPORT_STATE.CONNECTED);
        });

        socket.on("disconnect", () => {
          setTransportState(REALTIME_TRANSPORT_STATE.RECONNECTING);
        });

        cleanupSocketHandlers = onSocketReady(socket);
      } catch (setupError) {
        if (!disposed) {
          setTransportState(REALTIME_TRANSPORT_STATE.DISCONNECTED);
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
      setTransportState(REALTIME_TRANSPORT_STATE.IDLE);
    };
  }, [enabled, onSocketReady, roomId]);

  return {
    socketRef,
    transportState: enabled ? transportState : REALTIME_TRANSPORT_STATE.IDLE,
    transportError: enabled ? transportError : null,
  };
}
