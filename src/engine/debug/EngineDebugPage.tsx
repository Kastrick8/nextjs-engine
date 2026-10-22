"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	appendEngineDebugDiagnostics,
	createEngineDebugDiagnostic,
	formatEngineDebugDiagnostic,
	redactEngineDebugText,
} from "./EngineDebugDiagnostics";
import type { EngineDebugDiagnostic, EngineDebugSource } from "./EngineDebugDiagnostics";
import type {
	EngineSchedulerDebugSnapshot,
	EngineSchedulerDebugTask,
	EngineSchedulerDebugTransition,
} from "../core/enginescheduler/EngineScheduler";

type DeviceMode = "Desktop" | "Tablet" | "Phone" | "Custom";

interface DeviceProfile {
	mode: DeviceMode;
	width: number;
	height: number;
	dpr: number;
	refresh: number;
	touch: boolean;
	hover: boolean;
	orientation: "portrait" | "landscape";
	visualViewport: boolean;
}

interface DebugNode {
	id: string;
	path: string;
	type: string;
	name: string;
	boundary: string;
	rendered: string;
	reason: string;
	hydration: string;
	clientJs: string;
	workClass: string;
	capabilities: string[];
	columns?: number;
}

interface DebugSchedulerWindow extends Window {
	console: Console;
	__NEXT_ENGINE_SCHEDULER_DEBUG__?: { snapshot: () => EngineSchedulerDebugSnapshot };
	__NEXT_ENGINE_DEVICE_DEBUG__?: { profile: DeviceProfile };
	__NEXT_ENGINE_ORIGINAL_MATCH_MEDIA__?: typeof window.matchMedia;
	__NEXT_ENGINE_ORIGINAL_VISUAL_VIEWPORT__?: VisualViewport | null;
	__NEXT_ENGINE_VISUAL_VIEWPORT_CAPTURED__?: boolean;
}

const DEVICE_PROFILES: Record<Exclude<DeviceMode, "Custom">, DeviceProfile> = {
	Desktop: { mode: "Desktop", width: 1440, height: 900, dpr: 1, refresh: 60, touch: false, hover: true, orientation: "landscape", visualViewport: true },
	Tablet: { mode: "Tablet", width: 1024, height: 1366, dpr: 2, refresh: 60, touch: true, hover: false, orientation: "portrait", visualViewport: true },
	Phone: { mode: "Phone", width: 390, height: 844, dpr: 3, refresh: 120, touch: true, hover: false, orientation: "portrait", visualViewport: true },
};

const EMPTY_SCHEDULER: EngineSchedulerDebugSnapshot = {
	tasks: [],
	transitions: [],
	underFramePressure: false,
};

const FRAME_OVERLAY_CSS = `
html[data-engine-debug-overlay="true"] [data-engine-debug-boundary]{
	outline:2px solid var(--engine-debug-color,#64748b)!important;
	outline-offset:-2px!important;
	position:relative!important;
}
html[data-engine-debug-overlay="true"] [data-engine-debug-boundary]::after{
	content:attr(data-engine-debug-boundary);
	position:absolute;z-index:2147483646;top:2px;left:2px;padding:2px 5px;border-radius:4px;
	background:var(--engine-debug-color,#64748b);color:white;font:700 10px/1.4 ui-monospace,monospace;
	pointer-events:none;
}
html[data-engine-debug-overlay="true"] [data-engine-debug-boundary="STATIC"]{--engine-debug-color:#64748b}
html[data-engine-debug-overlay="true"] [data-engine-debug-boundary="SERVER"]{--engine-debug-color:#2563eb}
html[data-engine-debug-overlay="true"] [data-engine-debug-boundary="CLIENT"]{--engine-debug-color:#dc2626}
html[data-engine-debug-overlay="true"] [data-engine-debug-boundary="DEFERRED"]{--engine-debug-color:#9333ea}
html[data-engine-debug-overlay="true"] [data-engine-debug-boundary][style*="display: contents"]> *{outline:2px solid var(--engine-debug-color,#dc2626)!important;outline-offset:-2px!important}
[data-engine-debug-selected="true"]{outline:4px solid #f59e0b!important;outline-offset:2px!important}
[data-engine-debug-selected="true"][style*="display: contents"]> *{outline:4px solid #f59e0b!important;outline-offset:2px!important}
`;

