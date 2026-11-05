import { expect, test } from "@playwright/test";

test("start a run, win or lose a fight, and keep progress after reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ASHFALL" })).toBeVisible();

  await page.getByPlaceholder("Korvash").fill("Tester");
  await page.getByRole("button", { name: "Begin the descent" }).click();

  // First row of the map is always fights.
  const room = page.locator('[data-testid="map"] button[data-available]').first();
  await expect(room).toBeVisible();
  await room.click();
  await expect(page.getByTestId("enemy")).toBeVisible();
  await expect(page.getByTestId("intent")).toBeVisible();

  // Keep attacking until the fight ends one way or the other.
  for (let i = 0; i < 60; i++) {
    const attack = page.getByRole("button", { name: "⚔️ Attack" });
    if (!(await attack.isVisible())) break;
    await attack.click();
  }
  await expect(page.getByRole("button", { name: /Continue|Return to the War Camp/ })).toBeVisible();
  await expect(page.getByTestId("log")).toContainText("Tester the Brute descends");

  // The run is saved in localStorage and resumes after a reload.
  await page.reload();
  await expect(page.getByTestId("log")).toContainText("Tester the Brute descends");
});

test("camp screen shows classes and upgrades", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Brute/ })).toBeVisible();
  await expect(page.getByText("🔒 20 embers")).toBeVisible();
  await expect(page.getByTestId("embers")).toHaveText(/0 embers/);
  await expect(page.getByText("Hardened")).toBeVisible();
});
