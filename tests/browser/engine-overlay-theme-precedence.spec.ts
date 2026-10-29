import { expect, test } from "@playwright/test";

async function expectRuntimeOwnedBackdrop(page, dialogName: string, overlayId: string) {
	const dialog = page.getByRole("dialog", { name: dialogName });
	await expect(dialog).toBeVisible();

	// The EngineTheme deliberately sets opacity=0.2 and transition=none.
	// These must not disable the runtime's active animation state.
	const backdrop = page.locator(`[data-engine-overlay-backdrop="${overlayId}"]`);
	await expect(backdrop).toHaveCSS("background-color", "rgb(18, 52, 86)");
	await expect(backdrop).toHaveCSS("opacity", "1");
	await expect(backdrop).toHaveCSS("transition-property", "opacity");
	await expect(backdrop).toHaveCSS("transition-duration", "0.18s");
}

test("EngineTheme backdrop appearance does not override dialog animation state", async ({ page }) => {
	await page.goto("/engine-overlay-theme-test");
	await page.getByRole("button", { name: "Open themed runtime dialog" }).click();
	await expectRuntimeOwnedBackdrop(page, "Themed runtime dialog", "themed-runtime-dialog");

	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog", { name: "Themed runtime dialog" })).toBeHidden();
});

test("EngineTheme backdrop appearance does not override drawer animation state", async ({ page }) => {
	await page.goto("/engine-overlay-theme-test");
	await page.getByRole("button", { name: "Open themed runtime drawer" }).click();
	await expectRuntimeOwnedBackdrop(page, "Themed runtime drawer", "themed-runtime-drawer");

	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog", { name: "Themed runtime drawer" })).toBeHidden();
});
