"use client";

import React, { type CSSProperties, type ReactNode } from "react";
import { useHandler } from "../../providers/EngineProvider";
import type { EngineOverlayAction } from "./types";
import type { EngineOverlayThemeStyles } from "../../schema/types";

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

function OverlayActionButton({ action, close, themeStyles }: {
	action: EngineOverlayAction;
	close: () => void;
	themeStyles?: EngineOverlayThemeStyles;
}) {
	const namedHandler = useHandler(typeof action.onClick === "string" ? action.onClick : "");
	const variant = action.variant ?? "secondary";
	const styleSlot = variant === "primary" ? themeStyles?.actionPrimary
		: variant === "danger" ? themeStyles?.actionDanger
			: variant === "ghost" ? themeStyles?.actionGhost
				: themeStyles?.actionSecondary;
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
				...(styleSlot ?? {}),
				opacity: action.disabled ? 0.55 : (styleSlot?.opacity ?? 1),
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

export function OverlayContent({ title, description, children, actions, close, showCloseButton, closeLabel, titleId, descriptionId, themeStyles }: {
	title?: ReactNode;
	description?: ReactNode;
	children?: ReactNode;
	actions?: EngineOverlayAction[];
	close: () => void;
	showCloseButton: boolean;
	closeLabel: string;
	titleId: string;
	descriptionId: string;
	themeStyles?: EngineOverlayThemeStyles;
}) {
	return (
		<>
			{showCloseButton && (
				<button
					type="button"
					aria-label={closeLabel}
					onClick={close}
					style={{ position: "absolute", top: 10, right: 10, border: 0, background: "transparent", color: "inherit", font: "inherit", fontSize: "1.25rem", cursor: "pointer", lineHeight: 1, ...(themeStyles?.closeButton ?? {}) }}
				>
					×
				</button>
			)}
			{(title != null || description != null) && (
				<div style={themeStyles?.header}>
					{title != null && <h2 id={titleId} style={{ margin: "0 2rem .35rem 0", fontSize: "1.125rem", ...(themeStyles?.title ?? {}) }}>{title}</h2>}
					{description != null && <p id={descriptionId} style={{ margin: "0 0 1rem", color: "var(--e-overlay-muted, #64748b)", lineHeight: 1.5, ...(themeStyles?.description ?? {}) }}>{description}</p>}
				</div>
			)}
			<div style={themeStyles?.content}>{children}</div>
			{actions && actions.length > 0 && (
				<div style={{ display: "flex", justifyContent: "flex-end", gap: ".5rem", marginTop: "1.25rem", flexWrap: "wrap", ...(themeStyles?.actions ?? {}) }}>
					{actions.map((action, index) => <OverlayActionButton key={`${action.label}-${index}`} action={action} close={close} themeStyles={themeStyles} />)}
				</div>
			)}
		</>
	);
}

function setElementRef<T>(ref: React.Ref<T> | undefined, value: T | null): void {
	if (typeof ref === "function") ref(value);
	else if (ref && typeof ref === "object") {
		(ref as React.MutableRefObject<T | null>).current = value;
	}
}

const UNSUPPORTED_NATIVE_TRIGGER_TAGS = new Set([
	"input", "select", "textarea", "summary", "audio", "video",
]);

export function OverlayTrigger({ label, children, className, style, disabled, expanded, controls, hasPopup, ariaLabel, onClick, triggerRef, asChild }: {
	label?: string;
	children?: ReactNode;
	className?: string;
	style?: CSSProperties;
	disabled?: boolean;
	expanded: boolean;
	controls: string;
	hasPopup: React.AriaAttributes["aria-haspopup"];
	ariaLabel?: string;
	onClick: () => void;
	triggerRef: React.RefObject<HTMLElement | null>;
	asChild?: boolean;
}) {
	if (label == null && children == null) return null;

	const child = React.isValidElement(children)
		? children as React.ReactElement<Record<string, unknown>>
		: null;
	const childTag = child && typeof child.type === "string" ? child.type : null;
	const composeNativeChild = childTag === "button" || childTag === "a";

	// Native button/link triggers are composed directly; never wrap them in a
	// second interactive element. Arbitrary React components are not cloned.
	if (composeNativeChild || asChild) {
		if (!child || (child.type !== "button" && child.type !== "a")) {
			if (process.env.NODE_ENV !== "production") {
				console.error("[EngineOverlay] triggerAsChild supports exactly one native button or anchor. The invalid trigger was not rendered.");
			}
			return null;
		}

		const childProps = child.props;
		const childStyle = childProps.style && typeof childProps.style === "object"
			? childProps.style as CSSProperties
			: undefined;
		const childClassName = typeof childProps.className === "string" ? childProps.className : undefined;
		// The package targets React 19, where ref is part of props; avoid
		// the deprecated ReactElement.ref accessor.
		const childRef = childProps.ref as React.Ref<HTMLElement> | undefined;
		const childOnClick = typeof childProps.onClick === "function"
			? childProps.onClick as React.MouseEventHandler<HTMLElement>
			: undefined;
		const isAnchor = child.type === "a";
		const childDisabled = childProps.disabled === true;
		const disabledAnchor = isAnchor && Boolean(disabled || childProps["aria-disabled"] === true || childProps["aria-disabled"] === "true");
		return React.cloneElement(child, {
			ref: (element: HTMLElement | null) => {
				setElementRef(childRef, element);
				setElementRef(triggerRef, element);
			},
			type: !isAnchor ? "button" : childProps.type,
			disabled: !isAnchor ? Boolean(disabled) || childDisabled : undefined,
			"aria-disabled": disabledAnchor ? "true" : childProps["aria-disabled"],
			tabIndex: disabledAnchor ? -1 : childProps.tabIndex,
			"aria-label": ariaLabel ?? childProps["aria-label"] ?? (typeof label === "string" ? label : undefined),
			"aria-haspopup": hasPopup,
			"aria-expanded": expanded,
			"aria-controls": controls,
			className: [childClassName, className].filter(Boolean).join(" ") || undefined,
			style: { ...BUTTON_BASE, ...style, ...childStyle, ...(disabledAnchor ? { cursor: "not-allowed" } : {}) },
			onClick: (event: React.MouseEvent<HTMLElement>) => {
				if (disabled || childDisabled || disabledAnchor) {
					event.preventDefault();
					event.stopPropagation();
					return;
				}
				childOnClick?.(event);
				if (!event.defaultPrevented) onClick();
			},
		} as Record<string, unknown>);
	}

	if (childTag && UNSUPPORTED_NATIVE_TRIGGER_TAGS.has(childTag)) {
		if (process.env.NODE_ENV !== "production") {
			console.error(`[EngineOverlay] A native <${childTag}> cannot be nested in a trigger button. Use a native button/anchor trigger instead.`);
		}
		return null;
	}
	if (asChild) return null;

	return (
		<button
			ref={triggerRef as React.Ref<HTMLButtonElement>}
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
