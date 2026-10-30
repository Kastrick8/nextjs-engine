#!/usr/bin/env node
"use strict";

const { main } = require("./ne-cli/cli");

main().catch((error) => {
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
});
