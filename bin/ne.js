#!/usr/bin/env node
"use strict";

const argv = process.argv.slice(2);

function reportError(error) {
	const message = error && error.message ? error.message : String(error);
	if (!error || !error.neFailureDisplayed) {
		process.stderr.write("\n[NE-CLI] " + message + "\n");
		if (error && error.output && !error.neOutputDisplayed) {
			if (error.outputTruncated) {
				process.stderr.write("[NE-CLI] Earlier command output was truncated; showing the final captured lines.\n");
			}
			process.stderr.write(error.output.replace(/\s+$/, "") + "\n");
		}
	}
	process.exitCode = 1;
}

// The version check is intentionally independent from the command framework.
// Global installs can answer it without loading the dashboard, updater or workers.
if (argv.length === 1 && (argv[0] === "--version" || argv[0] === "-v")) {
	try {
		const manifest = require("../package.json");
		process.stdout.write(String(manifest.version || "unknown") + "\n");
	} catch (error) {
		reportError(error);
	}
} else {
	try {
		const { main } = require("./ne-cli/cli");
		Promise.resolve(main(argv)).catch(reportError);
	} catch (error) {
		reportError(error);
	}
}
