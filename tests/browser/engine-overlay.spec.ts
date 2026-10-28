import { expect, test } from "@playwright/test";

const FIXTURE = "/engine-compat-test/overlay-runtime";

test("native triggers compose directly and modal dialog owns focus and inertness", async ({ page }) => {
	await page.goto(FIXTURE);

	const trigger = page.getByTestId("parent-dialog-trigger");
	await expect(trigger).toHaveCount(1);
	await expect(page.locator("button button")).toHaveCount(0);
	await trigger.click();

	const parent = page.locator('[role="dialog"]').filter({ has: page.getByTestId("dialog-initial-focus") });
	await expect(parent).toBeVisible();
	await expect(page.getByTestId("dialog-initial-focus")).toBeFocused();
	await expect.poll(() => page.getByTestId("overlay-background").evaluate((element) => element.closest("[inert]") !== null)).toBe(true);
	await expect.poll(() => page.getByTestId("overlay-background").evaluate((element) => element.closest('[aria-hidden="true"]') !== null)).toBe(true);

	// The background must not be operable while a modal is active.
	await expect(page.getByTestId("background-action")).not.toBeDisabled();
	await page.getByTestId("nested-popover-trigger").click();
	const popover = page.getByRole("dialog", { name: "Nested popover" });
	await expect(popover).toBeVisible();
	await expect(parent).toBeVisible();

	// Escape belongs to the topmost overlay only.
	await page.keyboard.press("Escape");
	await expect(popover).toBeHidden();
	await expect(parent).toBeVisible();

	await page.getByTestId("nested-dialog-trigger").click();
	const nested = page.getByRole("dialog", { name: "Nested dialog" });
	await expect(nested).toBeVisible();
	await expect(page.getByTestId("nested-dialog-action")).toBeFocused();
	await expect(parent.locator("xpath=ancestor-or-self::*[@inert]")).toHaveCount(1);

	await page.keyboard.press("Escape");
	await expect(nested).toBeHidden();
	await expect(parent).toBeVisible();
	await expect(page.getByTestId("nested-dialog-trigger")).toBeFocused();
	await expect.poll(() => page.getByTestId("overlay-background").evaluate((element) => element.closest("[inert]") !== null)).toBe(true);

	await page.keyboard.press("Escape");
	await expect(parent).toBeHidden();
	await expect(trigger).toBeFocused();
	await expect.poll(() => page.getByTestId("overlay-background").evaluate((element) => element.closest("[inert]") !== null)).toBe(false);
	await expect.poll(() => page.getByTestId("overlay-background").evaluate((element) => element.closest('[aria-hidden="true"]') !== null)).toBe(false);
});

test("popover is non-modal and outside pointer closes it", async ({ page }) => {
	await page.goto(FIXTURE);
	await page.getByTestId("standalone-popover-trigger").click();
	await expect(page.getByRole("dialog", { name: "Standalone popover" })).toBeVisible();
	await expect.poll(() => page.getByTestId("overlay-background").evaluate((element) => element.closest("[inert]") !== null)).toBe(false);

	await page.getByTestId("background-action").click();
	await expect(page.getByTestId("background-count")).toHaveText("1");
	await expect(page.getByRole("dialog", { name: "Standalone popover" })).toBeHidden();
});

test("drawer restores body scroll and focus when it closes", async ({ page }) => {
	await page.goto(FIXTURE);
	const trigger = page.getByRole("button", { name: "Open settings drawer" });
	await trigger.click();
	const drawer = page.getByRole("dialog", { name: "Settings drawer" });
	await expect(drawer).toBeVisible();
	await expect.poll(() => page.locator("body").evaluate((element) => (element as HTMLElement).style.overflow)).toBe("hidden");
	await expect.poll(() => page.getByTestId("overlay-background").evaluate((element) => element.closest("[inert]") !== null)).toBe(true);

	await page.keyboard.press("Escape");
	await expect(drawer).toBeHidden();
	await expect.poll(() => page.locator("body").evaluate((element) => (element as HTMLElement).style.overflow)).toBe("");
	await expect(trigger).toBeFocused();
	await expect.poll(() => page.getByTestId("overlay-background").evaluate((element) => element.closest("[inert]") !== null)).toBe(false);
});

test("controlled open state notifies once and restores its external trigger", async ({ page }) => {
	await page.goto(FIXTURE);
	const trigger = page.getByTestId("open-controlled-dialog");
	await trigger.click();
	await expect(page.getByRole("dialog", { name: "Controlled dialog" })).toBeVisible();
	await expect(page.getByTestId("controlled-changes")).toHaveText("0");

	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog", { name: "Controlled dialog" })).toBeHidden();
	await expect(page.getByTestId("controlled-changes")).toHaveText("1");
	await expect(trigger).toBeFocused();
});

test("anchor triggers open overlays without performing anchor navigation", async ({ page }) => {
	await page.goto(FIXTURE);
	const trigger = page.getByTestId("anchor-popover-trigger");
	await expect(trigger).toHaveAttribute("href", "#must-not-navigate");
	await trigger.click();
	await expect(page.getByRole("dialog", { name: "Anchor-triggered popover" })).toBeVisible();
	await expect(page).toHaveURL(/\/engine-compat-test\/overlay-runtime$/);
	await expect(trigger).toHaveAttribute("aria-expanded", "true");
});

test("a controlled overlay can reopen before its exit-presence timer expires", async ({ page }) => {
	await page.goto(FIXTURE);
	const trigger = page.getByTestId("open-controlled-dialog");
	const dialog = page.locator('[role="dialog"]').filter({ has: page.getByTestId("controlled-dialog-action") });
	await trigger.click();
	await expect(dialog).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(page.getByTestId("controlled-changes")).toHaveText("1");

	// Use a direct DOM activation so the transparent exit backdrop's hit-test
	// behavior doesn't add an artificial wait beyond the actual close event.
	await trigger.evaluate((element) => (element as HTMLButtonElement).click());
	await expect(dialog).toBeVisible();
	await expect(page.getByTestId("controlled-changes")).toHaveText("1");
	await expect.poll(() => page.getByTestId("overlay-background").evaluate((element) => element.closest("[inert]") !== null)).toBe(true);
});

test("focus restoration uses a safe fallback if the trigger disappears", async ({ page }) => {
	await page.goto(FIXTURE);
	await page.getByTestId("parent-dialog-trigger").click();
	await expect(page.getByRole("dialog", { name: "Parent dialog" })).toBeVisible();

	// Exercise DOM removal while the background is inert; the app React handler
	// removes the trigger and leaves the already-open dialog alive.
	await page.evaluate(() => {
		(document.querySelector('[data-testid="remove-parent-trigger"]') as HTMLButtonElement)?.click();
	});
	await expect(page.getByTestId("parent-dialog-trigger")).toHaveCount(0);
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog", { name: "Parent dialog" })).toBeHidden();
	await expect(page.getByTestId("focus-fallback")).toBeFocused();
});