const PAGE_CSS = `
:root{color-scheme:dark;--ed-bg:#1e1e1e;--ed-panel:#252526;--ed-panel-alt:#181818;--ed-border:#3c3c3c;--ed-muted:#9da0a5;--ed-text:#cccccc;--ed-accent:#007acc;--ed-hover:#2a2d2e;--ed-active:#37373d;--ed-error:#f48771;--ed-warning:#cca700}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--ed-bg);color:var(--ed-text);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:12px}
button,input,select{font:inherit;color:inherit}.ed-shell{height:100dvh;display:grid;grid-template-rows:40px minmax(0,1fr);overflow:hidden;background:var(--ed-bg)}
.ed-head{display:flex;align-items:center;gap:10px;padding:0 12px;border-bottom:1px solid var(--ed-border);background:#181818}.ed-brand-mark{width:18px;height:18px;display:grid;place-items:center;border:1px solid #5da9e9;color:#75beff;font:700 10px ui-monospace,monospace}.ed-head h1{font-size:12px;font-weight:600;margin:0;color:#f1f1f1}.ed-badge{font:600 9px ui-monospace,monospace;color:#89d185;border:1px solid #365d36;border-radius:3px;padding:2px 5px;letter-spacing:.04em}.ed-body{min-height:0;display:grid;grid-template-columns:42px 196px minmax(280px,1fr) 304px}
.ed-activity{display:flex;align-items:center;flex-direction:column;gap:4px;padding:7px 0;background:var(--ed-panel-alt);border-right:1px solid #242424}.ed-activity-button{width:34px;height:36px;border:0;border-left:2px solid transparent;background:transparent;color:#858585;display:grid;place-items:center;cursor:pointer;font:16px/1 ui-sans-serif,system-ui;border-radius:0}.ed-activity-button:hover{color:#eee;background:#232323}.ed-activity-button[aria-pressed="true"]{color:#fff;border-left-color:#fff;background:#202020}.ed-activity-button .ed-activity-glyph{font-size:16px}
.ed-sidebar,.ed-inspector{min-height:0;overflow:auto;background:var(--ed-panel)}.ed-sidebar{border-right:1px solid var(--ed-border);padding:0 0 12px}.ed-inspector{border-left:1px solid var(--ed-border);padding:0 10px 14px}.ed-section-title{margin:0;padding:13px 12px 9px;color:#bbbbbb;font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:600}.ed-sidebar-subtitle{padding:3px 12px 10px;color:var(--ed-muted);font:10px ui-monospace,monospace}
.ed-route,.ed-button,.ed-mode,.ed-filter,.ed-diagnostic{border:1px solid transparent;background:transparent;color:var(--ed-text);border-radius:2px;cursor:pointer}.ed-route{display:block;width:100%;padding:5px 10px 5px 17px;text-align:left;margin:0;font:12px ui-monospace,SFMono-Regular,Consolas,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ed-route:hover{background:var(--ed-hover)}.ed-route[aria-current="page"]{background:#37373d;color:#fff}.ed-button,.ed-mode{padding:5px 8px;font-size:11px;border-radius:2px}.ed-button:hover,.ed-mode:hover{background:var(--ed-hover)}.ed-button[aria-pressed="true"],.ed-mode[aria-pressed="true"]{background:#094771;color:#fff}.ed-stage{min-width:0;min-height:0;display:grid;grid-template-rows:36px minmax(0,1fr);background:#1e1e1e}.ed-tools{display:flex;align-items:center;gap:5px;padding:4px 8px;border-bottom:1px solid var(--ed-border);background:#252526}.ed-spacer{flex:1}.ed-fps{font:10px ui-monospace,monospace;color:#9cdcfe;white-space:nowrap}.ed-viewport-scroll{overflow:auto;padding:15px;display:grid;place-items:start center;background-color:#1e1e1e;background-image:radial-gradient(#343434 .6px,transparent .6px);background-size:9px 9px}.ed-frame-shell{flex:none;background:white;overflow:hidden;box-shadow:0 8px 22px #0006;border:1px solid #444}.ed-frame{display:block;width:100%;height:100%;border:0;background:white}
.ed-tabs{display:flex;gap:0;margin:0 -10px 12px;position:sticky;top:0;padding:0 6px;background:var(--ed-panel);border-bottom:1px solid var(--ed-border);z-index:2;overflow-x:auto}.ed-tabs .ed-button{white-space:nowrap;padding:11px 8px 9px;border:0;border-bottom:1px solid transparent;color:#999}.ed-tabs .ed-button[aria-pressed="true"]{border-bottom-color:#007acc;background:transparent;color:#f0f0f0}.ed-tabs .ed-button:hover{background:#2a2d2e}.ed-card{border:1px solid #383838;background:#1f1f1f;border-radius:3px;padding:9px;margin-bottom:8px}.ed-card h3{font-size:12px;font-weight:600;margin:0 0 8px;color:#e7e7e7}.ed-row{display:grid;grid-template-columns:78px minmax(0,1fr);gap:7px;padding:4px 0;font-size:11px;line-height:1.45}.ed-key{color:#9da0a5}.ed-value{color:#d4d4d4;overflow-wrap:anywhere}.ed-chip{display:inline-block;padding:2px 5px;margin:2px;border-radius:2px;background:#333;color:#ccc;font:600 9px ui-monospace,monospace}.ed-task{display:flex;gap:8px;align-items:flex-start;justify-content:space-between}.ed-task-name{font-size:11px;font-weight:500}.ed-task-state{text-align:right;white-space:nowrap}.ed-transition{font:10px/1.5 ui-monospace,monospace;color:#9da0a5;border-left:2px solid #555;padding-left:8px;margin:7px 0}.ed-mode-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}.ed-fields{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.ed-field{display:grid;gap:4px;color:#9da0a5;font-size:10px}.ed-field input,.ed-field select{width:100%;border:1px solid #454545;border-radius:2px;background:#181818;color:#ddd;padding:5px}.ed-check{display:flex;gap:7px;align-items:center;font-size:11px;color:#ccc}.ed-empty{padding:22px 8px;color:#858585;text-align:center;font-size:11px;line-height:1.5}.ed-explain{font-size:11px;line-height:1.55;color:#c7c7c7}.ed-warning{color:#e2c08d}.ed-count{margin-left:auto;color:#999;font:10px ui-monospace,monospace}
.ed-problem-toolbar{display:flex;align-items:center;gap:4px;margin:0 0 8px;flex-wrap:wrap}.ed-filter{padding:4px 7px;border-color:#424242;color:#bdbdbd;font-size:10px}.ed-filter[aria-pressed="true"]{background:#37373d;border-color:#666;color:#fff}.ed-problem-count{margin-left:auto;color:#999;font:10px ui-monospace,monospace}.ed-diagnostic-list{display:grid;gap:2px;margin-bottom:12px}.ed-diagnostic{display:grid;grid-template-columns:12px minmax(0,1fr);gap:6px;width:100%;padding:6px 7px;text-align:left;border-radius:2px}.ed-diagnostic:hover{background:#2a2d2e}.ed-diagnostic[aria-pressed="true"]{background:#094771}.ed-problem-glyph{font:700 11px ui-monospace,monospace}.ed-problem-glyph.error{color:var(--ed-error)}.ed-problem-glyph.warning{color:var(--ed-warning)}.ed-diagnostic-message{font-size:11px;line-height:1.4;display:block;overflow-wrap:anywhere;color:#ddd}.ed-diagnostic-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:3px;color:#999;font:9px ui-monospace,monospace}.ed-severity-summary{display:flex;gap:12px;padding:7px 0 9px;border-bottom:1px solid #383838;margin-bottom:8px;color:#bdbdbd;font:10px ui-monospace,monospace}.ed-severity-summary strong{color:#f48771}.ed-severity-summary .warn{color:#cca700}.ed-detail-text{font:11px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;color:#d4d4d4;max-height:230px;overflow:auto;margin:6px 0 10px}
@media(max-width:1050px){.ed-body{grid-template-columns:40px 166px minmax(250px,1fr)}.ed-inspector{position:fixed;right:0;top:40px;bottom:0;width:min(318px,calc(100vw - 205px));box-shadow:-15px 0 35px #0009;z-index:3}.ed-stage{grid-column:3;grid-row:1}.ed-sidebar{grid-column:2;grid-row:1}}@media(max-width:680px){.ed-body{grid-template-columns:38px minmax(220px,1fr)}.ed-sidebar{display:none}.ed-stage{grid-column:2;grid-row:1}.ed-inspector{width:min(330px,calc(100vw - 42px));}.ed-count{display:none}.ed-fps{font-size:9px}.ed-viewport-scroll{padding:8px}}
`;

