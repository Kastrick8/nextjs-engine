import * as React from "react";
import type { ComponentType } from "react";

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

export interface CreateCustomComponentOptions<P extends object> {
	/** Discriminant for the trusted local React component authoring path. */
	mode: "custom";
	/** Stable schema node type. Register the returned component using this ID. */
	id: string;
	/** Trusted application code; remote themes and schemas never provide component code. */
	component: ComponentType<P>;
	/** Optional runtime contract for props received from schema nodes. */
	props?: EngineCustomPropSchema;
	/** Additional props declared as named ReactNode slots, such as "leading" or "trailing". */
	slots?: readonly string[];
	/** Reject undeclared non-standard props in addition to validating declared props. */
	strictProps?: boolean;
}

export type EngineCustomReactComponent<P extends object> = ComponentType<P> & {
	readonly engineCustomComponentId: string;
};

const CUSTOM_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const RESERVED_IDS = new Set(["__proto__", "prototype", "constructor"]);
const RESERVED_PROPS = new Set(["dangerouslySetInnerHTML", "__proto__", "prototype", "constructor"]);
const STANDARD_PROPS = new Set(["children", "id", "className", "style", "title", "role", "tabIndex"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
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

	function EngineCustomComponent(props: P) {
		validateProps(options, props);
		return React.createElement(options.component, props);
	}
	EngineCustomComponent.displayName = "EngineCustomComponent(" + options.id + ")";
	Object.defineProperty(EngineCustomComponent, "engineCustomComponentId", {
		configurable: false,
		enumerable: false,
		writable: false,
		value: options.id,
	});
	return EngineCustomComponent as EngineCustomReactComponent<P>;
}
