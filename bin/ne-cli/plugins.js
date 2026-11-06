"use strict";

const fs = require("node:fs");
const path = require("node:path");

const API_VERSION = 1;
const PLUGIN_DIRECTORY = path.join(".nextjs-engine", "plugins");
const CONFIG_PATH = path.join(".nextjs-engine", "config", "ne.config.json");
const BUILTIN_COMMANDS = new Set([
	"analyze", "build", "check", "clean", "dev", "help", "info", "plugins",
	"rollback", "start", "update", "updater",
]);
const HOOKS = new Set([
	"beforeCommand", "afterCommand", "beforeBuild", "afterBuild",
	"beforeAnalyze", "afterAnalyze",
]);

function safeIdentifier(value, label) {
	if (typeof value !== "string" || !/^[a-z][a-z0-9-]{0,47}$/.test(value)) {
		throw new Error("NE CLI plugin " + label + " must use lowercase letters, numbers, and hyphens.");
	}
	return value;
}

function createHost() {
	return {
		commands: new Map(),
		analyzeChecks: [],
		infoProviders: [],
		hooks: new Map(Array.from(HOOKS, (name) => [name, []])),
		plugins: [],
	};
}

function loadPlugins(root) {
	const host = createHost();
	const configFile = path.join(root, CONFIG_PATH);
	let config = {};
	try {
		config = JSON.parse(fs.readFileSync(configFile, "utf8"));
	} catch (error) {
		if (error && error.code !== "ENOENT") {
			throw new Error("Cannot read NE CLI configuration at " + CONFIG_PATH + ": " + error.message);
		}
	}
	const enabled = Array.isArray(config.neCliPlugins) ? config.neCliPlugins : [];
	if (!enabled.length) return host;

	const pluginRoot = path.resolve(root, PLUGIN_DIRECTORY);
	for (const entry of enabled) {
		if (typeof entry !== "string" || !/^[a-z][a-z0-9-]{0,47}$/.test(entry)) {
			throw new Error("Invalid NE CLI plugin identifier in neCliPlugins: " + String(entry));
		}
		const pluginFile = path.join(pluginRoot, entry + ".cjs");
		let stat;
		try { stat = fs.lstatSync(pluginFile); }
		catch { throw new Error("Enabled NE CLI plugin '" + entry + "' was not found at " + path.relative(root, pluginFile) + "."); }
		if (!stat.isFile() || stat.isSymbolicLink()) {
			throw new Error("NE CLI plugin '" + entry + "' must be a regular .cjs file; symbolic links are not accepted.");
		}
		const actualPath = fs.realpathSync(pluginFile);
		if (path.dirname(actualPath) !== fs.realpathSync(pluginRoot)) {
			throw new Error("NE CLI plugin '" + entry + "' resolves outside " + PLUGIN_DIRECTORY + ".");
		}

		let plugin;
		try {
			delete require.cache[require.resolve(actualPath)];
			plugin = require(actualPath);
		} catch (error) {
			throw new Error("Could not load NE CLI plugin '" + entry + "': " + error.message);
		}
		if (!plugin || typeof plugin !== "object" || plugin.apiVersion !== API_VERSION ||
			typeof plugin.register !== "function") {
			throw new Error("NE CLI plugin '" + entry + "' must export apiVersion: 1 and register(api).");
		}
		const pluginName = safeIdentifier(plugin.name || entry, "name");
		if (host.plugins.some((item) => item.name === pluginName)) {
			throw new Error("Duplicate NE CLI plugin name: " + pluginName);
		}

		const api = Object.freeze({
			apiVersion: API_VERSION,
			root,
			command(definition) {
				if (!definition || typeof definition !== "object") throw new Error("command() requires a definition object.");
				const name = safeIdentifier(definition.name, "command name");
				if (BUILTIN_COMMANDS.has(name)) throw new Error("NE CLI plugins cannot replace built-in command '" + name + "'.");
				if (host.commands.has(name)) throw new Error("Another NE CLI plugin already registered command '" + name + "'.");
				if (typeof definition.run !== "function") throw new Error("Plugin command '" + name + "' must provide run(context).");
				host.commands.set(name, {
					name,
					description: String(definition.description || "Plugin command"),
					help: typeof definition.help === "string" ? definition.help : "",
					run: definition.run,
					plugin: pluginName,
				});
			},
			analyzeCheck(definition) {
				if (!definition || typeof definition !== "object" || typeof definition.run !== "function") {
					throw new Error("analyzeCheck() requires { id, label, run(context) }.");
				}
				const id = safeIdentifier(definition.id, "analyze check id");
				if (host.analyzeChecks.some((item) => item.id === id)) throw new Error("Duplicate analyze check id: " + id);
				host.analyzeChecks.push({ id, label: String(definition.label || id), run: definition.run, plugin: pluginName });
			},
			infoProvider(definition) {
				if (!definition || typeof definition !== "object" || typeof definition.run !== "function") {
					throw new Error("infoProvider() requires { id, label, run(context) }.");
				}
				const id = safeIdentifier(definition.id, "info provider id");
				if (host.infoProviders.some((item) => item.id === id)) throw new Error("Duplicate info provider id: " + id);
				host.infoProviders.push({ id, label: String(definition.label || id), run: definition.run, plugin: pluginName });
			},
			on(event, handler) {
				if (!HOOKS.has(event)) throw new Error("Unsupported NE CLI plugin hook: " + String(event));
				if (typeof handler !== "function") throw new Error("Plugin hook '" + event + "' must be a function.");
				host.hooks.get(event).push({ plugin: pluginName, handler });
			},
		});

		try { plugin.register(api); }
		catch (error) { throw new Error("NE CLI plugin '" + pluginName + "' failed during registration: " + error.message); }
		host.plugins.push({ name: pluginName, version: String(plugin.version || "unknown"), file: path.relative(root, actualPath) });
	}
	return host;
}

async function runHooks(host, event, context) {
	if (!host || !host.hooks || !host.hooks.has(event)) return [];
	const results = [];
	for (const hook of host.hooks.get(event)) {
		try {
			results.push(await hook.handler(context));
		} catch (error) {
			error.message = "NE CLI plugin '" + hook.plugin + "' hook " + event + " failed: " + error.message;
			throw error;
		}
	}
	return results;
}

async function runAnalyzeChecks(host, context) {
	const results = [];
	for (const check of (host && host.analyzeChecks) || []) {
		try {
			results.push({ id: check.id, label: check.label, plugin: check.plugin, result: await check.run(context) });
		} catch (error) {
			results.push({ id: check.id, label: check.label, plugin: check.plugin, error: error.message });
		}
	}
	return results;
}

async function runInfoProviders(host, context) {
	const results = [];
	for (const provider of (host && host.infoProviders) || []) {
		try {
			results.push({ id: provider.id, label: provider.label, plugin: provider.plugin, result: await provider.run(context) });
		} catch (error) {
			results.push({ id: provider.id, label: provider.label, plugin: provider.plugin, error: error.message });
		}
	}
	return results;
}

function listPlugins(host) {
	return ((host && host.plugins) || []).map((plugin) => ({ ...plugin }));
}

module.exports = {
	API_VERSION,
	BUILTIN_COMMANDS,
	HOOKS,
	loadPlugins,
	runHooks,
	runAnalyzeChecks,
	runInfoProviders,
	listPlugins,
};
