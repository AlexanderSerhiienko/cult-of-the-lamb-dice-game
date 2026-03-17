import { test, expect } from "@playwright/test";

test.describe("test auth online flow", () => {
  test.skip(!process.env.DATABASE_URL, "requires DATABASE_URL for auth-backed online flow");

  test("signs in through test auth and reaches the online room screen", async ({ page }) => {
    await page.goto("/test-auth?next=/online");

    await page.getByLabel("Email").fill("playwright@example.com");
    await page.getByLabel("Name").fill("Playwright Tester");
    await page.getByRole("button", { name: "Sign in with test auth" }).click();

    await expect(page.getByRole("heading", { name: "Online private rooms" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create room" })).toBeVisible();

    await page.getByRole("button", { name: "Create room" }).click();

    await expect(page).toHaveURL(/\/online\/room\/.+/);
    await expect(page.getByText(/^Room /)).toBeVisible();
    await expect(page.getByRole("button", { name: "Leave room" })).toBeVisible();
  });
});
