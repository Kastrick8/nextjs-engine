"use client";

import React, {
	useCallback,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
	type CSSProperties,
} from "react";
import { useHandler } from "../../providers/EngineProvider";
import {
	getFocusableElements,
	isTopOverlay,
	lockBodyScroll,
	registerOverlay,
} from "../../core/engineoverlay";
import type { EngineOverlayOpenChange } from "./types";

export const SURFACE_BASE: CSSProperties = {
	background: "var(--e-overlay-bg, #fff)",
	color: "var(--e-overlay-color, #0f172a)",
	border: "1px solid var(--e-overlay-border, rgba(15,23,42,.14))",
	boxShadow: "var(--e-overlay-shadow, 0 24px 80px rgba(2,6,23,.28))",
	borderRadius: "var(--e-overlay-radius, 14px)",
};

export function clampDuration(value: number | undefined, fallback = 180): number {
	return Math.min(1200, Math.max(0, Number.isFinite(value) ? value! : fallback));
}

interface ReducedMotionStore {
	query: MediaQueryList | null;
	matches: boolean;
	listeners: Set<() => void>;
	subscribe: (listener: () => void) => () => void;
	getSnapshot: () => boolean;
	handleChange: () => void;
}

const reducedMotionStores = new WeakMap<Document, ReducedMotionStore>();

function getReducedMotionStore(ownerDocument: Document): ReducedMotionStore {
	const existing = reducedMotionStores.get(ownerDocument);
	if (existing) return existing;
	const store: ReducedMotionStore = {
		query: null,
		matches: false,
		listeners: new Set(),
		subscribe(listener) {
			store.listeners.add(listener);
			if (!store.query) {
				const view = ownerDocument.defaultView;
				if (view && typeof view.matchMedia === "function") {
					store.query = view.matchMedia("(prefers-reduced-motion: reduce)");
					store.matches = store.query.matches;
					if (typeof store.query.addEventListener === "function") {
						store.query.addEventListener("change", store.handleChange);
					} else {
						store.query.addListener?.(store.handleChange);
					}
				}
			}
			return () => {
				store.listeners.delete(listener);
				if (store.listeners.size !== 0 || !store.query) return;
				if (typeof store.query.removeEventListener === "function") {
					store.query.removeEventListener("change", store.handleChange);
				} else {
					store.query.removeListener?.(store.handleChange);
				}
				store.query = null;
				store.matches = false;
			};
		},
		getSnapshot: () => store.query?.matches ?? store.matches,
		handleChange: () => undefined,
	};
	store.handleChange = () => {
		const next = store.query?.matches ?? false;
		if (next === store.matches) return;
		store.matches = next;
		for (const listener of [...store.listeners]) listener();
	};
	reducedMotionStores.set(ownerDocument, store);
	return store;
}

function subscribeReducedMotion(listener: () => void): () => void {
	if (typeof document === "undefined") return () => undefined;
	return getReducedMotionStore(document).subscribe(listener);
}

function getReducedMotionSnapshot(): boolean {
	if (typeof document === "undefined") return false;
	return getReducedMotionStore(document).getSnapshot();
}

export function useReducedMotion(): boolean {
	return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, () => false);
}

/** Resolve portal ownership only after mount so SSR and first hydration match. */
export function usePortalTarget(portalTargetId?: string): HTMLElement | null {
	const [target, setTarget] = useState<HTMLElement | null>(null);
	useEffect(() => {
		const nextTarget = portalTargetId
			? document.getElementById(portalTargetId) ?? document.body
			: document.body;
		setTarget(nextTarget);
		return () => setTarget(null);
	}, [portalTargetId]);
	return target;
}

export function useOverlayState(
	open: boolean | undefined,
	defaultOpen: boolean,
	onOpenChange: EngineOverlayOpenChange | undefined,
) {
	const [internalOpen, setInternalOpen] = useState(defaultOpen);
	const namedHandler = useHandler(typeof onOpenChange === "string" ? onOpenChange : "");
	const controlled = open !== undefined;
	const resolvedOpen = controlled ? Boolean(open) : internalOpen;
	const setOpen = useCallback((nextOpen: boolean) => {
		if (!controlled) setInternalOpen(nextOpen);
		if (typeof onOpenChange === "function") onOpenChange(nextOpen);
		else namedHandler?.(nextOpen);
	}, [controlled, namedHandler, onOpenChange]);
	return [resolvedOpen, setOpen] as const;
}

export function useOverlayPresence(open: boolean, duration: number) {
	const [present, setPresent] = useState(open);
	const [active, setActive] = useState(false);
	useEffect(() => {
		let frame = 0;
		let timer: ReturnType<typeof setTimeout> | undefined;
		if (open) {
			setPresent(true);
			frame = requestAnimationFrame(() => setActive(true));
		} else {
			setActive(false);
			timer = setTimeout(() => setPresent(false), duration);
		}
		return () => {
			if (frame) cancelAnimationFrame(frame);
			if (timer) clearTimeout(timer);
		};
	}, [duration, open]);
	return { present, active };
}

