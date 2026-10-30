#!/usr/bin/env node
"use strict";

const { main } = require("./ne-cli/cli");

main().catch((error) => {
	let rendered = "";
	try {
		const { renderError } = require("./ne-cli/presentation");
		rendered = renderError(error, {
			color: !process.argv.includes("--no-color"),
		});
	} catch {
		const message = error && error.message ? error.message : String(error);
		rendered = "[NE-CLI] " + message;
	}
	process.stderr.write("\n" + rendered + "\n");
	if (error && error.output) {
		if (error.outputTruncated) {
			process.stderr.write("[NE-CLI] Earlier command output was truncated; showing the final captured lines.\n");
		}
		process.stderr.write("[NE-CLI] Captured command output:\n");
		process.stderr.write(error.output.replace(/\s+$/, "") + "\n");
	}
	process.exitCode = 1;
});
