"use strict";

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline/promises");
const {
	PACKAGE_NAME,
	parseVersion,
	compareVersions,
	loadChannelCatalog,
	resolveRelease,
	channelLabel,
} = require("./channels");
const {
	runTui,
} = require("./terminal");
const {
	findProjectRoot,
	loadState,
	runNext,
	projectName,
	runClean,
	installRelease,
	rollback,
	runCheck,
	runBuild,
} = require("./project");

function parseArgs(argv) {
	const positional = [];
	const options = {};
	const takesValue = new Set(["channel", "version", "and", "and-terminal"]);
	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];
		if (argument === "-q" || argument === "--quiet") {
			options.quiet = true;
			continue;
		}
		if (argument === "-h" || argument === "--help" || argument === "-help") {
			options.help = true;
			continue;
		}
		if (argument.startsWith("--")) {
			const equal = argument.indexOf("=");
			const name = argument.slice(2, equal === -1 ? undefined : equal);
			const value = equal === -1 ? undefined : argument.slice(equal + 1);
			if (name === "and") {
				const command = value !== undefined ? value : argv[index + 1];
				if (!command || (value === undefined && command.startsWith("-"))) throw new Error("--and requires a command.");
				if (value === undefined) index += 1;
				(options.andCommands ||= []).push(command);
			} else if (name === "and-terminal") {
				const rawHeight = value !== undefined ? value : argv[index + 1];
				if (!rawHeight || (value === undefined && rawHeight.startsWith("-"))) throw new Error("--and-terminal requires a height.");
				if (value === undefined) index += 1;
				const height = Number(rawHeight);
				if (!Number.isInteger(height) || height < 1 || height > 100) throw new Error("and-terminal height must be an integer between 1 and 100.");
				options.andTerminal = height;
			} else if (takesValue.has(name)) {
				if (value !== undefined) options[name] = value;
				else if (argv[index + 1] && !argv[index + 1].startsWith("-")) options[name] = argv[++index];
				else throw new Error("--" + name + " requires a value.");
			} else if (["yes", "check", "json", "dry-run", "force"].includes(name)) {
				options[name === "dry-run" ? "dryRun" : name === "yes" ? "yes" : name] = true;
			} else {
				throw new Error("Unknown option: " + argument + ". Run ne help for commands.");
			}
			continue;
		}
		if (argument === "-and") {
			if (!argv[index + 1]) throw new Error("-and requires a command.");
			(options.andCommands ||= []).push(argv[++index]);
			continue;
		}
		if (argument.startsWith("-and=")) {
			(options.andCommands ||= []).push(argument.slice(5));
			continue;
		}
		if (argument.startsWith("--and=")) {
			(options.andCommands ||= []).push(argument.slice(6));
			continue;
		}
		if (argument.startsWith("--and-terminal=") || argument.startsWith("-and-terminal=")) {
			const value = argument.slice(argument.indexOf("=") + 1);
			const height = Number(value);
			if (!Number.isInteger(height) || height < 1 || height > 100) {
				throw new Error("and-terminal height must be an integer between 1 and 100.");
			}
			options.andTerminal = height;
			continue;
		}
		positional.push(argument);
	}
	return { positional, options };
}

function shouldShowExperimentalWarning() {
	if (!process.stdout.isTTY || process.env.CI === "true" || process.env.NE_NO_WARN === "1") return false;
	const args = process.argv.slice(2);
	return !args.includes("-q") && !args.includes("--quiet");
}

function experimentalWarning() {
	if (!shouldShowExperimentalWarning()) return;
	const ascii = process.env.NE_ASCII === "1" || process.env.TERM === "dumb";
	const top = ascii ? "+--------------------------------------------------------------------------+" : "  ╭──────────────────────────────────────────────────────────────────────────╮";
	const bottom = ascii ? "+--------------------------------------------------------------------------+" : "  ╰──────────────────────────────────────────────────────────────────────────╯";
	const edge = ascii ? "|" : "  │";
	const tail = ascii ? "|" : "│";
	process.stdout.write(top + "\n");
	process.stdout.write((ascii ? "|" : "  │") + " !! WARNING : NE is experimental and may change or be removed in a future !! " + tail + "\n");
	process.stdout.write((ascii ? "|" : "  │") + "    version. Review the selected channel before applying updates.             " + tail + "\n");
	process.stdout.write(bottom + "\n");
}

