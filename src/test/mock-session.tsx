import type { ReactNode } from "react";
import type { Session } from "next-auth";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

type MockSessionState = {
  status: SessionStatus;
  data: Session | null;
};

export const mockSessionControls = {
  state: {
    status: "unauthenticated",
    data: null,
  } as MockSessionState,
  signIn: (...args: unknown[]) => {
    void args;
    return Promise.resolve();
  },
  signOut: (...args: unknown[]) => {
    void args;
    return Promise.resolve();
  },
};

export function setMockSessionState(state: Partial<MockSessionState>) {
  mockSessionControls.state = {
    ...mockSessionControls.state,
    ...state,
  };
}

export function resetMockSessionState() {
  mockSessionControls.state = {
    status: "unauthenticated",
    data: null,
  };
}

export function MockSessionProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
