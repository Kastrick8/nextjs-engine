"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const Module = require("module");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const ts = require("typescript");

function transpile(sourcePath, destinationPath) {
	const source = fs.readFileSync(sourcePath, "utf8");
	const result = ts.transpileModule(source, {
		fileName: sourcePath,
		reportDiagnostics: true,
		compilerOptions: {
			target: ts.ScriptTarget.ES2020,
			module: ts.ModuleKind.CommonJS,
			jsx: ts.JsxEmit.ReactJSX,
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

		const releaseA = runtime.registerOverlay("a");
		assert.equal(runtime.isTopOverlay("a"), true);
		const releaseB = runtime.registerOverlay("b");
		assert.equal(runtime.isTopOverlay("a"), false);
		assert.equal(runtime.isTopOverlay("b"), true);
		releaseB();
		assert.equal(runtime.isTopOverlay("a"), true);
		releaseA();
		assert.equal(runtime.isTopOverlay("a"), false);

		const releaseOld = runtime.registerOverlay("same");
		const releaseNew = runtime.registerOverlay("same");
		assert.equal(runtime.isTopOverlay("same"), true);
		releaseOld();
		assert.equal(runtime.isTopOverlay("same"), true);
		releaseNew();
		assert.equal(runtime.isTopOverlay("same"), false);

		// Overlay stacks and body-scroll locking are isolated per Document.
		function makeEventTarget() {
			const listeners = new Map();
			return {
				addEventListener(type, listener) {
					if (!listeners.has(type)) listeners.set(type, new Set());
					listeners.get(type).add(listener);
				},
				removeEventListener(type, listener) {
					listeners.get(type)?.delete(listener);
				},
				emit(type) {
					for (const listener of [...(listeners.get(type) ?? [])]) {
						if (typeof listener === "function") listener({ type });
						else listener.handleEvent({ type });
					}
				},
				count(type) { return listeners.get(type)?.size ?? 0; },
			};
		}
		function makeDocument() {
			const view = makeEventTarget();
			const visualViewport = makeEventTarget();
			const frames = new Map();
			let nextFrame = 1;
			Object.assign(view, {
				innerWidth: 1000,
				innerHeight: 800,
				visualViewport,
				getComputedStyle: () => ({ paddingRight: "4px" }),
				requestAnimationFrame(callback) {
					const id = nextFrame++;
					frames.set(id, callback);
					return id;
				},
				cancelAnimationFrame(id) { frames.delete(id); },
				runAnimationFrame() {
					const callbacks = [...frames.values()];
					frames.clear();
					for (const callback of callbacks) callback(0);
				},
				pendingFrames: () => frames.size,
			});
			Object.assign(visualViewport, { width: 1000, height: 800, offsetLeft: 0, offsetTop: 0 });
			const body = { style: { overflow: "auto", paddingRight: "4px" } };
			const ownerDocument = { defaultView: view, body, documentElement: { clientWidth: 980 }, activeElement: null };
			return ownerDocument;
		}

		const documentA = makeDocument();
		const documentB = makeDocument();
		const unregisterA = runtime.registerOverlay("dialog-a", documentA);
		const unregisterB = runtime.registerOverlay("dialog-b", documentB);
		assert.equal(runtime.isTopOverlay("dialog-a", documentA), true, "overlay stack is scoped to its owning document");
		assert.equal(runtime.isTopOverlay("dialog-b", documentB), true, "another document has an independent overlay stack");
		const releaseLockA = runtime.lockBodyScroll(documentA);
		const releaseLockA2 = runtime.lockBodyScroll(documentA);
		assert.equal(documentA.body.style.overflow, "hidden", "scroll locking starts on the owning document");
		assert.equal(documentA.body.style.paddingRight, "24px", "scrollbar compensation is applied once");
		releaseLockA();
		assert.equal(documentA.body.style.overflow, "hidden", "a nested lock keeps scrolling disabled");
		releaseLockA2();
		assert.equal(documentA.body.style.overflow, "auto", "last lock restores original overflow");
		assert.equal(documentA.body.style.paddingRight, "4px", "last lock restores original padding");
		unregisterA();
		unregisterB();

		// Multiple popovers share one listener set, one observer and one RAF pass.
		const previousResizeObserver = global.ResizeObserver;
		let resizeObserverInstances = 0;
		let resizeObserverDisconnects = 0;
		let resizeObserverObservations = 0;
		let resizeObserverUnobservations = 0;
		global.ResizeObserver = class TestResizeObserver {
			constructor(callback) { this.callback = callback; this.targets = new Set(); resizeObserverInstances += 1; }
			observe(element) { this.targets.add(element); resizeObserverObservations += 1; }
			unobserve(element) { this.targets.delete(element); resizeObserverUnobservations += 1; }
			disconnect() { this.targets.clear(); resizeObserverDisconnects += 1; }
		};
		const positionDoc = makeDocument();
		const phases = [];
		function makeElement(rect) {
			const properties = new Map();
			return {
				ownerDocument: positionDoc,
				getBoundingClientRect: () => rect,
				style: {
					getPropertyValue: (name) => properties.get(name) ?? "",
					setProperty: (name, value) => properties.set(name, value),
					removeProperty: (name) => properties.delete(name),
				},
			};
		}
		let releasePositionA;
		let releasePositionB;
		try {
			const triggerA = makeElement(rect(100, 100, 80, 40));
			const panelA = makeElement(rect(0, 0, 120, 60));
			const triggerB = makeElement(rect(250, 200, 70, 35));
			const panelB = makeElement(rect(0, 0, 140, 75));
			releasePositionA = runtime.registerPopoverPositioner({
				ownerDocument: positionDoc, trigger: triggerA, panel: panelA,
				beforeMeasure: () => phases.push("before-a"),
				measure: () => { phases.push("read-a"); return { top: 10, left: 20, placement: "bottom" }; },
				onPosition: () => phases.push("write-a"),
			});
			releasePositionB = runtime.registerPopoverPositioner({
				ownerDocument: positionDoc, trigger: triggerB, panel: panelB,
				beforeMeasure: () => phases.push("before-b"),
				measure: () => { phases.push("read-b"); return { top: 30, left: 40, placement: "top" }; },
				onPosition: () => phases.push("write-b"),
			});
			assert.equal(resizeObserverInstances, 1, "multiple popovers share one ResizeObserver");
			assert.equal(resizeObserverObservations, 4, "the shared observer tracks each trigger and panel");
			assert.equal(positionDoc.defaultView.count("resize"), 1, "only one window resize listener is installed");
			assert.equal(positionDoc.defaultView.count("scroll"), 1, "only one capture-phase scroll listener is installed");
			assert.equal(positionDoc.defaultView.visualViewport.count("resize"), 1, "only one visual viewport listener is installed");
			assert.equal(positionDoc.defaultView.pendingFrames(), 1, "initial positioning work is coalesced into one frame");
			positionDoc.defaultView.runAnimationFrame();
			assert.deepEqual(phases, ["before-a", "before-b", "read-a", "read-b", "write-a", "write-b"],
				"all positioners finish style-write and geometry-read phases before publishing positions");
			phases.length = 0;
			positionDoc.defaultView.emit("scroll");
			positionDoc.defaultView.emit("resize");
			positionDoc.defaultView.emit("scroll");
			assert.equal(positionDoc.defaultView.pendingFrames(), 1, "repeated viewport events schedule only one frame");
			positionDoc.defaultView.runAnimationFrame();
			assert.equal(phases.filter((value) => value.startsWith("read-")).length, 2,
				"one shared frame measures each registered popover exactly once");
			releasePositionA();
			releasePositionA = undefined;
			assert.equal(positionDoc.defaultView.count("resize"), 1, "one remaining popover keeps the shared listeners");
			assert.equal(resizeObserverUnobservations, 2, "removed popover elements are unobserved independently");
			releasePositionB();
			releasePositionB = undefined;
			assert.equal(positionDoc.defaultView.count("resize"), 0, "last popover removes the shared resize listener");
			assert.equal(positionDoc.defaultView.count("scroll"), 0, "last popover removes the shared scroll listener");
			assert.equal(positionDoc.defaultView.visualViewport.count("resize"), 0, "last popover removes viewport listeners");
			assert.equal(resizeObserverDisconnects, 1, "last popover disconnects the shared ResizeObserver");
		} finally {
			releasePositionA?.();
			releasePositionB?.();
			if (previousResizeObserver === undefined) delete global.ResizeObserver;
			else global.ResizeObserver = previousResizeObserver;
		}

		// Focusable discovery ignores hidden/inert ancestors and negative tab stops.
		const focusable = (options = {}) => ({
			isConnected: true,
			tabIndex: options.tabIndex ?? 0,
			matches: (selector) => selector === ":disabled" && Boolean(options.disabled),
			closest: () => options.hiddenAncestor ? {} : null,
			getClientRects: () => options.noRects ? [] : [{}],
		});
		const focusableVisible = focusable();
		const hiddenDescendant = focusable({ hiddenAncestor: true });
		const negativeTabStop = focusable({ tabIndex: -1 });
		const disabledControl = focusable({ disabled: true });
		const focusRoot = { querySelectorAll: () => [focusableVisible, hiddenDescendant, negativeTabStop, disabledControl] };
		assert.deepEqual(runtime.getFocusableElements(focusRoot), [focusableVisible],
			"hidden/inert descendants, disabled controls and negative tab stops are excluded");

		// Render the real OverlayTrigger source and verify native interactive
		// children are composed rather than nested. Mock only the provider hook.
		const overlayPartsSource = path.join(
			process.cwd(), "src", "engine", "components", "EngineOverlay", "OverlayParts.tsx",
		);
		const overlayPartsOutput = path.join(tempRoot, "OverlayParts.js");
		transpile(overlayPartsSource, overlayPartsOutput);
		const originalModuleLoad = Module._load;
		let OverlayParts;
		Module._load = function(request, parent, isMain) {
			if (request === "../../providers/EngineProvider" && parent?.filename === overlayPartsOutput) {
				return { useHandler: () => undefined };
			}
			return originalModuleLoad.call(this, request, parent, isMain);
		};
		try {
			OverlayParts = require(overlayPartsOutput);
		} finally {
			Module._load = originalModuleLoad;
		}
		const triggerDefaults = {
			label: "Open details",
			expanded: false,
			controls: "overlay-details",
			hasPopup: "dialog",
			onClick: () => undefined,
			triggerRef: React.createRef(),
		};
		const renderTrigger = (props) => ReactDOMServer.renderToStaticMarkup(
			React.createElement(OverlayParts.OverlayTrigger, { ...triggerDefaults, ...props }),
		);
		const nativeButtonMarkup = renderTrigger({
			children: React.createElement("button", { className: "consumer-button", "data-owner": "app" }, "Open details"),
		});
		assert.equal((nativeButtonMarkup.match(/<button/g) ?? []).length, 1,
			"a supplied native button is composed instead of nested");
		assert.ok(nativeButtonMarkup.includes('data-owner="app"'), "native button attributes are preserved");
		assert.ok(nativeButtonMarkup.includes('aria-expanded="false"'), "trigger state ARIA is composed onto the native button");

		const nativeAnchorMarkup = renderTrigger({
			children: React.createElement("a", { href: "#details", className: "consumer-link" }, "Open details"),
		});
		assert.equal((nativeAnchorMarkup.match(/<a\b/g) ?? []).length, 1,
			"a supplied native anchor is composed directly");
		assert.equal((nativeAnchorMarkup.match(/<button\b/g) ?? []).length, 0,
			"a composed anchor is not wrapped by a button");
		assert.ok(nativeAnchorMarkup.includes('href="#details"'), "native anchor navigation attributes are preserved");

		const plainContentMarkup = renderTrigger({
			children: React.createElement("span", null, "Open details"),
		});
		assert.equal((plainContentMarkup.match(/<button\b/g) ?? []).length, 1,
			"non-interactive content retains the default button trigger");

		const reportedErrors = [];
		const originalConsoleError = console.error;
		let unsupportedInputMarkup;
		let unsupportedAsChildMarkup;
		try {
			console.error = (...args) => reportedErrors.push(args.join(" "));
			unsupportedInputMarkup = renderTrigger({ children: React.createElement("input", { value: "bad", readOnly: true }) });
			unsupportedAsChildMarkup = renderTrigger({ asChild: true, children: React.createElement("span", null, "not a native trigger") });
		} finally {
			console.error = originalConsoleError;
		}
		assert.equal(unsupportedInputMarkup, "", "unsupported interactive native children fail closed instead of nesting");
		assert.equal(unsupportedAsChildMarkup, "", "explicit asChild rejects non-native elements rather than cloning arbitrary components");
		assert.equal(reportedErrors.length, 2, "invalid trigger contracts emit development diagnostics");

		const stackDocument = makeDocument();
		const lowerLayer = { isConnected: true, style: { zIndex: "1000" } };
		const upperLayer = { isConnected: true, style: { zIndex: "1100" } };
		const releaseLowerLayer = runtime.registerOverlay("lower-layer", stackDocument, {
			baseZIndex: 1000, layers: [{ element: lowerLayer, offset: 0 }],
		});
		const releaseUpperLayer = runtime.registerOverlay("upper-layer", stackDocument, {
			baseZIndex: 1000, layers: [{ element: upperLayer, offset: 0 }],
		});
		assert.ok(Number(upperLayer.style.zIndex) > Number(lowerLayer.style.zIndex),
			"later overlays receive a higher effective z-index even with the same base");
		releaseUpperLayer();
		assert.equal(lowerLayer.style.zIndex, "1000", "removing the top layer restores the remaining overlay's base layer");
		releaseLowerLayer();

		const modalDocument = makeDocument();
		const attributes = new Map();
		const bodyNode = {
			style: { overflow: "auto", paddingRight: "0px" },
			children: [],
			parentElement: null,
			contains(target) { return this === target || this.children.some((child) => child.contains(target)); },
		};
		function makeNode(name) {
			const nodeAttrs = new Map();
			return {
				name, style: { zIndex: "" }, children: [], parentElement: null, inert: false, isConnected: true,
				contains(target) { return this === target || this.children.some((child) => child.contains(target)); },
				setAttribute(key, value) { nodeAttrs.set(key, String(value)); },
				removeAttribute(key) { nodeAttrs.delete(key); },
				hasAttribute(key) { return nodeAttrs.has(key); },
				getAttribute(key) { return nodeAttrs.has(key) ? nodeAttrs.get(key) : null; },
			};
		}
		function attach(parent, child) { child.parentElement = parent; parent.children.push(child); }
		const applicationNode = makeNode("application");
		applicationNode.setAttribute("aria-hidden", "false");
		const modalLayer = makeNode("modal");
		attach(bodyNode, applicationNode);
		attach(bodyNode, modalLayer);
		modalDocument.body = bodyNode;
		const releaseModal = runtime.registerOverlay("modal-inert-smoke", modalDocument, {
			modal: true, baseZIndex: 1000, layers: [{ element: modalLayer, offset: 0 }],
		});
		assert.equal(applicationNode.inert, true, "opening a modal makes background siblings inert");
		assert.equal(applicationNode.getAttribute("aria-hidden"), "true", "background siblings become hidden to assistive technology");
		releaseModal();
		assert.equal(applicationNode.inert, false, "closing the modal restores prior inert state");
		assert.equal(applicationNode.getAttribute("aria-hidden"), "false", "closing the modal restores existing aria-hidden values");

		console.log("EngineOverlay runtime and trigger smoke tests passed");
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
