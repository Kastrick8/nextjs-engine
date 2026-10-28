"use strict";

// Small CommonJS bridge for compiler sources that are intentionally kept as TypeScript.
// Preserve a loader already installed by Next.js, ts-node, or the schema worker.
const fs = require("node:fs");
const ts = require("typescript");

if (!require.extensions[".ts"]) {
	const handler = function engineNencTypeScriptCompilerHook(module, filename) {
		const sourceText = fs.readFileSync(filename, "utf8");
		const result = ts.transpileModule(sourceText, {
			compilerOptions: {
				module: ts.ModuleKind.CommonJS,
				target: ts.ScriptTarget.ES2022,
				esModuleInterop: true,
				jsx: ts.JsxEmit.ReactJSX,
			},
			fileName: filename,
			reportDiagnostics: true,
		});
		const errors = (result.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error);
		if (errors.length) {
			const message = ts.formatDiagnosticsWithColorAndContext(errors, {
				getCurrentDirectory: process.cwd,
				getCanonicalFileName: (name) => name,
				getNewLine: () => "\n",
			});
			throw new SyntaxError(message);
		}
		module._compile(result.outputText, filename);
	};
	handler.__engineNencTypeScriptCompilerHook = true;
	require.extensions[".ts"] = handler;
}

module.exports = { typeScriptCompilerLoaderInstalled: true };
