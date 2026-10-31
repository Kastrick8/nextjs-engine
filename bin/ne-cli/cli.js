"use strict";

const path = require("node:path");

// Keep CLI import time small. Feature modules are loaded only after routing.
function channels() {
	return require("./channels");
}

function terminal() {
	return require("./terminal");
}

function project() {
	return require("./project");
}

function diagnostics() {
	return require("./diagnostics");
}

function presentation() {
	return require("./presentation");
}

function packageVersion() {
	try {
		return require("../../package.json").version || "unknown";
	} catch {
		return "unknown";
	}
}

function parseArgs(argv) {
	const positional = [];
	const options = {};
	const takesValue = new Set(["channel", "version", "and", "and-terminal"]);
	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];
		if (argument === "-v" || argument === "--version") {
			options.version = true;
			continue;
		}
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
				if (!command || (value === undefined && command.startsWith("-"))) throw diagnostics().missingOptionValue("--and", "a command to run");
				if (value === undefined) index += 1;
				(options.andCommands ||= []).push(command);
			} else if (name === "and-terminal") {
				const rawHeight = value !== undefined ? value : argv[index + 1];
				if (!rawHeight || (value === undefined && rawHeight.startsWith("-"))) throw diagnostics().missingOptionValue("--and-terminal", "a terminal height");
				if (value === undefined) index += 1;
				const height = Number(rawHeight);
				if (!Number.isInteger(height) || height < 1 || height > 100) throw diagnostics().invalidOptionValue("--and-terminal", "an integer between 1 and 100");
				options.andTerminal = height;
			} else if (takesValue.has(name)) {
				if (value !== undefined) options[name] = value;
				else if (argv[index + 1] && !argv[index + 1].startsWith("-")) options[name] = argv[++index];
				else throw diagnostics().missingOptionValue("--" + name, "a value");
			} else if (["yes", "check", "json", "dry-run", "force", "no-color"].includes(name)) {
				options[name === "dry-run" ? "dryRun" : name === "no-color" ? "noColor" : name] = true;
			} else {
				throw diagnostics().unknownOption(argument, [
					"--channel", "--version", "--and", "--and-terminal",
					"--yes", "--check", "--json", "--dry-run", "--force",
					"--quiet", "--no-color",
				]);
			}
			continue;
		}
		if (argument === "-and") {
			if (!argv[index + 1]) throw diagnostics().missingOptionValue("-and", "a command to run");
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
				throw diagnostics().invalidOptionValue("-and-terminal", "an integer between 1 and 100");
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

function experimentalWarning(options) {
	if (!shouldShowExperimentalWarning()) return;
	const settings = options || {};
	const banner = presentation().renderBanner({
		type: "warning",
		title: "NE CLI · EXPERIMENTAL",
		message: "NE is experimental and may change or be removed in a future version.",
		details: ["Review the selected channel before applying updates."],
		color: settings.noColor ? false : undefined,
	});
	process.stderr.write(banner + "\n");
}

function getHelp() {
	return [
		"Nextjs Engine (NE) CLI",
		"  ne --version         Print the installed package version",
		"",
		"  ne                    Open the interactive dashboard",
		"  ne dev                Start the Next.js development server",
		"  ne build              Run NE checks and the production Next.js build",
		"  ne start              Start the production Next.js server",
		"  ne check              Run type-checking and Gen 3 migration diagnostics",
		"  ne clean              Safely clean generated build caches",
		"  ne updater            Open the Play Store-style release UI",
		"  ne update             List channel releases from the command line",
		"  ne update --channel alpha",
		"  ne update --channel latest-green",
		"  ne update --version 3.0.0-alpha.2",
		"  ne rollback           Restore the previous dependency and lockfiles",
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
		"  --no-color    Disable ANSI colors in CLI output",
		"",
		"Install once for direct shell commands:",
		"  npm install --global @kastrick/nextjs-engine",
		"  ne                    Open the dashboard",
		"  ne build              Build the current project",
		"  ne clean              Clean generated build files",
		"",
		"Development checkout:",
		"  npm link                Expose this checkout's ne executable on PATH",
		"",
		"Local project install (not a global shell command):",
		"  npx ne --help           Run the locally installed executable",
		"  npm exec -- ne --help   Equivalent npm exec form",
		"",
		"One-shot invocation without a global install:",
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
			channels().channelLabel(release).padEnd(20, " ") + " " +
			sources + active + installability
		);
	}
	lines.push("", "Use: ne update --channel stable|alpha|latest-green");
	return lines.join("\n");
}

async function loadExactStableVersion(rootDir, version) {
	if (!channels().parseVersion(version) || channels().parseVersion(version).prerelease !== null) return null;
	const url = "https://registry.npmjs.org/@kastrick%2fnextjs-engine/" + encodeURIComponent(version);
	const response = await fetch(url, {
		headers: { Accept: "application/json", "User-Agent": "nextjs-engine-ne-cli" },
		signal: AbortSignal.timeout(12000),
	});
	if (!response.ok) return null;
	const metadata = await response.json();
	if (metadata.name !== channels().PACKAGE_NAME || metadata.version !== version) return null;
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
		releaseUrl: "https://www.npmjs.com/package/" + channels().PACKAGE_NAME + "?activeTab=versions",
		installSpec: channels().PACKAGE_NAME + "@" + version,
		description: "Published stable package from the npm registry.",
	};
}

