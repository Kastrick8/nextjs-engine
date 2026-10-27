import { isSafeEngineThemeCssValue } from "./cssSafety";
import type { CSSProperties } from "react";
import type { EngineComponentRegistry } from "../../core/registry";
import type {
	EngineTheme,
	EngineThemeJsonObject,
	PageSchema,
	SchemaNode,
	NodeType,
} from "../../schema/types";
import type {
	EngineOverlayResolvedTheme,
	EngineOverlayThemeDefaults,
	EngineOverlayThemeSlot,
} from "../../components/EngineOverlay/types";
import {
	getEngineThemeComponentDefinitions,
	parseEngineThemeId,
	resolveRegisteredEngineTheme,
} from "./createTheme";
import {
	getRegisteredEngineCustomComponentThemeId as getGlobalComponentThemeId,
	getRegisteredEngineCustomComponentSlots as getGlobalComponentThemeSlots,
	isRegisteredEngineCustomComponent as isGlobalCustomComponentType,
	sanitizeEngineCustomThemeStyles,
	type EngineCustomThemeStyles,
} from "../../core/EngineCustomComponent";

function isCustomComponentType(type: string, registry?: EngineComponentRegistry): boolean {
	return registry ? registry.isCustomComponentType(type as NodeType) : isGlobalCustomComponentType(type);
}
function getComponentThemeId(type: string, registry?: EngineComponentRegistry): string | undefined {
	return registry ? registry.getComponentThemeId(type as NodeType) : getGlobalComponentThemeId(type);
}
function getComponentThemeSlots(type: string, registry?: EngineComponentRegistry): readonly string[] {
	return registry ? registry.getComponentThemeSlots(type as NodeType) : getGlobalComponentThemeSlots(type);
}

interface ResolvedMarkdownTheme {
	props: Record<string, unknown>;
	styles?: Record<string, unknown>;
}

const MARKDOWN_THEME_PROP_KEYS = new Set([
	"textColor", "headingColor", "linkColor", "mutedColor", "fontFamily",
	"bodySize", "bodyLineHeight", "headingSizes", "headingIdPrefix",
	"textAnimation", "blockAnimation", "animationDuration", "animationStagger",
	"codeBackground", "codeColor", "inlineCodeBackground", "inlineCodeColor",
	"codeBorderColor", "codeFontFamily", "showCodeLanguage", "prettyPlease", "themeTemplates", "ansiPalette",
	"ansiForeground", "ansiBackground", "markdownStyles",
	"emd_show-url-icon", "emd_url-icon-size",
]);
const THEME_REFERENCE_KEYS = new Set(["id", "scope", "sourceUrl", "vars", "fonts", "globalStyles"]);

function isThemeRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mergeMarkdownStyleSlots(
	base: Record<string, unknown> | undefined,
	overlay: unknown,
): Record<string, unknown> | undefined {
	if (!base && !isThemeRecord(overlay)) return undefined;
	const result: Record<string, unknown> = { ...(base ?? {}) };
	if (isThemeRecord(overlay)) {
		for (const [slot, style] of Object.entries(overlay)) {
			result[slot] = isThemeRecord(result[slot]) && isThemeRecord(style)
				? { ...(result[slot] as Record<string, unknown>), ...style }
				: style;
		}
	}
	return result;
}

function pickMarkdownThemeProps(value: unknown): Record<string, unknown> {
	if (!isThemeRecord(value)) return {};
	const result: Record<string, unknown> = {};
	for (const [key, item] of Object.entries(value)) {
		if (MARKDOWN_THEME_PROP_KEYS.has(key) && key !== "markdownStyles") result[key] = item;
	}
	return result;
}

function withoutVariants(value: EngineThemeJsonObject | undefined): Record<string, unknown> | undefined {
	if (!value) return undefined;
	const result: Record<string, unknown> = { ...value };
	delete result.variants;
	return result;
}

