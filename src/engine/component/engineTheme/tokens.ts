import { isSafeEngineThemeCssValue } from "./cssSafety";

const MAX_TOKEN_DEPTH = 8;
const MAX_TOKEN_NODES = 512;
const MAX_TOKEN_VARIABLES = 128;
const MAX_TOKEN_VALUE_LENGTH = 256;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export type EngineThemeCssVariables = Record<string, string>;

function safeCssValue(value: unknown): value is string {
	return isSafeEngineThemeCssValue(value, MAX_TOKEN_VALUE_LENGTH);
}

function safeVariableKey(value: string): string | undefined {
	const raw = value.startsWith("--") ? value.slice(2) : value;
	if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,80}$/.test(raw)) return undefined;
	return "--" + raw;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

/**
 * Sanitize legacy/custom CSS variables before placing their values in a style
 * element. Invalid entries are ignored instead of breaking the whole page.
 */
export function normalizeEngineThemeVariables(value: unknown): EngineThemeCssVariables {
	if (!isPlainRecord(value)) return {};
	const output: EngineThemeCssVariables = {};
	let inspected = 0;
	for (const key of Object.keys(value)) {
		if (inspected >= MAX_TOKEN_VARIABLES) break;
		inspected += 1;
		if (RESERVED_KEYS.has(key)) continue;
		const variable = safeVariableKey(key);
		const descriptor = Object.getOwnPropertyDescriptor(value, key);
		if (!variable || !descriptor || !("value" in descriptor) || descriptor.get || descriptor.set) continue;
		const rawValue = descriptor.value;
		const cssValue = typeof rawValue === "number" && Number.isFinite(rawValue) ? String(rawValue) : rawValue;
		if (!safeCssValue(cssValue)) continue;
		output[variable] = cssValue;
	}
	return output;
}

/**
 * Flatten semantic theme tokens into predictable CSS custom properties, e.g.
 * tokens.colors.accent -> --e-theme-colors-accent. Traversal is bounded and
 * accepts only scalar CSS values; arrays, booleans, unsafe text and objects
 * outside the expected plain-data shape are ignored.
 */
export function flattenEngineThemeTokens(tokens: unknown): EngineThemeCssVariables {
	const output: EngineThemeCssVariables = {};
	const active = new Set<object>();
	let visited = 0;

	function visit(value: unknown, path: string[], depth: number): void {
		visited += 1;
		if (visited > MAX_TOKEN_NODES || depth > MAX_TOKEN_DEPTH || outputCountReached()) return;

		if (typeof value === "number" && Number.isFinite(value)) {
			write(path, String(value));
			return;
		}
		if (typeof value === "string") {
			write(path, value);
			return;
		}
		if (!isPlainRecord(value) || active.has(value)) return;

		active.add(value);
		for (const key of Object.keys(value)) {
			if (RESERVED_KEYS.has(key) || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(key)) continue;
			const descriptor = Object.getOwnPropertyDescriptor(value, key);
			if (!descriptor || !("value" in descriptor) || descriptor.get || descriptor.set) continue;
			visit(descriptor.value, [...path, key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()], depth + 1);
			if (outputCountReached()) break;
		}
		active.delete(value);
	}

	function outputCountReached(): boolean {
		return Object.keys(output).length >= MAX_TOKEN_VARIABLES;
	}

	function write(path: string[], rawValue: string): void {
		if (path.length === 0 || outputCountReached() || !safeCssValue(rawValue)) return;
		const key = "--e-theme-" + path.join("-");
		if (key.length > 128 || !/^--[A-Za-z0-9_-]+$/.test(key)) return;
		output[key] = rawValue;
	}

	visit(tokens, [], 0);
	return output;
}

