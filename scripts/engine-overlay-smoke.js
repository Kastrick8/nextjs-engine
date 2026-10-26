"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

function transpile(sourcePath, destinationPath) {
	const source = fs.readFileSync(sourcePath, "utf8");
	const result = ts.transpileModule(source, {
		fileName: sourcePath,
		reportDiagnostics: true,
		compilerOptions: {
			target: ts.ScriptTarget.ES2020,
			module: ts.ModuleKind.CommonJS,
			esModuleInterop: true,
		},
	});
	const errors = (result.diagnostics || []).filter(
		(diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
	);
	if (errors.length > 0) {
		throw new Error(errors.map((diagnostic) =>
			ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
		).join("\n"));
	}
	fs.writeFileSync(destinationPath, result.outputText, "utf8");
}

function rect(top, left, width, height) {
	return {
		top,
		left,
		width,
		height,
		right: left + width,
		bottom: top + height,
	};
}

function main() {
	const tempRoot = fs.mkdtempSync(path.join(process.cwd(), ".engine-overlay-smoke-"));
	try {
		const sourcePath = path.join(
			process.cwd(),
			"src", "engine", "core", "engineoverlay", "EngineOverlayRuntime.ts",
		);
		const outputPath = path.join(tempRoot, "EngineOverlayRuntime.js");
		transpile(sourcePath, outputPath);
		const runtime = require(outputPath);

		const centered = runtime.computePopoverPosition(
			rect(100, 100, 80, 40),
			{ width: 120, height: 60 },
			{
				placement: "bottom",
				align: "center",
				offset: 8,
				viewportWidth: 800,
				viewportHeight: 600,
			},
		);
		assert.equal(centered.placement, "bottom");
		assert.equal(centered.top, 148);
		assert.equal(centered.left, 80);

		const flipped = runtime.computePopoverPosition(
			rect(560, 300, 80, 32),
			{ width: 160, height: 100 },
			{
				placement: "bottom",
				viewportWidth: 800,
				viewportHeight: 600,
			},
		);
		assert.equal(flipped.placement, "top");
		assert.ok(flipped.top < 560);

		const clamped = runtime.computePopoverPosition(
			rect(10, 2, 20, 20),
			{ width: 220, height: 80 },
			{
				placement: "top",
				align: "start",
				viewportWidth: 320,
				viewportHeight: 240,
				viewportPadding: 12,
			},
		);
		assert.ok(clamped.left >= 12);
		assert.ok(clamped.top >= 12);
		assert.ok(clamped.left + 220 <= 308);

		const ownerDocument = {};
		const otherDocument = {};
		const releaseA = runtime.registerOverlay("a", ownerDocument);
		assert.equal(runtime.isTopOverlay("a", ownerDocument), true);
		const releaseB = runtime.registerOverlay("b", ownerDocument);
		assert.equal(runtime.isTopOverlay("a", ownerDocument), false);
		assert.equal(runtime.isTopOverlay("b", ownerDocument), true);
		releaseB();
		assert.equal(runtime.isTopOverlay("a", ownerDocument), true);
		releaseA();
		assert.equal(runtime.isTopOverlay("a", ownerDocument), false);

		const releaseOld = runtime.registerOverlay("same", ownerDocument);
		const releaseNew = runtime.registerOverlay("same", ownerDocument);
		assert.equal(runtime.isTopOverlay("same", ownerDocument), true);
		releaseOld();
		assert.equal(runtime.isTopOverlay("same", ownerDocument), true);
		releaseNew();
		assert.equal(runtime.isTopOverlay("same", ownerDocument), false);

		const releaseOtherDocument = runtime.registerOverlay("other", otherDocument);
		assert.equal(runtime.isTopOverlay("other", otherDocument), true);
		assert.equal(runtime.isTopOverlay("other", ownerDocument), false,
			"overlay stacks are isolated by their owning Document");
		releaseOtherDocument();

		const scheduledFrames = new Map();
		let frameToken = 0;
		const frameDocument = {
			defaultView: {
				requestAnimationFrame(callback) {
					const token = ++frameToken;
					scheduledFrames.set(token, callback);
					return token;
				},
				cancelAnimationFrame(token) {
					scheduledFrames.delete(token);
				},
			},
		};
		const frameResults = [];
		runtime.scheduleOverlayFrame(() => frameResults.push("first"), frameDocument);
		const cancelSecondFrame = runtime.scheduleOverlayFrame(() => frameResults.push("cancelled"), frameDocument);
		cancelSecondFrame();
		runtime.scheduleOverlayFrame(() => frameResults.push("third"), frameDocument);
		assert.equal(scheduledFrames.size, 1, "overlay layout callbacks share one animation frame per Document");
		const [scheduledId, runFrame] = scheduledFrames.entries().next().value;
		scheduledFrames.delete(scheduledId);
		runFrame(0);
		assert.deepEqual(frameResults, ["first", "third"], "cancelled layout work is not executed");

		const resizeObservers = [];
		class FakeResizeObserver {
			constructor(callback) {
				this.callback = callback;
				this.targets = new Set();
				this.disconnectCount = 0;
				resizeObservers.push(this);
			}
			observe(target) { this.targets.add(target); }
			unobserve(target) { this.targets.delete(target); }
			disconnect() { this.disconnectCount += 1; this.targets.clear(); }
			notify(target) { this.callback([{ target }]); }
		}
		const resizeDocument = { defaultView: { ResizeObserver: FakeResizeObserver } };
		const trigger = {};
		const panel = {};
		let triggerNotifications = 0;
		let panelNotifications = 0;
		const stopTrigger = runtime.subscribeOverlayResize(trigger, () => triggerNotifications += 1, resizeDocument);
		const stopPanel = runtime.subscribeOverlayResize(panel, () => panelNotifications += 1, resizeDocument);
		assert.equal(resizeObservers.length, 1, "all observed popover elements share one ResizeObserver per Document");
		resizeObservers[0].notify(trigger);
		assert.equal(triggerNotifications, 1);
		assert.equal(panelNotifications, 0, "resize callbacks are scoped to their own observed element");
		stopTrigger();
		assert.equal(resizeObservers[0].targets.has(trigger), false, "inactive trigger targets are unobserved");
		resizeObservers[0].notify(panel);
		assert.equal(panelNotifications, 1);
		stopPanel();
		assert.equal(resizeObservers[0].disconnectCount, 1, "the shared ResizeObserver disconnects when its last target is released");

		const fallbackDocument = { defaultView: {} };
		const stopWithoutObserver = runtime.subscribeOverlayResize({}, () => assert.fail("unsupported ResizeObserver must not subscribe"), fallbackDocument);
		assert.doesNotThrow(stopWithoutObserver, "missing ResizeObserver degrades to a no-op");

		console.log("EngineOverlay runtime smoke tests passed");
	} finally {
		fs.rmSync(tempRoot, { recursive: true, force: true });
	}
}

try {
	main();
} catch (reason) {
	console.error(reason);
	process.exit(1);
}