function resolveMarkdownThemeDefinition(value: EngineThemeJsonObject, themeId?: string): {
	props: Record<string, unknown>;
	styles?: Record<string, unknown>;
} {
	const definition = value as Record<string, unknown>;
	const defaults = isThemeRecord(definition.defaults) ? definition.defaults : undefined;
	const explicitProps = isThemeRecord(definition.props) ? definition.props : undefined;
	const props: Record<string, unknown> = {
		...pickMarkdownThemeProps(definition),
		...pickMarkdownThemeProps(defaults),
		...pickMarkdownThemeProps(explicitProps),
		...(themeId ? { engineThemeId: themeId } : {}),
	};
	const styleParts = [
		definition.styles,
		definition.markdownStyles,
		defaults?.markdownStyles,
		explicitProps?.markdownStyles,
	];
	let styles: Record<string, unknown> | undefined;
	for (const part of styleParts) {
		styles = mergeMarkdownStyleSlots(styles, part);
	}
	if (styles) delete props.markdownStyles;

	// A variant may replace one named template without copying every block.
	const templateParts = [
		definition.templates,
		definition.themeTemplates,
		defaults?.templates,
		defaults?.themeTemplates,
		explicitProps?.themeTemplates,
	];
	const templates: Record<string, unknown> = {};
	for (const part of templateParts) {
		if (isThemeRecord(part)) Object.assign(templates, part);
	}
	if (Object.keys(templates).length > 0) props.themeTemplates = templates;
	return { props, styles };
}

interface EngineThemeResolutionContext {
	groupId?: string;
	components: Record<string, EngineThemeJsonObject>;
	selectedComponents: Record<string, EngineThemeJsonObject>;
	globallyRegistered: boolean;
}

function namespaceDefinition(
	context: EngineThemeResolutionContext,
	namespace: string,
	selection?: Record<string, unknown>,
): Record<string, unknown> | undefined {
	return selection ?? withoutVariants(context.components[namespace]);
}

function resolveLocalVariant(
	definition: EngineThemeJsonObject | undefined,
	subthemes: string[],
	themeId: string,
): Record<string, unknown> | undefined {
	if (!definition) {
		throw new Error("EngineTheme '" + themeId + "' references a missing component namespace.");
	}
	let active: Record<string, unknown> = definition;
	let merged: Record<string, unknown> = withoutVariants(definition) ?? { ...definition };
	for (const segment of subthemes) {
		const variants = active.variants;
		const selected = isThemeRecord(variants) ? variants[segment] : undefined;
		if (!isThemeRecord(selected)) {
			throw new Error("EngineTheme '" + themeId + "' references missing subtheme '" + segment + "'.");
		}
		merged = mergeThemeData(merged, selected);
		active = selected;
	}
	delete merged.variants;
	return merged;
}

const OVERLAY_NODE_NAMESPACES: Readonly<Record<string, "dialog" | "drawer" | "popover">> = {
	dialog: "dialog",
	EngineDialog: "dialog",
	drawer: "drawer",
	EngineDrawer: "drawer",
	popover: "popover",
	EnginePopover: "popover",
};

const OVERLAY_STYLE_SLOTS: readonly EngineOverlayThemeSlot[] = [
	"trigger", "backdrop", "panel", "header", "title", "description",
	"content", "actions", "actionPrimary", "actionSecondary", "actionDanger",
	"closeButton",
];

const OVERLAY_DEFAULT_KEYS = new Set([
	"duration", "size", "side", "placement", "align", "offset", "viewportPadding", "matchTriggerWidth",
]);
const OVERLAY_SHARED_DEFAULT_KEYS = ["duration"] as const;
const OVERLAY_COMPONENT_DEFAULT_KEYS: Readonly<Record<"dialog" | "drawer" | "popover", readonly string[]>> = {
	dialog: ["duration"],
	drawer: ["duration", "size", "side"],
	popover: ["duration", "placement", "align", "offset", "viewportPadding", "matchTriggerWidth"],
};

const OVERLAY_STYLE_PROPERTIES = new Set([
	"background", "backgroundColor", "color", "border", "borderColor", "borderWidth",
	"borderStyle", "borderRadius", "boxShadow", "outline", "outlineColor", "outlineWidth",
	"outlineStyle", "fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight",
	"letterSpacing", "textAlign", "textTransform", "textDecoration", "textDecorationColor",
	"padding", "paddingBlock", "paddingBlockStart", "paddingBlockEnd", "paddingInline",
	"paddingInlineStart", "paddingInlineEnd", "paddingTop", "paddingRight", "paddingBottom",
	"paddingLeft", "margin", "marginBlock", "marginInline", "gap", "rowGap", "columnGap",
	"width", "minWidth", "maxWidth", "height", "minHeight", "maxHeight", "whiteSpace",
	"wordBreak", "overflowWrap", "textOverflow", "backdropFilter",
]);