function getHelp() {
	return [
		"Nextjs Engine (NE) CLI",
		"",
		"  ne                    Open the interactive dashboard",
		"  ne dev                Start the Next.js development server",
		"  ne build              Run NE checks and the production Next.js build",
		"  ne start              Start the production Next.js server",
		"  ne check              Run type-checking and available Engine diagnostics",
		"  ne clean              Safely clean generated build caches",
		"  ne updater            Open the Play Store-style release UI",
		"  ne update             List channel releases from the command line",
		"  ne update --channel alpha",
		"  ne update --channel latest-green",
		"  ne update --version 3.0.0-alpha.2",
		"  ne rollback           Restore the previous dependency and lockfiles",
		"  --and=<command>       Run one executable and its arguments after NE completes",
		"                        Shell operators are rejected; repeat --and for multiple commands",
		"  ne help               Show this help",
		"",
		"Channels:",
		"  stable        The latest published stable npm package",
		"  alpha         The newest verified Alpha artifact from GitHub Releases",
		"  latest-green  The newest version among stable and Beta; never Alpha",
		"",
		"Safety flags:",
		"  --yes         Skip the interactive installation confirmation",
		"  --dry-run     Show a selection without changing the project",
		"  --check       Refresh and list channel availability without installing",
		"  --json        Print the channel catalog as JSON",
		"  -q, --quiet   Suppress the experimental notice banner",
		"",
		"One-shot invocation before a local installation:",
		"  npx --yes --package=@kastrick/nextjs-engine ne updater",
		"",
	].join("\n");
}

function listChannels(catalog, state) {
	const lines = [
		"NE release channels" + (catalog.cached ? " (cached feed)" : ""),
		"",
		"Installed: " + (state.installedVersion || "not recorded"),
		"Channel:   " + (state.activeChannel || "not selected"),
		"",
	];
	for (const release of catalog.releases) {
		const active = release.version === state.installedVersion ? "  [installed]" : "";
		const sources = Array.isArray(release.sourceLabels) && release.sourceLabels.length
			? release.sourceLabels.join(" + ")
			: release.sourceLabel || release.source || "unknown";
		const installability = release.installable === false ? "  [catalog only]" : "";
		lines.push(
			release.version.padEnd(26, " ") + " " +
			channelLabel(release).padEnd(20, " ") + " " +
			sources + active + installability
		);
	}
	lines.push("", "Use: ne update --channel stable|alpha|latest-green");
	return lines.join("\n");
}

async function loadExactStableVersion(rootDir, version) {
	if (!parseVersion(version) || parseVersion(version).prerelease !== null) return null;
	const url = "https://registry.npmjs.org/@kastrick%2fnextjs-engine/" + encodeURIComponent(version);
	const response = await fetch(url, {
		headers: { Accept: "application/json", "User-Agent": "nextjs-engine-ne-cli" },
		signal: AbortSignal.timeout(12000),
	});
	if (!response.ok) return null;
	const metadata = await response.json();
	if (metadata.name !== PACKAGE_NAME || metadata.version !== version) return null;
	return {
		version,
		track: "stable",
		channel: "stable",
		source: "npm",
		sourceLabel: "npm Registry",
		sourceBranch: null,
		sourceCommit: null,
		sha256: null,
		artifactName: null,
		artifactUrl: null,
		publishedAt: "",
		releaseUrl: "https://www.npmjs.com/package/" + PACKAGE_NAME + "?activeTab=versions",
		installSpec: PACKAGE_NAME + "@" + version,
		description: "Published stable package from the npm registry.",
	};
}

