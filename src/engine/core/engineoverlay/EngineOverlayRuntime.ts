// ──────────────────────────────────────────────────────────────────────────────
// EngineOverlay — shared browser runtime
// ──────────────────────────────────────────────────────────────────────────────

export type EnginePopoverPlacement = "top" | "right" | "bottom" | "left";
export type EnginePopoverAlign = "start" | "center" | "end";

export interface OverlayRect {
	top: number;
	right: number;
	bottom: number;
	left: number;
	width: number;
	height: number;
}

export interface PopoverPositionOptions {
	placement?: EnginePopoverPlacement;
	align?: EnginePopoverAlign;
	offset?: number;
	viewportWidth: number;
	viewportHeight: number;
	viewportLeft?: number;
	viewportTop?: number;
	viewportPadding?: number;
}

export interface PopoverPosition {
	top: number;
	left: number;
	placement: EnginePopoverPlacement;
}

interface OverlayLayer {
	element: HTMLElement;
	offset: number;
	previousZIndex: string;
}

interface OverlayRegistration {
	id: string;
	token: number;
	baseZIndex: number;
	effectiveZIndex: number;
	modal: boolean;
	layers: OverlayLayer[];
}

interface InertSnapshot {
	inert: boolean;
	hadInertAttribute: boolean;
	ariaHidden: string | null;
}

interface OverlayDocumentState {
	stack: OverlayRegistration[];
	registrationToken: number;
	bodyLockCount: number;
	previousOverflow: string;
	previousPaddingRight: string;
	inertSnapshots: Map<HTMLElement, InertSnapshot>;
}

const overlayDocuments = new WeakMap<Document, OverlayDocumentState>();

function getOwnerDocument(ownerDocument?: Document): Document | undefined {
	if (ownerDocument) return ownerDocument;
	return typeof document !== "undefined" ? document : undefined;
}

