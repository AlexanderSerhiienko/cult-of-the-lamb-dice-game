import { test, expect } from "@playwright/test";

test("home page exposes the main menu and rules summary", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Knucklebones" })).toBeVisible();
  await expect(page.getByRole("link", { name: "New game with bot" })).toHaveAttribute("href", "/game/bot");
  await expect(page.getByRole("link", { name: "Local PvP" })).toHaveAttribute("href", "/game/local");
  await expect(page.getByRole("link", { name: "Online PvP" })).toHaveAttribute("href", "/online");
  await expect(page.getByText("How to play")).toBeVisible();
  await expect(page.getByText("A die rolls automatically at the start of your turn.")).toBeVisible();
});
