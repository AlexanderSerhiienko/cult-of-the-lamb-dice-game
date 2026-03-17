import { test, expect } from "@playwright/test";

test("local PvP flow starts and hands off the turn", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Local PvP" }).click();

  await expect(page.getByRole("button", { name: "New game" })).toBeVisible();
  await page.getByRole("button", { name: "New game" }).click();

  const playerOneColumn = page.getByRole("button", { name: "Player 1 board column 1" });
  await expect(playerOneColumn).toBeEnabled();
  await playerOneColumn.click();

  await expect(page.getByRole("button", { name: "Player 2 board column 1" })).toBeEnabled();
});