function mergeThemeData(
	base: Record<string, unknown>,
	overlay: Record<string, unknown>,
): Record<string, unknown> {
	const merged: Record<string, unknown> = { ...base };
	for (const [key, next] of Object.entries(overlay)) {
		const previous = merged[key];
		merged[key] = isThemeRecord(previous) && isThemeRecord(next)
			? mergeThemeData(previous, next)
			: next;
	}
	return merged;
}

function isSafeThemeScalar(value: unknown): value is string | number {
	if (typeof value === "number") return Number.isFinite(value) && Math.abs(value) <= 1_000_000;
	return isSafeEngineThemeCssValue(value, 256);
}

function sanitizeOverlayStyles(value: unknown): EngineOverlayResolvedTheme["styles"] | undefined {
	if (value === undefined) return undefined;
	if (!isThemeRecord(value)) throw new TypeError("EngineTheme overlay styles must be an object of named style slots.");
	const result: Partial<Record<EngineOverlayThemeSlot, CSSProperties>> = {};
	for (const [slot, candidate] of Object.entries(value)) {
		if (!OVERLAY_STYLE_SLOTS.includes(slot as EngineOverlayThemeSlot)) {
			throw new TypeError("Unsupported EngineTheme overlay style slot '" + slot + "'.");
		}
		if (!isThemeRecord(candidate)) {
			throw new TypeError("EngineTheme overlay style slot '" + slot + "' must be a plain object.");
		}
		const style: Record<string, string | number> = {};
		for (const [property, item] of Object.entries(candidate)) {
			if (!OVERLAY_STYLE_PROPERTIES.has(property)) {
				throw new TypeError("Unsupported CSS property '" + property + "' in EngineTheme overlay slot '" + slot + "'.");
			}
			if (!isSafeThemeScalar(item)) {
				throw new TypeError("Unsafe or invalid CSS value for '" + property + "' in EngineTheme overlay slot '" + slot + "'.");
			}
			style[property] = item;
		}
		if (Object.keys(style).length > 0) result[slot as EngineOverlayThemeSlot] = style as unknown as CSSProperties;
	}
	return Object.keys(result).length > 0 ? result : undefined;
}

function isAllowedDefaultKey(key: string, allowed: readonly string[]): boolean {
	return allowed.includes(key);
}

function readOverlayDefaults(
	definition: Record<string, unknown> | undefined,
	allowedKeys: readonly string[],
	label: string,
): Record<string, unknown> {
	if (!definition) return {};
	const result: Record<string, unknown> = {};
	for (const key of OVERLAY_DEFAULT_KEYS) {
		if (Object.prototype.hasOwnProperty.call(definition, key) && !allowedKeys.includes(key)) {
			throw new TypeError("Unsupported EngineTheme default '" + key + "' in " + label + ".");
		}
	}
	for (const key of allowedKeys) {
		if (Object.prototype.hasOwnProperty.call(definition, key)) result[key] = definition[key];
	}
	for (const field of ["defaults", "props"] as const) {
		const nested = definition[field];
		if (nested === undefined) continue;
		if (!isThemeRecord(nested)) {
			throw new TypeError("EngineTheme overlay " + label + "." + field + " must be an object.");
		}
		for (const key of Object.keys(nested)) {
			if (key === "styles") continue;
			if (!isAllowedDefaultKey(key, allowedKeys)) {
				throw new TypeError("Unsupported EngineTheme default '" + key + "' in " + label + "." + field + ".");
			}
			result[key] = nested[key];
		}
	}
	return result;
}

