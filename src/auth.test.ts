import { describe, expect, it } from "vitest";
import { authOptions } from "@/auth";

describe("auth callbacks", () => {
  it("stores user id and role in jwt callback", async () => {
    const token = await authOptions.callbacks!.jwt!({
      token: {},
      user: { id: "user-1", role: "ADMIN" } as never,
      account: null,
      profile: undefined,
      trigger: "signIn",
      isNewUser: false,
      session: undefined,
    });

    expect(token.userId).toBe("user-1");
    expect(token.role).toBe("ADMIN");
  });

  it("falls back to USER role when jwt user role is missing", async () => {
    const token = await authOptions.callbacks!.jwt!({
      token: {},
      user: { id: "user-1" } as never,
      account: null,
      profile: undefined,
      trigger: "signIn",
      isNewUser: false,
      session: undefined,
    });

    expect(token.role).toBe("USER");
  });

  it("projects id and role into session callback", async () => {
    const session = await authOptions.callbacks!.session!({
      session: { user: { name: "Alex", email: "a@example.com" }, expires: "" } as never,
      token: { userId: "user-1", role: "USER", sub: "fallback-sub" } as never,
      user: null as never,
      newSession: undefined,
      trigger: "update",
    });
    const user = session.user as { id?: string; role?: string } | undefined;

    expect(user?.id).toBe("user-1");
    expect(user?.role).toBe("USER");
  });
});