function clampNumber(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) return min;
	return Math.min(max, Math.max(min, value));
}

function readDebugNode(element: HTMLElement): DebugNode {
	const data = element.dataset;
	const computed = element.ownerDocument.defaultView?.getComputedStyle(element);
	const columns = data.engineDebugType === "grid" && computed?.display === "grid"
		? computed.gridTemplateColumns.split(" ").filter(Boolean).length
		: undefined;
	return {
		id: data.engineDebugId ?? "unknown",
		path: data.engineDebugPath ?? "unknown",
		type: data.engineDebugType ?? element.tagName.toLowerCase(),
		name: data.engineDebugName ?? data.engineDebugType ?? element.tagName.toLowerCase(),
		boundary: data.engineDebugBoundary ?? "UNKNOWN",
		rendered: data.engineDebugRendered ?? "Unknown",
		reason: data.engineDebugReason ?? "No compiler explanation is available.",
		hydration: data.engineDebugHydration ?? "Unknown",
		clientJs: data.engineDebugClientJs ?? "Unknown",
		workClass: data.engineDebugWorkClass ?? "unknown",
		capabilities: (data.engineDebugCapabilities ?? "").split(",").filter(Boolean),
		columns,
	};
}

function taskForNode(element: HTMLElement, view: Window): EngineSchedulerDebugTask {
	const node = readDebugNode(element);
	const box = element.getBoundingClientRect();
	const visible = box.bottom > 0 && box.right > 0 && box.top < view.innerHeight && box.left < view.innerWidth;
	const near = box.bottom > -700 && box.top < view.innerHeight + 700;
	const state = visible ? "VISIBLE" : near ? "NEAR" : node.workClass === "sleeping" ? "SLEEPING" : "DEFERRED";
	const animated = /canvas|video|manim|shader/i.test(node.type);
	return {
		id: node.id,
		label: node.name,
		nodeId: node.id,
		nodeType: node.type,
		state,
		activity: state === "VISIBLE" ? animated ? "RUNNING" : "IDLE" : state === "NEAR" ? "PRELOADING" : state,
		updatedAt: performance.now(),
	};
}

function syntheticMatch(profile: DeviceProfile, query: string): boolean | undefined {
	const normalized = query.toLowerCase();
	if (normalized.includes("orientation:")) return normalized.includes(profile.orientation);
	if (normalized.includes("hover:")) return normalized.includes(profile.hover ? "hover" : "none");
	if (normalized.includes("pointer:")) return normalized.includes(profile.touch ? "coarse" : "fine");
	if (normalized.includes("resolution:") && normalized.includes("dppx")) {
		const requested = Number(normalized.match(/([0-9.]+)dppx/)?.[1]);
		return Number.isFinite(requested) ? profile.dpr >= requested : undefined;
	}
	return undefined;
}

