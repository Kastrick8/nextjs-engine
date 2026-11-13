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

const BUILTIN_COMMANDS = new Set(["updater", "update", "dev", "build", "start", "check", "clean", "rollback", "analyze", "info", "plugins", "help"]);

function parseArgs(argv) {
	const positional = [];
	const options = {};
	const takesValue = new Set(["channel", "version", "and", "and-terminal"]);
	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];
		if (argument === "-v") {
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
			} else if (["yes", "check", "json", "dry-run", "force", "no-color", "allow-downgrade", "allow-generation-change", "acknowledge-compatibility", "source", "fix", "no-fix"].includes(name)) {
				const optionNames = {
					"dry-run": "dryRun",
					"no-color": "noColor",
					"no-fix": "noFix",
					"allow-downgrade": "allowDowngrade",
					"allow-generation-change": "allowGenerationChange",
					"acknowledge-compatibility": "acknowledgeCompatibility"
				};
				options[optionNames[name] || name] = true;
			} else if (positional.length && !BUILTIN_COMMANDS.has(positional[0])) {
				// Plugin option schemas belong to the plugin; preserve unknown options
				// without consuming the next positional argument.
				(options.pluginOptions ||= []).push(argument);
			} else {
				throw diagnostics().unknownOption(argument, [
					"--channel", "--version", "--and", "--and-terminal",
					"--yes", "--check", "--json", "--dry-run", "--force",
					"--quiet", "--no-color", "--allow-downgrade", "--allow-generation-change", "--acknowledge-compatibility",
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
		"Next.js Engine CLI — Generation 3",
		"",
		"Usage",
		"  ne [command] [options]",
		"",
		"Commands",
		"  ne                 Open the interactive dashboard",
		"  ne dev             Start the Next.js development server",
		"  ne build           Run NE checks and the production build",
		"  ne start           Start the production server",
		"  ne check           Run the configured project checks",
		"  ne analyze         Analyze dependencies and project diagnostics",
		"  ne info            Show local and remote Engine information",
		"  ne plugins         List enabled local NE CLI plugins",
		"  ne clean           Remove generated build files and caches",
		"  ne updater         Browse releases in the terminal",
		"  ne update          List or install a release",
		"  ne rollback        Restore the previous dependency files",
		"",
		"Help",
		"  ne --help          Show this overview",
		"  ne <command> -h    Show help for a command",
		"  ne help update     Show update options",
		"",
		"Install",
		"  npm install -g @kastrick/nextjs-engine",
		"  npm link           Use this checkout from your shell",
		"",
		"Run once",
		"  npx --yes --package=@kastrick/nextjs-engine ne updater",
		"",
		"Common options",
		"  -v, --version      Print the installed package version",
		"  -q, --quiet        Hide the experimental notice",
		"  --no-color         Disable ANSI colors",
		"  --and <command>    Run a command after NE completes (without a shell)",
		"  --and-terminal <n> Show the last 1–100 output lines",
		"",
		"Run ne update --help for release options."
	].join("\n") + "\n";
}

function getCommandHelp(command) {
	const help = {
		update: [
			"ne update — Release manager",
			"",
			"Usage",
			"  ne update",
			"  ne update --channel <channel> [options]",
			"  ne update --version <version> [options]",
			"",
			"Release selection",
			"  --channel <channel>  stable, alpha, beta, or latest-green",
			"  --version <version>  Select one verified version",
			"",
			"Options",
			"  --check              Refresh and list releases without installing",
			"  --source             Install a verified GitHub maintenance artifact for this exact version",
			"  --dry-run            Show the selected release; do not install",
			"  --json               Print the release catalog as JSON",
			"  --force              Ignore the cached catalog and refresh feeds",
			"  --yes                Skip the interactive install confirmation",
			"  --allow-downgrade   Explicitly allow an older version",
			"  --allow-generation-change  Explicitly allow switching Gen 2 / Gen 3",
			"  --acknowledge-compatibility  Acknowledge migration warnings",
			"  -q, --quiet          Hide the experimental notice",
			"  --no-color           Disable ANSI colors",
			"  -h, --help           Show this command help",
			"",
			"Examples",
			"  ne update",
			"  ne update --channel alpha --check",
			"  ne update --channel latest-green --dry-run",
			"  ne update --version 3.0.0-alpha.2",
			"  ne update --channel alpha --yes",
			"",
			"Notes",
			"  latest-green chooses the newest stable or beta release, never alpha.",
			"  Alpha and beta installs require a verified GitHub release artifact.",
			"  Use --json without a selector for a read-only JSON catalog."
		],
		analyze: [
			"ne analyze — Project and dependency analysis",
			"",
			"Usage",
			"  ne analyze",
			"  ne analyze --check",
			"",
			"Runs the package manager audit, checks outdated dependencies, validates",
			"supported configuration files, and runs project checks.",
			"By default it applies native safe dependency fixes where supported.",
			"--check performs a read-only analysis.",
			"Generation 3 does not run Gen 2-to-Gen 3 migration diagnostics.",
			"NE reports source problems but never rewrites application source files."
		],
		info: [
			"ne info — Local and remote project information",
			"",
			"Usage",
			"  ne info",
			"",
			"Shows the installed package, generation, package manager, runtime,",
			"source commit, remote branch head, and any compatible GitHub hotfix."
		],
		plugins: [
			"ne plugins — Local NE CLI plugins",
			"",
			"Usage",
			"  ne plugins",
			"",
			"Lists the plugins explicitly enabled in .nextjs-engine/config/ne-cli.json.",
			"Plugin files live in .nextjs-engine/plugins/*.cjs."
		],
		updater: [
			"ne updater — Interactive release browser",
			"",
			"Usage",
			"  ne updater",
			"",
			"Browse releases, inspect their source and verification details, and select",
			"an installable version. Use Esc or Q to go back or quit.",
			"",
			"For a non-interactive install, use ne update --help."
		],
		dev: [
			"ne dev — Development server",
			"",
			"Usage",
			"  ne dev",
			"",
			"Starts the project's Next.js development server with the Engine integration."
		],
		build: [
			"ne build — Production build",
			"",
			"Usage",
			"  ne build",
			"",
			"Runs prepare:production when configured, NE checks, and the Next.js",
			"production build. The command stops when a required step fails."
		],
		start: [
			"ne start — Production server",
			"",
			"Usage",
			"  ne start",
			"",
			"Starts the project's production Next.js server. Run ne build first."
		],
		check: [
			"ne check — Project checks",
			"",
			"Usage",
			"  ne check",
			"",
			"Runs TypeScript checking when configured and the available Gen 3",
			"migration diagnostics. It does not install or update dependencies."
		],
		clean: [
			"ne clean — Clean generated files",
			"",
			"Usage",
			"  ne clean [--dry-run]",
			"",
			"Removes supported build output and generated caches. Rollback backups",
			"are kept.",
			"",
			"Options",
			"  --dry-run   Show what would be removed without deleting anything",
			"  -h, --help  Show this command help"
		],
		rollback: [
			"ne rollback — Restore the previous install",
			"",
			"Usage",
			"  ne rollback",
			"",
			"Restores the previous managed package.json and lockfiles, then reinstalls",
			"dependencies. Rollback is available only after NE has made a backup."
		]
	};
	return Object.prototype.hasOwnProperty.call(help, command)
		? help[command].join("\n") + "\n"
		: null;
}

function loadPluginCommandHelp(command) {
	const root = project().findProjectRoot(process.cwd());
	const host = require("./plugins").loadPlugins(root);
	const definition = host.commands.get(command);
	return definition && definition.help ? String(definition.help).replace(/\n?$/, "\n") : null;
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
	if (options.source) return require("./maintenance").installAvailableHotfix(project(), root, options);
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
		const safetyReport = project().inspectUpdateSafety(root, release);
		process.stdout.write("[NE] Selected " + release.version + " [" + channels().channelLabel(release) + "] from " + release.sourceLabel + ".\n");
		process.stdout.write(project().formatUpdateSafety(safetyReport) + "\n");
		if (safetyReport.blockers.length) process.stdout.write("[NE] This selection is BLOCKED by compatibility errors.\n");
		if (options.dryRun) process.stdout.write("[NE] Dry run only; the project was not modified.\n");
		return;
	}

	if (!(await askToInstall(release, options))) {
		process.stdout.write("[NE] Installation cancelled.\n");
		return;
	}
	await project().installRelease(root, release, options.channel || release.track, options);
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
		inspectRelease: (release) => project().inspectUpdateSafety(root, release),
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
		await project().installRelease(root, result.release, result.release.track === "beta" ? "latest-green" : result.release.track, { safetyAcknowledged: Boolean(result.safetyAcknowledged) });
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

async function runDashboardAction(root, result, pluginHost) {
	const action = typeof result === "string" ? result : result && result.action;
	if (action === "install" && result && result.release) {
		return project().installRelease(root, result.release, result.release.track === "beta" ? "latest-green" : result.release.track, { safetyAcknowledged: Boolean(result.safetyAcknowledged) });
	}
	if (action === "dev") return project().runNext(root, ["dev"]);
	if (action === "build") return project().runBuild(root, pluginHost);
	if (action === "start") return project().runNext(root, ["start"]);
	if (action === "check") return project().runCheck(root);
	if (action === "analyze") return require("./analyze").runAnalyze(project(), root, { checkOnly: true }, pluginHost);
	if (action === "info") return require("./info").runInfo(root, project(), pluginHost);
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

async function executeCommand(root, command, subArgs, options, showWarning, pluginHost) {
	if (!command) {
		if (!process.stdin.isTTY || !process.stdout.isTTY) {
			process.stdout.write(getHelp());
			return;
		}
		const result = await runDashboard(root, showWarning);
		await runDashboardAction(root, result, pluginHost);
		return;
	}
	if (command === "updater") return commandUpdater(root, showWarning);
	if (command === "update") return commandUpdate(root, options);
	if (command === "dev") return project().runNext(root, ["dev", ...subArgs]);
	if (command === "build") return project().runBuild(root, pluginHost, options);
	if (command === "start") return project().runNext(root, ["start", ...subArgs]);
	if (command === "check") return project().runCheck(root);
	if (command === "analyze") return require("./analyze").runAnalyze(project(), root, { checkOnly: Boolean(options.check || options.noFix) }, pluginHost);
	if (command === "info") return require("./info").runInfo(root, project(), pluginHost);
	if (command === "plugins") {
		const list = require("./plugins").listPlugins(pluginHost);
		if (!list.length) process.stdout.write("[NE] No NE CLI plugins are enabled.\n");
		else for (const item of list) process.stdout.write(item.name + "@" + item.version + " · " + item.file + "\n");
		return;
	}
	const pluginCommand = pluginHost && pluginHost.commands.get(command);
	if (pluginCommand) return pluginCommand.run({ root, args: subArgs, options, pluginOptions: options.pluginOptions || [], project: project() });
	if (command === "clean") return project().runClean(root, Boolean(options.dryRun));
	if (command === "rollback") return project().rollback(root);
	throw diagnostics().unknownCommand(command, [
		"updater", "update", "dev", "build", "start", "check", "clean", "rollback", "analyze", "info", "plugins", "help",
	]);
}

async function main(argv) {
	const args = parseArgs(argv || process.argv.slice(2));
	const command = args.positional[0];
	const subArgs = args.positional.slice(1);
	if (args.options.version === true && !command) {
		process.stdout.write(packageVersion() + "\n");
		return;
	}
	if (command === "help") {
		const target = subArgs[0];
		if (!target) process.stdout.write(getHelp());
		else {
			const help = getCommandHelp(target) || loadPluginCommandHelp(target);
			if (!help) throw diagnostics().unknownCommand(target, [
				"updater", "update", "dev", "build", "start", "check", "clean", "rollback", "analyze", "info", "plugins", "help",
			]);
			process.stdout.write(help);
		}
		return;
	}
	if (args.options.help) {
		if (!command) process.stdout.write(getHelp());
		else {
			const help = getCommandHelp(command) || (command ? loadPluginCommandHelp(command) : null);
			if (!help) throw diagnostics().unknownCommand(command, [
				"updater", "update", "dev", "build", "start", "check", "clean", "rollback", "analyze", "info", "plugins", "help",
			]);
			process.stdout.write(help);
		}
		return;
	}
	const usesTui = !command || command === "updater";
	if (!usesTui) experimentalWarning(args.options);
	let root;
	try { root = project().findProjectRoot(process.cwd()); }
	catch (error) {
		if (command && !BUILTIN_COMMANDS.has(command)) throw diagnostics().unknownCommand(command, [...BUILTIN_COMMANDS]);
		throw error;
	}
	const pluginHost = require("./plugins").loadPlugins(root);
	const knownCommand = BUILTIN_COMMANDS.has(command);
	if (command && !knownCommand && !pluginHost.commands.has(command)) throw diagnostics().unknownCommand(command, [...BUILTIN_COMMANDS, ...pluginHost.commands.keys()]);
	const context = { root, command, args: subArgs, options: args.options, project: project() };
	await require("./plugins").runHooks(pluginHost, "beforeCommand", context);
	await executeCommand(root, command, subArgs, args.options, shouldShowExperimentalWarning(), pluginHost);
	await require("./plugins").runHooks(pluginHost, "afterCommand", context);
	await runChainedCommands(root, args.options);
}

module.exports = {
	parseArgs,
	parseChainedCommand,
	getHelp,
	getCommandHelp,
	listChannels,
	main,
	runChainedCommands,
	runDashboardAction,
};
