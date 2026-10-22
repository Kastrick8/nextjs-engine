"use strict";

export type EngineDebugSeverity = "error" | "warning";
export type EngineDebugSource = "runtime" | "unhandled-rejection" | "console" | "next-overlay";

export interface EngineDebugDiagnostic {
	id: string;
	at: number;
	severity: EngineDebugSeverity;
	category: "Hydration" | "SSR" | "Runtime" | "Console";
	source: EngineDebugSource;
	ownerHint: "Likely NE source" | "Likely application code" | "Likely React / Next.js" | "Unknown";
	message: string;
	detail: string;
	location?: string;
}

const MAX_MESSAGE_LENGTH = 8_000;
const SECRET_PATTERNS: Array<[RegExp, string]> = [
	[/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [redacted]"],
	[/\b(access[_-]?token|refresh[_-]?token|api[_-]?key|secret|password|authorization)\s*[:=]\s*([^\s,;]+)/gi, "$1=[redacted]"],
	[/\b(cookie|set-cookie)\s*:\s*[^\r\n]+/gi, "$1: [redacted]"],
];

export function redactEngineDebugText(value: unknown, maxLength = MAX_MESSAGE_LENGTH): string {
	let text: string;
	const errorLike = value && typeof value === "object"
		? value as { name?: unknown; message?: unknown; stack?: unknown }
		: undefined;
	if (value instanceof Error || (errorLike && typeof errorLike.message === "string" && typeof errorLike.stack === "string")) {
		const name = typeof errorLike?.name === "string" && errorLike.name ? errorLike.name : "Error";
		const message = typeof errorLike?.message === "string" ? errorLike.message : String(value);
		text = [name + ": " + message, typeof errorLike?.stack === "string" ? errorLike.stack : ""].filter(Boolean).join("\n");
	} else if (typeof value === "string") {
		text = value;
	} else {
		try {
			text = JSON.stringify(value, (_key, entry) => {
				if (typeof entry === "string" && entry.length > 2_000) return entry.slice(0, 2_000) + "…";
				if (typeof entry === "function") return "[Function]";
				return entry;
			}, 2) ?? String(value);
		} catch {
			text = String(value);
		}
	}
	for (const [pattern, replacement] of SECRET_PATTERNS) text = text.replace(pattern, replacement);
	return text.length > maxLength ? text.slice(0, maxLength) + "\n…[truncated]" : text;
}

export function classifyEngineDebugDiagnostic(source: EngineDebugSource, message: string, detail = ""):
	Pick<EngineDebugDiagnostic, "severity" | "category" | "ownerHint"> {
	const combined = (message + "\n" + detail).toLowerCase();
	const hydration = /hydration|hydrating|server html|did not match|text content does not match|hydration failed/.test(combined);
	const ssr = /server.?side render|server render|server component|error occurred prerender|failed to render on the server|ssr error/.test(combined);
	const explicitFailure = /uncaught|unhandled|fatal|error:|mismatch|hydration|did not match|failed|exception|server error/.test(combined);
	const isWarning = /\bwarn(?:ing)?\b|deprecated|will be removed/.test(combined);
	const severity: EngineDebugSeverity = source === "console" && isWarning && !explicitFailure ? "warning" : "error";
	const category: EngineDebugDiagnostic["category"] = hydration ? "Hydration" : ssr ? "SSR" : source === "console" ? "Console" : "Runtime";
	let ownerHint: EngineDebugDiagnostic["ownerHint"] = "Unknown";
	if (/src\/engine\/|\/engine\/debug\/|\[engine(?:canvas|shader|manim|provider|style|scroll|transitions)?\]|nextjs-engine\/(?:src\/)?engine/i.test(combined)) {
		ownerHint = "Likely NE source";
	} else if (/(^|[\s("'\\])(?:src\/)?(?:app|pages|components)\/|\bat\s+(?:async\s+)?(?:Home|Page|Layout|RootLayout)\b/.test(combined)) {
		ownerHint = "Likely application code";
	} else if (/react-dom|react\.production|next\/dist|next\.js|nextjs\.org\/docs\/messages|react\.dev\/errors/.test(combined)) {
		ownerHint = "Likely React / Next.js";
	}
	return { severity, category, ownerHint };
}

export function createEngineDebugDiagnostic(input: {
	source: EngineDebugSource;
	message: unknown;
	detail?: unknown;
	location?: string;
	now?: number;
}): EngineDebugDiagnostic {
	const message = redactEngineDebugText(input.message, 1_600).trim() || "(empty diagnostic)";
	const detail = redactEngineDebugText(input.detail ?? "", 6_000).trim();
	const classification = classifyEngineDebugDiagnostic(input.source, message, detail);
	const location = input.location ? redactEngineDebugText(input.location, 500) : undefined;
	const stable = [input.source, classification.category, message, location ?? ""].join("|");
	let hash = 2166136261;
	for (let index = 0; index < stable.length; index++) hash = Math.imul(hash ^ stable.charCodeAt(index), 16777619);
	const at = input.now ?? Date.now();
	return {
		id: (hash >>> 0).toString(16) + "-" + String(at),
		at,
		...classification,
		source: input.source,
		message,
		detail,
		location,
	};
}

export function formatEngineDebugDiagnostic(diagnostic: EngineDebugDiagnostic): string {
	return [
		"[" + diagnostic.severity.toUpperCase() + "] " + diagnostic.category,
		"Likely owner: " + diagnostic.ownerHint,
		"Source: " + diagnostic.source,
		"Time: " + new Date(diagnostic.at).toISOString(),
		diagnostic.location ? "Location: " + diagnostic.location : "",
		"",
		diagnostic.message,
		diagnostic.detail,
	].filter((line, index) => line || index === 5).join("\n").trim();
}

export function appendEngineDebugDiagnostics(
	current: readonly EngineDebugDiagnostic[],
	incoming: EngineDebugDiagnostic,
	limit = 200,
): EngineDebugDiagnostic[] {
	const fingerprint = incoming.source + "|" + incoming.category + "|" + incoming.message + "|" + (incoming.location ?? "");
	const mostRecent = current[current.length - 1];
	if (mostRecent) {
		const lastFingerprint = mostRecent.source + "|" + mostRecent.category + "|" + mostRecent.message + "|" + (mostRecent.location ?? "");
		if (fingerprint === lastFingerprint && incoming.at - mostRecent.at < 1_500) {
			return [...current.slice(0, -1), { ...mostRecent, at: incoming.at, detail: incoming.detail || mostRecent.detail }];
		}
	}
	return [...current, incoming].slice(-Math.max(1, limit));
}
