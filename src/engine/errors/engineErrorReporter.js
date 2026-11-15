"use strict";

const PROCESS_MONITOR_KEY = Symbol.for("nextjs-engine.uncaught-exception-monitor");
const { createEngineErrorReport, resolveEngineErrorHelpUrl, cleanText, isBrowser } = require("./engineErrorCore");

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
	ERROR_BOOK_URL: require('./engineErrorCore').ERROR_BOOK_URL,
	createEngineErrorReport,
	formatEngineErrorReport,
	reportEngineError,
	resolveEngineErrorHelpUrl,
	installEngineUncaughtExceptionMonitor,
};
