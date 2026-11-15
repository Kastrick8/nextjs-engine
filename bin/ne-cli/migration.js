"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { readRegularFileNoFollow } = require("./file-system");

const ROOTS = ["app", "src/app", "pages", "src/pages", "components", "src/components", "lib", "src/lib"];
const SKIP = new Set([".git", ".next", "dist", "node_modules", ".nextjs-engine", "coverage"]);
const MAX_FILE_BYTES = 1024 * 1024;
const RULES = [
	{
		code: "E3M001",
		severity: "error",
		pattern: /\bRawComponentRenderer\b/,
		message: "RawComponentRenderer is not a supported Generation 3 public API.",
		recommendation: "Replace it with a registered React component via createComponent()/registerComponent(), or render normal JSX inside your own React component.",
	},
	{
		code: "E3M002",
		severity: "error",
		pattern: /(?:\btype\b|"type"|'type')\s*:\s*(["'])raw\1/,
		message: 'Schema nodes with type: "raw" are not supported by Generation 3.',
		recommendation: "Replace the raw schema node with a registered component node. Do not pass executable component code through schema data.",
	},
];

function maskComments(source) {
	return source.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\x60(?:\\[\s\S]|[^\x60\\])*\x60)|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g,
		(match, literal) => literal !== undefined ? literal : match.replace(/[^\r\n]/g, " "));
}

function maskStrings(source) {
	return source.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\x60(?:\\[\s\S]|[^\x60\\])*\x60)/g,
		(match) => match.replace(/[^\r\n]/g, " "));
}

function walkSourceFiles(root, maxFiles = 500) {
	const files = [];
	for (const relative of ROOTS) {
		const directory = path.resolve(root, relative);
		const relativeToRoot = path.relative(root, directory);
		if (!relativeToRoot || relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) continue;
		// Let readdirSync be the single path operation instead of checking and
		// reopening the same directory through separate filesystem calls.
		const pending = [directory];
		while (pending.length && files.length < maxFiles) {
			const current = pending.pop();
			let entries;
			try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { continue; }
			for (const entry of entries) {
				const file = path.join(current, entry.name);
				if (entry.isDirectory()) {
					if (!SKIP.has(entry.name)) pending.push(file);
					continue;
				}
				if (!entry.isFile() || !/\.(?:cjs|mjs|js|jsx|ts|tsx)$/i.test(entry.name)) continue;
				files.push(file);
				if (files.length >= maxFiles) break;
			}
		}
	}
	return [...new Set(files)];
}