function applyDeviceProfile(frameWindow: DebugSchedulerWindow, profile: DeviceProfile): void {
	frameWindow.__NEXT_ENGINE_DEVICE_DEBUG__ = { profile };
	frameWindow.document.documentElement.dataset.engineDebugDevice = profile.mode.toLowerCase();
	frameWindow.document.documentElement.style.setProperty("--engine-debug-dpr", String(profile.dpr));
	frameWindow.document.documentElement.style.setProperty("--engine-debug-refresh", String(profile.refresh));
	try {
		Object.defineProperty(frameWindow, "devicePixelRatio", { configurable: true, get: () => profile.dpr });
	} catch {
		// Some engines expose a non-configurable native DPR. The debug bridge still records the requested value.
	}
	try {
		Object.defineProperty(frameWindow.navigator, "maxTouchPoints", { configurable: true, get: () => profile.touch ? 5 : 0 });
	} catch {
		// The viewport and media-query simulator remain available when navigator is locked.
	}
	if (!frameWindow.__NEXT_ENGINE_VISUAL_VIEWPORT_CAPTURED__) {
		frameWindow.__NEXT_ENGINE_ORIGINAL_VISUAL_VIEWPORT__ = frameWindow.visualViewport;
		frameWindow.__NEXT_ENGINE_VISUAL_VIEWPORT_CAPTURED__ = true;
	}
	try {
		Object.defineProperty(frameWindow, "visualViewport", {
			configurable: true,
			get: () => profile.visualViewport ? frameWindow.__NEXT_ENGINE_ORIGINAL_VISUAL_VIEWPORT__ ?? null : null,
		});
	} catch {
		// The requested capability remains recorded when the native property cannot be redefined.
	}
	if (!frameWindow.__NEXT_ENGINE_ORIGINAL_MATCH_MEDIA__) {
		frameWindow.__NEXT_ENGINE_ORIGINAL_MATCH_MEDIA__ = frameWindow.matchMedia.bind(frameWindow);
	}
	const originalMatchMedia = frameWindow.__NEXT_ENGINE_ORIGINAL_MATCH_MEDIA__;
	frameWindow.matchMedia = ((query: string) => {
		const simulated = syntheticMatch(frameWindow.__NEXT_ENGINE_DEVICE_DEBUG__?.profile ?? profile, query);
		if (simulated === undefined) return originalMatchMedia(query);
		return {
			matches: simulated,
			media: query,
			onchange: null,
			addListener: () => undefined,
			removeListener: () => undefined,
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
			dispatchEvent: () => false,
		};
	}) as typeof window.matchMedia;
	const resizeEvent = frameWindow.document.createEvent("Event");
	resizeEvent.initEvent("resize", false, false);
	frameWindow.dispatchEvent(resizeEvent);
	const orientationEvent = frameWindow.document.createEvent("Event");
	orientationEvent.initEvent("orientationchange", false, false);
	frameWindow.dispatchEvent(orientationEvent);
}

function mergeTasks(actual: EngineSchedulerDebugTask[], inferred: EngineSchedulerDebugTask[]): EngineSchedulerDebugTask[] {
	const tasks = new Map(inferred.map((task) => [task.nodeId ?? task.id, task]));
	for (const task of actual) tasks.set(task.nodeId ?? task.id, task);
	return [...tasks.values()].sort((left, right) => left.label.localeCompare(right.label));
}

export interface EngineDebugPageProps {
	pages: readonly string[];
}