async function askToInstall(release, options) {
	if (options.yes) return true;
	if (process.env.CI === "true" || !process.stdin.isTTY || !process.stdout.isTTY) {
		throw new Error("Installation requires confirmation in CI/non-interactive mode. Review the release and pass --yes to continue.");
	}
	const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
	try {
		const answer = await prompt.question("Install " + PACKAGE_NAME + "@" + release.version + " from " + release.sourceLabel + "? [y/N] ");
		return /^y(es)?$/i.test(answer.trim());
	} finally {
		prompt.close();
	}
}

async function commandUpdate(root, options) {
	const state = loadState(root);
	const catalog = await loadChannelCatalog(root, { force: Boolean(options.force || options.check) });
	if (options.json) {
		process.stdout.write(JSON.stringify({ cached: catalog.cached, releases: catalog.releases }, null, 2) + "\n");
		if (options.check || (!options.channel && !options.version)) return;
	}
	if (!options.channel && !options.version) {
		process.stdout.write(listChannels(catalog, state) + "\n");
		return;
	}
	if (options.channel && !["stable", "alpha", "beta", "latest-green"].includes(options.channel)) {
		throw new Error("Unknown channel " + options.channel + ". Use stable, alpha, beta, or latest-green.");
	}
	let release = resolveRelease(catalog, { channel: options.channel, version: options.version });
	if (!release && options.version) release = await loadExactStableVersion(root, options.version);
	if (!release) {
		throw new Error("No verified installable release was found for " + (options.version || options.channel) + ". The catalog may list npm prereleases or Git tags without a verified installation artifact.");
	}
	if (options.check || options.dryRun) {
		process.stdout.write("[NE] Selected " + release.version + " [" + channelLabel(release) + "] from " + release.sourceLabel + ".\n");
		if (options.dryRun) process.stdout.write("[NE] Dry run only; the project was not modified.\n");
		return;
	}
	if (!(await askToInstall(release, options))) {
		process.stdout.write("[NE] Installation cancelled.\n");
		return;
	}
	await installRelease(root, release, options.channel || release.track);
}

async function commandUpdater(root, showWarning) {
	const catalog = await loadChannelCatalog(root);
	const state = loadState(root);
	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		process.stdout.write(listChannels(catalog, state) + "\n");
		process.stdout.write("Run ne update --channel alpha|latest-green|stable to install without the interactive UI.\n");
		return;
	}
	const result = await runTui({
		initialScreen: "releases",
		showWarning: Boolean(showWarning),
		catalog,
		context: {
			projectName: projectName(root),
			version: readInstalledVersion(root),
			installedVersion: state.installedVersion || readInstalledVersion(root),
			channel: state.activeChannel || "not selected",
			cacheStatus: "ready",
		},
	});
	if (result.action === "install" && result.release) {
		await installRelease(root, result.release, result.release.track === "beta" ? "latest-green" : result.release.track);
	}
}

function readInstalledVersion(root) {
	const installedPath = path.join(root, "node_modules", "@kastrick", "nextjs-engine", "package.json");
	try {
		const installed = JSON.parse(require("node:fs").readFileSync(installedPath, "utf8"));
		if (installed.name === PACKAGE_NAME) return installed.version || "unknown";
	} catch {}
	const pkg = require("node:fs").existsSync(path.join(root, "package.json"))
		? require("node:fs").readFileSync(path.join(root, "package.json"), "utf8")
		: "{}";
	try {
		const parsed = JSON.parse(pkg);
		return parsed.name === "nextjs-engine" ? (parsed.version || "unknown") : "not installed";
	} catch {
		return "unknown";
	}
}

async function runDashboard(root, showWarning) {
	const state = loadState(root);
	let catalog = { releases: [], cached: true };
	try { catalog = await loadChannelCatalog(root); } catch {}
	const result = await runTui({
		initialScreen: "dashboard",
		showWarning: Boolean(showWarning),
		catalog,
		context: {
			projectName: projectName(root),
			version: readInstalledVersion(root),
			installedVersion: state.installedVersion || readInstalledVersion(root),
			channel: state.activeChannel || "not selected",
			cacheStatus: catalog.cached ? "cached" : "ready",
		},
	});
	return result;
}

