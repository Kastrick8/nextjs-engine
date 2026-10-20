"use strict";

const compiler = require("../src/engine/plugins/gen3BuildCompiler");

if (require.main === module) process.exitCode = compiler.runCLI();

module.exports = compiler;
