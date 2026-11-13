"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { readRegularFileNoFollow } = require("./file-system");

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
	const maxConfigBytes = 1024 * 1024;
	for (const relative of candidates) {
		const file = path.join(root, relative);
		let source;
		try {
			source = readRegularFileNoFollow(file, { maxBytes: maxConfigBytes }).content.toString("utf8");
		} catch (error) {
			if (error && error.code === "ENOENT") continue;
			findings.push({
				file: relative,
				line: null,
				column: null,
				code: "NEA1002",
				severity: "error",
				message: "Could not safely read this configuration file: " + error.message,
				recommendation: "Ensure the configuration is a regular, readable file no larger than 1 MiB. NE does not follow symlinks or rewrite user-owned project configuration.",
			});
			continue;
		}
		try {
			JSON.parse(source);
		} catch (error) {
			const match = String(error.message || "").match(/position\s+(\d+)/i);
			let line = null, column = null;
			if (match) {
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

function pluginCheckStatus(item) {
	if (item && item.error) return { status: "error", message: item.error };
	const result = item && item.result;
	const status = result && ["ok", "warning", "error"].includes(result.status) ? result.status : "ok";
	const message = result && typeof result.message === "string"
		? result.message
		: status === "ok" ? "passed" : "Plugin check returned " + status + ".";
	return { status, message };
}

async function runAnalyze(project, root, options, plugins) {
	const settings = options || {};
	const pluginHost = plugins || null;
	process.stdout.write("[NE ANALYZE] Inspecting project configuration, dependencies, and available checks.\n");

	await require("./plugins").runHooks(pluginHost, "beforeAnalyze", { root, options: settings });
	const findings = parseJsonConfigDiagnostics(root);
	for (const finding of findings) {
		const location = finding.file + (finding.line ? ":" + finding.line + ":" + finding.column : "");
		process.stderr.write("[NE ANALYZE] ERROR " + finding.code + " " + location + "\n  " + finding.message + "\n  " + finding.recommendation + "\n");
	}

	const audit = await runDependencyAudit(project, root, { fix: !settings.checkOnly });
	const outdated = await runOutdatedCheck(project, root);
	const pluginResults = await require("./plugins").runAnalyzeChecks(pluginHost, { root, options: settings, project });
	for (const result of pluginResults) {
		const status = pluginCheckStatus(result);
		process.stdout.write("[NE ANALYZE] Plugin check " + result.plugin + "/" + result.id + ": " +
			status.status.toUpperCase() + " · " + status.message + "\n");
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
		(pluginResults.filter((item) => pluginCheckStatus(item).status === "error").length) + (checksError ? 1 : 0);
	if (audit.failed) process.stdout.write("[NE ANALYZE] Dependency audit reported vulnerabilities or could not complete; review the audit output above.\n");
	if (audit.message) process.stdout.write("[NE ANALYZE] " + audit.message + "\n");
	process.stdout.write("[NE ANALYZE] " + (errors ? "Completed with " + errors + " project error(s)." : "Analysis complete.") + "\n");
	if (errors) throw new Error("ne analyze found project issues. Review the diagnostics above; application source files were not modified.");
	return { findings, audit, outdated, pluginResults, migrationFindings };
}

module.exports = {
	packageManagerAudit,
	pluginCheckStatus,
	runDependencyAudit,
	runOutdatedCheck,
	parseJsonConfigDiagnostics,
	runAnalyze,
};