function sanitizeOverlayDefaults(value: Record<string, unknown>): EngineOverlayThemeDefaults | undefined {
	const result: EngineOverlayThemeDefaults = {};
	for (const [key, item] of Object.entries(value)) {
		if (!OVERLAY_DEFAULT_KEYS.has(key)) {
			throw new TypeError("Unsupported EngineTheme overlay default '" + key + "'.");
		}
		switch (key) {
			case "duration":
				if (typeof item !== "number" || !Number.isFinite(item)) {
					throw new TypeError("EngineTheme overlay duration must be a finite number.");
				}
				result.duration = Math.min(1200, Math.max(0, item));
				break;
			case "size":
				if (typeof item === "number" && Number.isFinite(item) && item > 0 && item <= 2048) {
					result.size = item;
				} else if (typeof item === "string" && item.length > 0 && isSafeEngineThemeCssValue(item, 64)) {
					result.size = item;
				} else {
					throw new TypeError("EngineTheme drawer size must be a positive bounded number or a safe CSS size.");
				}
				break;
			case "side":
				if (item !== "left" && item !== "right" && item !== "top" && item !== "bottom") {
					throw new TypeError("EngineTheme drawer side must be left, right, top, or bottom.");
				}
				result.side = item;
				break;
			case "placement":
				if (item !== "left" && item !== "right" && item !== "top" && item !== "bottom") {
					throw new TypeError("EngineTheme popover placement must be left, right, top, or bottom.");
				}
				result.placement = item;
				break;
			case "align":
				if (item !== "start" && item !== "center" && item !== "end") {
					throw new TypeError("EngineTheme popover align must be start, center, or end.");
				}
				result.align = item;
				break;
			case "offset":
			case "viewportPadding":
				if (typeof item !== "number" || !Number.isFinite(item) || item < 0) {
					throw new TypeError("EngineTheme popover " + key + " must be a finite non-negative number.");
				}
				result[key] = Math.min(128, item);
				break;
			case "matchTriggerWidth":
				if (typeof item !== "boolean") {
					throw new TypeError("EngineTheme popover matchTriggerWidth must be boolean.");
				}
				result.matchTriggerWidth = item;
				break;
		}
	}
	return Object.keys(result).length > 0 ? result : undefined;
}

function getOverlayStylePart(value: unknown, path: string): Record<string, unknown> | undefined {
	if (value === undefined) return undefined;
	if (!isThemeRecord(value)) {
		throw new TypeError("EngineTheme overlay styles at '" + path + "' must be a plain object.");
	}
	return value;
}

function overlayThemeFromDefinitions(
	shared: Record<string, unknown> | undefined,
	specific: Record<string, unknown> | undefined,
	namespace: "dialog" | "drawer" | "popover",
): EngineOverlayResolvedTheme | undefined {
	const defaults = {
		...readOverlayDefaults(shared, OVERLAY_SHARED_DEFAULT_KEYS, "overlay"),
		...readOverlayDefaults(specific, OVERLAY_COMPONENT_DEFAULT_KEYS[namespace], namespace),
	};
	const safeDefaults = sanitizeOverlayDefaults(defaults);

	const styleParts = [
		getOverlayStylePart(shared?.styles, "overlay.styles"),
		getOverlayStylePart(shared?.overlayStyles, "overlay.overlayStyles"),
		getOverlayStylePart(isThemeRecord(shared?.defaults) ? shared.defaults.styles : undefined, "overlay.defaults.styles"),
		getOverlayStylePart(isThemeRecord(shared?.props) ? shared.props.styles : undefined, "overlay.props.styles"),
		getOverlayStylePart(specific?.styles, namespace + ".styles"),
		getOverlayStylePart(specific?.overlayStyles, namespace + ".overlayStyles"),
		getOverlayStylePart(isThemeRecord(specific?.defaults) ? specific.defaults.styles : undefined, namespace + ".defaults.styles"),
		getOverlayStylePart(isThemeRecord(specific?.props) ? specific.props.styles : undefined, namespace + ".props.styles"),
	].filter((item): item is Record<string, unknown> => item !== undefined);
	const mergedStyles = styleParts.reduce<Record<string, unknown>>(
		(result, part) => mergeThemeData(result, part),
		{},
	);
	const styles = sanitizeOverlayStyles(mergedStyles);
	if (!safeDefaults && !styles) return undefined;
	return {
		...(safeDefaults ? { defaults: safeDefaults } : {}),
		...(styles ? { styles } : {}),
	};
}

