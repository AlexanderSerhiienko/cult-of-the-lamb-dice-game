import { useEffect, useRef, useState } from "react";
import type { Board, DieValue } from "@/features/game/core/types";

type SlotMap = Record<string, true>;
type SlotValueMap = Record<string, DieValue>;

export function useBoardSlotAnimations(board: Board) {
  const previousBoardRef = useRef<Board | null>(null);
  const [impactSlots, setImpactSlots] = useState<SlotMap>({});
  const [removedSlots, setRemovedSlots] = useState<SlotMap>({});
  const [removedValues, setRemovedValues] = useState<SlotValueMap>({});

  useEffect(() => {
    const previousBoard = previousBoardRef.current;
    previousBoardRef.current = board;

    if (!previousBoard) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const nextImpactSlots: SlotMap = {};
    const nextRemovedSlots: SlotMap = {};
    const nextRemovedValues: SlotValueMap = {};
    const rafIds: number[] = [];

    for (let columnIndex = 0; columnIndex < 3; columnIndex += 1) {
      for (let slotIndex = 0; slotIndex < 3; slotIndex += 1) {
        const prevValue = previousBoard[columnIndex][slotIndex];
        const nextValue = board[columnIndex][slotIndex];
        const slotKey = `${columnIndex}-${slotIndex}`;

        if (typeof prevValue !== "number" && typeof nextValue === "number") {
          nextImpactSlots[slotKey] = true;
        }

        if (typeof prevValue === "number" && typeof nextValue !== "number") {
          nextRemovedSlots[slotKey] = true;
          nextRemovedValues[slotKey] = prevValue;
        }
      }
    }

    if (Object.keys(nextImpactSlots).length > 0) {
      const rafId = window.requestAnimationFrame(() => {
        setImpactSlots((prev) => ({ ...prev, ...nextImpactSlots }));
      });
      rafIds.push(rafId);
    }

    if (Object.keys(nextRemovedSlots).length > 0) {
      const rafId = window.requestAnimationFrame(() => {
        setRemovedSlots((prev) => ({ ...prev, ...nextRemovedSlots }));
        setRemovedValues((prev) => ({ ...prev, ...nextRemovedValues }));
      });
      rafIds.push(rafId);
    }

    return () => {
      rafIds.forEach((id) => window.cancelAnimationFrame(id));
    };
  }, [board]);

  const clearImpactSlot = (slotKey: string) => {
    setImpactSlots((prev) => {
      if (!prev[slotKey]) {
        return prev;
      }

      const next = { ...prev };

      delete next[slotKey];

      return next;
    });
  };

  const clearRemovedSlot = (slotKey: string) => {
    setRemovedSlots((prev) => {
      if (!prev[slotKey]) {
        return prev;
      }

      const next = { ...prev };
      delete next[slotKey];
      return next;
    });

    setRemovedValues((prev) => {
      if (!prev[slotKey]) {
        return prev;
      }

      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  };

  return {
    impactSlots,
    removedSlots,
    removedValues,
    clearImpactSlot,
    clearRemovedSlot,
  };
}
