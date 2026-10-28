import type { CSSProperties, MouseEvent, ReactNode } from "react";
import type { BaseNodeProps } from "../../schema/types";
import type { EnginePopoverAlign, EnginePopoverPlacement } from "../../core/engineoverlay";

export type EngineOverlayOpenChange = string | ((open: boolean) => void);
export type EngineOverlayActionVariant = "primary" | "secondary" | "danger" | "ghost";

export type EngineOverlayThemeSlot =
	| "trigger" | "backdrop" | "panel" | "header" | "title" | "description"
	| "content" | "actions" | "actionPrimary" | "actionSecondary" | "actionDanger"
	| "closeButton";

export interface EngineOverlayThemeDefaults {
	duration?: number;
	size?: string | number;
	side?: "left" | "right" | "top" | "bottom";
	placement?: EnginePopoverPlacement;
	align?: EnginePopoverAlign;
	offset?: number;
	viewportPadding?: number;
	matchTriggerWidth?: boolean;
}

/** Compiler-resolved, allowlisted appearance values; theme IDs never reach DOM props. */
export interface EngineOverlayResolvedTheme {
	defaults?: EngineOverlayThemeDefaults;
	styles?: Partial<Record<EngineOverlayThemeSlot, CSSProperties>>;
}

export interface EngineOverlayAction {
	label: string;
	onClick?: string | ((event: MouseEvent<HTMLButtonElement>) => void);
	close?: boolean;
	variant?: EngineOverlayActionVariant;
	disabled?: boolean;
}

export interface EngineOverlayCommonProps extends Omit<BaseNodeProps, "onClick"> {
	/** Internal resolved EngineTheme data injected by the schema theme compiler. */
	engineOverlayTheme?: EngineOverlayResolvedTheme;
	children?: ReactNode;
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: EngineOverlayOpenChange;
	trigger?: ReactNode;
	/** Opt in to using a native button trigger as the actual control, without nesting buttons. */
	triggerAsChild?: boolean;
	triggerLabel?: string;
	triggerClassName?: string;
	triggerStyle?: CSSProperties;
	triggerDisabled?: boolean;
	title?: ReactNode;
	description?: ReactNode;
	actions?: EngineOverlayAction[];
	showCloseButton?: boolean;
	closeLabel?: string;
	closeOnEscape?: boolean;
	restoreFocus?: boolean;
	initialFocus?: string;
	duration?: number;
	portalTargetId?: string;
	ariaLabel?: string;
	triggerAriaLabel?: string;
	overlayStyle?: CSSProperties;
}

export interface EngineDialogProps extends EngineOverlayCommonProps {
	role?: "dialog" | "alertdialog";
	closeOnBackdrop?: boolean;
	lockScroll?: boolean;
	trapFocus?: boolean;
}

export interface EngineDrawerProps extends EngineOverlayCommonProps {
	side?: "left" | "right" | "top" | "bottom";
	size?: string | number;
	closeOnBackdrop?: boolean;
	lockScroll?: boolean;
	trapFocus?: boolean;
}

export interface EnginePopoverProps extends EngineOverlayCommonProps {
	placement?: EnginePopoverPlacement;
	align?: EnginePopoverAlign;
	offset?: number;
	viewportPadding?: number;
	closeOnOutsideClick?: boolean;
	matchTriggerWidth?: boolean;
	autoFocus?: boolean;
	trapFocus?: boolean;
	/** Only dialog semantics are supported until menu/listbox keyboard behavior exists. */
	role?: "dialog";
}