function resolveNodeOverlayTheme(
	node: SchemaNode,
	namespace: "dialog" | "drawer" | "popover",
	context: EngineThemeResolutionContext,
): EngineOverlayResolvedTheme | undefined {
	const explicitId = node.theme;
	let sharedSelection = context.selectedComponents.overlay
		? { ...(context.selectedComponents.overlay as Record<string, unknown>) }
		: namespaceDefinition(context, "overlay");
	let componentSelection = context.selectedComponents[namespace]
		? { ...(context.selectedComponents[namespace] as Record<string, unknown>) }
		: namespaceDefinition(context, namespace);

	if (explicitId !== undefined) {
		if (typeof explicitId !== "string" || !explicitId) {
			throw new TypeError("SchemaNode.theme must be a qualified EngineTheme component ID.");
		}
		const parsed = parseEngineThemeId(explicitId);
		if (!parsed.componentId || (parsed.componentId !== "overlay" && parsed.componentId !== namespace)) {
			throw new Error(
				"Schema node <" + node.type + "> must use an EngineTheme ID qualified for 'overlay' or '" + namespace + "'; received '" + explicitId + "'.",
			);
		}
		if (context.groupId && parsed.groupId !== context.groupId) {
			throw new Error(
				"Schema node theme '" + explicitId + "' must use the same EngineTheme group '" + context.groupId + "' as its PageSchema.",
			);
		}
			if (!context.groupId) {
			throw new Error(
				"Schema node theme '" + explicitId + "' requires PageSchema.theme to select its EngineTheme group first.",
			);
		}
		let selected: Record<string, unknown> | undefined;
		if (context.globallyRegistered) {
			selected = resolveRegisteredEngineTheme(explicitId).components[parsed.componentId];
		} else {
			selected = resolveLocalVariant(context.components[parsed.componentId], parsed.subthemes, explicitId);
		}
		if (!selected) {
			throw new Error("EngineTheme '" + explicitId + "' did not resolve to a component namespace.");
		}
		if (parsed.componentId === "overlay") sharedSelection = selected;
		else componentSelection = selected;
	}

	return overlayThemeFromDefinitions(sharedSelection, componentSelection, namespace);
}

function applyMarkdownThemeToNode(node: SchemaNode, markdownTheme: ResolvedMarkdownTheme): SchemaNode {
	if (node.type !== "markdown") return node;
	const originalProps = node.props ?? {};
	const themeProps = markdownTheme.props;
	const localStyles = originalProps.markdownStyles;
	const mergedStyles = mergeMarkdownStyleSlots(markdownTheme.styles, localStyles);
	const nextProps: Record<string, unknown> = {
		...themeProps,
		...originalProps,
	};
	if (isThemeRecord(themeProps.prettyPlease) || isThemeRecord(originalProps.prettyPlease)) {
		nextProps.prettyPlease = {
			...(isThemeRecord(themeProps.prettyPlease) ? themeProps.prettyPlease : {}),
			...(isThemeRecord(originalProps.prettyPlease) ? originalProps.prettyPlease : {}),
		};
	}
	if (isThemeRecord(themeProps.themeTemplates) || isThemeRecord(originalProps.themeTemplates)) {
		nextProps.themeTemplates = {
			...(isThemeRecord(themeProps.themeTemplates) ? themeProps.themeTemplates : {}),
			...(isThemeRecord(originalProps.themeTemplates) ? originalProps.themeTemplates : {}),
		};
	}
	if (mergedStyles) nextProps.markdownStyles = mergedStyles;
	return { ...node, props: nextProps as SchemaNode["props"] };
}

const CUSTOM_COMPONENT_THEME_STYLE_KEYS = new Set([
	"color", "background", "backgroundColor", "backgroundImage", "border", "borderColor",
	"borderWidth", "borderStyle", "borderRadius", "boxShadow", "outline", "outlineColor",
	"outlineWidth", "outlineStyle", "fontFamily", "fontSize", "fontWeight", "fontStyle",
	"lineHeight", "letterSpacing", "textAlign", "textTransform", "textDecoration",
	"textDecorationColor", "textDecorationThickness", "textUnderlineOffset", "padding",
	"paddingBlock", "paddingBlockStart", "paddingBlockEnd", "paddingInline", "paddingInlineStart",
	"paddingInlineEnd", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "margin",
	"marginBlock", "marginInline", "marginTop", "marginRight", "marginBottom", "marginLeft",
	"gap", "rowGap", "columnGap", "width", "minWidth", "maxWidth", "height", "minHeight",
	"maxHeight", "display", "opacity", "cursor", "boxSizing", "verticalAlign", "whiteSpace",
	"wordBreak", "overflowWrap", "textOverflow", "objectFit", "alignItems", "justifyContent",
	"alignSelf", "justifySelf", "flex", "flexGrow", "flexShrink", "flexBasis", "flexDirection",
	"flexWrap", "gridTemplateColumns", "gridTemplateRows", "aspectRatio", "transition",
	"transform", "filter", "backdropFilter",
]);

