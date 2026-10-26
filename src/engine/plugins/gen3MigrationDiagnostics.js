"use strict";

const fs = require("node:fs");
const path = require("node:path");

const STATE_KEY = Symbol.for("nextjs-engine.gen3-migration-diagnostics");
const SOURCE_EXTENSIONS = /\.(?:cjs|mjs|js|jsx|ts|tsx)$/i;
const SOURCE_ROOTS = [
	"app",
	"src/app",
	"pages",
	"src/pages",
	"components",
	"src/components",
	"lib",
	"src/lib",
];
const SKIPPED_DIRECTORIES = new Set([
	".git",
	".next",
	"dist",
	"node_modules",
	".nextjs-engine",
	"coverage",
]);

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

function isDevelopmentProcess() {
	return process.env.NEXT_PHASE === "phase-development-server"
		|| (process.env.NODE_ENV === "development" && process.env.NEXT_PHASE !== "phase-production-build")
		|| process.argv.slice(2).some((arg) => arg === "dev");
}

function getState() {
	if (!globalThis[STATE_KEY]) globalThis[STATE_KEY] = { reported: new Set() };
	return globalThis[STATE_KEY];
}

function packageVersion(rootDir, providedVersion) {
	if (providedVersion) return String(providedVersion);
	try {
		const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
		return typeof manifest.version === "string" && manifest.version ? manifest.version : "3.x-alpha";
	} catch {
		return "3.x-alpha";
	}
}

/** Replace comments with whitespace while preserving line numbers and string literals. */
function maskComments(source) {
	return source.replace(
		/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\x60(?:\\[\s\S]|[^\x60\\])*\x60)|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g,
		(match, literal) => literal !== undefined ? literal : match.replace(/[^\r\n]/g, " "),
	);
}

function walkSourceFiles(rootDir) {
	const files = [];
	for (const relativeRoot of SOURCE_ROOTS) {
		const absoluteRoot = path.resolve(rootDir, relativeRoot);
		const relativeToRoot = path.relative(rootDir, absoluteRoot);
		if (!relativeToRoot || relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) continue;
		try {
			if (!fs.statSync(absoluteRoot).isDirectory()) continue;
		} catch {
			continue;
		}

		const pending = [absoluteRoot];
		while (pending.length && files.length < 500) {
			const current = pending.pop();
			let entries;
			try {
				entries = fs.readdirSync(current, { withFileTypes: true });
			} catch {
				continue;
			}
			for (const entry of entries) {
				const absolute = path.join(current, entry.name);
				if (entry.isDirectory()) {
					if (!SKIPPED_DIRECTORIES.has(entry.name)) pending.push(absolute);
					continue;
				}
				if (!entry.isFile() || !SOURCE_EXTENSIONS.test(entry.name)) continue;
				try {
					if (fs.statSync(absolute).size > 1024 * 1024) continue;
					files.push(absolute);
					if (files.length >= 500) break;
				} catch {
					// A source file can disappear while dev startup is scanning.
				}
			}
			if (files.length >= 500) break;
		}
		if (files.length >= 500) break;
	}
	return [...new Set(files)];
}

function findLegacyEngineAPI(rootDir) {
	const configDir = path.join(rootDir, ".EngineAPIConfig");
	const legacyOutput = path.join(rootDir, ".engine-api-compiled.json");
	let apiSourceFiles = [];
	try {
		apiSourceFiles = fs.readdirSync(configDir, { withFileTypes: true })
			.filter((entry) => entry.isFile() && entry.name.endsWith(".api"))
			.map((entry) => path.posix.join(".EngineAPIConfig", entry.name))
			.sort();
	} catch {
		// No legacy provider source directory; a stale output may still exist.
	}
	let hasLegacyOutput = false;
	try {
		hasLegacyOutput = fs.statSync(legacyOutput).isFile();
	} catch {
		// No stale root-level compiled output.
	}
	if (apiSourceFiles.length === 0 && !hasLegacyOutput) return null;
	return { apiSourceFiles, hasLegacyOutput };
}

function emitOnce(rootDir, diagnostic, output) {
	const state = getState();
	const key = [
		path.resolve(rootDir),
		diagnostic.code,
		diagnostic.file || "",
		diagnostic.line || "",
	].join("|");
	if (state.reported.has(key)) return;
	state.reported.add(key);
	output(diagnostic);
}

function reportDiagnostic(rootDir, diagnostic) {
	const location = diagnostic.file
		? diagnostic.file + (diagnostic.line ? ":" + diagnostic.line : "")
		: "";
	const heading = "[nextjs-engine][migration][" + diagnostic.code + "] "
		+ diagnostic.severity.toUpperCase()
		+ (location ? " " + location : "");
	const output = diagnostic.severity === "error" ? console.error : console.warn;
	output(
		heading + "\n  " + diagnostic.message
		+ "\n  Suggested action: " + diagnostic.recommendation,
	);
}

function runGen3MigrationDiagnostics(options = {}) {
	const rootDir = path.resolve(options.rootDir || process.cwd());
	const development = options.development === undefined ? isDevelopmentProcess() : options.development;
	if (!development) return [];

	const version = packageVersion(rootDir, options.version);
	const diagnostics = [];
	if (options.reportEngineApiMigration !== false) {
		const legacyAPI = findLegacyEngineAPI(rootDir);
		if (legacyAPI) {
			const sourceDescription = legacyAPI.apiSourceFiles.length
				? "Legacy input: " + legacyAPI.apiSourceFiles.join(", ") + " (kept in place)."
				: "A legacy compiled EngineAPI artifact was found.";
			const staleOutputDescription = legacyAPI.hasLegacyOutput
				? " The stale root-level .engine-api-compiled.json artifact is retired by the combined Gen 3 plugin."
				: "";
			const diagnostic = {
				code: "W3M001",
				severity: "warn",
				message: "EngineAPI configuration migration detected for nextjs-engine@" + version + ". "
					+ sourceDescription
					+ " Generation 3 compiles provider config to .nextjs-engine/config/.apiconfig.json; "
					+ ".api source files are not physically moved."
					+ staleOutputDescription,
				recommendation: "Keep editing .EngineAPIConfig/*.api as the source of truth and read the compiled output from .nextjs-engine/config/.apiconfig.json.",
			};
			diagnostics.push(diagnostic);
			emitOnce(rootDir, diagnostic, () => reportDiagnostic(rootDir, diagnostic));
		}
	}

	for (const absoluteFile of walkSourceFiles(rootDir)) {
		let source;
		try {
			source = maskComments(fs.readFileSync(absoluteFile, "utf8"));
		} catch {
			continue;
		}
		const relativeFile = path.relative(rootDir, absoluteFile).split(path.sep).join("/");
		for (const rule of RULES) {
			const match = rule.pattern.exec(source);
			if (!match) continue;
			const line = source.slice(0, match.index).split(/\r?\n/).length;
			const diagnostic = {
				code: rule.code,
				severity: rule.severity,
				file: relativeFile,
				line,
				message: rule.message,
				recommendation: rule.recommendation,
			};
			diagnostics.push(diagnostic);
			emitOnce(rootDir, diagnostic, () => reportDiagnostic(rootDir, diagnostic));
		}
	}
	return diagnostics;
}

module.exports = {
	runGen3MigrationDiagnostics,
	findLegacyEngineAPI,
	maskComments,
	walkSourceFiles,
	RULES,
};
