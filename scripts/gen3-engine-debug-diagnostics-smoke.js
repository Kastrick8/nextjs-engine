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
		engineDebugDiagnosticFingerprint,
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
		detail: hydration.detail + "\nrepeat",
		location: "/",
		route: "/guide",
		now: 1_500,
	});
	let collection = appendEngineDebugDiagnostics([], hydration);
	collection = appendEngineDebugDiagnostics(collection, duplicate);
	assert.equal(collection.length, 1, "identical issues are coalesced across routes");
	assert.equal(collection[0].detail, "repeat", "a repeated message can refresh available detail");
	assert.equal(collection[0].occurrences, 2, "merged errors retain their occurrence count");
	assert.deepEqual(collection[0].routes, ["/", "/guide"], "merged errors retain each affected route");
	assert.equal(engineDebugDiagnosticFingerprint(hydration), engineDebugDiagnosticFingerprint(duplicate), "fingerprints ignore the route that observed an issue");
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
		applyEngineDebugSourcePatch,
	} = require("../src/engine/debug/EngineDebugSourceRoute.ts");
	const sourcePreview = createEngineDebugSourcePreview(process.cwd(), "src/engine/debug/EngineDebugDiagnostics.ts", 1);
	assert.ok(sourcePreview, "development source preview reads an allowed workspace source file");
	assert.equal(sourcePreview.path, "src/engine/debug/EngineDebugDiagnostics.ts");
	assert.equal(sourcePreview.highlightLine, 1);
	assert.ok(sourcePreview.lines.some((line) => line.number === 1), "source preview includes the selected line");
	assert.equal(createEngineDebugSourcePreview(process.cwd(), "../.env", 1), null, "source preview rejects parent traversal");
	assert.equal(createEngineDebugSourcePreview(process.cwd(), ".env.local", 1), null, "source preview rejects hidden environment files");
	assert.equal(createEngineDebugSourcePreview(process.cwd(), "node_modules/typescript/lib/typescript.js", 1), null, "source preview rejects dependency directories");

	const tempRoot = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "engine-debug-patch-"));
	try {
		const fixturePath = path.join(tempRoot, "src", "app", "page.tsx");
		fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
		const before = 'const label = "before";\\nexport {};';
		fs.writeFileSync(fixturePath, before, "utf8");
		const saved = applyEngineDebugSourcePatch(tempRoot, "src/app/page.tsx", 1, 1,
			['const label = "before";', "export {};"], ['const label = "after";', "export {};"]);
		assert.equal(saved.ok, true, "valid explicit source patches save to the workspace");
		assert.equal(fs.readFileSync(fixturePath, "utf8"), 'const label = "after";\\nexport {};', "patches update only the requested line range");
		const stale = applyEngineDebugSourcePatch(tempRoot, "src/app/page.tsx", 1, 1,
			['const label = "before";', "export {};"], ['const label = "wrong";', "export {};"]);
		assert.equal(stale.ok, false, "patches based on stale source context are rejected");
		if (!stale.ok) assert.equal(stale.code, "stale", "stale patch responses have a stable code");
		assert.equal(applyEngineDebugSourcePatch(tempRoot, "../outside.ts", 1, 1, ["x"], ["y"]).ok, false, "patches reject path traversal");
	} finally {
		fs.rmSync(tempRoot, { recursive: true, force: true });
	}

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

	const editorSource = fs.readFileSync(path.resolve(__dirname, "../src/engine/debug/EngineDebugFixEditor.tsx"), "utf8");
	const editorCompile = ts.transpileModule(editorSource, {
		reportDiagnostics: true,
		compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
	});
	const editorSyntaxErrors = (editorCompile.diagnostics ?? []).filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error);
	assert.equal(editorSyntaxErrors.length, 0, "EngineDebug editor TSX parses cleanly: " + editorSyntaxErrors.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\\n")).join("\\n"));
	for (const required of ["EngineDebugFixEditor", "ed-route-search", "Fit preview to available space", "source !== \"next-overlay\"", "ed-selected-detail", "route: frameWindow.location.pathname"]) {
		assert.ok(pageSource.includes(required), "dashboard contains " + required);
	}
	for (const required of ["Suggest auto-fix", "Apply changes", "originalLines", "replacementLines"]) assert.ok(editorSource.includes(required), "source editor contains " + required);

	const runtimeMonitorSource = fs.readFileSync(path.resolve(__dirname, "../src/engine/debug/EngineDebugRuntimeMonitor.tsx"), "utf8");
	const monitorCompile = ts.transpileModule(runtimeMonitorSource, {
		reportDiagnostics: true,
		compilerOptions: {
			jsx: ts.JsxEmit.ReactJSX,
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022,
			esModuleInterop: true,
		},
	});
	const monitorSyntaxErrors = (monitorCompile.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
	assert.equal(monitorSyntaxErrors.length, 0,
		"normal-page monitor TSX parses cleanly: " + monitorSyntaxErrors.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\\n")).join("\\n"));
	const createPageSource = fs.readFileSync(path.resolve(__dirname, "../src/engine/createPage.tsx"), "utf8");
	assert.match(createPageSource, /process\.env\.NODE_ENV === "development" && <EngineDebugRuntimeMonitor \/>/,
		"normal Engine pages only mount the inline diagnostics monitor during development");
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
	]) assert.ok(pageSource.includes(required), "debug workbench includes " + required);


	assert.ok(runtimeMonitorSource.includes('url.searchParams.get("__engine_debug") === "1"'), "normal-page monitor skips the dashboard preview to prevent duplicate overlays");
	const inlineCalloutSource = fs.readFileSync(path.resolve(__dirname, "../src/engine/debug/EngineDebugInlineCallout.ts"), "utf8");
	for (const required of [
		"data-engine-debug-error-target",
		"Source preview",
		"View on Dashboard",
		"SOURCE_LOCATION",
		"nextjs-engine:debug:diagnostic-handoff",
	]) assert.ok(inlineCalloutSource.includes(required), "inline callout includes " + required);
	const sourceRouteSource = fs.readFileSync(path.resolve(__dirname, "../src/engine/debug/EngineDebugSourceRoute.ts"), "utf8");
	for (const required of [
		"process.env.NODE_ENV",
		"isLoopbackHost",
		"FORBIDDEN_SEGMENTS",
		"MAX_SOURCE_BYTES",
		"applyEngineDebugSourcePatch",
		"A same-origin request is required",
		"writeFileSync(target.path, updated",
	]) assert.ok(sourceRouteSource.includes(required), "source preview/edit route includes " + required);
	const debugPluginSource = fs.readFileSync(path.resolve(__dirname, "../src/engine/plugins/engineDebugPlugin.js"), "utf8");
	assert.ok(debugPluginSource.includes("export { GET, POST }"), "the generated debug source route exports its guarded save handler");

	console.log("Generation 3 EngineDebug diagnostics smoke: ok");
} finally {
	if (previousTsLoader) require.extensions[".ts"] = previousTsLoader;
	else delete require.extensions[".ts"];
	if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
	else process.env.NODE_ENV = previousNodeEnv;
}