async function askToInstall(release, options) {
	if (options.yes) return true;
	if (process.env.CI === "true" || !process.stdin.isTTY || !process.stdout.isTTY) {
		throw new Error("Installation requires confirmation in CI/non-interactive mode. Review the release and pass --yes to continue.");
	}
	const readline = require("node:readline/promises");
	const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
	try {
		const answer = await prompt.question("Install " + channels().PACKAGE_NAME + "@" + release.version + " from " + release.sourceLabel + "? [y/N] ");
		return /^y(es)?$/i.test(answer.trim());
	} finally {
		prompt.close();
	}
}

async function commandUpdate(root, options) {
	const state = project().loadState(root);
	if (!options.json) process.stdout.write("[NE-UPDATER] Refreshing npm versions, GitHub releases and repository tags...\n");
	const catalog = await channels().loadChannelCatalog(root, {
		force: Boolean(options.force || options.check),
		onSourceStatus: (update) => {
			if (options.quiet || process.env.CI === "true" || !process.stderr.isTTY) return;
			if (update && update.status === "failed") {
				process.stderr.write("[NE-UPDATER] " + update.source + " feed failed: " + update.message + "\n");
			}
		},
	});
	for (const warning of catalog.sourceErrors || []) {
		process.stderr.write("[NE-UPDATER] " + warning.source + " feed warning: " + warning.message + "\n");
	}
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
	let release = channels().resolveRelease(catalog, { channel: options.channel, version: options.version });
	if (!release && options.version) release = await loadExactStableVersion(root, options.version);
	if (!release) {
		throw new Error("No verified installable release was found for " + (options.version || options.channel) + ". The catalog may list npm prereleases or Git tags without a verified installation artifact.");
	}
	if (options.check || options.dryRun) {
		process.stdout.write("[NE] Selected " + release.version + " [" + channels().channelLabel(release) + "] from " + release.sourceLabel + ".\n");
		if (options.dryRun) process.stdout.write("[NE] Dry run only; the project was not modified.\n");
		return;
	}
	if (!(await askToInstall(release, options))) {
		process.stdout.write("[NE] Installation cancelled.\n");
		return;
	}
	await project().installRelease(root, release, options.channel || release.track);
}

async function commandUpdater(root, showWarning) {
	const state = project().loadState(root);
	const cached = channels().readCachedCatalog(root);
	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		const catalog = await channels().loadChannelCatalog(root);
		process.stdout.write(listChannels(catalog, state) + "\n");
		if (catalog.sourceErrors && catalog.sourceErrors.length) {
			for (const warning of catalog.sourceErrors) {
				process.stderr.write("[NE-UPDATER] " + warning.source + " feed warning: " + warning.message + "\n");
			}
		}
		process.stdout.write("Run ne update --channel alpha|latest-green|stable to install without the interactive UI.\n");
		return;
	}
	const projectManifest = project().readJson(path.join(root, "package.json"), {});
	const projectTitle = projectManifest.name || path.basename(root);
	const installedVersion = readInstalledVersion(root, projectManifest);
	const result = await terminal().runTui({
		initialScreen: "releases",
		showWarning: Boolean(showWarning),
		catalog: cached,
		loadCatalog: (onSourceStatus) => channels().loadChannelCatalog(root, { onSourceStatus }),
		context: {
			projectName: projectTitle,
			version: installedVersion,
			installedVersion: state.installedVersion || installedVersion,
			channel: state.activeChannel || "not selected",
			rollbackAvailable: Boolean(state.previous && state.previous.backup),
			cacheStatus: cached.releases.length ? "cached" : "loading",
			sourceStatus: cached.sourceStatus || {},
			activity: "Opening release catalog",
		},
	});
	if (result.action === "install" && result.release) {
		await project().installRelease(root, result.release, result.release.track === "beta" ? "latest-green" : result.release.track);
	}
}

function readInstalledVersion(root, projectManifest) {
	const installedPath = path.join(root, "node_modules", "@kastrick", "nextjs-engine", "package.json");
	const installed = project().readJson(installedPath, null);
	if (installed && installed.name === channels().PACKAGE_NAME) return installed.version || "unknown";
	const manifest = projectManifest || project().readJson(path.join(root, "package.json"), {});
	return manifest.name === "nextjs-engine" ? (manifest.version || "unknown") : "not installed";
}

