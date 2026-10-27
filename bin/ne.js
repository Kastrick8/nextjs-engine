#!/usr/bin/env node
"use strict";

const { main } = require("./ne-cli/cli");

main().catch((error) => {
	const message = error && error.message ? error.message : String(error);
	process.stderr.write("\n[NE-CLI] " + message + "\n");
	process.exitCode = 1;
});