export function EngineDebugPage({ pages }: EngineDebugPageProps) {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const previousTasks = useRef(new Map<string, EngineSchedulerDebugTask>());
	const [selectedPage, setSelectedPage] = useState(pages[0] ?? "/");
	const [picker, setPicker] = useState(false);
	const [overlay, setOverlay] = useState(false);
	const [tab, setTab] = useState<"Node" | "Errors" | "Scheduler" | "Device">("Node");
	const [diagnostics, setDiagnostics] = useState<EngineDebugDiagnostic[]>([]);
	const [selectedDiagnosticId, setSelectedDiagnosticId] = useState<string | null>(null);
	const [diagnosticFilter, setDiagnosticFilter] = useState<"all" | "error" | "warning">("all");
	const [selectedNode, setSelectedNode] = useState<DebugNode | null>(null);
	const [scheduler, setScheduler] = useState<EngineSchedulerDebugSnapshot>(EMPTY_SCHEDULER);
	const [inferredTransitions, setInferredTransitions] = useState<EngineSchedulerDebugTransition[]>([]);
	const [device, setDevice] = useState<DeviceProfile>(DEVICE_PROFILES.Desktop);
	const [fps, setFps] = useState(0);
	const [layoutByDevice, setLayoutByDevice] = useState<Record<string, number>>({});
	const frameSource = useMemo(() => `${selectedPage}${selectedPage.includes("?") ? "&" : "?"}__engine_debug=1`, [selectedPage]);

	useEffect(() => {
		const frame = iframeRef.current;
		if (!frame) return;
		let frameCleanup = () => undefined;
		const connect = () => {
			frameCleanup();
			const frameWindow = frame.contentWindow as DebugSchedulerWindow | null;
			const frameDocument = frame.contentDocument;
			if (!frameWindow || !frameDocument) return;
			applyDeviceProfile(frameWindow, device);
			frameDocument.documentElement.dataset.engineDebugOverlay = String(overlay);
			let overlayStyle = frameDocument.getElementById("__engine_debug_overlay__") as HTMLStyleElement | null;
			if (!overlayStyle) {
				overlayStyle = frameDocument.createElement("style");
				overlayStyle.id = "__engine_debug_overlay__";
				overlayStyle.textContent = FRAME_OVERLAY_CSS;
				frameDocument.head.appendChild(overlayStyle);
			}

			const reportDiagnostic = (
				source: EngineDebugSource,
				message: unknown,
				detail?: unknown,
				location?: string,
			) => {
				const diagnostic = createEngineDebugDiagnostic({ source, message, detail, location });
				setDiagnostics((current) => appendEngineDebugDiagnostics(current, diagnostic));
				setSelectedDiagnosticId((current) => current ?? diagnostic.id);
			};
			const handleRuntimeError = (event: ErrorEvent) => {
				reportDiagnostic(
					"runtime",
					event.message || "Uncaught browser runtime error",
					event.error,
					event.filename ? event.filename + (event.lineno ? ":" + event.lineno : "") : frameWindow.location.pathname,
				);
			};
			const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
				reportDiagnostic("unhandled-rejection", "Unhandled promise rejection", event.reason, frameWindow.location.pathname);
			};
			const originalConsoleError = frameWindow.console.error;
			const patchedConsoleError: typeof frameWindow.console.error = (...args) => {
				const detail = args.map((argument) => redactEngineDebugText(argument, 1_500)).join("\n");
				const message = typeof args[0] === "string" ? args[0] : detail || "console.error";
				reportDiagnostic("console", message, detail, frameWindow.location.pathname);
				originalConsoleError.apply(frameWindow.console, args);
			};
			let consolePatched = false;
			try {
				frameWindow.console.error = patchedConsoleError;
				consolePatched = frameWindow.console.error === patchedConsoleError;
			} catch {
				// Keep diagnostic collection alive when a browser exposes a locked console object.
			}
			frameWindow.addEventListener("error", handleRuntimeError);
			frameWindow.addEventListener("unhandledrejection", handleUnhandledRejection);
			const scanNextOverlay = () => {
				for (const element of frameDocument.querySelectorAll<HTMLElement>("nextjs-portal, nextjs-error, [data-nextjs-dialog], [data-nextjs-error], [data-nextjs-error-message]")) {
					const text = (element.shadowRoot?.textContent || element.innerText || element.textContent || "").trim();
					if (!text || !/(error|exception|failed|hydration|mismatch|digest)/i.test(text)) continue;
					reportDiagnostic("next-overlay", "Next.js development error overlay", text, frameWindow.location.pathname);
				}
			};
			const overlayObserver = new MutationObserver(scanNextOverlay);
			if (frameDocument.body) overlayObserver.observe(frameDocument.body, { childList: true, subtree: true, characterData: true });
			scanNextOverlay();

			const selectNode = (event: MouseEvent) => {
				if (!picker) return;
				const eventTarget = event.target as (Element & { closest?: Element["closest"] }) | null;
				const target = typeof eventTarget?.closest === "function"
					? eventTarget.closest("[data-engine-debug-id]") as HTMLElement | null
					: null;
				if (!target) return;
				event.preventDefault();
				event.stopPropagation();
				frameDocument.querySelectorAll("[data-engine-debug-selected]").forEach((entry) => entry.removeAttribute("data-engine-debug-selected"));
				target.dataset.engineDebugSelected = "true";
				const node = readDebugNode(target);
				setSelectedNode(node);
				setTab("Node");
				if (node.columns !== undefined) setLayoutByDevice((current) => ({ ...current, [device.mode]: node.columns! }));
			};
			frameDocument.addEventListener("click", selectNode, true);

			const updateScheduler = (event?: Event) => {
				const actual = event
					? (event as CustomEvent<EngineSchedulerDebugSnapshot>).detail
					: frameWindow.__NEXT_ENGINE_SCHEDULER_DEBUG__?.snapshot() ?? EMPTY_SCHEDULER;
				const inferred = [...frameDocument.querySelectorAll<HTMLElement>("[data-engine-debug-id]")]
					.map((element) => taskForNode(element, frameWindow));
				const tasks = mergeTasks(actual.tasks, inferred);
				const transitions: EngineSchedulerDebugTransition[] = [];
				for (const task of tasks) {
					const previous = previousTasks.current.get(task.id);
					if (previous && (previous.state !== task.state || previous.activity !== task.activity)) {
						transitions.push({ id: task.id, label: task.label, from: `${previous.state}/${previous.activity}`, to: `${task.state}/${task.activity}`, at: performance.now() });
					}
				}
				previousTasks.current = new Map(tasks.map((task) => [task.id, task]));
				if (transitions.length > 0) setInferredTransitions((current) => [...current, ...transitions].slice(-50));
				setScheduler({ ...actual, tasks });
				if (selectedNode) {
					const selected = frameDocument.querySelector<HTMLElement>(`[data-engine-debug-id="${CSS.escape(selectedNode.id)}"]`);
					if (selected) {
						const node = readDebugNode(selected);
						setSelectedNode(node);
						if (node.columns !== undefined) setLayoutByDevice((current) => ({ ...current, [device.mode]: node.columns! }));
					}
				}
			};
			frameWindow.addEventListener("engine:debug:scheduler", updateScheduler);
			const scanTimer = frameWindow.setInterval(updateScheduler, 400);
			updateScheduler();

			let raf = 0;
			let sampleStart = 0;
			let samples = 0;
			const measure = (now: number) => {
				if (sampleStart === 0) sampleStart = now;
				samples += 1;
				if (now - sampleStart >= 500) {
					setFps(samples * 1000 / (now - sampleStart));
					sampleStart = now;
					samples = 0;
				}
				raf = frameWindow.requestAnimationFrame(measure);
			};
			raf = frameWindow.requestAnimationFrame(measure);
			frameCleanup = () => {
				frameDocument.removeEventListener("click", selectNode, true);
				frameWindow.removeEventListener("engine:debug:scheduler", updateScheduler);
				frameWindow.removeEventListener("error", handleRuntimeError);
				frameWindow.removeEventListener("unhandledrejection", handleUnhandledRejection);
				if (consolePatched && frameWindow.console.error === patchedConsoleError) {
					frameWindow.console.error = originalConsoleError;
				}
				overlayObserver.disconnect();
				frameWindow.clearInterval(scanTimer);
				frameWindow.cancelAnimationFrame(raf);
			};
		};
		frame.addEventListener("load", connect);
		connect();
		return () => {
			frame.removeEventListener("load", connect);
			frameCleanup();
		};
	}, [device, overlay, picker, selectedNode?.id]);

	const changeMode = (mode: DeviceMode) => {
		if (mode === "Custom") {
			setDevice((current) => ({ ...current, mode: "Custom" }));
			return;
		}
		setDevice(DEVICE_PROFILES[mode]);
	};
	const updateDevice = <Key extends keyof DeviceProfile>(key: Key, value: DeviceProfile[Key]) => {
		setDevice((current) => ({ ...current, mode: "Custom", [key]: value }));
	};
	const selectedTask = selectedNode
		? scheduler.tasks.find((task) => task.nodeId === selectedNode.id)
		: undefined;
	const transitions = [...scheduler.transitions, ...inferredTransitions].slice(-50).reverse();

	return (
		<main className="ed-shell">
			<style>{PAGE_CSS}</style>
			<header className="ed-head">
				<span className="ed-brand-mark" aria-hidden="true">NE</span>
				<h1>Engine Debug</h1>
				<span className="ed-badge">DEV</span>
				<span className="ed-count">{diagnostics.filter((item) => item.severity === "error").length} errors · {diagnostics.filter((item) => item.severity === "warning").length} warnings · /_engine/debug</span>
			</header>
			<div className="ed-body">
				<nav className="ed-activity" aria-label="Debug views">
					<button type="button" className="ed-activity-button" aria-label="Explorer" title="Explorer" aria-pressed={tab === "Node"} onClick={() => setTab("Node")}><span className="ed-activity-glyph">⌕</span></button>
					<button type="button" className="ed-activity-button" aria-label="Problems" title="Problems" aria-pressed={tab === "Errors"} onClick={() => setTab("Errors")}><span className="ed-activity-glyph">!</span></button>
					<button type="button" className="ed-activity-button" aria-label="Scheduler" title="Scheduler" aria-pressed={tab === "Scheduler"} onClick={() => setTab("Scheduler")}><span className="ed-activity-glyph">◷</span></button>
					<button type="button" className="ed-activity-button" aria-label="Device" title="Device simulation" aria-pressed={tab === "Device"} onClick={() => setTab("Device")}><span className="ed-activity-glyph">▦</span></button>
				</nav>
				<nav className="ed-sidebar" aria-label="Application pages">
					<h2 className="ed-section-title">Explorer</h2>
					<div className="ed-sidebar-subtitle">APPLICATION ROUTES</div>
					{pages.map((route) => (
						<button key={route} type="button" className="ed-route" data-route={route} aria-current={selectedPage === route ? "page" : undefined} onClick={() => { setSelectedPage(route); setSelectedNode(null); }}>
							{route === "/" ? "/ (home)" : route}
						</button>
					))}
				</nav>
				<section className="ed-stage" aria-label="Live page preview">
					<div className="ed-tools">
						<button type="button" className="ed-button" aria-pressed={picker} onClick={() => setPicker((value) => !value)}>Pick node</button>
						<button type="button" className="ed-button" aria-pressed={overlay} onClick={() => setOverlay((value) => !value)}>Boundaries</button>
						<span className="ed-spacer" />
						<span className="ed-fps">{device.width}×{device.height} · DPR {device.dpr} · {fps.toFixed(1)} FPS</span>
					</div>
					<div className="ed-viewport-scroll">
						<div className="ed-frame-shell" style={{ width: device.width, height: device.height }}>
							<iframe ref={iframeRef} className="ed-frame" title={"Live preview: " + selectedPage} src={frameSource} />
						</div>
					</div>
				</section>
				<aside className="ed-inspector">
					<div className="ed-tabs" role="tablist" aria-label="Debug inspectors">
						{(["Node", "Errors", "Scheduler", "Device"] as const).map((name) => <button key={name} type="button" role="tab" aria-selected={tab === name} className="ed-button" aria-pressed={tab === name} onClick={() => setTab(name)}>{name}{name === "Errors" && diagnostics.length > 0 ? " " + diagnostics.length : ""}</button>)}
					</div>
					{tab === "Node" && (
						selectedNode ? <NodeInspector node={selectedNode} task={selectedTask} fps={fps} refresh={device.refresh} layouts={layoutByDevice} /> : <div className="ed-empty">Pick node, then select an Engine element in the preview.</div>
					)}
					{tab === "Errors" && (
						<ErrorInspector
							diagnostics={diagnostics}
							selectedId={selectedDiagnosticId}
							filter={diagnosticFilter}
							onFilter={setDiagnosticFilter}
							onSelect={setSelectedDiagnosticId}
							onClear={() => { setDiagnostics([]); setSelectedDiagnosticId(null); }}
						/>
					)}
					{tab === "Scheduler" && <SchedulerInspector snapshot={scheduler} transitions={transitions} />}
					{tab === "Device" && <DeviceInspector device={device} layouts={layoutByDevice} selectedNode={selectedNode} changeMode={changeMode} updateDevice={updateDevice} />}
				</aside>
			</div>
		</main>
	);
}


