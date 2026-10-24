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
	await expect(preview.getByRole("heading", { name: "Reasonable fallback available" })).toBeVisible();
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
	await page.locator("iframe[title^='Live preview:']").scrollIntoViewIfNeeded();
	const badge = preview.getByRole("button", { name: "! Error" });
	await badge.evaluate((element) => element.scrollIntoView({ block: "center", inline: "center" }));
	await badge.hover();
	await expect(preview.getByText("app/page.tsx:1:2", { exact: true })).toBeVisible();
	await expect(preview.getByText(/ENGINE_DEBUG_INLINE_CALLOUT/)).toBeVisible();
	await expect(preview.getByRole("button", { name: "View on Dashboard" })).toBeVisible();
	await preview.getByRole("button", { name: "View on Dashboard" }).click();
	await expect(page.locator(".ed-diagnostic").filter({ hasText: "ENGINE_DEBUG_INLINE_CALLOUT" })).toBeVisible();
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
	await expect(page.locator(".ed-diagnostic").filter({ hasText: "ENGINE_DEBUG_STANDALONE_CALLOUT" })).toBeVisible();
	await expect(page.getByText(/ENGINE_DEBUG_STANDALONE_CALLOUT/).first()).toBeVisible();
	await expect(page.getByRole("button", { name: "/engine-compat-test/browser-dialog/fallback", exact: true })).toHaveAttribute("aria-current", "page");
});


test("EngineDebug merges repeated problems across routes", async ({ page }) => {
	await page.goto("/_engine/debug");
	const previewFrame = page.locator("iframe[title^='Live preview:']");
	const preview = page.frameLocator("iframe[title^='Live preview:']");
	await expect(page.locator(".ed-preview-status")).toHaveText("READY");
	await preview.locator("body").evaluate(body => {
		body.ownerDocument.defaultView?.console.error("ENGINE_DEBUG_DEDUPE_ROUTE_SMOKE: hydration mismatch");
	});
	await page.getByRole("button", { name: "/engine-compat-test/browser-dialog/fallback", exact: true }).click();
	await expect(preview.locator("body")).toBeVisible();
	await expect(preview.getByRole("heading", { name: "Reasonable fallback available" })).toBeVisible();
	await preview.locator("body").evaluate(body => {
		body.ownerDocument.defaultView?.console.error("ENGINE_DEBUG_DEDUPE_ROUTE_SMOKE: hydration mismatch");
	});
	await page.getByRole("tab", { name: /Errors/ }).click();
	const issue = page.locator(".ed-diagnostic").filter({ hasText: "ENGINE_DEBUG_DEDUPE_ROUTE_SMOKE" });
	await expect(issue).toHaveCount(1);
	await expect(issue).toContainText("×2");
	await issue.click();
	await expect(page.getByLabel("Selected diagnostic details")).toContainText("Routes: /");
	await expect(page.getByLabel("Selected diagnostic details")).toContainText("/engine-compat-test/browser-dialog/fallback");
	await expect(previewFrame).toBeVisible();
});

test("EngineDebug keeps unrelated Next.js overlays from obscuring the preview and fits the viewport", async ({ page }) => {
	await page.goto("/_engine/debug");
	await expect(page.locator(".ed-preview-status")).toHaveText("READY");
	const preview = page.frameLocator("iframe[title^='Live preview:']");
	await preview.locator("body").evaluate(body => {
		const overlay = body.ownerDocument.createElement("div");
		overlay.setAttribute("data-nextjs-error-message", "true");
		overlay.textContent = "Failed to compile /guide";
		body.append(overlay);
	});
	await expect(page.locator(".ed-preview-status")).toHaveText("READY");
	await expect(preview.locator("[data-engine-debug-next-overlay-hidden]")).toBeVisible();
	await expect(preview.getByText("Reasonable fallback available")).toBeVisible();
	const viewport = page.locator(".ed-viewport-scroll");
	const fit = page.locator(".ed-frame-fit");
	await expect(fit).toBeVisible();
	const viewportBox = await viewport.boundingBox();
	const fitBox = await fit.boundingBox();
	expect(viewportBox).not.toBeNull();
	expect(fitBox).not.toBeNull();
	expect(fitBox!.width).toBeLessThanOrEqual(viewportBox!.width);
	expect(fitBox!.height).toBeLessThanOrEqual(viewportBox!.height);
	await page.getByRole("button", { name: "Fit preview to available space" }).click();
	await expect(page.getByText("100%", { exact: true })).toBeVisible();
});


test("EngineDebug opens a dynamic route picker with Next.js paths and custom slug values", async ({ page }) => {
	await page.route("**/_engine/debug/routes", async route => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				patterns: ["/", "/blog/[slug]", "/docs/[[...slug]]"],
				staticPaths: ["/", "/blog/hello-world", "/blog/another-post", "/docs", "/docs/api/errors"],
				dynamicPatterns: ["/blog/[slug]", "/docs/[[...slug]]"],
			}),
		});
	});
	await page.goto("/_engine/debug");
	await page.getByRole("button", { name: "/blog/[slug]", exact: true }).click();
	await expect(page.getByRole("dialog", { name: /Choose a route for \/blog\/\[slug\]/ })).toBeVisible();
	await page.getByRole("button", { name: "/blog/hello-world" }).click();
	await expect(page.locator("iframe[title='Live preview: /blog/hello-world']")).toBeVisible();
	await page.getByRole("button", { name: "/blog/[slug]", exact: true }).click();
	await page.getByLabel("slug").fill("special route");
	await page.getByRole("button", { name: "Preview route" }).click();
	await expect(page.locator("iframe[title='Live preview: /blog/special%20route']")).toBeVisible();
});