async function runDashboard(root, showWarning) {
	const state = project().loadState(root);
	const cached = channels().readCachedCatalog(root);
	const projectManifest = project().readJson(path.join(root, "package.json"), {});
	const projectTitle = projectManifest.name || path.basename(root);
	const installedVersion = readInstalledVersion(root, projectManifest);
	const result = await terminal().runTui({
		initialScreen: "dashboard",
		showWarning: Boolean(showWarning),
		catalog: cached,
		loadCatalog: (onSourceStatus) => channels().loadChannelCatalog(root, { onSourceStatus }),
		context: {
			projectName: projectTitle,
			version: installedVersion,
			installedVersion: state.installedVersion || installedVersion,
			channel: state.activeChannel || "not selected",
			rollbackAvailable: Boolean(state.previous && state.previous.backup),
			cacheStatus: cached.releases.length ? "cached" : "loading",
			sourceStatus: cached.sourceStatus || {},
			activity: "Preparing project dashboard",
		},
	});
	return result;
}

async function runDashboardAction(root, result) {
	const action = typeof result === "string" ? result : result && result.action;
	if (action === "install" && result && result.release) {
		return project().installRelease(root, result.release, result.release.track === "beta" ? "latest-green" : result.release.track);
	}
	if (action === "dev") return project().runNext(root, ["dev"]);
	if (action === "build") return project().runBuild(root);
	if (action === "start") return project().runNext(root, ["start"]);
	if (action === "check") return project().runCheck(root);
	if (action === "clean") return project().runClean(root, false);
	if (action === "rollback") return project().rollback(root);
	if (action === "help") return process.stdout.write(getHelp());
	if (action === "updater") return commandUpdater(root, false);
	if (action === "quit") return;
	throw new Error("Unknown dashboard action: " + (action || "none"));
}

function parseChainedCommand(command) {
	if (typeof command !== "string" || command.length === 0 || command.length > 4096) {
		throw new Error("A chained command must be a non-empty command line under 4096 characters.");
	}
	const tokens = [];
	let token = "";
	let quote = "";
	let escaped = false;
	const pushToken = () => {
		if (token) tokens.push(token);
		token = "";
	};
	for (const character of command) {
		if (escaped) {
			token += character;
			escaped = false;
			continue;
		}
		if (quote) {
			if (character === "\\" && quote === '"') {
				escaped = true;
			} else if (character === quote) {
				quote = "";
			} else {
				token += character;
			}
			continue;
		}
		if (character === "'" || character === '"') {
			quote = character;
			continue;
		}
		const code = character.charCodeAt(0);
		if (code === 10 || code === 13 || code === 96 || ";&|<>()$".includes(character)) {
			throw new Error("NE --and accepts one executable and arguments, not shell operators or expansions. Run shell scripts from a script file.");
		}
		if (/\s/.test(character)) {
			pushToken();
			continue;
		}
		token += character;
	}
	if (escaped || quote) throw new Error("NE --and contains an unterminated quote or escape.");
	pushToken();
	if (!tokens.length) throw new Error("NE --and did not contain an executable.");
	return tokens;
}

async function runChainedCommands(root, options) {
	const commands = options.andCommands || [];
	const height = options.andTerminal || 5;
	for (let index = 0; index < commands.length; index += 1) {
		const command = commands[index];
		const tokens = parseChainedCommand(command);
		const invocation = project().resolveProcessInvocation(tokens[0], tokens.slice(1));
		const label = tokens.map((token) => JSON.stringify(token)).join(" ");
		process.stdout.write("\n[NE CHAIN " + (index + 1) + "/" + commands.length + "] " + label + " [viewport: " + height + " rows]\n");
		await new Promise((resolve, reject) => {
			const child = require("node:child_process").spawn(invocation.command, invocation.args, {
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
		await runDashboardAction(root, result);
		return;
	}
	if (command === "updater") return commandUpdater(root, showWarning);
	if (command === "update") return commandUpdate(root, options);
	if (command === "dev") return project().runNext(root, ["dev", ...subArgs]);
	if (command === "build") return project().runBuild(root);
	if (command === "start") return project().runNext(root, ["start", ...subArgs]);
	if (command === "check") return project().runCheck(root);
	if (command === "clean") return project().runClean(root, Boolean(options.dryRun));
	if (command === "rollback") return project().rollback(root);
	throw diagnostics().unknownCommand(command, [
		"updater", "update", "dev", "build", "start", "check", "clean", "rollback", "help",
	]);
}

async function main(argv) {
	const args = parseArgs(argv || process.argv.slice(2));
	const command = args.positional[0];
	const subArgs = args.positional.slice(1);
	if (args.options.version) {
		process.stdout.write(packageVersion() + "\n");
		return;
	}
	if (args.options.help || command === "help") {
		process.stdout.write(getHelp());
		return;
	}
	if (command && !["updater", "update", "dev", "build", "start", "check", "clean", "rollback"].includes(command)) {
		throw diagnostics().unknownCommand(command, [
			"updater", "update", "dev", "build", "start", "check", "clean", "rollback", "help",
		]);
	}
	const usesTui = !command || command === "updater";
	if (!usesTui) experimentalWarning(args.options);
	const root = project().findProjectRoot(process.cwd());
	await executeCommand(root, command, subArgs, args.options, shouldShowExperimentalWarning());
	await runChainedCommands(root, args.options);
}

module.exports = {
	parseArgs,
	parseChainedCommand,
	getHelp,
	listChannels,
	main,
	runChainedCommands,
	runDashboardAction,
};
