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
	children, engineOverlayTheme, open, defaultOpen = false, onOpenChange,
	trigger, triggerAsChild, triggerLabel, triggerClassName, triggerStyle, triggerDisabled, triggerAriaLabel,
	title, description, actions, showCloseButton = true, closeLabel = "Close drawer",
	closeOnEscape = true, closeOnBackdrop = true, restoreFocus = true, initialFocus,
	duration, portalTargetId, ariaLabel, overlayStyle, lockScroll = true, trapFocus = true,
	side, size, style, className, cprop, id, point,
	zIndex = 1000, ...props
}: EngineDrawerProps) {
	const uid = useId();
	const panelId = id ?? point ?? `e-drawer-${uid.replace(/:/g, "")}`;
	const titleId = `${panelId}-title`;
	const descriptionId = `${panelId}-description`;
	const [isOpen, setOpen] = useOverlayState(open, defaultOpen, onOpenChange);
	const transitionMs = useReducedMotion() ? 0 : clampDuration(duration ?? engineOverlayTheme?.defaults?.duration, 220);
	const { present, active } = useOverlayPresence(isOpen, transitionMs);
	const panelRef = useRef<HTMLDivElement>(null);
	const backdropRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const target = usePortalTarget(portalTargetId);
	const close = useCallback(() => setOpen(false), [setOpen]);
	const behavior = useMemo(() => ({
		open: isOpen, present: present && target !== null, overlayId: panelId, panelRef, triggerRef, close, modal: true,
		baseZIndex: zIndex, layers: [{ ref: backdropRef, offset: 0 }, { ref: panelRef, offset: 1 }],
		closeOnEscape, trapFocus, autoFocus: true, lockScroll, restoreFocus, initialFocus,
	}), [backdropRef, close, closeOnEscape, initialFocus, isOpen, lockScroll, panelId, panelRef, present, restoreFocus, target, trapFocus, zIndex]);
	useOverlayBehavior(behavior);

	const resolvedSide = side ?? engineOverlayTheme?.defaults?.side ?? "right";
	const resolvedSize = size ?? engineOverlayTheme?.defaults?.size ?? "min(26rem, 92vw)";
	const horizontal = resolvedSide === "left" || resolvedSide === "right";
	const hiddenTransform = resolvedSide === "left" ? "translateX(-100%)"
		: resolvedSide === "right" ? "translateX(100%)"
			: resolvedSide === "top" ? "translateY(-100%)" : "translateY(100%)";
	const edgeStyle = resolvedSide === "left" ? { left: 0, top: 0, bottom: 0 }
		: resolvedSide === "right" ? { right: 0, top: 0, bottom: 0 }
			: resolvedSide === "top" ? { top: 0, left: 0, right: 0 }
				: { bottom: 0, left: 0, right: 0 };
	const panelStyle = usePrimitiveStyles(props as any, {
		defaults: {
			...SURFACE_BASE,
			position: "fixed",
			...edgeStyle,
			width: horizontal ? resolvedSize : "100%",
			height: horizontal ? "100%" : resolvedSize,
			borderRadius: 0,
			overflow: "auto",
			padding: "1.25rem",
			...engineOverlayTheme?.styles?.panel,
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
			<OverlayTrigger label={triggerLabel} children={trigger} asChild={triggerAsChild} className={triggerClassName} style={{ ...engineOverlayTheme?.styles?.trigger, ...triggerStyle }} disabled={triggerDisabled} expanded={isOpen} controls={panelId} hasPopup="dialog" ariaLabel={triggerAriaLabel} onClick={() => setOpen(!isOpen)} triggerRef={triggerRef} />
			{target && present && createPortal(
				<>
					<div
						ref={backdropRef}
						aria-hidden="true"
						style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,.5)", backdropFilter: "blur(4px)", opacity: active ? 1 : 0, transition: `opacity ${transitionMs}ms ease`, ...engineOverlayTheme?.styles?.backdrop, ...overlayStyle, zIndex: `var(--e-overlay-stack-z, ${zIndex})` } as React.CSSProperties}
						onPointerDown={() => {
							if (closeOnBackdrop && isTopOverlay(panelId)) close();
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
						style={{ ...panelStyle, zIndex: `var(--e-overlay-stack-z, ${zIndex + 1})` } as React.CSSProperties}
						data-state={active ? "open" : "closed"}
						data-side={resolvedSide}
					>
						<OverlayContent title={title} description={description} actions={actions} close={close} showCloseButton={showCloseButton} closeLabel={closeLabel} titleId={titleId} descriptionId={descriptionId} theme={engineOverlayTheme}>{children}</OverlayContent>
					</div>
				</>,
				target,
			)}
		</>
	);
});