interface OverlayBehaviorOptions {
	open: boolean;
	ready?: boolean;
	overlayId: string;
	panelRef: React.RefObject<HTMLElement | null>;
	triggerRef: React.RefObject<HTMLElement | null>;
	baseZIndex?: number;
	layers?: Array<{ ref: React.RefObject<HTMLElement | null>; offset?: number }>;
	close: () => void;
	closeOnEscape: boolean;
	trapFocus: boolean;
	autoFocus: boolean;
	lockScroll: boolean;
	restoreFocus: boolean;
	initialFocus?: string;
}

function resolveInitialFocus(panel: HTMLElement, selector: string | undefined): HTMLElement | null {
	if (!selector) return null;
	try {
		return panel.querySelector<HTMLElement>(selector);
	} catch {
		if (process.env.NODE_ENV !== "production") {
			console.warn(`[EngineOverlay] Invalid initialFocus selector: ${selector}`);
		}
		return null;
	}
}

export function useOverlayBehavior(options: OverlayBehaviorOptions) {
	const previousFocus = useRef<HTMLElement | null>(null);
	const currentOptions = useRef(options);
	currentOptions.current = options;

	// Scroll locking owns its own lifecycle so `lockScroll` can change live while
	// an overlay remains open without recreating keyboard/focus registration.
	const ownerDocument = options.panelRef.current?.ownerDocument
		?? options.triggerRef.current?.ownerDocument
		?? (typeof document !== "undefined" ? document : undefined);

	useEffect(() => {
		if (!options.open || options.ready === false || !options.lockScroll) return;
		const doc = options.panelRef.current?.ownerDocument
			?? options.triggerRef.current?.ownerDocument
			?? (typeof document !== "undefined" ? document : undefined);
		if (!doc) return;
		return lockBodyScroll(doc);
	}, [options.lockScroll, options.open, options.overlayId, options.ready]);

	useEffect(() => {
		if (!options.open || options.ready === false || !ownerDocument) return;
		const doc = ownerDocument;
		previousFocus.current = doc.activeElement instanceof HTMLElement ? doc.activeElement : null;
		const layers = (options.layers ?? []).map((layer) => ({
			element: layer.ref.current,
			offset: layer.offset,
		}));
		const unregister = registerOverlay(options.overlayId, doc, {
			baseZIndex: options.baseZIndex,
			layers,
		});
		const onKeyDown = (event: KeyboardEvent) => {
			const current = currentOptions.current;
			if (!isTopOverlay(current.overlayId, doc)) return;
			if (event.key === "Escape" && current.closeOnEscape) {
				event.preventDefault();
				current.close();
				return;
			}
			if (event.key !== "Tab" || !current.trapFocus) return;
			const panel = current.panelRef.current;
			if (!panel) return;
			const focusable = getFocusableElements(panel);
			if (focusable.length === 0) {
				event.preventDefault();
				panel.focus();
				return;
			}
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			const activeElement = doc.activeElement;
			if (!(activeElement instanceof Node) || !panel.contains(activeElement)) {
				event.preventDefault();
				(event.shiftKey ? last : first).focus();
			} else if (event.shiftKey && activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};
		doc.addEventListener("keydown", onKeyDown);
		return () => {
			doc.removeEventListener("keydown", onKeyDown);
			unregister();
			const current = currentOptions.current;
			if (!current.restoreFocus) return;
			const trigger = current.triggerRef.current;
			const target = trigger?.isConnected ? trigger : previousFocus.current;
			if (target?.isConnected) target.focus({ preventScroll: true });
		};
	}, [options.open, options.overlayId, options.ready, options.baseZIndex, ownerDocument]);

	useEffect(() => {
		if (!options.open || options.ready === false || !options.autoFocus || !ownerDocument) return;
		const view = ownerDocument.defaultView;
		let frame: number | undefined;
		const focus = () => {
			const current = currentOptions.current;
			if (!current.autoFocus || !current.open) return;
			const panel = current.panelRef.current;
			if (!panel) return;
			const requested = resolveInitialFocus(panel, current.initialFocus);
			const target = requested?.isConnected
				? requested
				: getFocusableElements(panel)[0] ?? panel;
			target.focus({ preventScroll: true });
		};
		if (view?.requestAnimationFrame) frame = view.requestAnimationFrame(focus);
		else focus();
		return () => {
			if (frame !== undefined) view?.cancelAnimationFrame(frame);
		};
	}, [options.autoFocus, options.initialFocus, options.open, options.overlayId, options.ready, ownerDocument]);
}