function findCreatePageCalls(source) {
	const calls = [];
	const marker = /\bcreatePage\s*\(/g;
	let match;
	while ((match = marker.exec(source)) !== null) {
		const open = source.indexOf("(", match.index);
		let depth = 1, quote = "", escaped = false;
		for (let index = open + 1; index < source.length; index += 1) {
			const character = source[index];
			if (quote) {
				if (escaped) escaped = false;
				else if (character === "\\") escaped = true;
				else if (character === quote) quote = "";
				continue;
			}
			if (character === "'" || character === '"' || character === "\x60") { quote = character; continue; }
			if (character === "(") depth += 1;
			else if (character === ")" && --depth === 0) {
				calls.push({ start: match.index, body: source.slice(open + 1, index) });
				marker.lastIndex = index + 1;
				break;
			}
		}
	}
	return calls;
}

function findLegacyEngineApi(root) {
	const directory = path.join(root, ".EngineAPIConfig");
	const oldOutput = path.join(root, ".engine-api-compiled.json");
	let sources = [];
	try {
		sources = fs.readdirSync(directory, { withFileTypes: true })
			.filter((entry) => entry.isFile() && entry.name.endsWith(".api"))
			.map((entry) => path.posix.join(".EngineAPIConfig", entry.name))
			.sort();
	} catch {}
	let hasOldOutput = false;
	try { hasOldOutput = fs.statSync(oldOutput).isFile(); } catch {}
	return sources.length || hasOldOutput ? { sources, hasOldOutput } : null;
}

function scanGen3Migration(root, options) {
	const settings = options || {};
	const diagnostics = [];
	const add = (item) => diagnostics.push(item);
	const legacy = findLegacyEngineApi(root);
	if (legacy && settings.reportEngineApiMigration !== false) {
		add({
			code: "W3M001",
			severity: "warning",
			file: ".EngineAPIConfig",
			line: null,
			message: "Legacy EngineAPI structure detected. Generation 3 compiles provider config to .nextjs-engine/config/.apiconfig.json. Existing .api source files are preserved in place.",
			recommendation: "Keep editing .EngineAPIConfig/*.api as source files; use .nextjs-engine/config/.apiconfig.json as the generated Gen 3 config.",
		});
	}
	for (const file of walkSourceFiles(root, settings.maxFiles || 500)) {
		let raw;
		try { raw = readRegularFileNoFollow(file, { maxBytes: MAX_FILE_BYTES }).content.toString("utf8"); } catch { continue; }
		const source = maskComments(raw);
		const code = maskStrings(source);
		const relative = path.relative(root, file).split(path.sep).join("/");
		for (const rule of RULES) {
			const scan = rule.code === "E3M001" ? code : source;
			const match = rule.pattern.exec(scan);
			if (match) {
				add({
					code: rule.code,
					severity: rule.severity,
					file: relative,
					line: scan.slice(0, match.index).split(/\r?\n/).length,
					message: rule.message,
					recommendation: rule.recommendation,
				});
			}
		}
		for (const call of findCreatePageCalls(source)) {
			const body = maskStrings(call.body);
			const line = source.slice(0, call.start).split(/\r?\n/).length;
			if (/\bcompiler\s*:\s*\{[^}]*\bserverFirst\s*:\s*false\b/.test(body)) {
				add({
					code: "W3M002",
					severity: "warning",
					file: relative,
					line,
					message: "createPage() explicitly enables the Generation 2 client-renderer compatibility path with compiler.serverFirst: false.",
					recommendation: "Remove this override when the page no longer depends on the legacy renderer. Keep it only as a deliberate migration escape hatch.",
				});
			}
			if (/\bhandlers\s*:/.test(body)) {
				add({
					code: "W3M003",
					severity: "warning",
					file: relative,
					line,
					message: "Named handlers in createPage() select the Generation 3 provider compatibility path instead of the normal server-first execution path.",
					recommendation: "Keep named handlers while needed; for a fully server-first page, prefer direct React components/slots or another supported interaction boundary.",
				});
			}
		}
	}
	return diagnostics;
}

function formatMigrationDiagnostics(diagnostics) {
	const lines = ["GEN 2 → GEN 3 MIGRATION ANALYSIS", ""];
	const items = Array.isArray(diagnostics) ? diagnostics : [];
	if (!items.length) {
		lines.push("No known migration findings were detected in the scanned project files.");
		return lines.join("\n");
	}
	for (const item of items) {
		const location = item.file ? item.file + (item.line ? ":" + item.line : "") : "project";
		lines.push("[" + item.code + "] " + String(item.severity || "info").toUpperCase() + " " + location);
		lines.push("  " + item.message);
		lines.push("  Suggested action: " + item.recommendation);
		lines.push("");
	}
	const errors = items.filter((item) => item.severity === "error").length;
	const warnings = items.filter((item) => item.severity === "warning").length;
	lines.push(items.length + " finding(s): " + errors + " blocking migration issue(s), " + warnings + " warning(s).");
	lines.push("This is a bounded static scan, not a guarantee of full Gen 3 compatibility.");
	return lines.join("\n");
}

module.exports = {
	ROOTS,
	SKIP,
	RULES,
	maskComments,
	maskStrings,
	walkSourceFiles,
	findCreatePageCalls,
	findLegacyEngineApi,
	scanGen3Migration,
	formatMigrationDiagnostics,
};
