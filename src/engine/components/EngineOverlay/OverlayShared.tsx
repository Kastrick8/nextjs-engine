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

let reducedMotionQuery: MediaQueryList | null = null;
let reducedMotionValue = false;
const reducedMotionSubscribers = new Set<() => void>();
let reducedMotionCleanup: (() => void) | null = null;

function getReducedMotionSnapshot(): boolean {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
	if (!reducedMotionQuery) {
		reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		reducedMotionValue = reducedMotionQuery.matches;
	}
	return reducedMotionValue;
}

function subscribeReducedMotion(subscriber: () => void): () => void {
	reducedMotionSubscribers.add(subscriber);
	if (reducedMotionSubscribers.size === 1 && typeof window !== "undefined" && typeof window.matchMedia === "function") {
		const query = reducedMotionQuery ?? window.matchMedia("(prefers-reduced-motion: reduce)");
		reducedMotionQuery = query;
		reducedMotionValue = query.matches;
		const update = () => {
			const next = query.matches;
			if (next === reducedMotionValue) return;
			reducedMotionValue = next;
			for (const listener of reducedMotionSubscribers) listener();
		};
		if (typeof query.addEventListener === "function") query.addEventListener("change", update);
		else query.addListener?.(update);
		reducedMotionCleanup = () => {
			if (typeof query.removeEventListener === "function") query.removeEventListener("change", update);
			else query.removeListener?.(update);
			reducedMotionQuery = null;
			reducedMotionCleanup = null;
		};
	}
	return () => {
		reducedMotionSubscribers.delete(subscriber);
		if (reducedMotionSubscribers.size === 0) reducedMotionCleanup?.();
	};
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
	/** True only when the portal target and panel have mounted. */
	present: boolean;
	overlayId: string;
	panelRef: React.RefObject<HTMLElement | null>;
	triggerRef: React.RefObject<HTMLButtonElement | null>;
	close: () => void;
	modal: boolean;
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
	useEffect(() => {
		if (!options.open || !options.lockScroll) return;
		return lockBodyScroll(document);
	}, [options.lockScroll, options.open]);

	useEffect(() => {
		if (!options.open || !options.present) return;
		const panel = options.panelRef.current;
		if (!panel) return;
		const ownerDocument = panel.ownerDocument;
		previousFocus.current = ownerDocument.activeElement instanceof HTMLElement
			? ownerDocument.activeElement
			: null;
		const unregister = registerOverlay(options.overlayId, ownerDocument, {
			root: panel.parentElement ?? panel,
			modal: options.modal,
		});
		const frame = requestAnimationFrame(() => {
			const current = currentOptions.current;
			if (!current.autoFocus) return;
			const currentPanel = current.panelRef.current;
			if (!currentPanel) return;
			const requested = resolveInitialFocus(currentPanel, current.initialFocus);
			(requested ?? getFocusableElements(currentPanel)[0] ?? currentPanel).focus({ preventScroll: true });
		});
		const onKeyDown = (event: KeyboardEvent) => {
			const current = currentOptions.current;
			if (!isTopOverlay(current.overlayId, ownerDocument)) return;
			if (event.key === "Escape" && current.closeOnEscape) {
				event.preventDefault();
				current.close();
				return;
			}
			if (event.key !== "Tab" || !current.trapFocus) return;
			const currentPanel = current.panelRef.current;
			if (!currentPanel) return;
			const focusable = getFocusableElements(currentPanel);
			if (focusable.length === 0) {
				event.preventDefault();
				currentPanel.focus();
				return;
			}
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			const activeElement = ownerDocument.activeElement;
			if (!(activeElement instanceof Node) || !currentPanel.contains(activeElement)) {
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
		ownerDocument.addEventListener("keydown", onKeyDown);
		return () => {
			cancelAnimationFrame(frame);
			ownerDocument.removeEventListener("keydown", onKeyDown);
			unregister();
			const current = currentOptions.current;
			if (!current.restoreFocus) return;
			const target = current.triggerRef.current ?? previousFocus.current;
			if (target?.isConnected) target.focus({ preventScroll: true });
		};
	}, [options.modal, options.open, options.overlayId, options.present]);
}