async function runDashboardAction(root, action) {
	if (action === "dev") return runNext(root, ["dev"]);
	if (action === "build") return runBuild(root);
	if (action === "start") return runNext(root, ["start"]);
	if (action === "check") return runCheck(root);
	if (action === "clean") return runClean(root, false);
	if (action === "rollback") return rollback(root);
	if (action === "help") return process.stdout.write(getHelp());
	if (action === "updater") return commandUpdater(root, false);
	if (action === "quit") return;
	throw new Error("Unknown dashboard action: " + action);
}

function tokenizeCommand(command) {
	if (typeof command !== "string" || !command.trim()) {
		throw new Error("--and requires a command.");
	}
	const tokens = [];
	let token = "";
	let tokenStarted = false;
	let quote = null;
	for (let index = 0; index < command.length; index += 1) {
		const character = command[index];
		if (character === "\n" || character === "\r" || character === "\0") {
			throw new Error("--and does not accept line breaks or NUL bytes.");
		}
		if (quote !== null) {
			if (character === quote) {
				quote = null;
				tokenStarted = true;
				continue;
			}
			token += character;
			tokenStarted = true;
			continue;
		}
		if (character === "'" || character === '"') {
			quote = character;
			tokenStarted = true;
			continue;
		}
		if (/\s/.test(character)) {
			if (tokenStarted) {
				tokens.push(token);
				token = "";
				tokenStarted = false;
			}
			continue;
		}
		if (/[;&|<>\x60]/.test(character)) {
			throw new Error("--and runs one executable at a time without a shell; shell operators are not supported. Use repeated --and options for sequential commands.");
		}
		token += character;
		tokenStarted = true;
	}
	if (quote !== null) throw new Error("--and contains an unterminated quoted argument.");
	if (tokenStarted) tokens.push(token);
	if (!tokens.length || !tokens[0]) throw new Error("--and requires an executable.");
	return tokens;
}

function resolveChainedCommand(executable, args, options = {}) {
	const platform = options.platform ?? process.platform;
	if (platform !== "win32") return { executable, args };

	const pathApi = path.win32;
	const runtimePath = options.execPath ?? process.execPath;
	const env = options.env ?? process.env;
	const existsSync = options.existsSync ?? fs.existsSync;
	if (/\.(?:cmd|bat)$/i.test(executable)) {
		throw new Error("NE --and does not execute .cmd/.bat wrappers through a shell. Use a direct executable or the wrapper's JavaScript entry point.");
	}
	const basename = pathApi.basename(executable).replace(/\.(?:cmd|bat|exe)$/i, "").toLowerCase();
	const hasExplicitPath = /[\\/]/.test(executable);
	if (!hasExplicitPath && ["npm", "npx", "pnpm", "yarn"].includes(basename)) {
		const runtimeDirectory = pathApi.dirname(runtimePath);
		const appData = typeof env.APPDATA === "string" ? env.APPDATA : "";
		const localAppData = typeof env.LOCALAPPDATA === "string" ? env.LOCALAPPDATA : "";
		const candidates = {
			npm: [
				pathApi.join(runtimeDirectory, "node_modules", "npm", "bin", "npm-cli.js"),
				appData ? pathApi.join(appData, "npm", "node_modules", "npm", "bin", "npm-cli.js") : null,
			],
			npx: [
				pathApi.join(runtimeDirectory, "node_modules", "npm", "bin", "npx-cli.js"),
				appData ? pathApi.join(appData, "npm", "node_modules", "npm", "bin", "npx-cli.js") : null,
			],
			pnpm: [
				appData ? pathApi.join(appData, "npm", "node_modules", "pnpm", "bin", "pnpm.cjs") : null,
				localAppData ? pathApi.join(localAppData, "pnpm", "pnpm.cjs") : null,
				localAppData ? pathApi.join(localAppData, "pnpm", "node_modules", "pnpm", "bin", "pnpm.cjs") : null,
			],
			yarn: [
				appData ? pathApi.join(appData, "npm", "node_modules", "yarn", "bin", "yarn.js") : null,
				pathApi.join(runtimeDirectory, "node_modules", "corepack", "dist", "yarn.js"),
			],
		}[basename].filter(Boolean);
		const scriptPath = candidates.find((candidate) => existsSync(candidate));
		if (!scriptPath) {
			throw new Error("NE cannot safely locate the JavaScript entry point for '" + basename + "' on Windows. Invoke a direct .exe or use 'node path/to/script.js'.");
		}
		return { executable: runtimePath, args: [scriptPath, ...args] };
	}
	return { executable, args };
}