function isCustomComponentStyleKey(key: string): boolean {
	return CUSTOM_COMPONENT_THEME_STYLE_KEYS.has(key) || /^--[A-Za-z0-9_-]{1,128}$/.test(key);
}

function collectCustomComponentStyle(
	target: Record<string, unknown>,
	candidate: unknown,
	label: string,
	strict: boolean,
): void {
	if (candidate === undefined) return;
	if (!isThemeRecord(candidate)) throw new TypeError("EngineTheme custom component styles at '" + label + "' must be an object.");
	for (const [property, value] of Object.entries(candidate)) {
		if (!isCustomComponentStyleKey(property)) {
			if (strict) throw new TypeError("Unsupported CSS property '" + property + "' in EngineTheme custom component styles at '" + label + "'.");
			continue;
		}
		target[property] = value;
	}
}

function resolveCustomComponentThemeStyles(
	definition: Record<string, unknown>,
	nodeType: string,
	registry?: EngineComponentRegistry,
): EngineCustomThemeStyles {
	const slots = getComponentThemeSlots(nodeType, registry);
	const styles: Record<string, Record<string, unknown>> = { root: {} };
	// Defaults provide the base values; the resolved namespace/variant's direct
	// CSS fields override them, and the named styles adapter overrides both.
	collectCustomComponentStyle(styles.root, definition.defaults, nodeType + ".defaults", false);
	collectCustomComponentStyle(styles.root, definition.props, nodeType + ".props", false);
	collectCustomComponentStyle(styles.root, Object.fromEntries(
		Object.entries(definition).filter(([key]) => isCustomComponentStyleKey(key)),
	), nodeType, false);

	const declaredStyles = definition.styles;
	if (declaredStyles !== undefined) {
		if (!isThemeRecord(declaredStyles)) {
			throw new TypeError("EngineTheme custom component '" + nodeType + "'.styles must be a plain object.");
		}
		const entries = Object.entries(declaredStyles);
		const isDirectRootStyle = entries.length === 0 || entries.every(([key]) => isCustomComponentStyleKey(key));
		if (isDirectRootStyle) {
			collectCustomComponentStyle(styles.root, declaredStyles, nodeType + ".styles", true);
		} else {
			for (const [slot, candidate] of entries) {
				if (slot !== "root" && !slots.includes(slot)) {
					throw new TypeError("EngineTheme custom component '" + nodeType + "' declares unsupported style slot '" + slot + "'. Declare it in createComponent({ mode: \"custom\", slots: [...] }).");
				}
				if (!isThemeRecord(candidate)) {
					throw new TypeError("EngineTheme custom component style slot '" + slot + "' must be an object.");
				}
				collectCustomComponentStyle(styles[slot] ?? (styles[slot] = {}), candidate, nodeType + ".styles." + slot, true);
			}
		}
	}
	return sanitizeEngineCustomThemeStyles(styles, slots, "EngineTheme custom component '" + nodeType + "'");
}

