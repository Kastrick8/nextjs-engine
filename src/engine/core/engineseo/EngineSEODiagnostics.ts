export type EngineSEODiagnosticCode = "NESEO1001" | "NESEO2001" | "NESEO3001" | "NESEO4001";

type EngineSEOGuidance = Readonly<{ reason: string; action: string }>;

const ENGINE_SEO_GUIDANCE: Readonly<Record<EngineSEODiagnosticCode, EngineSEOGuidance>> = Object.freeze({
	NESEO1001: {
		reason: "The EngineSEO schema is not valid JSON-safe input for the build-time metadata compiler.",
		action: "Use a plain JSON-compatible schema with finite numbers, no functions or symbols, and no circular references. Keep environment secrets out of public metadata.",
	},
	NESEO2001: {
		reason: "The canonical URL is malformed or uses a protocol unsupported by search-engine canonical metadata.",
		action: "Use a valid HTTP(S) URL or a relative page path with a valid HTTP(S) site URL. Avoid javascript:, data:, malformed origins, credentials and invalid URL syntax.",
	},
	NESEO3001: {
		reason: "The JSON-LD value could not be serialized as safe JSON.",
		action: "Use JSON-compatible structured-data values; remove cycles, BigInt values, functions and unsupported values. Keep the serializer's script-tag escaping enabled.",
	},
	NESEO4001: {
		reason: "EngineSEO could not scan the configured App Router or Pages Router trees to derive sitemap routes.",
		action: "Check route-directory existence, filesystem permissions and unexpected filesystem errors. Rerun the build after fixing the route scan; do not substitute invented routes or dates.",
	},
});

export class EngineSEODiagnosticError extends Error {
	readonly code: EngineSEODiagnosticCode;
	readonly reason: string;
	readonly action: string;
	readonly cause?: unknown;

	constructor(code: EngineSEODiagnosticCode, message: string, cause?: unknown) {
		super("[" + code + "] " + message);
		this.name = "EngineSEODiagnosticError";
		this.code = code;
		this.reason = ENGINE_SEO_GUIDANCE[code].reason;
		this.action = ENGINE_SEO_GUIDANCE[code].action;
		this.cause = cause;
	}
}

export function createEngineSEODiagnosticError(
	code: EngineSEODiagnosticCode,
	message: string,
	cause?: unknown,
): EngineSEODiagnosticError {
	return new EngineSEODiagnosticError(code, message, cause);
}
