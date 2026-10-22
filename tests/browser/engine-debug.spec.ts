import { expect, test } from "@playwright/test";

test("EngineDebug explores pages, selects nodes, and overlays runtime boundaries", async ({ page }) => {
	await page.goto("/_engine/debug");
	await expect(page.getByRole("heading", { name: "Next.js Engine Debug" })).toBeVisible();
	await expect(page.getByText("DEV ONLY")).toBeVisible();

	await page.getByRole("button", { name: "/engine-compat-test/browser-dialog/fallback", exact: true }).click();
	const preview = page.frameLocator("iframe[title^='Live preview:']");
	await expect(preview.getByRole("heading", { name: "Reasonable fallback available" })).toBeVisible();

	await page.getByRole("button", { name: "Pick node" }).click();
	await preview.getByRole("heading", { name: "Reasonable fallback available" }).click();
	await expect(page.getByText("Static", { exact: true })).toBeVisible();
	await expect(page.getByText("0 bytes", { exact: true })).toBeVisible();

	await page.getByRole("button", { name: "Runtime boundaries" }).click();
	await expect(preview.locator("html")).toHaveAttribute("data-engine-debug-overlay", "true");
	await expect(preview.locator("[data-engine-debug-boundary='STATIC']").first()).toBeVisible();
});

test("EngineDebug exposes live scheduler and mobile simulation controls", async ({ page }) => {
	await page.goto("/_engine/debug");
	await page.getByRole("button", { name: "/engine-compat-test/browser-dialog/fallback", exact: true }).click();
	await expect(page.frameLocator("iframe[title^='Live preview:']").getByRole("heading", { name: "Reasonable fallback available" })).toBeVisible();

	await page.getByRole("tab", { name: "Scheduler" }).click();
	await expect(page.getByRole("heading", { name: "Live work" })).toBeVisible();
	await expect(page.locator(".ed-task").first()).toBeVisible();

	await page.getByRole("tab", { name: "Device" }).click();
	await page.getByRole("button", { name: "Phone" }).click();
	await expect(page.getByText(/390×844 · DPR 3/)).toBeVisible();
	await expect(page.getByLabel("Viewport width")).toHaveValue("390");
	await expect(page.getByLabel("Touch input")).toBeChecked();
	await expect(page.getByLabel("Hover input")).not.toBeChecked();
});


test("EngineDebug captures preview console errors in its Problems view", async ({ page }) => {
	await page.goto("/_engine/debug");
	const preview = page.frameLocator("iframe[title^='Live preview:']");
	await expect(preview.locator("body")).toBeVisible();
	await expect(page.locator(".ed-preview-status")).toHaveText(/^(READY|ERROR)$/);

	await preview.locator("body").evaluate(() => {
		console.error("ENGINE_DEBUG_CAPTURE_SMOKE hydration mismatch");
	});
	await page.getByRole("tab", { name: /Errors/ }).click();
	const capturedDiagnostic = page.locator(".ed-diagnostic").filter({ hasText: "ENGINE_DEBUG_CAPTURE_SMOKE" });
	await expect(capturedDiagnostic).toBeVisible();
	await expect(capturedDiagnostic).toContainText("Hydration");
});

test("EngineDebug shows a waiting state while the preview response is pending", async ({ page }) => {
	let continuePreview!: () => void;
	const previewGate = new Promise<void>((resolve) => {
		continuePreview = resolve;
	});
	await page.route(/__engine_debug=1/, async (route) => {
		await previewGate;
		await route.continue();
	});

	await page.goto("/_engine/debug");
	await expect(page.getByText("Waiting for Next.js…", { exact: true })).toBeVisible();
	continuePreview();
	await expect(page.locator(".ed-preview-state")).toHaveCount(0);
	await expect(page.locator(".ed-preview-status")).toHaveText(/^(READY|ERROR)$/);
});
