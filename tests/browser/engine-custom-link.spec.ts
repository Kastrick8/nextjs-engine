import { expect, test } from "@playwright/test";

test("registered custom link resolves EngineTheme base and variant styles", async ({ page }) => {
	await page.goto("/engine-custom-link-test");

	const internal = page.getByTestId("custom-safe-link").getByRole("link", { name: /Read the internal guide/ });
	await expect(internal).toHaveAttribute("href", "/engine-compat-test");
	await expect(internal).toHaveCSS("color", "rgb(21, 94, 117)");
	await expect(internal).toHaveCSS("text-decoration-line", "underline");

	const external = page.getByTestId("custom-external-link").getByRole("link", { name: /Open the external docs/ });
	await expect(external).toHaveAttribute("href", "https://example.com/docs");
	await expect(external).toHaveAttribute("target", "_blank");
	await expect(external).toHaveAttribute("rel", /noopener/);
	await expect(external).toHaveAttribute("rel", /noreferrer/);
	await expect(external).toHaveCSS("text-decoration-line", "none");

	const unsafe = page.getByTestId("custom-unsafe-link");
	await expect(unsafe).toHaveAttribute("data-engine-link-blocked", "true");
	await expect(unsafe).toHaveAttribute("aria-disabled", "true");
	await expect(unsafe.locator("a")).toHaveCount(0);
	await expect(unsafe).toContainText("Unsafe link blocked");
});