function getOverlayDocumentState(ownerDocument: Document, create = true): OverlayDocumentState | undefined {
	const existing = overlayDocuments.get(ownerDocument);
	if (existing || !create) return existing;
	const state: OverlayDocumentState = {
		stack: [],
		registrationToken: 0,
		bodyLockCount: 0,
		previousOverflow: "",
		previousPaddingRight: "",
		inertSnapshots: new Map(),
	};
	overlayDocuments.set(ownerDocument, state);
	return state;
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function oppositePlacement(placement: EnginePopoverPlacement): EnginePopoverPlacement {
	if (placement === "top") return "bottom";
	if (placement === "bottom") return "top";
	if (placement === "left") return "right";
	return "left";
}

function availableSpace(
	trigger: OverlayRect,
	placement: EnginePopoverPlacement,
	viewportLeft: number,
	viewportTop: number,
	viewportWidth: number,
	viewportHeight: number,
): number {
	const viewportRight = viewportLeft + viewportWidth;
	const viewportBottom = viewportTop + viewportHeight;
	if (placement === "top") return trigger.top - viewportTop;
	if (placement === "bottom") return viewportBottom - trigger.bottom;
	if (placement === "left") return trigger.left - viewportLeft;
	return viewportRight - trigger.right;
}

export function computePopoverPosition(
	trigger: OverlayRect,
	panel: Pick<OverlayRect, "width" | "height">,
	options: PopoverPositionOptions,
): PopoverPosition {
	const offset = Math.max(0, options.offset ?? 8);
	const padding = Math.max(0, options.viewportPadding ?? 8);
	const viewportLeft = options.viewportLeft ?? 0;
	const viewportTop = options.viewportTop ?? 0;
	const preferred = options.placement ?? "bottom";
	const requiredSpace = (
		preferred === "top" || preferred === "bottom"
			? panel.height
			: panel.width
	) + offset + padding;
	const preferredSpace = availableSpace(
		trigger,
		preferred,
		viewportLeft,
		viewportTop,
		options.viewportWidth,
		options.viewportHeight,
	);
	const opposite = oppositePlacement(preferred);
	const oppositeSpace = availableSpace(
		trigger,
		opposite,
		viewportLeft,
		viewportTop,
		options.viewportWidth,
		options.viewportHeight,
	);
	const placement = preferredSpace < requiredSpace && oppositeSpace > preferredSpace
		? opposite
		: preferred;

	let top = 0;
	let left = 0;
	if (placement === "top") top = trigger.top - panel.height - offset;
	if (placement === "bottom") top = trigger.bottom + offset;
	if (placement === "left") left = trigger.left - panel.width - offset;
	if (placement === "right") left = trigger.right + offset;

	const align = options.align ?? "center";
	if (placement === "top" || placement === "bottom") {
		if (align === "start") left = trigger.left;
		else if (align === "end") left = trigger.right - panel.width;
		else left = trigger.left + (trigger.width - panel.width) / 2;
	} else {
		if (align === "start") top = trigger.top;
		else if (align === "end") top = trigger.bottom - panel.height;
		else top = trigger.top + (trigger.height - panel.height) / 2;
	}

	return {
		top: clamp(
			top,
			viewportTop + padding,
			viewportTop + options.viewportHeight - panel.height - padding,
		),
		left: clamp(
			left,
			viewportLeft + padding,
			viewportLeft + options.viewportWidth - panel.width - padding,
		),
		placement,
	};
}

function restoreOverlayLayers(registration: OverlayRegistration): void {
	for (const layer of registration.layers) {
		layer.element.style.zIndex = layer.previousZIndex;
	}
}

function restoreModalInertness(state: OverlayDocumentState): void {
	for (const [element, previous] of state.inertSnapshots) {
		element.inert = previous.inert;
		if (previous.hadInertAttribute) element.setAttribute("inert", "");
		else element.removeAttribute("inert");
		if (previous.ariaHidden === null) element.removeAttribute("aria-hidden");
		else element.setAttribute("aria-hidden", previous.ariaHidden);
	}
	state.inertSnapshots.clear();
}

function makeElementInert(state: OverlayDocumentState, element: HTMLElement): void {
	if (!state.inertSnapshots.has(element)) {
		state.inertSnapshots.set(element, {
			inert: element.inert,
			hadInertAttribute: element.hasAttribute("inert"),
			ariaHidden: element.getAttribute("aria-hidden"),
		});
	}
	element.inert = true;
	element.setAttribute("inert", "");
	element.setAttribute("aria-hidden", "true");
}

function synchronizeModalInertness(state: OverlayDocumentState, ownerDocument: Document): void {
	restoreModalInertness(state);
	let lastModalIndex = -1;
	for (let index = 0; index < state.stack.length; index += 1) {
		if (state.stack[index].modal) lastModalIndex = index;
	}
	if (lastModalIndex < 0 || !ownerDocument.body) return;

	const protectedElements = state.stack.slice(lastModalIndex)
		.flatMap((entry) => entry.layers.map((layer) => layer.element))
		.filter((element) => element.isConnected);
	if (protectedElements.length === 0) return;

	for (const protectedElement of protectedElements) {
		let current: HTMLElement | null = protectedElement;
		while (current?.parentElement) {
			const parent: HTMLElement = current.parentElement;
			for (const sibling of Array.from(parent.children)) {
				if (sibling === current) continue;
				const siblingElement = sibling as HTMLElement;
				const containsProtected = protectedElements.some((element) => (
					siblingElement === element || siblingElement.contains(element)
				));
				if (!containsProtected) makeElementInert(state, siblingElement);
			}
			if (parent === ownerDocument.body) break;
			current = parent;
		}
	}
}

function synchronizeOverlayLayers(state: OverlayDocumentState, ownerDocument: Document): void {
	let previousTopZIndex = Number.NEGATIVE_INFINITY;
	for (const registration of state.stack) {
		const requestedBase = Number.isFinite(registration.baseZIndex) ? registration.baseZIndex : 1000;
		registration.effectiveZIndex = Math.max(
			requestedBase,
			Number.isFinite(previousTopZIndex) ? previousTopZIndex + 10 : requestedBase,
		);
		let maximumOffset = 0;
		for (const layer of registration.layers) {
			layer.element.style.zIndex = String(registration.effectiveZIndex + layer.offset);
			maximumOffset = Math.max(maximumOffset, layer.offset);
		}
		previousTopZIndex = registration.effectiveZIndex + maximumOffset;
	}
	synchronizeModalInertness(state, ownerDocument);
}

export function registerOverlay(
	id: string,
	ownerDocument?: Document,
	options: {
		baseZIndex?: number;
		modal?: boolean;
		layers?: Array<{ element: HTMLElement | null; offset?: number }>;
	} = {},
): () => void {
	const doc = getOwnerDocument(ownerDocument);
	if (!doc) return () => undefined;
	const state = getOverlayDocumentState(doc)!;
	const existingIndex = state.stack.findIndex((entry) => entry.id === id);
	if (existingIndex >= 0) {
		const [existing] = state.stack.splice(existingIndex, 1);
		restoreOverlayLayers(existing);
	}
	const layers: OverlayLayer[] = (options.layers ?? [])
		.filter((layer): layer is { element: HTMLElement; offset?: number } => layer.element !== null)
		.map((layer) => ({
			element: layer.element,
			offset: Number.isFinite(layer.offset) ? layer.offset! : 0,
			previousZIndex: layer.element.style.zIndex,
		}));
	const registration: OverlayRegistration = {
		id,
		token: ++state.registrationToken,
		baseZIndex: options.baseZIndex ?? 1000,
		effectiveZIndex: options.baseZIndex ?? 1000,
		modal: options.modal === true,
		layers,
	};
	state.stack.push(registration);
	synchronizeOverlayLayers(state, doc);
	return () => {
		const index = state.stack.findIndex((entry) => (
			entry.id === registration.id && entry.token === registration.token
		));
		if (index >= 0) {
			const [removed] = state.stack.splice(index, 1);
			restoreOverlayLayers(removed);
			synchronizeOverlayLayers(state, doc);
		}
	};
}

export function isTopOverlay(id: string, ownerDocument?: Document): boolean {
	const doc = getOwnerDocument(ownerDocument);
	if (!doc) return false;
	const stack = getOverlayDocumentState(doc, false)?.stack;
	return stack?.[stack.length - 1]?.id === id;
}

export function lockBodyScroll(ownerDocument?: Document): () => void {
	const doc = getOwnerDocument(ownerDocument);
	const view = doc?.defaultView;
	if (!doc?.body || !view) return () => undefined;
	const state = getOverlayDocumentState(doc)!;
	const body = doc.body;
	if (state.bodyLockCount === 0) {
		state.previousOverflow = body.style.overflow;
		state.previousPaddingRight = body.style.paddingRight;
		const scrollbarWidth = Math.max(0, view.innerWidth - doc.documentElement.clientWidth);
		const computedPaddingRight = Number.parseFloat(view.getComputedStyle(body).paddingRight) || 0;
		body.style.overflow = "hidden";
		if (scrollbarWidth > 0) body.style.paddingRight = `${computedPaddingRight + scrollbarWidth}px`;
	}
	state.bodyLockCount += 1;
	let released = false;
	return () => {
		if (released) return;
		released = true;
		state.bodyLockCount = Math.max(0, state.bodyLockCount - 1);
		if (state.bodyLockCount !== 0) return;
		body.style.overflow = state.previousOverflow;
		body.style.paddingRight = state.previousPaddingRight;
	};
}

export interface PopoverPositionRegistration {
	ownerDocument: Document;
	trigger: HTMLElement;
	panel: HTMLElement;
	/** Write dependent CSS variables before any bounding-box reads. */
	beforeMeasure?: () => void;
	/** Read current geometry and calculate the next position. */
	measure: () => PopoverPosition | null;
	/** Called after all registered positioners have completed their read phase. */
	onPosition: (position: PopoverPosition) => void;
}

interface PositionSubscriber extends PopoverPositionRegistration {}

interface PopoverPositionScheduler {
	ownerDocument: Document;
	view: Window | null;
	subscribers: Set<PositionSubscriber>;
	frame: number | null;
	resizeObserver?: ResizeObserver;
	observedCounts: Map<Element, number>;
	schedule: () => void;
	flush: () => void;
	dispose: () => void;
}

const popoverSchedulers = new WeakMap<Document, PopoverPositionScheduler>();

function requestSchedulerFrame(view: Window | null, callback: FrameRequestCallback): number {
	if (view && typeof view.requestAnimationFrame === "function") {
		return view.requestAnimationFrame(callback);
	}
	return setTimeout(() => callback(Date.now()), 16) as unknown as number;
}

function cancelSchedulerFrame(view: Window | null, frame: number): void {
	if (view && typeof view.cancelAnimationFrame === "function") {
		view.cancelAnimationFrame(frame);
	} else {
		clearTimeout(frame as unknown as ReturnType<typeof setTimeout>);
	}
}

function createPopoverScheduler(ownerDocument: Document): PopoverPositionScheduler {
	const view = ownerDocument.defaultView;
	const subscribers = new Set<PositionSubscriber>();
	const observedCounts = new Map<Element, number>();
	let frame: number | null = null;
	let resizeObserver: ResizeObserver | undefined;
	let disposed = false;

	const scheduler = {
		ownerDocument,
		view,
		subscribers,
		get frame() { return frame; },
		set frame(value: number | null) { frame = value; },
		get resizeObserver() { return resizeObserver; },
		set resizeObserver(value: ResizeObserver | undefined) { resizeObserver = value; },
		observedCounts,
		schedule: () => {
			if (disposed || frame !== null || subscribers.size === 0) return;
			frame = requestSchedulerFrame(view, () => {
				frame = null;
				scheduler.flush();
			});
		},
		flush: () => {
			if (disposed || subscribers.size === 0) return;
			const active = [...subscribers];
			// Perform dependent style writes first; all geometry reads follow.
			for (const subscriber of active) {
				if (!subscribers.has(subscriber)) continue;
				try { subscriber.beforeMeasure?.(); } catch { /* one faulty positioner must not starve others */ }
			}
			const measured: Array<{ subscriber: PositionSubscriber; position: PopoverPosition | null }> = [];
			for (const subscriber of active) {
				if (!subscribers.has(subscriber)) continue;
				try {
					measured.push({ subscriber, position: subscriber.measure() });
				} catch {
					measured.push({ subscriber, position: null });
				}
			}
			// Notify only after every subscriber has completed its read phase.
			for (const item of measured) {
				if (!item.position || !subscribers.has(item.subscriber)) continue;
				try { item.subscriber.onPosition(item.position); } catch { /* isolate consumers */ }
			}
		},
		dispose: () => {
			if (disposed) return;
			disposed = true;
			if (frame !== null) {
				cancelSchedulerFrame(view, frame);
				frame = null;
			}
			view?.removeEventListener("resize", scheduler.schedule);
			view?.removeEventListener("scroll", scheduler.schedule, true);
			view?.visualViewport?.removeEventListener("resize", scheduler.schedule);
			view?.visualViewport?.removeEventListener("scroll", scheduler.schedule);
			resizeObserver?.disconnect();
			resizeObserver = undefined;
			observedCounts.clear();
			subscribers.clear();
			popoverSchedulers.delete(ownerDocument);
		},
	} satisfies PopoverPositionScheduler;

	if (view) {
		view.addEventListener("resize", scheduler.schedule, { passive: true });
		view.addEventListener("scroll", scheduler.schedule, { passive: true, capture: true });
		view.visualViewport?.addEventListener("resize", scheduler.schedule, { passive: true });
		view.visualViewport?.addEventListener("scroll", scheduler.schedule, { passive: true });
	}
	if (typeof ResizeObserver !== "undefined") {
		resizeObserver = new ResizeObserver(() => scheduler.schedule());
	}
	popoverSchedulers.set(ownerDocument, scheduler);
	return scheduler;
}

function observePopoverElement(scheduler: PopoverPositionScheduler, element: Element, delta: 1 | -1): void {
	const previous = scheduler.observedCounts.get(element) ?? 0;
	const next = previous + delta;
	if (next <= 0) {
		scheduler.observedCounts.delete(element);
		try { scheduler.resizeObserver?.unobserve(element); } catch { /* optional API */ }
		return;
	}
	scheduler.observedCounts.set(element, next);
	if (previous === 0) {
		try { scheduler.resizeObserver?.observe(element); } catch { /* optional API */ }
	}
}

/** Register one open popover with the per-document, single-frame positioning scheduler. */
export function registerPopoverPositioner(registration: PopoverPositionRegistration): () => void {
	const { ownerDocument } = registration;
	let scheduler = popoverSchedulers.get(ownerDocument);
	if (!scheduler) scheduler = createPopoverScheduler(ownerDocument);
	const subscriber: PositionSubscriber = registration;
	scheduler.subscribers.add(subscriber);
	const observed = new Set<Element>([registration.trigger, registration.panel]);
	for (const element of observed) observePopoverElement(scheduler, element, 1);
	scheduler.schedule();

	let released = false;
	return () => {
		if (released) return;
		released = true;
		if (!scheduler!.subscribers.delete(subscriber)) return;
		for (const element of observed) observePopoverElement(scheduler!, element, -1);
		if (scheduler!.subscribers.size === 0) scheduler!.dispose();
	};
}

/** Schedule one shared positioning pass when viewport or observed geometry changes. */
export function schedulePopoverPositionUpdate(ownerDocument?: Document): void {
	const doc = getOwnerDocument(ownerDocument);
	if (doc) popoverSchedulers.get(doc)?.schedule();
}

const FOCUSABLE_SELECTOR = [
	"a[href]",
	"area[href]",
	"button",
	"input:not([type='hidden'])",
	"select",
	"textarea",
	"summary",
	"audio[controls]",
	"video[controls]",
	"[tabindex]",
	"[contenteditable='true']",
].join(",");

export function getFocusableElements(root: HTMLElement): HTMLElement[] {
	return [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter((element) => {
		if (!element.isConnected || element.matches(":disabled")) return false;
		if (element.tabIndex < 0) return false;
		if (element.closest("[hidden], [inert], [aria-hidden='true']")) return false;
		if (element.getClientRects().length === 0) return false;
		return true;
	});
}
