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

interface OverlayRegistration {
	id: string;
	token: number;
}

interface OverlayDocumentState {
	stack: OverlayRegistration[];
	nextToken: number;
	bodyLockCount: number;
	previousOverflow: string;
	previousPaddingRight: string;
	viewportSubscribers: Set<() => void>;
	viewportCleanup: (() => void) | null;
	nextFrameToken: number;
	frameId: number | null;
	frameCallbacks: Map<number, () => void>;
	resizeObserver: ResizeObserver | null;
	resizeSubscribers: Map<Element, Set<() => void>>;
}

const overlayDocuments = new WeakMap<Document, OverlayDocumentState>();

function getOverlayDocumentState(ownerDocument: Document): OverlayDocumentState {
	let state = overlayDocuments.get(ownerDocument);
	if (!state) {
		state = {
			stack: [],
			nextToken: 0,
			bodyLockCount: 0,
			previousOverflow: "",
			previousPaddingRight: "",
			viewportSubscribers: new Set(),
			viewportCleanup: null,
			nextFrameToken: 0,
			frameId: null,
			frameCallbacks: new Map(),
			resizeObserver: null,
			resizeSubscribers: new Map(),
		};
		overlayDocuments.set(ownerDocument, state);
	}
	return state;
}

function resolveOwnerDocument(ownerDocument?: Document): Document | null {
	if (ownerDocument) return ownerDocument;
	return typeof document === "undefined" ? null : document;
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

export function registerOverlay(id: string, ownerDocument?: Document): () => void {
	const doc = resolveOwnerDocument(ownerDocument);
	if (!doc) return () => undefined;
	const state = getOverlayDocumentState(doc);
	const existingIndex = state.stack.findIndex((entry) => entry.id === id);
	if (existingIndex >= 0) state.stack.splice(existingIndex, 1);
	const registration = { id, token: ++state.nextToken };
	state.stack.push(registration);
	return () => {
		const index = state.stack.findIndex((entry) => (
			entry.id === registration.id && entry.token === registration.token
		));
		if (index >= 0) state.stack.splice(index, 1);
	};
}

export function isTopOverlay(id: string, ownerDocument?: Document): boolean {
	const doc = resolveOwnerDocument(ownerDocument);
	if (!doc) return false;
	const stack = getOverlayDocumentState(doc).stack;
	return stack[stack.length - 1]?.id === id;
}

/**
 * Coalesce overlay layout work into one animation-frame callback per Document.
 * Consumers can cancel their queued work when a panel closes or receives a newer update.
 */
export function scheduleOverlayFrame(callback: () => void, ownerDocument?: Document): () => void {
	const doc = resolveOwnerDocument(ownerDocument);
	const view = doc?.defaultView;
	if (!doc || !view) return () => undefined;
	const state = getOverlayDocumentState(doc);
	const token = ++state.nextFrameToken;
	state.frameCallbacks.set(token, callback);
	if (state.frameId === null) {
		state.frameId = view.requestAnimationFrame(() => {
			state.frameId = null;
			const callbacks = [...state.frameCallbacks.values()];
			state.frameCallbacks.clear();
			for (const run of callbacks) run();
		});
	}
	return () => {
		state.frameCallbacks.delete(token);
		if (state.frameCallbacks.size === 0 && state.frameId !== null) {
			view.cancelAnimationFrame(state.frameId);
			state.frameId = null;
		}
	};
}

/**
 * Share viewport listeners between all open popovers in one Document.
 * The first subscriber attaches listeners; the last one removes them.
 */
export function subscribeOverlayViewport(callback: () => void, ownerDocument?: Document): () => void {
	const doc = resolveOwnerDocument(ownerDocument);
	const view = doc?.defaultView;
	if (!doc || !view) return () => undefined;
	const state = getOverlayDocumentState(doc);
	state.viewportSubscribers.add(callback);
	if (state.viewportSubscribers.size === 1) {
		const notify = () => {
			for (const subscriber of state.viewportSubscribers) subscriber();
		};
		const viewport = view.visualViewport;
		view.addEventListener("resize", notify, { passive: true });
		view.addEventListener("scroll", notify, { passive: true, capture: true });
		viewport?.addEventListener("resize", notify, { passive: true });
		viewport?.addEventListener("scroll", notify, { passive: true });
		state.viewportCleanup = () => {
			view.removeEventListener("resize", notify);
			view.removeEventListener("scroll", notify, true);
			viewport?.removeEventListener("resize", notify);
			viewport?.removeEventListener("scroll", notify);
			state.viewportCleanup = null;
		};
	}
	return () => {
		state.viewportSubscribers.delete(callback);
		if (state.viewportSubscribers.size === 0) state.viewportCleanup?.();
	};
}

/**
 * Share one ResizeObserver per owning Document. Individual elements are observed
 * only while at least one active consumer needs their geometry.
 */
export function subscribeOverlayResize(
	element: Element,
	callback: () => void,
	ownerDocument?: Document,
): () => void {
	const doc = ownerDocument ?? element.ownerDocument ?? resolveOwnerDocument();
	if (!doc) return () => undefined;
	const view = doc.defaultView as (Window & { ResizeObserver?: typeof ResizeObserver }) | null;
	const ResizeObserverConstructor = view?.ResizeObserver
		?? (typeof ResizeObserver === "undefined" ? undefined : ResizeObserver);
	if (!ResizeObserverConstructor) return () => undefined;

	const state = getOverlayDocumentState(doc);
	if (!state.resizeObserver) {
		state.resizeObserver = new ResizeObserverConstructor((entries) => {
			for (const entry of entries) {
				const subscribers = state.resizeSubscribers.get(entry.target);
				if (!subscribers) continue;
				for (const subscriber of [...subscribers]) subscriber();
			}
		});
	}

	let subscribers = state.resizeSubscribers.get(element);
	if (!subscribers) {
		subscribers = new Set();
		state.resizeSubscribers.set(element, subscribers);
		try {
			state.resizeObserver.observe(element);
		} catch {
			state.resizeSubscribers.delete(element);
			if (state.resizeSubscribers.size === 0) {
				state.resizeObserver.disconnect();
				state.resizeObserver = null;
			}
			return () => undefined;
		}
	}
	subscribers.add(callback);

	let subscribed = true;
	return () => {
		if (!subscribed) return;
		subscribed = false;
		const current = state.resizeSubscribers.get(element);
		current?.delete(callback);
		if (current && current.size === 0) {
			state.resizeSubscribers.delete(element);
			state.resizeObserver?.unobserve(element);
		}
		if (state.resizeSubscribers.size === 0) {
			state.resizeObserver?.disconnect();
			state.resizeObserver = null;
		}
	};
}

export function lockBodyScroll(ownerDocument?: Document): () => void {
	const doc = resolveOwnerDocument(ownerDocument);
	if (!doc?.body) return () => undefined;
	const state = getOverlayDocumentState(doc);
	const body = doc.body;
	const view = doc.defaultView;
	if (state.bodyLockCount === 0) {
		state.previousOverflow = body.style.overflow;
		state.previousPaddingRight = body.style.paddingRight;
		const scrollbarWidth = Math.max(0, (view?.innerWidth ?? 0) - doc.documentElement.clientWidth);
		const computedPaddingRight = Number.parseFloat(view?.getComputedStyle(body).paddingRight ?? "0") || 0;
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

const FOCUSABLE_SELECTOR = [
	"a[href]",
	"button",
	"input",
	"select",
	"textarea",
	"summary",
	"audio[controls]",
	"video[controls]",
	"[tabindex]:not([tabindex='-1'])",
	"[contenteditable]:not([contenteditable='false'])",
].join(",");

/** Exclude controls hidden or disabled by themselves or by an ancestor. */
export function getFocusableElements(root: HTMLElement): HTMLElement[] {
	const view = root.ownerDocument.defaultView;
	return [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter((element) => {
		if (element.matches(":disabled") || element.tabIndex < 0) return false;
		if (element.closest("[hidden], [inert], [aria-hidden='true']")) return false;
		if (element.getClientRects().length === 0) return false;
		const visibility = view?.getComputedStyle(element).visibility;
		return visibility !== "hidden" && visibility !== "collapse";
	});
}
