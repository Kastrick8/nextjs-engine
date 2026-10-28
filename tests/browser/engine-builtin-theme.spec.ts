import { expect, test } from "@playwright/test";

test("EngineTheme resolves built-in root styles and named slots without overriding local props", async ({ page }) => {
	await page.goto("/engine-builtin-theme-test");

	const hero = page.locator("#themed-hero");
	await expect(hero).toHaveCSS("background-color", "rgb(124, 58, 237)");
	await expect(hero).toHaveCSS("color", "rgb(248, 250, 252)");
	await expect(hero.locator(":scope > div").first()).toHaveCSS("gap", "12px");
	await expect(hero.locator(":scope > div[aria-hidden='true']")).toHaveCSS("background-color", "rgba(0, 0, 0, 0.2)");

	const nav = page.locator("#themed-nav");
	await expect(nav).toHaveCSS("background-color", "rgb(254, 243, 199)");
	await expect(nav.getByRole("link", { name: "Overview" })).toHaveCSS("color", "rgb(120, 53, 15)");

	const link = page.getByRole("link", { name: "Themed link" });
	await expect(link).toHaveCSS("color", "rgb(14, 116, 144)");
	await expect(link).toHaveCSS("text-decoration-line", "none");

	const select = page.locator("#themed-select");
	const trigger = select.getByRole("combobox", { name: "Choose plan" });
	await expect(trigger).toHaveCSS("background-color", "rgb(236, 252, 203)");
	await expect(select).toHaveCSS("max-width", "320px");
	await trigger.click();
	await expect(select.locator(".e-select-dropdown")).toHaveCSS("border-top-color", "rgb(101, 163, 13)");
	await expect(select.getByRole("option", { name: "Starter" })).toHaveCSS("color", "rgb(22, 101, 52)");

	const imageWrapper = page.locator(".e-img-wrap").first();
	await expect(imageWrapper).toHaveCSS("background-color", "rgb(241, 245, 249)");
	await expect(imageWrapper).toHaveCSS("border-radius", "4px");
	await expect(page.locator(".themed-video")).toHaveCSS("background-color", "rgb(11, 17, 32)");
	await expect(page.locator(".themed-video")).toHaveCSS("border-radius", "4px");
});
