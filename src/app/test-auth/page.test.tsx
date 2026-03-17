"use client";

import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { mockSessionControls } from "@/test/mock-session";

describe("TestAuthPage", () => {
  const originalEnableFlag = process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnableFlag === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH;
    } else {
      process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH = originalEnableFlag;
    }
  });

  it("shows a disabled message when test auth is off", async () => {
    process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH = "0";
    const { default: TestAuthPage } = await import("@/app/test-auth/page");

    renderWithProviders(<TestAuthPage />, {
      pathname: "/test-auth",
      searchParams: { next: "/online" },
      session: { status: "unauthenticated", data: null },
    });

    expect(screen.getByText("Test auth is disabled")).toBeInTheDocument();
  });

  it("routes authenticated users forward with the continue button", async () => {
    process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH = "1";
    const { default: TestAuthPage } = await import("@/app/test-auth/page");
    const push = vi.fn();

    const { user } = renderWithProviders(<TestAuthPage />, {
      pathname: "/test-auth",
      searchParams: { next: "/online" },
      router: { push },
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "u1", name: "Alex", email: "alex@example.com" },
        },
      },
    });

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(push).toHaveBeenCalledWith("/online");
  });

  it("submits test auth credentials and navigates to the callback URL", async () => {
    process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH = "1";
    const { default: TestAuthPage } = await import("@/app/test-auth/page");
    const push = vi.fn();
    mockSessionControls.signIn = vi.fn().mockResolvedValue({ url: "/online" });

    const { user } = renderWithProviders(<TestAuthPage />, {
      pathname: "/test-auth",
      searchParams: { next: "/online" },
      router: { push },
      session: { status: "unauthenticated", data: null },
    });

    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "playwright@example.com");
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Playwright");
    await user.click(screen.getByRole("button", { name: "Sign in with test auth" }));

    await waitFor(() => {
      expect(mockSessionControls.signIn).toHaveBeenCalledWith("test-auth", {
        email: "playwright@example.com",
        name: "Playwright",
        callbackUrl: "/online",
        redirect: false,
      });
      expect(push).toHaveBeenCalledWith("/online");
    });
  });

  it("renders sign-in errors from the provider", async () => {
    process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH = "1";
    const { default: TestAuthPage } = await import("@/app/test-auth/page");
    mockSessionControls.signIn = vi.fn().mockResolvedValue({ error: "Access denied" });

    const { user } = renderWithProviders(<TestAuthPage />, {
      pathname: "/test-auth",
      searchParams: { next: "/online" },
      session: { status: "unauthenticated", data: null },
    });

    await user.click(screen.getByRole("button", { name: "Sign in with test auth" }));

    expect(await screen.findByText("Access denied")).toBeInTheDocument();
  });
});
