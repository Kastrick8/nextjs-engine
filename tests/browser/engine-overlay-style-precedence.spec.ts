import { expect, test, type Page } from "@playwright/test";

async function expectRuntimeOwnedBackdrop(
	page: Page,
	triggerLabel: string,
	dialogName: string,
	overlayId: string,
) {
	await page.getByRole("button", { name: triggerLabel }).click();
	await expect(page.getByRole("dialog", { name: dialogName })).toBeVisible();

	const backdrop = page.locator(`[data-engine-overlay-backdrop="${overlayId}"]`);
	await expect(backdrop).toHaveCSS("background-color", "rgb(18, 52, 86)");
	await expect(backdrop).toHaveCSS("opacity", "1");
	await expect(backdrop).toHaveCSS("transition-property", "opacity");
	await expect(backdrop).toHaveCSS("transition-duration", "0.18s");

	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog", { name: dialogName })).toBeHidden();
}

test("dialog preserves runtime-owned backdrop animation while accepting visual styles", async ({ page }) => {
	await page.goto("/engine-overlay-style-precedence-test");
	await expectRuntimeOwnedBackdrop(
		page,
		"Open precedence dialog",
		"Precedence dialog",
		"engine-overlay-precedence-dialog",
	);
});

test("drawer preserves runtime-owned backdrop animation while accepting visual styles", async ({ page }) => {
	await page.goto("/engine-overlay-style-precedence-test");
	await expectRuntimeOwnedBackdrop(
		page,
		"Open precedence drawer",
		"Precedence drawer",
		"engine-overlay-precedence-drawer",
	);
});
