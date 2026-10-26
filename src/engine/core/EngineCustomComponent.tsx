import * as React from "react";
import type { ComponentType, CSSProperties } from "react";
import { parseEngineThemeId } from "../components/engineTheme/createTheme";

export type EngineCustomPropType =
	| "string"
	| "number"
	| "boolean"
	| "object"
	| "array"
	| "function"
	| "node";

export interface EngineCustomPropRule {
	type: EngineCustomPropType | readonly EngineCustomPropType[];
	required?: boolean;
	nullable?: boolean;
	enum?: readonly (string | number | boolean | null)[];
	minimum?: number;
	maximum?: number;
	minLength?: number;
	maxLength?: number;
}

export type EngineCustomPropSchema = Readonly<Record<string, EngineCustomPropRule>>;

/** Safe theme styles keyed by the custom component's declared slots. */
export type EngineCustomThemeStyles = Readonly<Record<string, CSSProperties>>;

export interface CreateCustomComponentOptions<P extends object> {
	/** Discriminant for the trusted local React component authoring path. */
	mode: "custom";
	/** Stable schema node type. Register the returned component using this ID. */
	id: string;
	/** Trusted application code; remote themes and schemas never provide component code. */
	component: ComponentType<P>;
	/** Optional base theme namespace, e.g. "site.link"; variants are selected on SchemaNode.theme. */
	theme?: string;
	/** Optional runtime contract for props received from schema nodes. */
	props?: EngineCustomPropSchema;
	/** Additional props declared as named ReactNode slots, such as "leading" or "trailing". */
	slots?: readonly string[];
	/** Reject undeclared non-standard props in addition to validating declared props. */
	strictProps?: boolean;
}

export type EngineCustomReactComponent<P extends object> = ComponentType<P & {
	engineThemeStyles?: EngineCustomThemeStyles;
}> & {
	readonly engineCustomComponentId: string;
	readonly engineCustomSlots: readonly string[];
	readonly engineCustomThemeId?: string;
};

const CUSTOM_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

/**
 * Lightweight metadata for explicitly registered custom schema components.
 * Kept separate from core/registry so EngineTheme resolution never imports
 * the default built-in component graph just to inspect custom theme bindings.
 */
export interface RegisteredEngineCustomComponentMetadata {
	id: string;
	slots: readonly string[];
	themeId?: string;
}

const registeredCustomComponentMetadata = new Map<string, RegisteredEngineCustomComponentMetadata>();

export function registerEngineCustomComponentMetadata(type: string, component: unknown): void {
	if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(type)
		|| type === "__proto__" || type === "prototype" || type === "constructor") {
		throw new TypeError("Custom component metadata requires a safe schema-node identifier.");
	}
	const metadata = component && (typeof component === "function" || typeof component === "object")
		? component as {
			engineCustomComponentId?: unknown;
			engineCustomSlots?: unknown;
			engineCustomThemeId?: unknown;
		}
		: undefined;
	if (typeof metadata?.engineCustomComponentId === "string" && metadata.engineCustomComponentId !== type) {
		throw new Error("Custom component metadata ID does not match registry type '" + type + "'.");
	}
	const slots = Array.isArray(metadata?.engineCustomSlots)
		? metadata.engineCustomSlots.filter((slot): slot is string => typeof slot === "string")
		: [];
	const themeId = typeof metadata?.engineCustomThemeId === "string" ? metadata.engineCustomThemeId : undefined;
	registeredCustomComponentMetadata.set(type, Object.freeze({
		id: type,
		slots: Object.freeze(slots),
		...(themeId ? { themeId } : {}),
	}));
}

export function unregisterEngineCustomComponentMetadata(type: string): void {
	registeredCustomComponentMetadata.delete(type);
}

export function isRegisteredEngineCustomComponent(type: string): boolean {
	return registeredCustomComponentMetadata.has(type);
}

export function getRegisteredEngineCustomComponentSlots(type: string): readonly string[] {
	return registeredCustomComponentMetadata.get(type)?.slots ?? [];
}

export function getRegisteredEngineCustomComponentThemeId(type: string): string | undefined {
	return registeredCustomComponentMetadata.get(type)?.themeId;
}


