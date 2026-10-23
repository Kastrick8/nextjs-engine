"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const previousTsLoader = require.extensions[".ts"];
const previousNodeEnv = process.env.NODE_ENV;
require.extensions[".ts"] = function engineDebugDiagnosticsSmokeLoader(module, filename) {
	const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022,
			esModuleInterop: true,
		},
		fileName: filename,
	}).outputText;
	module._compile(output, filename);
};
process.env.NODE_ENV = "development";

try {
	const {
		appendEngineDebugDiagnostics,
		classifyEngineDebugDiagnostic,
		createEngineDebugDiagnostic,
		formatEngineDebugDiagnostic,
		redactEngineDebugText,
	} = require("../src/engine/debug/EngineDebugDiagnostics.ts");

	const hydration = createEngineDebugDiagnostic({
		source: "console",
		message: "Warning: Text content did not match. Server: \"Loading\" Client: \"Ready\"",
		detail: "at Home (app/page.tsx:14)",
		location: "/",
		now: 1_000,
	});
	assert.equal(hydration.category, "Hydration", "hydration mismatch messages get a dedicated category");
	assert.equal(hydration.severity, "error", "a hydration mismatch is surfaced as an error");
	assert.equal(hydration.ownerHint, "Likely application code", "application source paths are classified as app-owned hints");

	const engineError = createEngineDebugDiagnostic({
		source: "runtime",
		message: "Canvas init failed",
		detail: "at EngineCanvas (src/engine/core/enginecanvas/EngineCanvas.tsx:71)",
		now: 2_000,
	});
	assert.equal(engineError.ownerHint, "Likely NE source", "Engine source paths are identified as possible Engine regressions");

	const frameworkError = classifyEngineDebugDiagnostic("runtime", "React error", "at react-dom/client");
	assert.equal(frameworkError.ownerHint, "Likely React / Next.js", "framework stack paths have their own owner hint");

	const crossRealmError = redactEngineDebugText({
		name: "TypeError",
		message: "Cross-realm error is preserved",
		stack: "TypeError: Cross-realm error is preserved\n    at render (app/page.tsx:8)",
	});
	assert.match(crossRealmError, /Cross-realm error is preserved/,
		"Error objects from the iframe realm retain their message and stack");
	assert.match(crossRealmError, /app\/page\.tsx/,
		"cross-realm stack locations remain useful for owner classification");

	const ssrError = createEngineDebugDiagnostic({
		source: "next-overlay",
		message: "Next.js development error overlay",
		detail: "Failed to render on the server",
		now: 3_000,
	});
	assert.equal(ssrError.category, "SSR", "visible server-render messages are categorized as SSR");

	const redacted = redactEngineDebugText("Authorization: Bearer abc.def.ghi api_key=secret-value cookie: sid=private");
	assert.doesNotMatch(redacted, /abc\.def\.ghi|secret-value|sid=private/, "common credential-like values are redacted");
	assert.match(redacted, /redacted/i, "redaction is visible rather than silently dropping context");

	const duplicate = createEngineDebugDiagnostic({
		source: "console",
		message: hydration.message,
		detail: "repeat",
		location: "/",
		now: 1_500,
	});
	let collection = appendEngineDebugDiagnostics([], hydration);
	collection = appendEngineDebugDiagnostics(collection, duplicate);
	assert.equal(collection.length, 1, "consecutive duplicate messages are coalesced inside the dedupe window");
	assert.equal(collection[0].detail, "repeat", "a repeated message can refresh available detail");
	for (let index = 0; index < 205; index++) {
		collection = appendEngineDebugDiagnostics(collection, createEngineDebugDiagnostic({
			source: "runtime",
			message: "runtime " + index,
			now: 10_000 + index,
		}));
	}
	assert.equal(collection.length, 200, "the diagnostic history remains bounded to 200 entries");

	const formatted = formatEngineDebugDiagnostic(ssrError);
	assert.match(formatted, /SSR/);
	assert.match(formatted, /Likely owner:/);
	assert.match(formatted, /Failed to render on the server/);

	const {
		parseEngineDebugSchemaPath,
		parseEngineDebugSourceLocation,
	} = require("../src/engine/debug/EngineDebugInlineCallout.ts");
	const mappedSource = parseEngineDebugSourceLocation({
		location: "/engine-compat-test/browser-dialog/fallback",
		message: "Preview failed",
		detail: "at EngineCard (app/page.tsx:14:6)",
	});
	assert.deepEqual(mappedSource, { path: "app/page.tsx", line: 14, column: 6 },
		"inline issue markers extract an authoring file and line/column from a mapped stack");
	assert.equal(parseEngineDebugSchemaPath({
		location: "/",
		message: "EngineError(E001): [schema:root.children[2]] Unknown node type",
		detail: "",
	}), "root.children[2]", "schema diagnostics preserve their exact Engine node path");

	const {
		createEngineDebugSourcePreview,
	} = require("../src/engine/debug/EngineDebugSourceRoute.ts");
	const sourcePreview = createEngineDebugSourcePreview(process.cwd(), "src/engine/debug/EngineDebugDiagnostics.ts", 1);
	assert.ok(sourcePreview, "development source preview reads an allowed workspace source file");
	assert.equal(sourcePreview.path, "src/engine/debug/EngineDebugDiagnostics.ts");
	assert.equal(sourcePreview.highlightLine, 1);
	assert.ok(sourcePreview.lines.some((line) => line.number === 1), "source preview includes the selected line");
	assert.equal(createEngineDebugSourcePreview(process.cwd(), "../.env", 1), null, "source preview rejects parent traversal");
	assert.equal(createEngineDebugSourcePreview(process.cwd(), ".env.local", 1), null, "source preview rejects hidden environment files");
	assert.equal(createEngineDebugSourcePreview(process.cwd(), "node_modules/typescript/lib/typescript.js", 1), null, "source preview rejects dependency directories");

	const pageSource = fs.readFileSync(path.resolve(__dirname, "../src/engine/debug/EngineDebugPage.tsx"), "utf8");
	const pageCompile = ts.transpileModule(pageSource, {
		reportDiagnostics: true,
		compilerOptions: {
			jsx: ts.JsxEmit.ReactJSX,
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022,
			esModuleInterop: true,
		},
	});
	const syntaxErrors = (pageCompile.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
	assert.equal(syntaxErrors.length, 0,
		"EngineDebug TSX parses cleanly: " + syntaxErrors.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\\n")).join("\\n"));
	for (const required of [
		"unhandledrejection",
		"frameWindow.addEventListener(\"error\"",
		"Next.js development error overlay",
		"console.error",
		"ErrorInspector",
		"Copy details",
		"ed-activity",
		"ed-problem-toolbar",
		"Waiting for Next.js",
		"ed-preview-progress",
		"aria-busy={previewStatus === \"waiting\"}",
		"Reload preview",
		"View Problems",
		"handlePreviewLoad",
		"installEngineDebugInlineCallout",
		"nextjs-engine:debug:view-diagnostic",
	]) assert.ok(pageSource.includes(required), "debug workbench includes " + required);


	const inlineCalloutSource = fs.readFileSync(path.resolve(__dirname, "../src/engine/debug/EngineDebugInlineCallout.ts"), "utf8");
	for (const required of [
		"data-engine-debug-error-target",
		"Source preview",
		"View on Dashboard",
		"app/page.tsx",
		"nextjs-engine:debug:view-diagnostic",
	]) assert.ok(inlineCalloutSource.includes(required), "inline callout includes " + required);
	const sourceRouteSource = fs.readFileSync(path.resolve(__dirname, "../src/engine/debug/EngineDebugSourceRoute.ts"), "utf8");
	for (const required of [
		"process.env.NODE_ENV",
		"isLoopbackHost",
		"FORBIDDEN_SEGMENTS",
		"MAX_SOURCE_BYTES",
	]) assert.ok(sourceRouteSource.includes(required), "source preview route includes " + required);

	console.log("Generation 3 EngineDebug diagnostics smoke: ok");
} finally {
	if (previousTsLoader) require.extensions[".ts"] = previousTsLoader;
	else delete require.extensions[".ts"];
	if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
	else process.env.NODE_ENV = previousNodeEnv;
}
