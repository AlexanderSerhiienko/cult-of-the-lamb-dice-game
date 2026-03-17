import { test, expect } from "@playwright/test";

test("online entry page asks unauthenticated users to sign in", async ({ page }) => {
  await page.goto("/online");

  await expect(page.getByRole("heading", { name: "Online private rooms" })).toBeVisible();
  await expect(page.getByText("Sign in first to create or join online rooms.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create room" })).toHaveCount(0);
});
