"use strict";

const PROCESS_MONITOR_KEY = Symbol.for("nextjs-engine.uncaught-exception-monitor");
const MAX_MESSAGE_LENGTH = 1600;
const MAX_DETAIL_LENGTH = 8000;
const PROJECT_URL = "https://kastrick.vercel.app/project/nextjs-engine";
const ERROR_BOOK_URL = "https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes";
const ERROR_BOOK_PAGE_BY_CODE = Object.freeze({
  "NECORE4000": "core",
  "NECORE4001": "core",
  "NECORE4002": "core",
  "NECORE4003": "core",
  "NECORE5001": "core",
  "NECORE9001": "core",
  "NENC1000": "nenc",
  "NENC1001": "nenc",
  "NENC1002": "nenc",
  "NENC2001": "nenc",
  "NENC2002": "nenc",
  "NENC3001": "nenc",
  "NENC3002": "nenc",
  "NENC4000": "nenc",
  "NENC4001": "nenc",
  "NENC5001": "nenc",
  "NENC5002": "nenc",
  "NENC8001": "nenc",
  "NECFG1001": "config",
  "NECFG1002": "config",
  "NECFG2001": "config",
  "NECFG2002": "config",
  "NECFG2003": "config",
  "NECFG5001": "config",
  "NECFG8001": "config",
  "NECFG9001": "config",
  "NEBLD1001": "build",
  "NEBLD1002": "build",
  "NEBLD2001": "build",
  "NEBLD2002": "build",
  "NEBLD3001": "build",
  "NEBLD3002": "build",
  "NEBLD5001": "build",
  "NEBLD8001": "build",
  "NECMP1001": "components",
  "NECMP1002": "components",
  "NECMP1003": "components",
  "NECMP1004": "components",
  "NECMP1005": "components",
  "NECMP1006": "components",
  "NECMP1007": "components",
  "NECMP1008": "components",
  "NECMP2001": "components",
  "NECMP2002": "components",
  "NECMP2003": "components",
  "NETH1001": "theme",
  "NETH1002": "theme",
  "NETH2001": "theme",
  "NETH2002": "theme",
  "NETH3001": "theme",
  "NETH8001": "theme",
  "NEMD1001": "markdown",
  "NEMD1002": "markdown",
  "NEMD2001": "markdown",
  "NEMD3001": "markdown",
  "NEMD8001": "markdown",
  "NEMD8002": "markdown",
  "NEIMG1001": "images",
  "NEIMG1002": "images",
  "NEIMG2001": "images",
  "NEIMG3001": "images",
  "NEIMG4001": "images",
  "NEAPI1001": "api",
  "NEAPI1002": "api",
  "NEAPI2001": "api",
  "NEAPI2002": "api",
  "NEAPI4001": "api",
  "NESCHED1001": "scheduler",
  "NESCHED1002": "scheduler",
  "NESCHED2001": "scheduler",
  "NESCHED4001": "scheduler",
  "NESCHED4002": "scheduler",
  "NESCHED5001": "scheduler",
  "NEDEBUG1001": "engine-debug",
  "NEDEBUG2001": "engine-debug",
  "NEDEBUG4001": "engine-debug",
  "NEDEBUG4002": "engine-debug",
  "NEDEBUG5001": "engine-debug",
  "NESEO1001": "seo",
  "NESEO2001": "seo",
  "NESEO3001": "seo",
  "NESEO4001": "seo",
  "NENET1001": "networking",
  "NENET2001": "networking",
  "NENET2002": "networking",
  "NENET4001": "networking",
  "NENET8001": "networking",
  "NENET8002": "networking",
  "NEMIG1001": "migration",
  "NEMIG1002": "migration",
  "NEMIG2001": "migration",
  "NEMIG2002": "migration",
  "NEVIS1001": "visual",
  "NEVIS2001": "visual",
  "NEVIS3001": "visual",
  "NEVIS4001": "visual",
  "NEVIS4002": "visual",
  "NEVIS8001": "visual",
  "NESEC2001": "security",
  "NESEC2002": "security",
  "NESEC4001": "security",
  "NESEC8001": "security"
});
const ERROR_GUIDANCE = Object.freeze({
	NECORE4000: { reason: "No subsystem-specific code was supplied by the caller.", action: "Inspect the first application-owned stack frame and assign a more specific stable code." },
	NECORE4001: { reason: "A route-level boundary caught an exception during route work.", action: "Fix the earliest application-owned cause, then retry the route." },
	NECORE4002: { reason: "The root boundary caught a failure that escaped narrower route handling or occurred in root layout work.", action: "Inspect root layout/global providers; preserve the digest and terminal report." },
	NECORE4003: { reason: "Next.js reported a server request/render/action failure through instrumentation.", action: "Use sanitized request method/path and first server frame; inspect logs without including headers or cookies." },
	NECORE5001: { reason: "Node.js is about to terminate after an uncaught fatal exception.", action: "Fix the originating exception; do not suppress Node's default fatal behavior." },
	NECFG2001: { reason: "The Engine preserved a user-owned route boundary.", action: "Keep the file and integrate reportEngineError() manually if structured diagnostics are desired." },
	NECFG2002: { reason: "The Engine preserved a user-owned global boundary.", action: "Keep the file and opt into the reporter deliberately." },
	NECFG2003: { reason: "The Engine preserved a user-owned instrumentation entry point.", action: "Merge Engine integration into the existing entry point instead of replacing it." },
	NECFG5001: { reason: "The plugin could not write an Engine-owned integration file.", action: "Check the path, permissions and file/directory conflicts, then rerun." },
	NENC4000: { reason: "NENC reported failure without a narrower stable error type.", action: "Inspect the first preceding NENC error and identify the route, worker or compile pass." }
});
let reportSequence = 0;

