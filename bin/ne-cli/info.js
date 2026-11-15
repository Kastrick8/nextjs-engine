"use strict";

const maintenance = require("./maintenance");

async function runInfo(root, project, plugins) {
	const info = await maintenance.getInfo(root, project);
	process.stdout.write(maintenance.formatInfo(info) + "\n");
	const providers = await require("./plugins").runInfoProviders(plugins, { root, info, project });
	for (const provider of providers) {
		process.stdout.write("\nPLUGIN INFO · " + provider.plugin + "/" + provider.id + "\n");
		if (provider.error) process.stdout.write("  FAILED: " + provider.error + "\n");
		else process.stdout.write("  " + formatValue(provider.result) + "\n");
	}
	return info;
}

function formatValue(value) {
	if (typeof value === "string") return value;
	if (value === undefined) return "no value";
	try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

module.exports = { runInfo, formatValue };
