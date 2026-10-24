"use strict";

const compiler = require("../src/engine/plugins/gen3BuildCompiler");

if (require.main === module) {
	compiler.runCLI().then((code) => { process.exitCode = code; }, (error) => {
		console.error(error);
		process.exitCode = 1;
	});
}

module.exports = compiler;