const RESERVED_IDS = new Set(["__proto__", "prototype", "constructor"]);
const RESERVED_PROPS = new Set(["dangerouslySetInnerHTML", "__proto__", "prototype", "constructor"]);
const STANDARD_PROPS = new Set(["children", "id", "className", "style", "title", "role", "tabIndex", "engineThemeStyles"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

const THEME_STYLE_PROPERTIES = new Set([
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
const UNSAFE_THEME_CSS_VALUE = /url\s*\(|expression\s*\(|javascript\s*:|@import|behavior\s*:|-moz-binding|[;{}]|[\u0000-\u001f\u007f]/i;

function safeThemeStyleValue(value: unknown): value is string | number {
	if (typeof value === "number") return Number.isFinite(value) && Math.abs(value) <= 1_000_000;
	return typeof value === "string" && value.length <= 256 && !UNSAFE_THEME_CSS_VALUE.test(value);
}

/** Validate style data from a theme before it reaches a trusted local component. */
export function sanitizeEngineCustomThemeStyles(
	value: unknown,
	declaredSlots: readonly string[],
	label = "EngineTheme custom styles",
): EngineCustomThemeStyles {
	if (!isPlainObject(value)) throw new TypeError(label + " must be an object of named style slots.");
	if (Object.keys(value).length > 33) throw new TypeError(label + " exceeds the maximum number of style slots.");
	const allowedSlots = new Set(["root", ...declaredSlots]);
	const output: Record<string, CSSProperties> = {};
	for (const [slot, candidate] of Object.entries(value)) {
		if (!allowedSlots.has(slot)) throw new TypeError("Unsupported " + label + " slot '" + slot + "'.");
		if (!isPlainObject(candidate)) throw new TypeError(label + " slot '" + slot + "' must be an object.");
		if (Object.keys(candidate).length > 80) throw new TypeError(label + " slot '" + slot + "' exceeds 80 properties.");
		const style: Record<string, string | number> = {};
		for (const [property, item] of Object.entries(candidate)) {
			if (!THEME_STYLE_PROPERTIES.has(property) && !/^--[A-Za-z0-9_-]{1,128}$/.test(property)) {
				throw new TypeError("Unsupported CSS property '" + property + "' in " + label + " slot '" + slot + "'.");
			}
			if (!safeThemeStyleValue(item)) {
				throw new TypeError("Unsafe or invalid CSS value for '" + property + "' in " + label + " slot '" + slot + "'.");
			}
			style[property] = item;
		}
		output[slot] = style as CSSProperties;
	}
	return output;
}

function isReactNode(value: unknown, depth = 0): boolean {
	if (depth > 32) return false;
	if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
	if (React.isValidElement(value)) return true;
	if (!Array.isArray(value)) return false;
	return value.length <= 10_000 && value.every((entry) => isReactNode(entry, depth + 1));
}

function isSupportedType(value: unknown, type: EngineCustomPropType): boolean {
	switch (type) {
		case "string": return typeof value === "string";
		case "number": return typeof value === "number" && Number.isFinite(value);
		case "boolean": return typeof value === "boolean";
		case "object": return isPlainObject(value) || React.isValidElement(value);
		case "array": return Array.isArray(value);
		case "function": return typeof value === "function";
		case "node": return isReactNode(value);
	}
}

function validateRule(key: string, rule: EngineCustomPropRule): void {
	if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(key) || RESERVED_PROPS.has(key)) {
		throw new TypeError("Invalid or reserved custom component prop name '" + key + "'.");
	}
	if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
		throw new TypeError("Custom component prop rule '" + key + "' must be an object.");
	}
	const types = Array.isArray(rule.type) ? rule.type : [rule.type];
	if (types.length === 0 || types.some((type) =>
		!["string", "number", "boolean", "object", "array", "function", "node"].includes(type))) {
		throw new TypeError("Custom component prop rule '" + key + "' has an unsupported type.");
	}
	if (rule.enum && (!Array.isArray(rule.enum) || rule.enum.length > 64
		|| rule.enum.some((entry) => !["string", "number", "boolean"].includes(typeof entry) && entry !== null))) {
		throw new TypeError("Custom component prop enum '" + key + "' must contain at most 64 scalar values.");
	}
	for (const [name, value] of Object.entries({
		minimum: rule.minimum,
		maximum: rule.maximum,
		minLength: rule.minLength,
		maxLength: rule.maxLength,
	})) {
		if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
			throw new TypeError("Custom component prop bound '" + name + "' for '" + key + "' must be a finite non-negative number.");
		}
	}
	if (rule.minimum !== undefined && rule.maximum !== undefined && rule.minimum > rule.maximum) {
		throw new TypeError("Custom component prop rule '" + key + "' has minimum greater than maximum.");
	}
	if (rule.minLength !== undefined && rule.maxLength !== undefined && rule.minLength > rule.maxLength) {
		throw new TypeError("Custom component prop rule '" + key + "' has minLength greater than maxLength.");
	}
}

function validateProps<P extends object>(
	options: CreateCustomComponentOptions<P>,
	input: unknown,
): asserts input is P {
	if (!isPlainObject(input)) throw new TypeError("Custom component props must be a plain object.");
	const schema = options.props ?? {};
	const slotNames = new Set(options.slots ?? []);
	for (const key of Object.keys(input)) {
		if (RESERVED_PROPS.has(key)) throw new TypeError("Reserved prop '" + key + "' is not forwarded to custom components.");
	}
	for (const [key, rule] of Object.entries(schema)) {
		const value = input[key];
		if (value === undefined || (value === null && rule.nullable !== true)) {
			if (rule.required) throw new TypeError("Custom component requires prop '" + key + "'.");
			if (value === undefined || value === null) continue;
		}
		if (value === null && rule.nullable === true) continue;
		const types = Array.isArray(rule.type) ? rule.type : [rule.type];
		if (!types.some((type) => isSupportedType(value, type))) {
			throw new TypeError("Custom component prop '" + key + "' must be " + types.join(" or ") + ".");
		}
		if (rule.enum && !rule.enum.some((candidate) => Object.is(candidate, value))) {
			throw new TypeError("Custom component prop '" + key + "' must be one of the declared enum values.");
		}
		if (typeof value === "number") {
			if (rule.minimum !== undefined && value < rule.minimum) throw new TypeError("Custom component prop '" + key + "' is below minimum.");
			if (rule.maximum !== undefined && value > rule.maximum) throw new TypeError("Custom component prop '" + key + "' is above maximum.");
		}
		if (typeof value === "string" || Array.isArray(value)) {
			if (rule.minLength !== undefined && value.length < rule.minLength) throw new TypeError("Custom component prop '" + key + "' is shorter than minLength.");
			if (rule.maxLength !== undefined && value.length > rule.maxLength) throw new TypeError("Custom component prop '" + key + "' is longer than maxLength.");
		}
	}
	if (options.strictProps) {
		const declared = new Set([...Object.keys(schema), ...slotNames, ...STANDARD_PROPS]);
		for (const key of Object.keys(input)) {
			if (declared.has(key) || key.startsWith("aria-") || key.startsWith("data-")) continue;
			throw new TypeError("Undeclared custom component prop '" + key + "'.");
		}
	}
	for (const slot of slotNames) {
		if (input[slot] !== undefined && !isReactNode(input[slot])) {
			throw new TypeError("Custom component slot '" + slot + "' must be a valid ReactNode.");
		}
	}
}

export function createTrustedEngineComponent<P extends object>(
	options: CreateCustomComponentOptions<P>,
): EngineCustomReactComponent<P> {
	if (options.mode !== "custom") throw new TypeError("Custom component mode must be explicitly set to 'custom'.");
	if (typeof options.id !== "string" || !CUSTOM_ID_PATTERN.test(options.id) || RESERVED_IDS.has(options.id)) {
		throw new TypeError("Custom component id must be a single safe schema-node identifier.");
	}
	if (!options.component || (typeof options.component !== "function" && typeof options.component !== "object")) {
		throw new TypeError("Custom component mode requires a trusted local React component.");
	}
	let defaultThemeId: string | undefined;
	if (options.theme !== undefined) {
		const parsedTheme = parseEngineThemeId(options.theme);
		if (!parsedTheme.componentId || parsedTheme.subthemes.length > 0) {
			throw new TypeError("Custom component theme must be a base EngineTheme namespace ID such as 'site.link', without a selected variant.");
		}
		defaultThemeId = options.theme;
	}
	if (options.props !== undefined) {
		if (!isPlainObject(options.props) || Object.keys(options.props).length > 128) {
			throw new TypeError("Custom component props schema must be a plain object with at most 128 fields.");
		}
		if (Object.getOwnPropertySymbols(options.props).length > 0) {
			throw new TypeError("Custom component props schema cannot contain symbol keys.");
		}
		for (const [key, rule] of Object.entries(options.props)) validateRule(key, rule);
	}
	if (options.slots !== undefined) {
		if (!Array.isArray(options.slots) || options.slots.length > 32 || new Set(options.slots).size !== options.slots.length) {
			throw new TypeError("Custom component slots must be a unique array with at most 32 names.");
		}
		for (const slot of options.slots) {
			if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(slot) || RESERVED_PROPS.has(slot)) {
				throw new TypeError("Invalid or reserved custom component slot name '" + slot + "'.");
			}
		}
	}

	function EngineCustomComponent(props: P & { engineThemeStyles?: EngineCustomThemeStyles }) {
		const input = props as unknown as Record<string, unknown>;
		const safeThemeStyles = input.engineThemeStyles === undefined
			? undefined
			: sanitizeEngineCustomThemeStyles(input.engineThemeStyles, options.slots ?? []);
		validateProps(options, input);
		const forwarded = safeThemeStyles === undefined
			? input
			: { ...input, engineThemeStyles: safeThemeStyles };
		return React.createElement(options.component, forwarded as P);
	}
	EngineCustomComponent.displayName = "EngineCustomComponent(" + options.id + ")";
	Object.defineProperty(EngineCustomComponent, "engineCustomComponentId", {
		configurable: false,
		enumerable: false,
		writable: false,
		value: options.id,
	});
	Object.defineProperty(EngineCustomComponent, "engineCustomSlots", {
		configurable: false,
		enumerable: false,
		writable: false,
		value: Object.freeze([...(options.slots ?? [])]),
	});
	Object.defineProperty(EngineCustomComponent, "engineCustomThemeId", {
		configurable: false,
		enumerable: false,
		writable: false,
		value: defaultThemeId,
	});
	return EngineCustomComponent as EngineCustomReactComponent<P>;
}