function resolveCustomComponentThemeNode(
	node: SchemaNode,
	context: EngineThemeResolutionContext,
	registry?: EngineComponentRegistry,
): SchemaNode {
	const explicitId = node.theme;
	if (!isCustomComponentType(node.type, registry)) {
		if (explicitId !== undefined) {
			throw new Error(
				"SchemaNode.theme currently supports registered custom node types plus EngineDialog, EngineDrawer, and EnginePopover; received <" + node.type + ">.",
			);
		}
		return node;
	}

	const declaredThemeId = getComponentThemeId(node.type, registry);
	const declaredTheme = declaredThemeId ? parseEngineThemeId(declaredThemeId) : undefined;
	if (declaredTheme && (!declaredTheme.componentId || declaredTheme.subthemes.length > 0)) {
		throw new Error("Registered custom component '" + node.type + "' has an invalid default EngineTheme namespace.");
	}

	let selection: Record<string, unknown> | undefined;
	let selectedId: string | undefined;
	if (explicitId !== undefined || declaredThemeId !== undefined) {
		selectedId = explicitId ?? declaredThemeId;
		if (typeof selectedId !== "string" || !selectedId) {
			throw new TypeError("SchemaNode.theme must be a qualified EngineTheme component ID.");
		}
		const parsed = parseEngineThemeId(selectedId);
		const expectedComponent = declaredTheme?.componentId ?? node.type;
		if (parsed.componentId !== expectedComponent) {
			if (declaredThemeId) {
				throw new Error(
					"Schema node <" + node.type + "> must use an EngineTheme namespace with the same ID as its declared default '" + declaredThemeId + "'; received '" + selectedId + "'.",
				);
			}
			throw new Error("Schema node <" + node.type + "> must use an EngineTheme namespace with the same ID; received '" + selectedId + "'.");
		}
		if (declaredTheme && parsed.groupId !== declaredTheme.groupId) {
			throw new Error("Schema node theme '" + selectedId + "' must use the same EngineTheme group as the declared default '" + declaredThemeId + "'.");
		}
		if (!context.groupId) {
			throw new Error("SchemaNode.theme requires PageSchema.theme to identify an EngineTheme group.");
		}
		if (parsed.groupId !== context.groupId) {
			throw new Error("Schema node theme '" + selectedId + "' must use the same EngineTheme group '" + context.groupId + "' as its PageSchema.");
		}
		if (context.globallyRegistered) {
			selection = resolveRegisteredEngineTheme(selectedId).components[parsed.componentId!];
		} else {
			selection = resolveLocalVariant(context.components[parsed.componentId!], parsed.subthemes, selectedId);
		}
	} else {
		selection = context.selectedComponents[node.type]
			? { ...(context.selectedComponents[node.type] as Record<string, unknown>) }
			: namespaceDefinition(context, node.type);
	}

	if (!selection) {
		const originalProps = node.props ?? {};
		if (!Object.prototype.hasOwnProperty.call(originalProps, "engineThemeStyles")) return node;
		const nextProps: Record<string, unknown> = { ...originalProps };
		delete nextProps.engineThemeStyles;
		return { ...node, props: nextProps as SchemaNode["props"] };
	}

	const safeStyles = resolveCustomComponentThemeStyles(selection, node.type, registry);
	const originalProps = node.props ?? {};
	const nextProps: Record<string, unknown> = { ...originalProps };
	delete nextProps.engineThemeStyles;
	if (originalProps.style !== undefined && !isThemeRecord(originalProps.style)) {
		throw new TypeError("Explicit style on custom node <" + node.type + "> must be an object so it can override EngineTheme defaults.");
	}
	const localStyle = isThemeRecord(originalProps.style) ? originalProps.style : {};
	const rootStyle = safeStyles.root ?? {};
	if (Object.keys(rootStyle).length > 0 || originalProps.style !== undefined) {
		nextProps.style = { ...rootStyle, ...localStyle };
	}
	if (Object.keys(safeStyles).some((slot) => slot !== "root")) nextProps.engineThemeStyles = safeStyles;
	const { theme: _consumedTheme, ...themedNode } = node;
	return { ...themedNode, props: nextProps as SchemaNode["props"] };
}
function applyResolvedThemeToNode(
	node: SchemaNode,
	context: EngineThemeResolutionContext,
	markdownTheme?: ResolvedMarkdownTheme,
	registry?: EngineComponentRegistry,
): SchemaNode {
	let children = node.children;
	if (Array.isArray(node.children)) {
		const mappedChildren = node.children.map((child) => (
			typeof child === "string" ? child : applyResolvedThemeToNode(child, context, markdownTheme, registry)
		));
		if (mappedChildren.some((child, index) => child !== node.children?.[index])) {
			children = mappedChildren;
		}
	}
	let result: SchemaNode = children === node.children ? node : { ...node, children };

	const namespace = OVERLAY_NODE_NAMESPACES[result.type];
	if (namespace) {
		const overlayTheme = resolveNodeOverlayTheme(result, namespace, context);
		const originalProps = result.props ?? {};
		const hasInjectedTheme = Object.prototype.hasOwnProperty.call(originalProps, "engineOverlayTheme");
		if (overlayTheme !== undefined || result.theme !== undefined || hasInjectedTheme) {
			const nextProps: Record<string, unknown> = { ...originalProps };
			// This is reserved internal data: schema authors cannot bypass the resolver
			// by injecting an unchecked object directly into the props.
			delete nextProps.engineOverlayTheme;
			if (overlayTheme) nextProps.engineOverlayTheme = overlayTheme;
			const { theme: _consumedTheme, ...themedNode } = result;
			result = {
				...themedNode,
				props: nextProps as SchemaNode["props"],
			};
		}
	} else {
		result = resolveCustomComponentThemeNode(result, context, registry);
	}

	if (markdownTheme) result = applyMarkdownThemeToNode(result, markdownTheme);
	return result;
}

