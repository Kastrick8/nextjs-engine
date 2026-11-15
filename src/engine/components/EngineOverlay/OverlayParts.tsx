"use client";

import React, { type CSSProperties, type ReactNode } from "react";
import { useHandler } from "../../providers/EngineProvider";
import type { EngineOverlayAction, EngineOverlayResolvedTheme } from "./types";

const BUTTON_BASE: CSSProperties = {
	appearance: "none",
	border: "1px solid var(--e-overlay-trigger-border, rgba(15,23,42,.16))",
	borderRadius: "8px",
	background: "var(--e-overlay-trigger-bg, #fff)",
	color: "inherit",
	font: "inherit",
	padding: "0.625rem 1rem",
	cursor: "pointer",
};

const INTERACTIVE_TRIGGER_TAGS = new Set(["button", "a", "input", "select", "textarea", "summary"]);

/** Prevent known interactive descendants from being nested inside the generated trigger button. */
function containsInteractiveTrigger(node: ReactNode): boolean {
	if (Array.isArray(node)) return node.some(containsInteractiveTrigger);
	if (!React.isValidElement(node)) return false;
	if (typeof node.type === "string" && INTERACTIVE_TRIGGER_TAGS.has(node.type)) return true;
	return containsInteractiveTrigger((node.props as { children?: ReactNode }).children);
}

function OverlayActionButton({ action, close, theme }: { action: EngineOverlayAction; close: () => void; theme?: EngineOverlayResolvedTheme }) {
	const namedHandler = useHandler(typeof action.onClick === "string" ? action.onClick : "");
	const variant = action.variant ?? "secondary";
	return (
		<button
			type="button"
			disabled={action.disabled}
			style={{
				...BUTTON_BASE,
				padding: "0.5rem 0.85rem",
				background: variant === "primary" ? "var(--e-accent, #4f46e5)" : variant === "danger" ? "#dc2626" : variant === "ghost" ? "transparent" : "var(--e-overlay-action-bg, #f1f5f9)",
				color: variant === "primary" || variant === "danger" ? "#fff" : "inherit",
				borderColor: variant === "ghost" ? "transparent" : undefined,
				...(variant === "primary" ? theme?.styles?.actionPrimary
					: variant === "danger" ? theme?.styles?.actionDanger
						: variant === "ghost" ? (theme?.styles?.actionGhost ?? theme?.styles?.actionSecondary)
							: theme?.styles?.actionSecondary),
				opacity: action.disabled ? 0.55 : 1,
				cursor: action.disabled ? "not-allowed" : "pointer",
			}}
			onClick={(event) => {
				if (typeof action.onClick === "function") action.onClick(event);
				else namedHandler?.(event);
				if (action.close !== false) close();
			}}
		>
			{action.label}
		</button>
	);
}

export function OverlayContent({ title, description, children, actions, close, showCloseButton, closeLabel, titleId, descriptionId, theme }: {
	title?: ReactNode;
	description?: ReactNode;
	children?: ReactNode;
	actions?: EngineOverlayAction[];
	close: () => void;
	showCloseButton: boolean;
	closeLabel: string;
	titleId: string;
	descriptionId: string;
	theme?: EngineOverlayResolvedTheme;
}) {
	const themedStyles = theme?.styles;
	return (
		<>
			<div style={themedStyles?.header}>
			{showCloseButton && (
				<button
					type="button"
					aria-label={closeLabel}
					onClick={close}
					style={{ position: "absolute", top: 10, right: 10, border: 0, background: "transparent", color: "inherit", font: "inherit", fontSize: "1.25rem", cursor: "pointer", lineHeight: 1, ...themedStyles?.closeButton }}
				>
					×
				</button>
			)}
			{title != null && <h2 id={titleId} style={{ margin: "0 2rem .35rem 0", fontSize: "1.125rem", ...themedStyles?.title }}>{title}</h2>}
			{description != null && <p id={descriptionId} style={{ margin: "0 0 1rem", color: "var(--e-overlay-muted, #64748b)", lineHeight: 1.5, ...themedStyles?.description }}>{description}</p>}
			</div>
			<div style={themedStyles?.content}>{children}</div>
			{actions && actions.length > 0 && (
				<div style={{ display: "flex", justifyContent: "flex-end", gap: ".5rem", marginTop: "1.25rem", flexWrap: "wrap", ...themedStyles?.actions }}>
					{actions.map((action, index) => <OverlayActionButton key={`${action.label}-${index}`} action={action} close={close} theme={theme} />)}
				</div>
			)}
		</>
	);
}

export function OverlayTrigger({ label, children, asChild = false, className, style, disabled, expanded, controls, hasPopup, ariaLabel, onClick, triggerRef }: {
	label?: string;
	children?: ReactNode;
	asChild?: boolean;
	className?: string;
	style?: CSSProperties;
	disabled?: boolean;
	expanded: boolean;
	controls: string;
	hasPopup: React.AriaAttributes["aria-haspopup"];
	ariaLabel?: string;
	onClick: () => void;
	triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
	if (label == null && children == null) return null;
	if (asChild) {
		if (!React.isValidElement(children) || children.type !== "button") {
			throw new Error("[EngineOverlay] triggerAsChild requires exactly one native <button> element.");
		}
		const child = children as React.ReactElement<React.ComponentPropsWithRef<"button">>;
		const childRef = child.props.ref;
		return React.cloneElement(child, {
			ref: (node: HTMLButtonElement | null) => {
				if (typeof childRef === "function") childRef(node);
				else if (childRef && typeof childRef === "object") (childRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
				triggerRef.current = node;
			},
			type: "button",
			disabled: Boolean(disabled || child.props.disabled),
			"aria-label": ariaLabel ?? child.props["aria-label"],
			"aria-haspopup": hasPopup,
			"aria-expanded": expanded,
			"aria-controls": controls,
			className: [child.props.className, className].filter(Boolean).join(" ") || undefined,
			style: { ...BUTTON_BASE, ...style, ...child.props.style },
			onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
				child.props.onClick?.(event);
				if (!event.defaultPrevented) onClick();
			},
		});
	}
	if (containsInteractiveTrigger(children)) {
		throw new Error("[EngineOverlay] Interactive trigger elements must use triggerAsChild; nested interactive controls are not supported.");
	}
	return (
		<button
			ref={triggerRef}
			type="button"
			disabled={disabled}
			aria-label={ariaLabel}
			aria-haspopup={hasPopup}
			aria-expanded={expanded}
			aria-controls={controls}
			className={className}
			style={{ ...BUTTON_BASE, ...style }}
			onClick={onClick}
		>
			{children ?? label}
		</button>
	);
}
