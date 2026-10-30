import { expect, test } from "@playwright/test";

test("modal inertness preserves nested overlays and restores focus", async ({ page }) => {
	await page.goto("/engine-overlay-test");

	const backgroundAction = page.getByTestId("background-action");
	const backgroundIsInert = () => backgroundAction.evaluate((element) => element.closest("[inert]") !== null);
	const modalTrigger = page.getByRole("button", { name: "Open modal" });

	await expect.poll(backgroundIsInert).toBe(false);
	await modalTrigger.click();
	const modal = page.getByRole("dialog", { name: "Overlay regression modal" });
	await expect(modal).toBeVisible();
	await expect(page.getByTestId("modal-content-action")).toBeFocused();
	await expect.poll(backgroundIsInert).toBe(true);

	await page.getByRole("button", { name: "Open nested popover" }).click();
	const popover = page.getByRole("dialog", { name: "Nested popover" });
	await expect(popover).toBeVisible();
	await expect(page.getByTestId("popover-content-action")).toBeVisible();
	const modalLayer = await modal.evaluate((element) => getComputedStyle(element.parentElement as HTMLElement).zIndex);
	const popoverLayer = await popover.evaluate((element) => getComputedStyle(element).zIndex);
	expect(Number(popoverLayer)).toBeGreaterThan(Number(modalLayer));
	await expect.poll(backgroundIsInert).toBe(true);
	await expect.poll(() => popover.evaluate((element) => element.closest("[inert]") === null)).toBe(true);

	await page.keyboard.press("Escape");
	await expect(popover).toBeHidden();
	await expect(modal).toBeVisible();
	await expect.poll(backgroundIsInert).toBe(true);

	await page.getByRole("button", { name: "Open nested dialog" }).click();
	const nested = page.getByRole("dialog", { name: "Nested dialog" });
	await expect(nested).toBeVisible();
	await expect(page.getByTestId("nested-dialog-action")).toBeFocused();
	await page.keyboard.press("Escape");
	await expect(nested).toBeHidden();
	await expect(modal).toBeVisible();
	await expect(page.getByRole("button", { name: "Open nested dialog" })).toBeFocused();
	await expect.poll(backgroundIsInert).toBe(true);

	await page.keyboard.press("Escape");
	await expect(modal).toBeHidden();
	await expect.poll(backgroundIsInert).toBe(false);
	await expect(modalTrigger).toBeFocused();
});

test("triggerAsChild composes one native button and focus falls back if the trigger is removed", async ({ page }) => {
	await page.goto("/engine-overlay-test");

	const trigger = page.getByTestId("native-trigger");
	await expect(trigger.locator("xpath=ancestor::button")).toHaveCount(0);
	await expect(page.locator("button button")).toHaveCount(0);
	await trigger.click();

	const modal = page.getByRole("dialog", { name: "Native trigger dialog" });
	await expect(modal).toBeVisible();
	await page.getByTestId("remove-trigger-from-dialog").click();
	await expect(page.getByTestId("native-trigger")).toHaveCount(0);

	await page.keyboard.press("Escape");
	await expect(modal).toBeHidden();
	await expect(page.getByTestId("focus-fallback")).toBeFocused();
});

test("standalone popover is non-modal and outside pointer closes it", async ({ page }) => {
	await page.goto("/engine-overlay-test");

	const backgroundAction = page.getByTestId("background-action");
	await page.getByRole("button", { name: "Open standalone popover" }).click();
	const popover = page.getByRole("dialog", { name: "Standalone popover" });
	await expect(popover).toBeVisible();
	await expect.poll(() => backgroundAction.evaluate((element) => element.closest("[inert]") !== null)).toBe(false);

	await backgroundAction.click();
	await expect(page.getByTestId("background-count")).toHaveText("1");
	await expect(popover).toBeHidden();
});

test("ghost action theme slot overrides secondary and keeps the backwards-compatible fallback", async ({ page }) => {
	await page.goto("/engine-overlay-test");

	await page.getByRole("button", { name: "Open ghost action themed dialog" }).click();
	const dedicatedDialog = page.getByRole("dialog", { name: "Ghost action theme" });
	await expect(dedicatedDialog).toBeVisible();
	await expect(dedicatedDialog.getByRole("button", { name: "Dedicated ghost action" }))
		.toHaveCSS("color", "rgb(180, 83, 9)");
	await page.keyboard.press("Escape");
	await expect(dedicatedDialog).toBeHidden();

	await page.getByRole("button", { name: "Open ghost action fallback dialog" }).click();
	const fallbackDialog = page.getByRole("dialog", { name: "Ghost action fallback" });
	await expect(fallbackDialog).toBeVisible();
	await expect(fallbackDialog.getByRole("button", { name: "Fallback ghost action" }))
		.toHaveCSS("color", "rgb(15, 118, 110)");
});

test("drawer releases its scroll lock and restores focus on Escape", async ({ page }) => {
	await page.goto("/engine-overlay-test");

	const body = page.locator("body");
	const initialOverflow = await body.evaluate((element) => (element as HTMLElement).style.overflow);
	const trigger = page.getByRole("button", { name: "Open settings drawer" });
	await trigger.click();

	const drawer = page.getByRole("dialog", { name: "Settings drawer" });
	await expect(drawer).toBeVisible();
	await expect(page.getByTestId("drawer-action")).toBeFocused();
	await expect.poll(() => body.evaluate((element) => (element as HTMLElement).style.overflow)).toBe("hidden");
	await expect.poll(() => page.getByTestId("background-action").evaluate((element) => element.closest("[inert]") !== null)).toBe(true);

	await page.keyboard.press("Escape");
	await expect(drawer).toBeHidden();
	await expect.poll(() => body.evaluate((element) => (element as HTMLElement).style.overflow)).toBe(initialOverflow);
	await expect(trigger).toBeFocused();
	await expect.poll(() => page.getByTestId("background-action").evaluate((element) => element.closest("[inert]") !== null)).toBe(false);
});

test("controlled open state reports one close transition and restores the external trigger", async ({ page }) => {
	await page.goto("/engine-overlay-test");

	const trigger = page.getByTestId("open-controlled-dialog");
	await trigger.click();
	await expect(page.getByRole("dialog", { name: "Controlled dialog" })).toBeVisible();
	await expect(page.getByTestId("controlled-changes")).toHaveText("0");

	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog", { name: "Controlled dialog" })).toBeHidden();
	await expect(page.getByTestId("controlled-changes")).toHaveText("1");
	await expect(trigger).toBeFocused();
});

test("reduced motion keeps overlay interaction functional without transition delay", async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto("/engine-overlay-test");

	await page.getByRole("button", { name: "Open modal" }).click();
	const modal = page.getByRole("dialog", { name: "Overlay regression modal" });
	await expect(modal).toBeVisible();
	await expect.poll(() => modal.evaluate((element) => (element as HTMLElement).style.transition)).toBe("none");
	await page.keyboard.press("Escape");
	await expect(modal).toBeHidden();
});