function schemaHasNodeTheme(node: SchemaNode, registry?: EngineComponentRegistry): boolean {
	if (node.theme !== undefined || getComponentThemeId(node.type, registry) !== undefined) return true;
	return Array.isArray(node.children)
		&& node.children.some((child) => typeof child !== "string" && schemaHasNodeTheme(child, registry));
}

export function resolveEngineThemeSchema(schema: PageSchema, registry?: EngineComponentRegistry): PageSchema {
	const theme = schema.theme;
	if (!theme || typeof theme.id !== "string" || !theme.id) {
		if (schemaHasNodeTheme(schema.root, registry)) {
			throw new Error("SchemaNode.theme requires PageSchema.theme to identify an EngineTheme group.");
		}
		return schema;
	}

	const themeRecord = theme as Record<string, unknown>;
	const keys = Object.keys(themeRecord);
	const isQualifiedReference = typeof theme.id === "string" && theme.id.includes(".");
	const isBareReference = theme.scope !== "local"
		&& typeof theme.id === "string"
		&& keys.every((key) => THEME_REFERENCE_KEYS.has(key));
	const isReference = isQualifiedReference || isBareReference;
	const parsedThemeId = typeof theme.id === "string" && theme.id ? parseEngineThemeId(theme.id) : undefined;

	let resolvedCssTheme: EngineTheme = theme;
	let components = getEngineThemeComponentDefinitions(theme);
	let selectedComponents: Record<string, EngineThemeJsonObject> = {};
	let globallyRegistered = false;

	if (isReference || theme.scope === "global" || theme.scope === "remote") {
		if (!parsedThemeId) throw new TypeError("EngineTheme reference requires a valid ID.");
		if (themeRecord.sourceUrl || themeRecord.scope === "remote") {
			try {
				resolveRegisteredEngineTheme(parsedThemeId.groupId);
			} catch {
				throw new Error(
					"Remote EngineTheme references are resolved only after an explicit loadRemoteEngineTheme() call "
					+ "with an origin allowlist and version/checksum verification. No network request is made during render.",
				);
			}
		}
		const baseResolved = resolveRegisteredEngineTheme(parsedThemeId.groupId);
		resolvedCssTheme = {
			...baseResolved.group,
			...(isThemeRecord(themeRecord.vars) ? { vars: { ...(baseResolved.group.vars ?? {}), ...(themeRecord.vars as Record<string, string>) } } : {}),
			...(Array.isArray(themeRecord.fonts) ? { fonts: [...(baseResolved.group.fonts ?? []), ...(themeRecord.fonts as string[])] } : {}),
			...(typeof themeRecord.globalStyles === "string" ? { globalStyles: themeRecord.globalStyles } : {}),
		};
		components = baseResolved.components;
		globallyRegistered = true;
		if (parsedThemeId.componentId) {
			const selected = resolveRegisteredEngineTheme(theme.id!);
			selectedComponents = selected.components;
		}
	}

	const markdownBase = components.markdown;
	const markdownSelected = selectedComponents.markdown;
	const markdownDefinition = markdownSelected ?? (withoutVariants(markdownBase) as EngineThemeJsonObject | undefined);
	const resolvedMarkdownTheme = markdownDefinition
		? resolveMarkdownThemeDefinition(markdownDefinition, typeof resolvedCssTheme.id === "string" ? resolvedCssTheme.id.split(".")[0] : undefined)
		: undefined;

	const context: EngineThemeResolutionContext = {
		groupId: parsedThemeId?.groupId ?? (typeof resolvedCssTheme.id === "string" ? resolvedCssTheme.id : undefined),
		components,
		selectedComponents,
		globallyRegistered,
	};
	const needsNodeResolution = Boolean(
		resolvedMarkdownTheme
		|| schemaHasNodeTheme(schema.root, registry)
		|| ["overlay", "dialog", "drawer", "popover"].some((name) => components[name] || selectedComponents[name])
		|| Object.keys(components).some((name) => isCustomComponentType(name, registry) && (components[name] || selectedComponents[name])),
	);
	const root = needsNodeResolution
		? applyResolvedThemeToNode(schema.root, context, resolvedMarkdownTheme, registry)
		: schema.root;
	return {
		...schema,
		theme: resolvedCssTheme,
		...(root !== schema.root ? { root } : {}),
	};
}
