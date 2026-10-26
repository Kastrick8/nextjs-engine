"use strict";

const PROCESS_MONITOR_KEY = Symbol.for("nextjs-engine.uncaught-exception-monitor");
const MAX_MESSAGE_LENGTH = 1600;
const MAX_DETAIL_LENGTH = 8000;
let reportSequence = 0;

const SECRET_PATTERNS = [
	[/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [redacted]"],
	[/\b(authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|secret)\s*[:=]\s*([^\s,;]+)/gi, "$1=[redacted]"],
	[/\b(cookie|set-cookie)\s*:\s*[^\r\n]+/gi, "$1: [redacted]"],
];

function isProduction() {
	return typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production";
}

function isBrowser() {
	return typeof window !== "undefined" && typeof window.dispatchEvent === "function";
}

function cleanText(value, maxLength = MAX_DETAIL_LENGTH) {
	let text = String(value == null ? "" : value)
		.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
		.replace(/\0/g, "")
		.trim();
	for (const [pattern, replacement] of SECRET_PATTERNS) text = text.replace(pattern, replacement);
	text = text.replace(/([?&](?:access_token|refresh_token|token|api_key|key|secret|password|signature)=)[^&#\s]*/gi, "$1[redacted]");
	if (text.length > maxLength) text = text.slice(0, maxLength - 14) + "…[truncated]";
	return text;
}

function normalizeError(error) {
	if (error && typeof error === "object") {
		const value = error;
		const name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : "Error";
		const message = typeof value.message === "string" ? value.message : String(error);
		const stack = typeof value.stack === "string" ? value.stack : "";
		return { name: cleanText(name, 120), message: cleanText(message, MAX_MESSAGE_LENGTH), stack: cleanText(stack, MAX_DETAIL_LENGTH) };
	}
	return { name: "Error", message: cleanText(error, MAX_MESSAGE_LENGTH) || "An unknown error occurred.", stack: "" };
}

function sourceLocationFromStack(stack) {
	if (!stack) return undefined;
	let fallback;
	for (const line of stack.split(/\r?\n/)) {
		let match = line.match(/\(([^()\r\n]+?\.(?:tsx?|jsx?|mjs|cjs):\d+:\d+)\)/i);
		if (!match) match = line.match(/((?:[A-Za-z]:[\\/]|\/|\.{1,2}[\\/])[^()\s]+?\.(?:tsx?|jsx?|mjs|cjs):\d+:\d+)/i);
		if (!match) continue;
		const location = cleanText(match[1], 500);
		if (!fallback) fallback = location;
		if (/[\\/](?:src|app|pages|components|lib|scripts)[\\/]/i.test(location)
			|| /^(?:src|app|pages|components|lib|scripts)[\\/]/i.test(location)) return location;
	}
	return fallback;
}

function normalizeRoute(value) {
	if (typeof value !== "string" || !value.trim()) return undefined;
	const route = cleanText(value, 800).split(/[?#]/, 1)[0];
	return route.startsWith("/") ? route : undefined;
}

function createEngineErrorReport(error, context = {}) {
	const normalized = normalizeError(error);
	const severity = context.severity === "warning" ? "warning" : "error";
	const codeCandidate = cleanText(context.code || "NE0001", 40);
	const code = /^[A-Za-z0-9_-]+$/.test(codeCandidate) ? codeCandidate : "NE0001";
	const source = cleanText(context.source || "application", 100);
	const message = normalized.name && normalized.name !== "Error"
		? cleanText(normalized.name + ": " + normalized.message, MAX_MESSAGE_LENGTH)
		: normalized.message;

	let location;
	if (typeof context.location === "string" && context.location.trim()) {
		location = cleanText(context.location, 500);
	} else if (typeof context.file === "string" && context.file.trim()) {
		location = cleanText(context.file, 400);
		const line = Number.isSafeInteger(context.line) && context.line > 0 ? context.line : undefined;
		const column = Number.isSafeInteger(context.column) && context.column > 0 ? context.column : undefined;
		if (line) location += ":" + line + (column ? ":" + column : "");
	} else {
		location = sourceLocationFromStack(normalized.stack);
	}

	const details = [];
	if (context.detail) details.push(cleanText(context.detail, 2000));
	if (context.componentStack) details.push("Component stack:\n" + cleanText(context.componentStack, 3000));
	const includeStack = context.includeStack === true || (context.includeStack !== false && !isProduction());
	if (includeStack && normalized.stack) {
		const stackLines = normalized.stack.split(/\r?\n/);
		if (stackLines.length > 1) details.push(stackLines.slice(1).join("\n"));
	}
	const requestPath = normalizeRoute(context.requestPath);
	const method = typeof context.requestMethod === "string"
		&& /^[A-Za-z]+$/.test(context.requestMethod.trim())
		? context.requestMethod.trim().toUpperCase()
		: undefined;
	const digest = typeof context.digest === "string" ? cleanText(context.digest, 200) : undefined;
	reportSequence += 1;

	return {
		id: digest || code + "-" + Date.now().toString(36) + "-" + reportSequence.toString(36),
		timestamp: new Date().toISOString(),
		severity,
		code,
		source,
		message: message || "An unknown error occurred.",
		location,
		route: normalizeRoute(context.route),
		requestPath,
		requestMethod: method,
		digest,
		detail: details.filter(Boolean).join("\n"),
	};
}

function formatEngineErrorReport(report) {
	const lines = [
		"[nextjs-engine][" + String(report.severity || "error").toUpperCase() + " " + cleanText(report.code || "NE0001", 40) + "] "
			+ cleanText(report.message || "An unknown error occurred.", MAX_MESSAGE_LENGTH),
	];
	if (report.source) lines.push("  Source: " + cleanText(report.source, 100));
	if (report.location) lines.push("  Location: " + cleanText(report.location, 500));
	if (report.route) lines.push("  Route: " + cleanText(report.route, 800));
	if (report.requestMethod || report.requestPath) {
		lines.push("  Request: " + [report.requestMethod, report.requestPath].filter(Boolean).join(" "));
	}
	if (report.digest) lines.push("  Digest: " + cleanText(report.digest, 200));
	if (report.detail) {
		for (const line of cleanText(report.detail, MAX_DETAIL_LENGTH).split(/\r?\n/)) lines.push(line ? "  " + line : "");
	}
	return lines.join("\n");
}

function reportEngineError(error, context = {}) {
	const report = createEngineErrorReport(error, context);
	const formatted = formatEngineErrorReport(report);
	try {
		const logger = report.severity === "warning" ? console.warn : console.error;
		logger.call(console, formatted);
	} catch {
		// Diagnostics must never replace the original failure.
	}
	if (isBrowser() && typeof CustomEvent !== "undefined") {
		try {
			window.dispatchEvent(new CustomEvent("engine:error", { detail: report }));
		} catch {
			// Event listeners are optional; terminal reporting has already happened.
		}
	}
	return report;
}

/**
 * Observe fatal Node exceptions without intercepting them. Node's default fatal
 * exception handler still runs and retains responsibility for process exit.
 */
function installEngineUncaughtExceptionMonitor() {
	if (typeof process === "undefined" || !process.versions || !process.versions.node
		|| typeof process.on !== "function" || process.env.NEXTJS_ENGINE_ERROR_MONITOR === "off") {
		return function noop() {};
	}
	if (process[PROCESS_MONITOR_KEY]) return function alreadyInstalled() {};

	const monitor = function engineUncaughtExceptionMonitor(error, origin) {
		reportEngineError(error, {
			code: "NE0001",
			source: "node-uncaught-exception",
			detail: "Node.js is about to terminate. Origin: " + cleanText(origin || "unknown", 120) + ".",
			includeStack: false,
		});
	};
	try {
		process.on("uncaughtExceptionMonitor", monitor);
		Object.defineProperty(process, PROCESS_MONITOR_KEY, { value: monitor, configurable: true });
	} catch {
		return function noop() {};
	}

	return function uninstallEngineUncaughtExceptionMonitor() {
		if (process[PROCESS_MONITOR_KEY] !== monitor) return;
		try {
			process.off("uncaughtExceptionMonitor", monitor);
			delete process[PROCESS_MONITOR_KEY];
		} catch {
			// Cleanup is best-effort and never alters Node's exception behavior.
		}
	};
}

module.exports = {
	createEngineErrorReport,
	formatEngineErrorReport,
	reportEngineError,
	installEngineUncaughtExceptionMonitor,
};
