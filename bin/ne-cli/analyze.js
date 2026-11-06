"use strict";

const fs = require("node:fs");
const path = require("node:path");

function packageManagerAudit(root, manager, fix) {
	const pkg = readJson(path.join(root, "package.json"));
	const declared = pkg.packageManager || "";
	const yarnBerry = /^yarn@(?:[2-9]|\d{2,})\./.test(declared) || fs.existsSync(path.join(root, ".yarnrc.yml"));
	if (manager === "npm") return ["audit", ...(fix ? ["fix"] : [])];
	if (manager === "pnpm") return ["audit", ...(fix ? ["--fix"] : []), "--audit-level", "low"];
	if (manager === "bun") return ["audit", ...(fix ? ["fix"] : [])];
	if (manager === "yarn") {
		if (fix) return null;
		return yarnBerry ? ["npm", "audit", "--all", "--recursive"] : ["audit"];
	}
	return null;
}

function readJson(file) {
	try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return {}; }
}

function formatCommand(manager, args) {
	return manager + " " + args.join(" ");
}

async function runDependencyAudit(project, root, options) {
	const settings = options || {};
	const manager = project.detectPackageManager(root);
	const fix = settings.fix !== false;
	const args = packageManagerAudit(root, manager, fix);
	const selectedArgs = args || packageManagerAudit(root, manager, false);
	if (!selectedArgs) {
		return { manager, fixed: false, skipped: true, message: "No native dependency audit command is available for package manager: " + manager };
	}
	const canFix = fix && args !== null;
	const command = formatCommand(manager, selectedArgs);
	process.stdout.write("[NE ANALYZE] " + (canFix ? "Applying package-manager security fixes: " : "Auditing dependencies: ") + command + "\n");
	let result;
	try {
		result = await project.runProcess(manager, selectedArgs, {
			cwd: root,
			captureOutput: true,
			quietNpmNotices: true,
			maxOutputBytes: 1024 * 1024,
		});
	} catch (error) {
		const output = typeof error.output === "string" ? error.output : "";
		if (output) process.stdout.write(output.replace(/\s+$/, "") + "\n");
		return {
			manager,
			fixed: false,
			failed: true,
			exitCode: Number.isInteger(error.code) ? error.code : 1,
			output,
			message: error.message,
		};
	}
	const output = [result && result.stdout, result && result.stderr].filter(Boolean).join("\n");
	if (output) process.stdout.write(output.replace(/\s+$/, "") + "\n");
	return {
		manager,
		fixed: canFix,
		failed: false,
		exitCode: 0,
		output,
		message: manager === "yarn" && fix
			? "Yarn's native audit command is report-only. NE did not install a third-party fixer or edit your dependency declarations; use the package-specific yarn up commands shown by your audit results."
			: undefined,
	};
}

async function runOutdatedCheck(project, root) {
	const manager = project.detectPackageManager(root);
	const args = manager === "npm" ? ["outdated", "--long"]
		: manager === "pnpm" ? ["outdated"]
		: manager === "yarn" ? ["outdated"]
		: manager === "bun" ? ["outdated"]
		: null;
	if (!args) return { skipped: true, message: "Unsupported package manager." };
	process.stdout.write("[NE ANALYZE] Checking outdated direct dependencies (" + formatCommand(manager, args) + ")...\n");
	try {
		const result = await project.runProcess(manager, args, {
			cwd: root, captureOutput: true, quietNpmNotices: true, maxOutputBytes: 512 * 1024,
		});
		const output = [result && result.stdout, result && result.stderr].filter(Boolean).join("\n");
		if (output) process.stdout.write(output.replace(/\s+$/, "") + "\n");
		return { failed: false, output };
	} catch (error) {
		const output = typeof error.output === "string" ? error.output : "";
		if (output) process.stdout.write(output.replace(/\s+$/, "") + "\n");
		return { outdated: true, output, message: error.message };
	}
}

function parseJsonConfigDiagnostics(root) {
	const candidates = [
		"package.json",
		"tsconfig.json",
		".nextjs-engine/config/ne.config.json",
		".nextjs-engine/config/.apiconfig.json",
	];
	const findings = [];
	for (const relative of candidates) {
		const file = path.join(root, relative);
		if (!fs.existsSync(file)) continue;
		try {
			JSON.parse(fs.readFileSync(file, "utf8"));
		} catch (error) {
			const match = String(error.message || "").match(/position\s+(\d+)/i);
			let line = null, column = null;
			if (match) {
				const source = fs.readFileSync(file, "utf8");
				const before = source.slice(0, Number(match[1]));
				line = before.split(/\r?\n/).length;
				column = Number(match[1]) - before.lastIndexOf("\n");
			}
			findings.push({
				file: relative,
				line,
				column,
				code: "NEA1001",
				severity: "error",
				message: error.message,
				recommendation: "Fix the JSON syntax in this configuration file. NE does not rewrite user-owned project configuration.",
			});
		}
	}
	return findings;
}

function generationForAnalysis(root) {
	const pkg = readJson(path.join(root, "node_modules", "@kastrick", "nextjs-engine", "package.json"));
	const version = pkg && pkg.version || "";
	const major = Number(String(version).split(".")[0]);
	if (major === 2) return 2;
	if (major === 3) return 3;
	const project = readJson(path.join(root, "package.json"));
	return project.name === "nextjs-engine" && Number(String(project.version || "").split(".")[0]) === 2 ? 2 : null;
}

