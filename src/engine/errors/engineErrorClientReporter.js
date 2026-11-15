"use strict";

const { createEngineErrorReport, resolveEngineErrorHelpUrl, isBrowser } = require("./engineErrorCore");

function formatClientErrorReport(report) {
	const severity = String(report.severity || "error").toUpperCase();
	const code = String(report.code || "NECORE4000");
	const lines = ["[nextjs-engine][" + severity + " " + code + "] " + String(report.message || "An unknown error occurred.")];
	if (report.source) lines.push("  Source: " + report.source);
	if (report.location) lines.push("  Where: " + report.location);
	if (report.route) lines.push("  Route: " + report.route);
	if (report.requestMethod || report.requestPath) lines.push("  Request: " + [report.requestMethod, report.requestPath].filter(Boolean).join(" "));
	if (report.digest) lines.push("  Digest: " + report.digest);
	if (report.reason) lines.push("  Reason: " + report.reason);
	if (report.action) lines.push("  Action: " + report.action);
	if (report.detail) lines.push(report.detail);
	lines.push("  Help: " + resolveEngineErrorHelpUrl(code));
	lines.push("  Project: https://kastrick.vercel.app/project/nextjs-engine");
	return lines.join("\n");
}

function reportEngineError(error, context = {}) {
	const report = createEngineErrorReport(error, context);
	try {
		const logger = report.severity === "warning" ? console.warn : console.error;
		logger.call(console, formatClientErrorReport(report));
	} catch {
		// Client-side diagnostics must never replace the original failure.
	}
	if (isBrowser() && typeof CustomEvent !== "undefined") {
		try {
			window.dispatchEvent(new CustomEvent("engine:error", { detail: report }));
		} catch {
			// Event listeners are optional.
		}
	}
	return report;
}

module.exports = {
	createEngineErrorReport,
	formatClientErrorReport,
	reportEngineError,
	resolveEngineErrorHelpUrl,
};