function ErrorInspector({
	diagnostics,
	selectedId,
	filter,
	onFilter,
	onSelect,
	onClear,
}: {
	diagnostics: EngineDebugDiagnostic[];
	selectedId: string | null;
	filter: "all" | "error" | "warning";
	onFilter: (value: "all" | "error" | "warning") => void;
	onSelect: (id: string) => void;
	onClear: () => void;
}) {
	const visible = diagnostics.filter((item) => filter === "all" || item.severity === filter).slice().reverse();
	const selected = diagnostics.find((item) => item.id === selectedId);
	const errorCount = diagnostics.filter((item) => item.severity === "error").length;
	const warningCount = diagnostics.length - errorCount;
	const copySelected = () => {
		if (!selected || typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
		void navigator.clipboard.writeText(formatEngineDebugDiagnostic(selected)).catch(() => undefined);
	};
	return (
		<>
			<div className="ed-severity-summary"><span><strong>{errorCount}</strong> errors</span><span><strong className="warn">{warningCount}</strong> warnings</span><span>{diagnostics.length}/200 captured</span></div>
			<div className="ed-problem-toolbar">
				{(["all", "error", "warning"] as const).map((value) => <button key={value} type="button" className="ed-filter" aria-pressed={filter === value} onClick={() => onFilter(value)}>{value === "all" ? "All" : value === "error" ? "Errors" : "Warnings"}</button>)}
				<span className="ed-problem-count">{visible.length} shown</span>
				<button type="button" className="ed-filter" onClick={onClear} disabled={diagnostics.length === 0}>Clear</button>
			</div>
			<div className="ed-diagnostic-list" aria-label="Captured problems">
				{visible.length === 0 ? <div className="ed-empty">No captured problems. Run or reload the preview to collect console, runtime, rejection, and visible Next.js overlay errors.</div> : visible.map((item) => (
					<button key={item.id} type="button" className="ed-diagnostic" aria-pressed={selected?.id === item.id} onClick={() => onSelect(item.id)}>
						<span className={"ed-problem-glyph " + item.severity}>{item.severity === "error" ? "●" : "▲"}</span>
						<span><span className="ed-diagnostic-message">{item.message}</span><span className="ed-diagnostic-meta"><span>{item.category}</span><span>{new Date(item.at).toLocaleTimeString()}</span></span></span>
					</button>
				))}
			</div>
			{selected && (
				<section className="ed-card" aria-label="Selected diagnostic details">
					<h3>{selected.category} diagnostic</h3>
					<DebugRow name="Severity" value={selected.severity.toUpperCase()} />
					<DebugRow name="Likely owner" value={selected.ownerHint} />
					<DebugRow name="Captured from" value={selected.source} />
					{selected.location && <DebugRow name="Location" value={selected.location} />}
					<p className="ed-explain">Owner is a heuristic from the message and stack, not proof. Verify the source before changing NE or application code.</p>
					<pre className="ed-detail-text">{[selected.message, selected.detail].filter(Boolean).join("\n\n")}</pre>
					<button type="button" className="ed-button" onClick={copySelected}>Copy details</button>
				</section>
			)}
			<p className="ed-explain"><span className="ed-warning">Capture boundary:</span> browser errors, unhandled rejections, console errors, and visible Next.js error overlays are collected from the same-origin preview in memory. Server errors emitted before a page reaches the browser may still appear only in the Next.js overlay or dev-server terminal.</p>
		</>
	);
}

function NodeInspector({ node, task, fps, refresh, layouts }: { node: DebugNode; task?: EngineSchedulerDebugTask; fps: number; refresh: number; layouts: Record<string, number> }) {
	return (
		<div className="ed-card">
			<h3>{node.name}</h3>
			<DebugRow name="Type" value={node.type} />
			<DebugRow name="Rendered" value={node.rendered} />
			<DebugRow name="Why?" value={node.reason} />
			<DebugRow name="Hydration" value={node.hydration} />
			<DebugRow name="Client JS" value={node.clientJs} />
			<DebugRow name="Boundary" value={node.boundary} />
			<DebugRow name="Status" value={task ? `${task.state} / ${task.activity}` : node.workClass.toUpperCase()} />
			{node.type.toLowerCase().includes("canvas") && <><DebugRow name="Refresh" value={`${refresh}Hz simulated target`} /><DebugRow name="Current" value={`${fps.toFixed(1)} FPS`} /></>}
			{node.capabilities.length > 0 && <DebugRow name="Capabilities" value={node.capabilities.join(", ")} />}
			<DebugRow name="Path" value={node.path} />
			{node.columns !== undefined && <p className="ed-explain">This grid currently resolves to {node.columns} column{node.columns === 1 ? "" : "s"}. {Object.entries(layouts).map(([mode, columns]) => `${mode}: ${columns}`).join(" · ")}</p>}
		</div>
	);
}

function DebugRow({ name, value }: { name: string; value: string }) {
	return <div className="ed-row"><span className="ed-key">{name}</span><span className="ed-value">{value}</span></div>;
}

function SchedulerInspector({ snapshot, transitions }: { snapshot: EngineSchedulerDebugSnapshot; transitions: EngineSchedulerDebugTransition[] }) {
	return (
		<>
			<div className="ed-card"><DebugRow name="Frame pressure" value={snapshot.underFramePressure ? "ACTIVE" : "Normal"} /><DebugRow name="Tracked work" value={String(snapshot.tasks.length)} /></div>
			<h2 className="ed-section-title">Live work</h2>
			{snapshot.tasks.length === 0 ? <div className="ed-empty">No Engine work is mounted in this preview.</div> : snapshot.tasks.map((task) => (
				<div className="ed-card ed-task" key={task.id}><span className="ed-task-name">{task.label}</span><span className="ed-task-state"><span className="ed-chip">{task.state}</span><br /><span className="ed-chip">{task.activity}</span></span></div>
			))}
			<h2 className="ed-section-title">State transitions</h2>
			{transitions.length === 0 ? <div className="ed-empty">Transitions appear here as work enters or leaves the viewport.</div> : transitions.map((transition, index) => <div className="ed-transition" key={`${transition.id}-${transition.at}-${index}`}>{transition.label}<br />{transition.from} → {transition.to}</div>)}
		</>
	);
}

function DeviceInspector({ device, layouts, selectedNode, changeMode, updateDevice }: { device: DeviceProfile; layouts: Record<string, number>; selectedNode: DebugNode | null; changeMode: (mode: DeviceMode) => void; updateDevice: <Key extends keyof DeviceProfile>(key: Key, value: DeviceProfile[Key]) => void }) {
	return (
		<>
			<div className="ed-mode-grid">{(["Desktop", "Tablet", "Phone", "Custom"] as const).map((mode) => <button key={mode} type="button" className="ed-mode" aria-pressed={device.mode === mode} onClick={() => changeMode(mode)}>{mode}</button>)}</div>
			<div className="ed-fields">
				<NumberField label="Viewport width" value={device.width} min={240} max={3840} onChange={(value) => updateDevice("width", value)} />
				<NumberField label="Viewport height" value={device.height} min={240} max={2160} onChange={(value) => updateDevice("height", value)} />
				<NumberField label="DPR" value={device.dpr} min={0.5} max={4} step={0.25} onChange={(value) => updateDevice("dpr", value)} />
				<NumberField label="Refresh Hz" value={device.refresh} min={24} max={360} onChange={(value) => updateDevice("refresh", value)} />
				<label className="ed-field">Orientation<select value={device.orientation} onChange={(event) => updateDevice("orientation", event.target.value as DeviceProfile["orientation"])}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>
			</div>
			<div className="ed-card" style={{ marginTop: 10 }}>
				<label className="ed-check"><input type="checkbox" checked={device.touch} onChange={(event) => updateDevice("touch", event.target.checked)} />Touch input</label>
				<label className="ed-check"><input type="checkbox" checked={device.hover} onChange={(event) => updateDevice("hover", event.target.checked)} />Hover input</label>
				<label className="ed-check"><input type="checkbox" checked={device.visualViewport} onChange={(event) => updateDevice("visualViewport", event.target.checked)} />VisualViewport</label>
			</div>
			<div className="ed-card ed-explain">
				<h3>Why did layout change?</h3>
				{selectedNode?.columns !== undefined ? <><p>{selectedNode.name} now has {selectedNode.columns} columns at {device.width}px.</p><p>{Object.entries(layouts).map(([mode, columns]) => `${mode}: ${columns} columns`).join(" · ") || "Switch profiles to compare compiled responsive output."}</p><p>Columns change when the available viewport can no longer satisfy the grid’s responsive sizing rules.</p></> : <p>Pick an EngineGrid to compare its real computed columns across Desktop, Tablet, Phone, and Custom profiles.</p>}
			</div>
			<p className="ed-explain"><span className="ed-warning">Simulator scope:</span> viewport size is native to the iframe. DPR, refresh target, touch, hover, orientation, and VisualViewport availability are exposed through the isolated debug bridge and matching media queries; physical monitor refresh cannot be changed by a webpage.</p>
		</>
	);
}

function NumberField({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
	return <label className="ed-field">{label}<input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(clampNumber(Number(event.target.value), min, max))} /></label>;
}
