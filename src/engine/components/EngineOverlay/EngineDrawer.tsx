"use client";

import React, { memo, useCallback, useId, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { isTopOverlay } from "../../core/engineoverlay";
import { useCpropClass } from "../../hooks/usePropStyles";
import { usePrimitiveStyles } from "../../hooks/usePrimitiveStyles";
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
import type { EngineDrawerProps } from "./types";

export const EngineDrawer = memo(function EngineDrawer({
	children, open, defaultOpen = false, onOpenChange,
	trigger, triggerAsChild, triggerLabel, triggerClassName, triggerStyle, triggerDisabled, triggerAriaLabel,
	title, description, actions, showCloseButton = true, closeLabel = "Close drawer",
	closeOnEscape = true, closeOnBackdrop = true, restoreFocus = true, initialFocus,
	duration, portalTargetId, ariaLabel, overlayStyle, themeStyles, lockScroll = true, trapFocus = true,
	side = "right", size = "min(26rem, 92vw)", style, className, cprop, id, point,
	zIndex = 1000, ...props
}: EngineDrawerProps) {
	const uid = useId();
	const panelId = id ?? point ?? `e-drawer-${uid.replace(/:/g, "")}`;
	const titleId = `${panelId}-title`;
	const descriptionId = `${panelId}-description`;
	const [isOpen, setOpen] = useOverlayState(open, defaultOpen, onOpenChange);
	const transitionMs = useReducedMotion() ? 0 : clampDuration(duration, 220);
	const { present, active } = useOverlayPresence(isOpen, transitionMs);
	const panelRef = useRef<HTMLDivElement>(null);
	const backdropRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLElement>(null);
	const target = usePortalTarget(portalTargetId);
	const close = useCallback(() => setOpen(false), [setOpen]);
	const behavior = useMemo(() => ({
		open: isOpen, ready: Boolean(target && present), overlayId: panelId, panelRef, triggerRef,
		baseZIndex: zIndex, layers: [{ ref: backdropRef, offset: 0 }, { ref: panelRef, offset: 1 }], close,
		closeOnEscape, trapFocus, autoFocus: true, lockScroll, restoreFocus, initialFocus,
	}), [backdropRef, close, closeOnEscape, initialFocus, isOpen, lockScroll, panelId, present, restoreFocus, target, trapFocus, zIndex]);
	useOverlayBehavior(behavior);

	const horizontal = side === "left" || side === "right";
	const hiddenTransform = side === "left" ? "translateX(-100%)"
		: side === "right" ? "translateX(100%)"
			: side === "top" ? "translateY(-100%)" : "translateY(100%)";
	const edgeStyle = side === "left" ? { left: 0, top: 0, bottom: 0 }
		: side === "right" ? { right: 0, top: 0, bottom: 0 }
			: side === "top" ? { top: 0, left: 0, right: 0 }
				: { bottom: 0, left: 0, right: 0 };
	const panelStyle = usePrimitiveStyles(props as any, {
		defaults: {
			...SURFACE_BASE,
			position: "fixed",
			...edgeStyle,
			width: horizontal ? size : "100%",
			height: horizontal ? "100%" : size,
			borderRadius: 0,
			overflow: "auto",
			padding: "1.25rem",
			...(themeStyles?.panel ?? {}),
		},
		style,
		runtime: {
			opacity: active ? 1 : 0.98,
			transform: active ? "translate(0,0)" : hiddenTransform,
			transition: `transform ${transitionMs}ms cubic-bezier(.2,.8,.2,1), opacity ${transitionMs}ms ease`,
		},
	});
	const panelClass = [className, useCpropClass(cprop)].filter(Boolean).join(" ") || undefined;

	return (
		<>
			<OverlayTrigger label={triggerLabel} children={trigger} className={triggerClassName} style={{ ...(themeStyles?.trigger ?? {}), ...(triggerStyle ?? {}) }} disabled={triggerDisabled} expanded={isOpen} controls={panelId} hasPopup="dialog" ariaLabel={triggerAriaLabel} onClick={() => setOpen(!isOpen)} triggerRef={triggerRef} asChild={triggerAsChild} />
			{target && present && createPortal(
				<>
					<div
						ref={backdropRef}
						aria-hidden="true"
						style={{ position: "fixed", inset: 0, zIndex, background: "rgba(2,6,23,.5)", backdropFilter: "blur(4px)", opacity: active ? 1 : 0, transition: `opacity ${transitionMs}ms ease`, ...themeStyles?.backdrop, ...overlayStyle }}
						onPointerDown={() => {
							if (closeOnBackdrop && isTopOverlay(panelId, panelRef.current?.ownerDocument ?? triggerRef.current?.ownerDocument)) close();
						}}
					/>
					<div
						ref={panelRef}
						id={panelId}
						role="dialog"
						aria-modal="true"
						aria-label={title == null ? (ariaLabel ?? triggerLabel ?? "Drawer") : undefined}
						aria-labelledby={title != null ? titleId : undefined}
						aria-describedby={description != null ? descriptionId : undefined}
						tabIndex={-1}
						className={panelClass}
						style={{ ...panelStyle, zIndex: zIndex + 1 }}
						data-state={active ? "open" : "closed"}
						data-side={side}
					>
						<OverlayContent title={title} description={description} actions={actions} close={close} showCloseButton={showCloseButton} closeLabel={closeLabel} titleId={titleId} descriptionId={descriptionId} themeStyles={themeStyles}>{children}</OverlayContent>
					</div>
				</>,
				target,
			)}
		</>
	);
});
