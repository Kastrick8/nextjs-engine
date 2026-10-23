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


test("EngineDebug pins a mapped problem to its element and opens its dashboard details", async ({ page }) => {
	await page.goto("/_engine/debug");
	await page.getByRole("button", { name: "/engine-compat-test/browser-dialog/fallback", exact: true }).click();
	const preview = page.frameLocator("iframe[title^='Live preview:']");
	const componentName = await preview.locator("[data-engine-debug-path][data-engine-debug-name]").evaluateAll((elements) => {
		const names = elements.map((element) => element.getAttribute("data-engine-debug-name") || element.getAttribute("data-engine-debug-type") || "");
		return names.find((name) =>
			/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) && names.filter((candidate) => candidate === name).length === 1
		) ?? "";
	});
	expect(componentName, "the fixture should contain a uniquely identified Engine node").not.toBe("");
	const componentLabel = componentName.charAt(0).toUpperCase() + componentName.slice(1);
	await preview.locator("body").evaluate((body, name) => {
		body.ownerDocument.defaultView?.console.error("ENGINE_DEBUG_INLINE_CALLOUT at " + name + " (app/page.tsx:1:2)");
	}, componentLabel);

	const marker = preview.locator("[data-engine-debug-inline-callout]");
	await expect(marker).toBeVisible();
	const badge = preview.getByRole("button", { name: "! Error" });
	await badge.hover();
	await expect(preview.getByText("app/page.tsx:1:2", { exact: true })).toBeVisible();
	await expect(preview.getByText(/ENGINE_DEBUG_INLINE_CALLOUT/)).toBeVisible();
	await expect(preview.getByRole("button", { name: "View on Dashboard" })).toBeVisible();
	await preview.getByRole("button", { name: "View on Dashboard" }).click();

	await expect(page.locator(".ed-diagnostic").filter({ hasText: /ENGINE_DEBUG_(?:INLINE|STANDALONE)_CALLOUT/ })).toBeVisible();
	await expect(page.getByText(/ENGINE_DEBUG_INLINE_CALLOUT/).first()).toBeVisible();
});


test("a normal Engine page can open its inline issue directly in EngineDebug", async ({ page }) => {
	await page.goto("/engine-compat-test/browser-dialog/fallback");
	const componentName = await page.locator("[data-engine-debug-path][data-engine-debug-name]").evaluateAll((elements) => {
		const names = elements.map((element) => element.getAttribute("data-engine-debug-name") || element.getAttribute("data-engine-debug-type") || "");
		return names.find((name) =>
			/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) && names.filter((candidate) => candidate === name).length === 1
		) ?? "";
	});
	expect(componentName, "the Engine page should expose a uniquely identifiable node").not.toBe("");
	const componentLabel = componentName.charAt(0).toUpperCase() + componentName.slice(1);
	await page.locator("body").evaluate((body, name) => {
		body.ownerDocument.defaultView?.console.error("ENGINE_DEBUG_STANDALONE_CALLOUT at " + name + " (app/page.tsx:1:2)");
	}, componentLabel);

	const marker = page.locator("[data-engine-debug-inline-callout]");
	await expect(marker).toBeVisible();
	await page.getByRole("button", { name: "! Error" }).hover();
	await expect(page.getByRole("button", { name: "View on Dashboard" })).toBeVisible();
	await page.getByRole("button", { name: "View on Dashboard" }).click();

	await expect(page).toHaveURL(/\/_engine\/debug/);
	await expect(page.locator(".ed-diagnostic").filter({ hasText: /ENGINE_DEBUG_(?:INLINE|STANDALONE)_CALLOUT/ })).toBeVisible();
	await expect(page.getByText(/ENGINE_DEBUG_STANDALONE_CALLOUT/).first()).toBeVisible();
	await expect(page.getByRole("button", { name: "/engine-compat-test/browser-dialog/fallback", exact: true })).toHaveAttribute("aria-current", "page");
});
