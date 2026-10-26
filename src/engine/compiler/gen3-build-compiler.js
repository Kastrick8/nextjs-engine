"use strict";

require("./loadTypeScriptCompiler");
const compiler = require("./build.compiler.ts");

if (require.main === module) {
	compiler.runCLI().then((code) => { process.exitCode = code; }, (error) => {
		console.error(error);
		process.exitCode = 1;
	});
}

module.exports = compiler;
