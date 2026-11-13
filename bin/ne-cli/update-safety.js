"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { compareVersions, parseVersion } = require("./channels");
const { readRegularFileNoFollow } = require("./file-system");

const SOURCE_ROOTS = ["app", "src/app", "pages", "src/pages", "components", "src/components", "lib", "src/lib"];
const SKIP_DIRS = new Set([".git", ".next", "dist", "node_modules", ".nextjs-engine", "coverage", ".turbo"]);
const MAX_FILES = 500;
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_FINDINGS = 25;

function generationFromBranch(branch) {
	if (branch === "main-2") return 2;
	if (branch === "main-3") return 3;
	return null;
}

function generationFromVersion(version) {
	const parsed = parseVersion(version);
	if (!parsed || (parsed.major !== 2 && parsed.major !== 3)) return null;
	return parsed.major;
}

function generationFromManifest(manifest, version) {
	if (manifest && typeof manifest === "object") {
		for (const key of ["engineGeneration", "nextjsEngineGeneration", "generation"]) {
			const value = Number(manifest[key]);
			if (value === 2 || value === 3) return value;
		}
		const branchGeneration = generationFromBranch(manifest.sourceBranch || manifest.engineSourceBranch);
		if (branchGeneration) return branchGeneration;
	}
	return generationFromVersion(version || (manifest && manifest.version));
}

function generationForRelease(release) {
	if (!release || typeof release !== "object") return null;
	return generationFromBranch(release.sourceBranch)
		|| generationFromManifest(release, release.version);
}

function readJson(file) {
	try {
		const opened = readRegularFileNoFollow(file, { maxBytes: MAX_FILE_BYTES });
		return JSON.parse(opened.content.toString("utf8"));
	} catch {
		return null;
	}
}

function readInstalled(root) {
	const manifest = readJson(path.join(root, "node_modules", "@kastrick", "nextjs-engine", "package.json"));
	const state = readJson(path.join(root, ".nextjs-engine", "config", "ne.config.json"));
	if (manifest && manifest.name === "@kastrick/nextjs-engine") {
		const stateMatchesInstalledVersion = Boolean(state && state.installedVersion === manifest.version);
		return {
			...manifest,
			engineGeneration: manifest.engineGeneration || (stateMatchesInstalledVersion && state.engineGeneration),
			sourceBranch: manifest.sourceBranch || (stateMatchesInstalledVersion && state.sourceBranch)
		};
	}
	if (state && typeof state.installedVersion === "string") {
		return { version: state.installedVersion, engineGeneration: state.engineGeneration, sourceBranch: state.sourceBranch };
	}
	return null;
}

function maskComments(source) {
	return source.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\x60(?:\\[\s\S]|[^\x60\\])*\x60)|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g,
		(match, literal) => literal !== undefined ? literal : match.replace(/[^\r\n]/g, " "));
}

function maskStrings(source) {
	return source.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\x60(?:\\[\s\S]|[^\x60\\])*\x60)/g,
		(match) => match.replace(/[^\r\n]/g, " "));
}

function maskStringsKeepingSchemaKeys(source) {
	return source.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\x60(?:\\[\s\S]|[^\x60\\])*\x60)/g,
		(match) => match === '"type"' || match === "'type'"
			? match
			: match.replace(/[^\r\n]/g, " "));
}