async function runChainedCommands(root, options) {
	const commands = options.andCommands || [];
	const height = options.andTerminal || 5;
	for (let index = 0; index < commands.length; index += 1) {
		const command = commands[index];
		const [requestedExecutable, ...requestedArgs] = tokenizeCommand(command);
		const invocation = resolveChainedCommand(requestedExecutable, requestedArgs);
		process.stdout.write("\n[NE CHAIN " + (index + 1) + "/" + commands.length + "] " + command + " [viewport: " + height + " rows]\n");
		await new Promise((resolve, reject) => {
			const child = require("node:child_process").spawn(invocation.executable, invocation.args, {
				cwd: root,
				env: process.env,
				windowsHide: true,
				shell: false,
				stdio: ["inherit", "pipe", "pipe"],
			});
			let output = "";
			const limit = 2 * 1024 * 1024;
			const capture = (kind) => (chunk) => {
				if (output.length < limit) {
					const text = chunk.toString("utf8");
					output += kind === "stderr" ? "[stderr] " + text : text;
					if (output.length > limit) output = output.slice(-limit);
				}
			};
			child.stdout.on("data", capture("stdout"));
			child.stderr.on("data", capture("stderr"));
			child.once("error", reject);
			child.once("close", (code, signal) => {
				const lines = output.replace(/\r\n/g, "\n").split("\n");
				const visible = lines.slice(-height);
				for (const line of visible) process.stdout.write(line + "\n");
				if (code !== 0) reject(new Error("Chained command failed: " + command + " (" + (signal || ("exit " + code)) + ")."));
				else resolve();
			});
		});
	}
}

async function executeCommand(root, command, subArgs, options, showWarning) {
	if (!command) {
		if (!process.stdin.isTTY || !process.stdout.isTTY) {
			process.stdout.write(getHelp());
			return;
		}
		const result = await runDashboard(root, showWarning);
		await runDashboardAction(root, result.action);
		return;
	}
	if (command === "updater") return commandUpdater(root, showWarning);
	if (command === "update") return commandUpdate(root, options);
	if (command === "dev") return runNext(root, ["dev", ...subArgs]);
	if (command === "build") return runBuild(root);
	if (command === "start") return runNext(root, ["start", ...subArgs]);
	if (command === "check") return runCheck(root);
	if (command === "clean") return runClean(root, Boolean(options.dryRun));
	if (command === "rollback") return rollback(root);
	throw new Error("Unknown command: " + command + ". Run ne help for commands.");
}

async function main(argv) {
	const args = parseArgs(argv || process.argv.slice(2));
	const command = args.positional[0];
	const subArgs = args.positional.slice(1);
	if (args.options.help || command === "help") {
		process.stdout.write(getHelp());
		return;
	}
	const usesTui = !command || command === "updater";
	if (!usesTui) experimentalWarning();
	const root = findProjectRoot(process.cwd());
	await executeCommand(root, command, subArgs, args.options, shouldShowExperimentalWarning());
	await runChainedCommands(root, args.options);
}

module.exports = {
	parseArgs,
	getHelp,
	listChannels,
	main,
	runChainedCommands,
	tokenizeCommand,
	resolveChainedCommand,
};
