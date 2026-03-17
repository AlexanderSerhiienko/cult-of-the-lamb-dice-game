"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  fetchActiveRankedMatch,
  fetchRankedProfile,
  joinRankedQueue,
  leaveRankedQueue,
  type RankedProfileApi,
} from "@/features/ranked/api";

export function useRankedPage() {
  const router = useRouter();
  const { status } = useSession();
  const [profile, setProfile] = useState<RankedProfileApi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") {
      setIsLoading(false);
      return;
    }

    let disposed = false;

    const load = async () => {
      try {
        const [nextProfile, activeMatch] = await Promise.all([
          fetchRankedProfile(),
          fetchActiveRankedMatch(),
        ]);

        if (disposed) {
          return;
        }

        setProfile(nextProfile);
        if (activeMatch && !hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          router.replace(`/ranked/match/${activeMatch.matchId}`);
        }
      } catch (loadError) {
        if (!disposed) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load ranked mode");
        }
      } finally {
        if (!disposed) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      disposed = true;
    };
  }, [router, status]);

  useEffect(() => {
    if (!isSearching || status !== "authenticated") {
      return;
    }

    let disposed = false;

    const intervalId = window.setInterval(() => {
      void fetchActiveRankedMatch()
        .then((activeMatch) => {
          if (disposed || !activeMatch || hasNavigatedRef.current) {
            return;
          }

          hasNavigatedRef.current = true;
          router.replace(`/ranked/match/${activeMatch.matchId}`);
        })
        .catch(() => {
          // transient errors should not eject the user from queue search
        });
    }, 2500);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [isSearching, router, status]);

  async function handleFindMatch() {
    setError(null);

    try {
      const result = await joinRankedQueue();
      if (result.matchId) {
        hasNavigatedRef.current = true;
        router.push(`/ranked/match/${result.matchId}`);
        return;
      }

      setIsSearching(result.searching);
    } catch (queueError) {
      setError(queueError instanceof Error ? queueError.message : "Failed to join ranked queue");
    }
  }

  async function handleCancel() {
    setError(null);
    setIsCancelling(true);

    try {
      await leaveRankedQueue();
      setIsSearching(false);
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Failed to leave ranked queue");
    } finally {
      setIsCancelling(false);
    }
  }

  return {
    status,
    profile,
    error,
    isLoading,
    isSearching,
    isCancelling,
    handleFindMatch,
    handleCancel,
  };
}