function findCreatePageCalls(source) {
	const calls = [];
	const marker = /\bcreatePage\s*\(/g;
	let match;
	while ((match = marker.exec(source)) !== null) {
		const open = source.indexOf("(", match.index);
		let depth = 1;
		let quote = "";
		let escaped = false;
		for (let index = open + 1; index < source.length; index += 1) {
			const character = source[index];
			if (quote) {
				if (escaped) escaped = false;
				else if (character === "\\") escaped = true;
				else if (character === quote) quote = "";
				continue;
			}
			if (character === "'" || character === '"' || character === "\x60") {
				quote = character;
				continue;
			}
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

function sourceFiles(root) {
	const found = [];
	for (const relative of SOURCE_ROOTS) {
		const directory = path.resolve(root, relative);
		const rel = path.relative(root, directory);
		if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) continue;
		let directoryStats;
		try { directoryStats = fs.lstatSync(directory); } catch { continue; }
		if (!directoryStats.isDirectory() || directoryStats.isSymbolicLink()) continue;
		const pending = [directory];
		while (pending.length && found.length < MAX_FILES) {
			const current = pending.pop();
			let entries;
			try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { continue; }
			for (const entry of entries) {
				const file = path.join(current, entry.name);
				if (entry.isDirectory()) {
					if (!SKIP_DIRS.has(entry.name)) pending.push(file);
					continue;
				}
				if (!entry.isFile() || !/\.(?:cjs|mjs|js|jsx|ts|tsx)$/i.test(entry.name)) continue;
				found.push(file);
				if (found.length >= MAX_FILES) break;
			}
		}
	}
	return [...new Set(found)].slice(0, MAX_FILES);
}

function addFinding(collection, finding) {
	if (collection.length >= MAX_FINDINGS) return;
	if (collection.some((item) => item.code === finding.code && item.file === finding.file && item.line === finding.line)) return;
	collection.push(finding);
}

function isRegularFileNoFollow(file) {
	try {
		const stats = fs.lstatSync(file);
		return stats.isFile() && !stats.isSymbolicLink();
	} catch {
		return false;
	}
}

function inspectSources(root, targetGeneration) {
	const blockers = [];
	const warnings = [];
	const files = sourceFiles(root);
	for (const file of files) {
		let raw;
		try {
			raw = readRegularFileNoFollow(file, { maxBytes: MAX_FILE_BYTES }).content.toString("utf8");
		} catch { continue; }
		const source = maskComments(raw);
		const code = maskStrings(source);
		const relative = path.relative(root, file).split(path.sep).join("/");
		const lineFor = (match) => source.slice(0, match.index).split(/\r?\n/).length;

		if (targetGeneration === 3) {
			const rawRenderer = /\bRawComponentRenderer\b/.exec(code);
			if (rawRenderer) addFinding(blockers, {
				code: "E3M001", file: relative, line: lineFor(rawRenderer),
				message: "RawComponentRenderer is not a supported Generation 3 public API.",
				recommendation: "Replace it with a registered React component via createComponent()/registerComponent(), or render normal JSX inside your own React component."
			});
			const schemaCode = maskStringsKeepingSchemaKeys(source);
			for (const rawSchemaKey of schemaCode.matchAll(/(?:\btype\b|"type"|'type')\s*:/g)) {
				const rawSchemaValue = /^\s*(["'])raw\1/.exec(
					source.slice(rawSchemaKey.index + rawSchemaKey[0].length)
				);
				if (rawSchemaValue) addFinding(blockers, {
					code: "E3M002",
					file: relative,
					line: lineFor(rawSchemaKey),
					message: 'Schema nodes with type: "raw" are not supported by Generation 3.',
					recommendation: "Replace the raw schema node with a registered component node. Do not pass executable component code through schema data."
				});
			}
			for (const call of findCreatePageCalls(code)) {
				const callCode = maskStrings(call.body);
				const callLine = source.slice(0, call.start).split(/\r?\n/).length;
				if (/\bcompiler\s*:\s*\{[^}]*\bserverFirst\s*:\s*false\b/.test(callCode)) addFinding(warnings, {
					code: "W3M002", file: relative, line: callLine,
					message: "createPage() explicitly enables the Generation 2 client-renderer compatibility path with compiler.serverFirst: false.",
					recommendation: "Remove this override when the page no longer depends on the legacy renderer. Keep it only as a deliberate migration escape hatch."
				});
				if (/\bhandlers\s*:/.test(callCode)) addFinding(warnings, {
					code: "W3M003", file: relative, line: callLine,
					message: "Named handlers in createPage() select the Generation 3 provider compatibility path instead of the normal server-first execution path.",
					recommendation: "Keep named handlers while needed; for a fully server-first page, prefer direct React components/slots or another supported interaction boundary and follow the Gen 3 migration guide."
				});
			}
		} else if (targetGeneration === 2) {
			const gen3Api = /\b(?:createPage|createTheme|EngineTheme)\b/.exec(code);
			if (gen3Api) addFinding(warnings, {
				code: "W2M001", file: relative, line: lineFor(gen3Api),
				message: "A Generation 3-oriented API reference was detected while selecting a Generation 2 package.",
				recommendation: "Review this source against the Generation 2 API before switching generations."
			});
		}
	}
	if (targetGeneration === 3) {
		const legacyDirectory = path.join(root, ".EngineAPIConfig");
		let legacyInputs = false;
		try {
			const stats = fs.lstatSync(legacyDirectory);
			if (stats.isDirectory() && !stats.isSymbolicLink()) {
				legacyInputs = fs.readdirSync(legacyDirectory, { withFileTypes: true })
					.some((entry) => entry.isFile() && entry.name.endsWith(".api"));
			}
		} catch {}
		const legacyOutput = isRegularFileNoFollow(path.join(root, ".engine-api-compiled.json"));
		if (legacyInputs || legacyOutput) addFinding(warnings, {
			code: "W3M001", file: legacyInputs ? ".EngineAPIConfig" : ".engine-api-compiled.json", line: 1,
			message: "Legacy EngineAPI configuration artifacts were detected.",
			recommendation: "Keep .api files as source inputs and review the Generation 3 .nextjs-engine/config/.apiconfig.json output location."
		});
	}
	return { blockers, warnings, scannedFiles: files.length };
}

function inspectUpdateSafety(root, release) {
	if (!release || typeof release.version !== "string") throw new Error("A versioned NE release is required for the update preflight.");
	const installed = readInstalled(root);
	const currentVersion = installed && installed.version || null;
	const targetVersion = release.version;
	const currentGeneration = installed ? generationFromManifest(installed, currentVersion) : null;
	const targetGeneration = generationForRelease(release);
	const isDowngrade = Boolean(currentVersion && parseVersion(currentVersion) && parseVersion(targetVersion)
		&& compareVersions(currentVersion, targetVersion) > 0);
	const generationChange = Boolean(currentGeneration && targetGeneration && currentGeneration !== targetGeneration);
	const findings = inspectSources(root, targetGeneration);
	const blockers = findings.blockers.slice();
	const warnings = findings.warnings.slice();
	if (currentVersion && !currentGeneration && targetGeneration) blockers.unshift({
		code: "ENE002", file: "", line: 0,
		message: "The installed Engine generation could not be determined from its manifest or version.",
		recommendation: "Confirm the installed package generation before attempting a generation-sensitive update."
	});
	if (!targetGeneration) blockers.unshift({
		code: "ENE001", file: "", line: 0,
		message: "The selected release does not identify a supported Engine generation.",
		recommendation: "Install only releases with verified main-2/main-3 source metadata or a recognized 2.x/3.x version."
	});
	return {
		currentVersion,
		targetVersion,
		currentGeneration,
		targetGeneration,
		isDowngrade,
		generationChange,
		scannedFiles: findings.scannedFiles,
		blockers,
		warnings,
		requiresAcknowledgement: Boolean(isDowngrade || generationChange || blockers.length || warnings.length)
	};
}

function formatUpdateSafety(report) {
	const lines = [
		"[NE] Update safety preflight",
		"  Installed: " + (report.currentVersion || "not detected") + (report.currentGeneration ? " (Gen " + report.currentGeneration + ")" : ""),
		"  Target:    " + report.targetVersion + (report.targetGeneration ? " (Gen " + report.targetGeneration + ")" : " (generation unknown)"),
		"  Project source files scanned: " + report.scannedFiles,
	];
	if (report.isDowngrade) lines.push("  DOWNGRADE: " + report.currentVersion + " → " + report.targetVersion);
	if (report.generationChange) lines.push("  GENERATION CHANGE: Gen " + report.currentGeneration + " → Gen " + report.targetGeneration);
	for (const finding of report.blockers) {
		lines.push("  BLOCKED " + finding.code + (finding.file ? " " + finding.file + ":" + finding.line : "") + " — " + finding.message);
		lines.push("    " + finding.recommendation);
	}
	for (const finding of report.warnings) {
		lines.push("  WARNING " + finding.code + (finding.file ? " " + finding.file + ":" + finding.line : "") + " — " + finding.message);
		lines.push("    " + finding.recommendation);
	}
	if (!report.blockers.length && !report.warnings.length && !report.isDowngrade && !report.generationChange) {
		lines.push("  No known migration blockers or downgrade/generation changes were detected.");
	}
	return lines.join("\n");
}

async function confirmUpdateSafety(report, options) {
	const settings = options || {};
	if (report.blockers.length) {
		throw new Error(formatUpdateSafety(report) + "\n\nInstallation blocked. Resolve the reported compatibility errors before installing this generation.");
	}
	if (!report.requiresAcknowledgement || settings.safetyAcknowledged) return report;

	const required = [];
	if (report.isDowngrade && !settings.allowDowngrade) required.push("--allow-downgrade");
	if (report.generationChange && !settings.allowGenerationChange) required.push("--allow-generation-change");
	if (report.warnings.length && !settings.acknowledgeCompatibility) required.push("--acknowledge-compatibility");
	if (settings.yes) {
		if (required.length) {
			throw new Error(formatUpdateSafety(report) + "\n\nNon-interactive safety acknowledgement is incomplete. Add: " + required.join(" "));
		}
		return report;
	}
	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		throw new Error(formatUpdateSafety(report) + "\n\nThis update needs an interactive acknowledgement. In automation, pass --yes plus the required safety flags: " + (required.join(" ") || "--acknowledge-compatibility"));
	}

	process.stderr.write(formatUpdateSafety(report) + "\n");
	const readline = require("node:readline/promises");
	const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
	try {
		const answer = await prompt.question("Proceed with this risky update? [y/N] ");
		if (!/^y(es)?$/i.test(answer.trim())) throw new Error("Installation cancelled after the NE update safety review.");
	} finally {
		prompt.close();
	}
	return report;
}

module.exports = {
	generationFromBranch,
	generationFromVersion,
	generationFromManifest,
	generationForRelease,
	readInstalled,
	inspectUpdateSafety,
	formatUpdateSafety,
	confirmUpdateSafety
};