function scanJavaScriptSyntax(root, options) {
	const settings = options || {};
	const roots = ["app", "src/app", "pages", "src/pages", "components", "src/components", "lib", "src/lib"];
	const skipped = new Set([".git", ".next", "dist", "node_modules", ".nextjs-engine", "coverage"]);
	const files = [];
	const maxFiles = Number.isInteger(settings.maxFiles) ? Math.max(1, Math.min(settings.maxFiles, 1000)) : 500;

	for (const relative of roots) {
		const directory = path.resolve(root, relative);
		const inside = path.relative(root, directory);
		if (!inside || inside.startsWith("..") || path.isAbsolute(inside)) continue;
		let stat;
		try { stat = fs.statSync(directory); } catch { continue; }
		if (!stat.isDirectory()) continue;
		const pending = [directory];
		while (pending.length && files.length < maxFiles) {
			const current = pending.pop();
			let entries;
			try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { continue; }
			for (const entry of entries) {
				const file = path.join(current, entry.name);
				if (entry.isDirectory()) {
					if (!skipped.has(entry.name)) pending.push(file);
					continue;
				}
				if (!entry.isFile() || !/\.(?:js|cjs|mjs)$/i.test(entry.name)) continue;
				try {
					if (fs.statSync(file).size <= 1024 * 1024) files.push(file);
				} catch {}
				if (files.length >= maxFiles) break;
			}
		}
	}

	const { spawnSync } = require("node:child_process");
	const findings = [];
	for (const file of [...new Set(files)]) {
		const result = spawnSync(process.execPath, ["--check", file], {
			cwd: root,
			encoding: "utf8",
			timeout: 5000,
			maxBuffer: 128 * 1024,
			windowsHide: true,
		});
		if (!result.error && result.status === 0) continue;
		const output = [result.stderr, result.stdout, result.error && result.error.message].filter(Boolean).join("\n").trim();
		const location = output.match(/:(\d+)(?::\d+)?(?:\r?\n|:)/);
		findings.push({
			file: path.relative(root, file).split(path.sep).join("/"),
			line: location ? Number(location[1]) : null,
			column: null,
			code: "NEA2001",
			severity: "error",
			message: output || "Node.js could not complete the syntax check.",
			recommendation: "Fix the reported JavaScript syntax in this file. NE reports the error but never rewrites application source code.",
		});
	}
	return findings;
}

async function runAnalyze(project, root, options, plugins) {
	const settings = options || {};
	const pluginHost = plugins || null;
	process.stdout.write("[NE ANALYZE] Inspecting project configuration, dependencies, and available checks.\n");

	await require("./plugins").runHooks(pluginHost, "beforeAnalyze", { root, options: settings });
	const findings = [...parseJsonConfigDiagnostics(root), ...scanJavaScriptSyntax(root)];
	for (const finding of findings) {
		const location = finding.file + (finding.line ? ":" + finding.line + ":" + finding.column : "");
		process.stderr.write("[NE ANALYZE] ERROR " + finding.code + " " + location + "\n  " + finding.message + "\n  " + finding.recommendation + "\n");
	}

	const audit = await runDependencyAudit(project, root, { fix: !settings.checkOnly });
	const outdated = await runOutdatedCheck(project, root);
	const pluginResults = await require("./plugins").runAnalyzeChecks(pluginHost, { root, options: settings, project });
	for (const result of pluginResults) {
		process.stdout.write("[NE ANALYZE] Plugin check " + result.plugin + "/" + result.id + ": " +
			(result.error ? "FAILED · " + result.error : "DONE") + "\n");
	}

	let migrationFindings = [];
	if (generationForAnalysis(root) === 2) {
		migrationFindings = require("./migration").scanGen3Migration(root);
		process.stdout.write("\\n" + require("./migration").formatMigrationDiagnostics(migrationFindings) + "\\n");
	}

	let checksError = null;
	try {
		await project.runCheck(root);
	} catch (error) {
		checksError = error;
		process.stderr.write("[NE ANALYZE] Project checks failed: " + error.message + "\n");
		if (error.output) process.stderr.write(error.output.replace(/\s+$/, "") + "\n");
	}
	await require("./plugins").runHooks(pluginHost, "afterAnalyze", {
		root, options: settings, audit, outdated, findings, pluginResults, checksError,
	});
	const errors = findings.filter((item) => item.severity === "error").length + (audit.failed ? 1 : 0) +
		(pluginResults.filter((item) => item.error).length) + (checksError ? 1 : 0);
	if (audit.failed) process.stdout.write("[NE ANALYZE] Dependency audit reported vulnerabilities or could not complete; review the audit output above.\n");
	if (audit.message) process.stdout.write("[NE ANALYZE] " + audit.message + "\n");
	process.stdout.write("[NE ANALYZE] " + (errors ? "Completed with " + errors + " project error(s)." : "Analysis complete.") + "\n");
	if (errors) throw new Error("ne analyze found project issues. Review the diagnostics above; application source files were not modified.");
	return { findings, audit, outdated, pluginResults, migrationFindings };
}

module.exports = {
	packageManagerAudit,
	runDependencyAudit,
	runOutdatedCheck,
	parseJsonConfigDiagnostics,
	scanJavaScriptSyntax,
	runAnalyze,
};
