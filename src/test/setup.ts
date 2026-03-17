import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { resetMockNavigation, mockNavigationState } from "@/test/mock-navigation";
import { MockSessionProvider, mockSessionControls, resetMockSessionState } from "@/test/mock-session";
import { resetDefaultGameStore } from "@/features/game/store/use-game-store";

vi.mock("next/navigation", () => ({
  usePathname: () => mockNavigationState.pathname,
  useRouter: () => mockNavigationState.router,
  useParams: () => mockNavigationState.params,
  useSearchParams: () => mockNavigationState.searchParams,
}));

vi.mock("next-auth/react", () => ({
  useSession: () => mockSessionControls.state,
  signIn: (...args: unknown[]) => mockSessionControls.signIn(...args),
  signOut: (...args: unknown[]) => mockSessionControls.signOut(...args),
  SessionProvider: MockSessionProvider,
}));

beforeEach(() => {
  vi.useRealTimers();
  Object.defineProperty(window, "matchMedia", {
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })),
    configurable: true,
  });
  Object.defineProperty(window, "localStorage", {
    value: window.localStorage ?? {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
    },
    configurable: true,
  });
  resetMockNavigation();
  resetMockSessionState();
  resetDefaultGameStore();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
