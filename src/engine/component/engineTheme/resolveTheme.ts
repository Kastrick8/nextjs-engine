import type {
	EngineTheme,
	EngineThemeJsonObject,
	PageSchema,
	SchemaNode,
} from "../../schema/types";
import {
	getEngineThemeComponentDefinitions,
	resolveRegisteredEngineTheme,
} from "./createTheme";

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

const OVERLAY_THEME_SLOTS: readonly EngineOverlayThemeSlot[] = [
	"trigger", "backdrop", "panel", "header", "title", "description", "content",
	"actions", "actionPrimary", "actionSecondary", "actionDanger", "actionGhost", "closeButton",
];

const OVERLAY_STYLE_PROPERTIES = new Set([
	"background", "backgroundColor", "backgroundImage", "backgroundPosition", "backgroundSize",
	"backgroundRepeat", "backgroundClip", "color", "border", "borderTop", "borderRight",
	"borderBottom", "borderLeft", "borderColor", "borderStyle", "borderWidth", "borderRadius",
	"boxShadow", "outline", "outlineColor", "outlineStyle", "outlineWidth", "outlineOffset",
	"padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "paddingBlock",
	"paddingInline", "paddingBlockStart", "paddingBlockEnd", "paddingInlineStart", "paddingInlineEnd",
	"margin", "marginTop", "marginRight", "marginBottom", "marginLeft", "marginBlock", "marginInline",
	"gap", "rowGap", "columnGap", "font", "fontFamily", "fontSize", "fontWeight", "fontStyle",
	"fontVariant", "lineHeight", "letterSpacing", "textAlign", "textDecoration", "textDecorationColor",
	"textDecorationLine", "textDecorationStyle", "textUnderlineOffset", "textTransform", "whiteSpace",
	"wordBreak", "overflowWrap", "textOverflow", "maxWidth", "minWidth", "width", "maxHeight",
	"minHeight", "height", "boxSizing", "opacity", "filter", "backdropFilter", "transform",
	"transformOrigin", "transition", "transitionDuration", "transitionDelay", "transitionProperty",
	"transitionTimingFunction", "alignItems", "justifyContent", "alignContent", "justifyItems",
	"placeItems", "placeContent", "flexDirection", "flexWrap", "flexGrow", "flexShrink", "flexBasis",
	"gridTemplateColumns", "gridTemplateRows", "gridAutoFlow",
]);
const UNSAFE_OVERLAY_STYLE_VALUE = /url\s*\(|expression\s*\(|javascript\s*:|@import|\/\*|\*\//i;
const OVERLAY_NODE_TYPES = new Set(["dialog", "drawer", "popover"]);

function sanitizeOverlayThemeStyle(value: unknown): CSSProperties | undefined {
	if (!isThemeRecord(value)) return undefined;
	const output: Record<string, string | number> = {};
	for (const key of Object.keys(value).slice(0, 64)) {
		if (!OVERLAY_STYLE_PROPERTIES.has(key)) continue;
		const descriptor = Object.getOwnPropertyDescriptor(value, key);
		if (!descriptor || !("value" in descriptor)) continue;
		const raw = descriptor.value;
		if (typeof raw === "number") {
			if (Number.isFinite(raw) && Math.abs(raw) <= 100_000) output[key] = raw;
			continue;
		}
		if (typeof raw !== "string" || raw.length > 512
			|| /[\u0000-\u001f\u007f{};<>]/.test(raw)
			|| UNSAFE_OVERLAY_STYLE_VALUE.test(raw)) continue;
		output[key] = raw;
	}
	return Object.keys(output).length > 0 ? output as CSSProperties : undefined;
}

function mergeOverlayThemeStyles(...sources: unknown[]): EngineOverlayThemeStyles {
	const output: EngineOverlayThemeStyles = {};
	for (const source of sources) {
		if (!isThemeRecord(source)) continue;
		for (const slot of OVERLAY_THEME_SLOTS) {
			const descriptor = Object.getOwnPropertyDescriptor(source, slot);
			if (!descriptor || !("value" in descriptor)) continue;
			const style = sanitizeOverlayThemeStyle(descriptor.value);
			if (!style) continue;
			output[slot] = { ...(output[slot] ?? {}), ...style };
		}
	}
	return output;
}

function resolveOverlayThemeStyles(value: unknown): EngineOverlayThemeStyles {
	if (!isThemeRecord(value)) return {};
	const defaults = isThemeRecord(value.defaults) ? value.defaults : undefined;
	const explicitProps = isThemeRecord(value.props) ? value.props : undefined;
	return mergeOverlayThemeStyles(
		value.styles,
		value.themeStyles,
		defaults?.styles,
		defaults?.themeStyles,
		explicitProps?.styles,
		explicitProps?.themeStyles,
	);
}

function resolveOverlayStylesByNodeType(
	definitions: Record<string, EngineThemeJsonObject>,
	selectedComponentId?: string,
): Partial<Record<"dialog" | "drawer" | "popover", EngineOverlayThemeStyles>> {
	const nodeTypes = selectedComponentId && selectedComponentId !== "overlay"
		? (OVERLAY_NODE_TYPES.has(selectedComponentId) ? [selectedComponentId] : [])
		: ["dialog", "drawer", "popover"];
	const shared = resolveOverlayThemeStyles(definitions.overlay);
	const result: Partial<Record<"dialog" | "drawer" | "popover", EngineOverlayThemeStyles>> = {};
	for (const nodeType of nodeTypes) {
		if (!OVERLAY_NODE_TYPES.has(nodeType)) continue;
		const styles = mergeOverlayThemeStyles(shared, resolveOverlayThemeStyles(definitions[nodeType]));
		if (Object.keys(styles).length > 0) {
			result[nodeType as "dialog" | "drawer" | "popover"] = styles;
		}
	}
	return result;
}

function applyOverlayThemeToNode(
	node: SchemaNode,
	stylesByNodeType: Partial<Record<"dialog" | "drawer" | "popover", EngineOverlayThemeStyles>>,
): SchemaNode {
	let children = node.children;
	if (Array.isArray(node.children)) {
		const mapped = node.children.map((child) => typeof child === "string"
			? child
			: applyOverlayThemeToNode(child, stylesByNodeType));
		if (mapped.some((child, index) => child !== node.children?.[index])) children = mapped;
	}

	const overlayStyles = stylesByNodeType[node.type as "dialog" | "drawer" | "popover"];
	if (!overlayStyles) return children === node.children ? node : { ...node, children };

	const originalProps = (node.props ?? {}) as Record<string, unknown>;
	const resolvedStyles = mergeOverlayThemeStyles(overlayStyles, originalProps.themeStyles);
	if (Object.keys(resolvedStyles).length === 0) {
		return children === node.children ? node : { ...node, children };
	}
	return {
		...node,
		...(children !== node.children ? { children } : {}),
		props: { ...originalProps, themeStyles: resolvedStyles } as SchemaNode["props"],
	};
}

function applyMarkdownThemeToNode(node: SchemaNode, markdownTheme: ResolvedMarkdownTheme): SchemaNode {
	let children = node.children;
	if (Array.isArray(node.children)) {
		const mapped = node.children.map((child) => typeof child === "string"
			? child
			: applyMarkdownThemeToNode(child, markdownTheme));
		if (mapped.some((child, index) => child !== node.children?.[index])) children = mapped;
	}

	if (node.type !== "markdown") {
		return children === node.children ? node : { ...node, children };
	}

	const resolved = markdownTheme;
	const originalProps = node.props ?? {};
	const themeProps = resolved.props;
	const localStyles = originalProps.markdownStyles;
	const mergedStyles = mergeMarkdownStyleSlots(resolved.styles, localStyles);
	const nextProps: Record<string, unknown> = {
		...themeProps,
		...originalProps,
	};
	if (isThemeRecord(themeProps.prettyPlease) || isThemeRecord(originalProps.prettyPlease)) {
		// Per-node provider/theme settings override the corresponding shared
		// options, but an explicitly supplied palette remains a full replacement.
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

	return {
		...node,
		...(children !== node.children ? { children } : {}),
		props: nextProps as SchemaNode["props"],
	};
}

export function resolveEngineThemeSchema(schema: PageSchema): PageSchema {
	const theme = schema.theme;
	if (!theme || typeof theme.id !== "string" || !theme.id) return schema;

	const themeRecord = theme as Record<string, unknown>;
	const keys = Object.keys(themeRecord);
	const isQualifiedReference = theme.id.includes(".");
	const isBareReference = keys.every((key) => THEME_REFERENCE_KEYS.has(key));
	const isReference = isQualifiedReference || isBareReference;

	let resolvedCssTheme: EngineTheme = theme;
	let componentThemes = getEngineThemeComponentDefinitions(theme);
	let selectedComponentId: string | undefined;

	if (isReference) {
		if (themeRecord.sourceUrl || themeRecord.scope === "remote") {
			try {
				resolveRegisteredEngineTheme(theme.id);
			} catch {
				throw new Error(
					"Remote EngineTheme references are resolved only after an explicit loadRemoteEngineTheme() call "
					+ "with an origin allowlist and version/checksum verification. No network request is made during render.",
				);
			}
		}
		const resolved = resolveRegisteredEngineTheme(theme.id);
		selectedComponentId = resolved.componentId;
		resolvedCssTheme = {
			...resolved.group,
			...(isThemeRecord(themeRecord.vars)
				? { vars: { ...(resolved.group.vars ?? {}), ...(themeRecord.vars as Record<string, string>) } }
				: {}),
			...(Array.isArray(themeRecord.fonts)
				? { fonts: [...(resolved.group.fonts ?? []), ...(themeRecord.fonts as string[])] }
				: {}),
			...(typeof themeRecord.globalStyles === "string"
				? { globalStyles: themeRecord.globalStyles }
				: {}),
		};
		if (resolved.componentId && OVERLAY_NODE_TYPES.has(resolved.componentId)) {
			const allDefinitions = getEngineThemeComponentDefinitions(resolved.group as EngineTheme);
			componentThemes = {
				...(allDefinitions.overlay ? { overlay: allDefinitions.overlay } : {}),
				...resolved.components,
			};
		} else {
			componentThemes = resolved.components;
		}
	} else if (theme.scope === "global") {
		// Calling createTheme() registered the group in this module instance.
		// Resolve by root ID so unknown/redefined IDs fail consistently.
		const resolved = resolveRegisteredEngineTheme(theme.id);
		componentThemes = resolved.components;
	}

	const markdownTheme = componentThemes.markdown;
	const resolvedMarkdownTheme = markdownTheme
		? resolveMarkdownThemeDefinition(
			markdownTheme,
			typeof resolvedCssTheme.id === "string" ? resolvedCssTheme.id.split(".")[0] : undefined,
		)
		: undefined;
	const hasMarkdownDefaults = Boolean(resolvedMarkdownTheme && (
		Object.keys(resolvedMarkdownTheme.props).length > 0
		|| resolvedMarkdownTheme.styles !== undefined
	));
	const overlayStylesByNodeType = resolveOverlayStylesByNodeType(componentThemes, selectedComponentId);
	const hasOverlayStyles = Object.keys(overlayStylesByNodeType).length > 0;

	let root = schema.root;
	if (resolvedMarkdownTheme && hasMarkdownDefaults) {
		root = applyMarkdownThemeToNode(root, resolvedMarkdownTheme);
	}
	if (hasOverlayStyles) {
		root = applyOverlayThemeToNode(root, overlayStylesByNodeType);
	}

	if (root === schema.root && resolvedCssTheme === theme) return schema;
	return {
		...schema,
		theme: resolvedCssTheme,
		...(root !== schema.root ? { root } : {}),
	};
}