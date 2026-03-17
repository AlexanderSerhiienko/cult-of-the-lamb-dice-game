"use client";

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthControls } from "@/components/auth/auth-controls";
import { renderWithProviders } from "@/test/render";
import { mockSessionControls } from "@/test/mock-session";

describe("AuthControls", () => {
  it("renders loading state", () => {
    renderWithProviders(<AuthControls />, {
      session: { status: "loading", data: null },
    });

    expect(screen.getByText("Auth...")).toBeInTheDocument();
  });

  it("renders sign-in state and triggers google sign-in", async () => {
    const signIn = vi.fn().mockResolvedValue(undefined);
    mockSessionControls.signIn = signIn;

    const { user } = renderWithProviders(<AuthControls />, {
      session: { status: "unauthenticated", data: null },
    });

    await user.click(screen.getByRole("button", { name: "Sign in with Google" }));

    expect(signIn).toHaveBeenCalledWith("google");
  });

  it("renders authenticated user and signs out", async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    mockSessionControls.signOut = signOut;

    const { user } = renderWithProviders(<AuthControls />, {
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: {
            id: "user-1",
            name: "Alex",
            email: "alex@example.com",
          },
        },
      },
    });

    expect(screen.getByText("Alex")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(signOut).toHaveBeenCalled();
  });
});
