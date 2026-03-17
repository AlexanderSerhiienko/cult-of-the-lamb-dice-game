import { test, expect } from "@playwright/test";

test("settings page is reachable and exposes gameplay controls", async ({ page }) => {
  await page.goto("/settings");

  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByText("Bot difficulty")).toBeVisible();
  await expect(page.getByText("Easy")).toBeVisible();
  await expect(page.getByText("Medium")).toBeVisible();
  await expect(page.getByText("Hard")).toBeVisible();
  await expect(page.getByRole("button", { name: /On|Off/ })).toBeVisible();
});
