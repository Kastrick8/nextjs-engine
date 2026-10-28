"use client";

import React, { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCpropClass } from "../../hooks/usePropStyles";
import { usePrimitiveStyles } from "../../hooks/usePrimitiveStyles";
import { computePopoverPosition, isTopOverlay, registerPopoverPositioner, type EnginePopoverPlacement } from "../../core/engineoverlay";
import {
	SURFACE_BASE,
	clampDuration,
	useOverlayBehavior,
	useOverlayPresence,
	useOverlayState,
	usePortalTarget,
	useReducedMotion,
} from "./OverlayShared";
import { OverlayContent, OverlayTrigger } from "./OverlayParts";
import type { EnginePopoverProps } from "./types";

export const EnginePopover = memo(function EnginePopover({
	children, open, defaultOpen = false, onOpenChange,
	trigger, triggerAsChild, triggerLabel, triggerClassName, triggerStyle, triggerDisabled, triggerAriaLabel,
	title, description, actions, showCloseButton = false, closeLabel = "Close popover",
	closeOnEscape = true, restoreFocus = true, initialFocus, duration, portalTargetId, ariaLabel, themeStyles,
	placement = "bottom", align = "center", offset = 8, viewportPadding = 8,
	closeOnOutsideClick = true, matchTriggerWidth = false, autoFocus = false, trapFocus = false,
	role = "dialog", style, className, cprop, id, point, zIndex = 1100, ...props
}: EnginePopoverProps) {
	const uid = useId();
	const panelId = id ?? point ?? `e-popover-${uid.replace(/:/g, "")}`;
	const titleId = `${panelId}-title`;
	const descriptionId = `${panelId}-description`;
	const [isOpen, setOpen] = useOverlayState(open, defaultOpen, onOpenChange);
	const transitionMs = useReducedMotion() ? 0 : clampDuration(duration, 140);
	const { present, active } = useOverlayPresence(isOpen, transitionMs);
	const panelRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLElement>(null);
	const target = usePortalTarget(portalTargetId);
	const [position, setPosition] = useState<{ top: number; left: number; placement: EnginePopoverPlacement } | null>(null);
	const close = useCallback(() => setOpen(false), [setOpen]);
	const behavior = useMemo(() => ({
		open: isOpen, overlayId: panelId, panelRef, triggerRef, close,
		closeOnEscape, trapFocus, autoFocus, lockScroll: false, restoreFocus, initialFocus,
	}), [autoFocus, close, closeOnEscape, initialFocus, isOpen, panelId, restoreFocus, trapFocus]);
	useOverlayBehavior(behavior);

	useEffect(() => {
		if (!present || !target) return;
		const triggerElement = triggerRef.current;
		const panelElement = panelRef.current;
		if (!triggerElement || !panelElement) return;

		const ownerDocument = panelElement.ownerDocument ?? target.ownerDocument;
		const ownerWindow = ownerDocument.defaultView;
		let triggerRect: DOMRect | null = null;
		let viewportWidth = ownerWindow?.innerWidth ?? 0;
		let viewportHeight = ownerWindow?.innerHeight ?? 0;
		let viewportLeft = 0;
		let viewportTop = 0;

		return registerPopoverPositioner({
			ownerDocument,
			trigger: triggerElement,
			panel: panelElement,
			beforeMeasure: () => {
				triggerRect = triggerElement.getBoundingClientRect();
				const visualViewport = ownerWindow?.visualViewport;
				viewportWidth = visualViewport?.width ?? ownerWindow?.innerWidth ?? 0;
				viewportHeight = visualViewport?.height ?? ownerWindow?.innerHeight ?? 0;
				viewportLeft = visualViewport?.offsetLeft ?? 0;
				viewportTop = visualViewport?.offsetTop ?? 0;
				if (matchTriggerWidth) {
					const usableViewportWidth = Math.max(0, viewportWidth - viewportPadding * 2);
					const nextWidth = `${Math.min(triggerRect.width, usableViewportWidth)}px`;
					if (panelElement.style.getPropertyValue("--e-popover-trigger-width") !== nextWidth) {
						panelElement.style.setProperty("--e-popover-trigger-width", nextWidth);
					}
				} else if (panelElement.style.getPropertyValue("--e-popover-trigger-width")) {
					panelElement.style.removeProperty("--e-popover-trigger-width");
				}
			},
			measure: () => {
				if (!triggerRect) return null;
				const panelRect = panelElement.getBoundingClientRect();
				return computePopoverPosition(triggerRect, panelRect, {
					placement,
					align,
					offset,
					viewportWidth,
					viewportHeight,
					viewportLeft,
					viewportTop,
					viewportPadding,
				});
			},
			onPosition: (next) => {
				setPosition((current) => current
					&& current.top === next.top
					&& current.left === next.left
					&& current.placement === next.placement
					? current
					: next);
			},
		});
	}, [align, matchTriggerWidth, offset, placement, present, target, viewportPadding]);

	useEffect(() => {
		if (!isOpen || !closeOnOutsideClick) return;
		const onPointerDown = (event: PointerEvent) => {
			if (!isTopOverlay(panelId, panelRef.current?.ownerDocument ?? triggerRef.current?.ownerDocument)) return;
			const eventTarget = event.target as Node | null;
			if (eventTarget && (panelRef.current?.contains(eventTarget) || triggerRef.current?.contains(eventTarget))) return;
			close();
		};
		document.addEventListener("pointerdown", onPointerDown, true);
		return () => document.removeEventListener("pointerdown", onPointerDown, true);
	}, [close, closeOnOutsideClick, isOpen, panelId]);

	const actualPlacement = position?.placement ?? placement;
	const hiddenTransform = actualPlacement === "top" ? "translateY(6px)"
		: actualPlacement === "bottom" ? "translateY(-6px)"
			: actualPlacement === "left" ? "translateX(6px)" : "translateX(-6px)";
	const panelStyle = usePrimitiveStyles(props as any, {
		defaults: {
			...SURFACE_BASE,
			position: "fixed",
			minWidth: matchTriggerWidth ? "var(--e-popover-trigger-width, 12rem)" : "12rem",
			maxWidth: "min(24rem, calc(100vw - 1rem))",
			maxHeight: "min(70vh, 36rem)",
			overflow: "auto",
			padding: "1rem",
			...(themeStyles?.panel ?? {}),
		},
		style,
		runtime: {
			top: position?.top ?? 0,
			left: position?.left ?? 0,
			visibility: position ? "visible" : "hidden",
			opacity: active ? 1 : 0,
			transform: active ? "translate(0,0) scale(1)" : `${hiddenTransform} scale(.985)`,
			transformOrigin: actualPlacement === "top" ? "bottom center" : actualPlacement === "bottom" ? "top center" : actualPlacement === "left" ? "center right" : "center left",
			transition: `opacity ${transitionMs}ms ease, transform ${transitionMs}ms ease`,
		},
	});
	const panelClass = [className, useCpropClass(cprop)].filter(Boolean).join(" ") || undefined;
	const hasPopup: React.AriaAttributes["aria-haspopup"] = "dialog";

	return (
		<>
			<OverlayTrigger label={triggerLabel} children={trigger} className={triggerClassName} style={{ ...(themeStyles?.trigger ?? {}), ...(triggerStyle ?? {}) }} disabled={triggerDisabled} expanded={isOpen} controls={panelId} hasPopup={hasPopup} ariaLabel={triggerAriaLabel} onClick={() => setOpen(!isOpen)} triggerRef={triggerRef} asChild={triggerAsChild} />
			{target && present && createPortal(
				<div
					ref={panelRef}
					id={panelId}
					role={role}
					aria-label={title == null ? (ariaLabel ?? triggerLabel ?? "Popover") : undefined}
					aria-labelledby={title != null ? titleId : undefined}
					aria-describedby={description != null ? descriptionId : undefined}
					tabIndex={-1}
					className={panelClass}
					style={{ ...panelStyle, zIndex }}
					data-state={active ? "open" : "closed"}
					data-placement={actualPlacement}
				>
					<OverlayContent title={title} description={description} actions={actions} close={close} showCloseButton={showCloseButton} closeLabel={closeLabel} titleId={titleId} descriptionId={descriptionId} themeStyles={themeStyles}>{children}</OverlayContent>
				</div>,
				target,
			)}
		</>
	);
});