const SECRET_PATTERNS = [
	[/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [redacted]"],
	[/\b(authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|secret)\s*[:=]\s*([^\s,;]+)/gi, "$1=[redacted]"],
	[/\b(cookie|set-cookie)\s*:\s*[^\r\n]+/gi, "$1: [redacted]"],
];

const ANSI = {
	reset: "\u001b[0m",
	bold: "\u001b[1m",
	dim: "\u001b[2m",
	red: "\u001b[31m",
	yellow: "\u001b[33m",
	green: "\u001b[32m",
	cyan: "\u001b[36m",
	blue: "\u001b[34m",
	white: "\u001b[37m",
};

function isProduction() {
	return typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production";
}

function isBrowser() {
	return typeof window !== "undefined" && typeof window.dispatchEvent === "function";
}

function isTerminal() {
	return typeof process !== "undefined"
		&& ((process.stdout && process.stdout.isTTY === true) || (process.stderr && process.stderr.isTTY === true));
}

function colorsEnabled() {
	if (typeof process === "undefined" || !process.env) return false;
	const env = process.env;
	if (env.NODE_DISABLE_COLORS || (env.NO_COLOR !== undefined && env.NO_COLOR !== "")) return false;
	if (env.FORCE_COLOR !== undefined) return env.FORCE_COLOR !== "0";
	return isTerminal() && env.TERM !== "dumb";
}

function terminalHyperlinksEnabled() {
	if (typeof process === "undefined" || !process.env) return false;
	const env = process.env;
	if (env.FORCE_HYPERLINK === "0") return false;
	if (env.FORCE_HYPERLINK === "1") return true;
	return isTerminal() && Boolean(
		env.WT_SESSION
		|| env.VTE_VERSION
		|| /^(iTerm\.app|WezTerm|vscode|Hyper|Tabby|ghostty)$/i.test(env.TERM_PROGRAM || "")
	);
}

function paint(value, color, enabled) {
	const text = String(value);
	if (!enabled || !ANSI[color]) return text;
	return ANSI[color] + text + ANSI.reset;
}

function hyperlink(label, url) {
	if (!terminalHyperlinksEnabled()) return label;
	return "\u001b]8;;" + url + "\u001b\\"
		+ label
		+ "\u001b]8;;\u001b\\";
}

function resolveEngineErrorHelpUrl(code) {
	const normalized = cleanText(code || "NECORE4000", 40).toUpperCase();
	if (!/^[A-Z]+\d{4}$/.test(normalized)) return ERROR_BOOK_URL;
	const page = ERROR_BOOK_PAGE_BY_CODE[normalized];
	return page ? ERROR_BOOK_URL + "/" + page + "#" + normalized.toLowerCase() : ERROR_BOOK_URL;
}

function cleanText(value, maxLength = MAX_DETAIL_LENGTH) {
	let text = String(value == null ? "" : value)
		.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
		.replace(/\u001b\]8;;.*?(?:\u0007|\u001b\\)/g, "")
		.replace(/\0/g, "")
		.trim();
	for (const [pattern, replacement] of SECRET_PATTERNS) text = text.replace(pattern, replacement);
	text = text.replace(/([?&](?:access_token|refresh_token|token|api_key|key|secret|password|signature)=)[^&#\s]*/gi, "$1[redacted]");
	if (text.length > maxLength) text = text.slice(0, maxLength - 14) + "…[truncated]";
	return text;
}

function normalizeError(error, depth = 0, seen = new Set()) {
	if (error && typeof error === "object") {
		if (seen.has(error)) return { name: "Error", message: "[circular error cause]", stack: "", cause: undefined };
		seen.add(error);
		const value = error;
		const name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : "Error";
		const message = typeof value.message === "string" ? value.message : String(error);
		const stack = typeof value.stack === "string" ? value.stack : "";
		const cause = depth < 4 && value.cause != null
			? normalizeError(value.cause, depth + 1, seen)
			: undefined;
		return {
			name: cleanText(name, 120),
			message: cleanText(message, MAX_MESSAGE_LENGTH),
			stack: cleanText(stack, MAX_DETAIL_LENGTH),
			cause,
		};
	}
	return { name: "Error", message: cleanText(error, MAX_MESSAGE_LENGTH) || "An unknown error occurred.", stack: "", cause: undefined };
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
	let attachedCode;
	let attachedReason;
	let attachedAction;
	if (error && typeof error === "object") {
		try {
			if (typeof error.code === "string") attachedCode = error.code;
			if (typeof error.reason === "string") attachedReason = error.reason;
			if (typeof error.action === "string") attachedAction = error.action;
		} catch {
			// Arbitrary thrown objects may have custom getters; reporting must not replace the original error.
		}
	}
	const codeCandidate = cleanText(context.code || attachedCode || "NECORE4000", 40);
	const code = /^[A-Za-z0-9_-]+$/.test(codeCandidate) ? codeCandidate : "NECORE4000";
	const source = cleanText(context.source || "application", 100);
	const messageWithoutCode = normalized.message.replace(/^\[[A-Z]+\d{4}\]\s*/, "");
	const message = normalized.name && normalized.name !== "Error"
		? cleanText(normalized.name + ": " + messageWithoutCode, MAX_MESSAGE_LENGTH)
		: messageWithoutCode;

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
	let cause = normalized.cause;
	let causeDepth = 0;
	while (cause && causeDepth < 4) {
		details.push("Caused by: " + (cause.name && cause.name !== "Error" ? cause.name + ": " : "") + cause.message);
		cause = cause.cause;
		causeDepth += 1;
	}
	const includeStack = context.includeStack === true || (context.includeStack !== false && !isProduction());
	if (includeStack && normalized.stack) {
		const stackLines = normalized.stack.split(/\r?\n/);
		if (stackLines.length > 1) details.push("Stack trace:\n" + stackLines.slice(1).join("\n"));
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
		reason: cleanText(context.reason || attachedReason || (ERROR_GUIDANCE[code] && ERROR_GUIDANCE[code].reason) || "", 1600) || undefined,
		action: cleanText(context.action || attachedAction || (ERROR_GUIDANCE[code] && ERROR_GUIDANCE[code].action) || "", 1600) || undefined,
		location,
		route: normalizeRoute(context.route),
		requestPath,
		requestMethod: method,
		digest,
		detail: details.filter(Boolean).join("\n"),
	};
}

function formatEngineErrorReport(report, options = {}) {
	const useColor = typeof options.color === "boolean" ? options.color : colorsEnabled();
	const severity = String(report.severity || "error").toUpperCase();
	const severityColor = severity === "WARNING" ? "yellow" : "red";
	const prefix = "[nextjs-engine][" + severity + " " + cleanText(report.code || "NECORE4000", 40) + "]";
	const lines = [
		paint(prefix, severityColor, useColor) + " " + paint(cleanText(report.message || "An unknown error occurred.", MAX_MESSAGE_LENGTH), "bold", useColor),
	];

	if (report.source) lines.push("  " + paint("Source:", "cyan", useColor) + " " + cleanText(report.source, 100));
	if (report.location) {
		lines.push("  " + paint("Where:", "cyan", useColor) + " " + paint(cleanText(report.location, 500), "blue", useColor));
		lines.push("         " + paint("Open the file at this line/column in your editor (Ctrl+Click in supported terminals).", "dim", useColor));
	}
	if (report.route) lines.push("  " + paint("Route:", "cyan", useColor) + " " + cleanText(report.route, 800));
	if (report.requestMethod || report.requestPath) {
		lines.push("  " + paint("Request:", "cyan", useColor) + " " + [report.requestMethod, report.requestPath].filter(Boolean).join(" "));
	}
	if (report.digest) lines.push("  " + paint("Digest:", "cyan", useColor) + " " + cleanText(report.digest, 200));
	if (report.reason) lines.push("  " + paint("Reason:", "cyan", useColor) + " " + cleanText(report.reason, 1600));
	if (report.action) lines.push("  " + paint("Action:", "cyan", useColor) + " " + cleanText(report.action, 1600));
	const helpUrl = resolveEngineErrorHelpUrl(report.code);
	const helpLabel = hyperlink("Error Book · " + cleanText(report.code || "NECORE4000", 40), helpUrl);
	lines.push("  " + paint("Help:", "cyan", useColor) + " " + helpLabel + " — " + helpUrl);
	if (report.detail) {
		for (const line of cleanText(report.detail, MAX_DETAIL_LENGTH).split(/\r?\n/)) {
			if (/^\s*Stack trace:/.test(line)) lines.push("  " + paint(line, "dim", useColor));
			else if (/^\s*Caused by:/.test(line)) lines.push("  " + paint(line, "yellow", useColor));
			else lines.push(line ? "  " + line : "");
		}
	}
	const projectLabel = hyperlink("Kastrick · Website", PROJECT_URL);
	lines.push("  " + paint("Project:", "cyan", useColor) + " " + projectLabel + " — " + PROJECT_URL);
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
			code: "NECORE5001",
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
	ERROR_BOOK_URL,
	createEngineErrorReport,
	formatEngineErrorReport,
	reportEngineError,
	resolveEngineErrorHelpUrl,
	installEngineUncaughtExceptionMonitor,
};