import { expect, test } from "@playwright/test";

test("modal inertness preserves a nested popover and restores background interaction", async ({ page }) => {
	await page.goto("/engine-overlay-test");

	const pageRoot = page.getByTestId("overlay-test-page");
	const backgroundAction = page.getByTestId("background-action");
	const backgroundIsInert = () => backgroundAction.evaluate((element) => element.closest("[inert]") !== null);

	await page.getByRole("button", { name: "Open modal" }).click();
	const modal = page.getByRole("dialog", { name: "Overlay regression modal" });
	await expect(modal).toBeVisible();
	await expect.poll(backgroundIsInert).toBe(true);
	await expect(page.getByTestId("modal-content-action")).toBeVisible();

	await page.getByRole("button", { name: "Open nested popover" }).click();
	const popover = page.getByRole("dialog", { name: "Nested popover" });
	await expect(popover).toBeVisible();
	await expect.poll(backgroundIsInert).toBe(true);
	await expect.poll(() => popover.evaluate((element) => element.closest("[inert]") === null)).toBe(true);
	await expect(page.getByTestId("popover-content-action")).toBeVisible();

	await page.keyboard.press("Escape");
	await expect(popover).toBeHidden();
	await expect.poll(backgroundIsInert).toBe(true);

	await page.keyboard.press("Escape");
	await expect(modal).toBeHidden();
	await expect.poll(backgroundIsInert).toBe(false);
	await expect(page.getByRole("button", { name: "Open modal" })).toBeFocused();
});

test("triggerAsChild does not nest buttons and restores focus after Escape", async ({ page }) => {
	await page.goto("/engine-overlay-test");

	const trigger = page.getByTestId("native-trigger");
	await expect(trigger.locator("xpath=ancestor::button")).toHaveCount(0);
	await trigger.click();

	const modal = page.getByRole("dialog", { name: "Native trigger dialog" });
	await expect(modal).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(modal).toBeHidden();
	await expect(trigger).toBeFocused();
});
