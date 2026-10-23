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
		route: "/",
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
		detail: "repeat - additional source context for the same failure",
		route: "/",
		now: 1_500,
	});
	let collection = appendEngineDebugDiagnostics([], hydration);
	collection = appendEngineDebugDiagnostics(collection, duplicate);
	assert.equal(collection.length, 1, "duplicate messages are coalesced");
	assert.equal(collection[0].detail, "repeat - additional source context for the same failure", "a repeated message replaces detail when it adds more useful context");
	assert.equal(collection[0].repeatCount, 2, "repeat count is recorded");
	collection = appendEngineDebugDiagnostics(collection, createEngineDebugDiagnostic({ source: "runtime", message: "intervening issue", now: 1_600, route: "/" }));
	collection = appendEngineDebugDiagnostics(collection, createEngineDebugDiagnostic({ source: "console", message: hydration.message, detail: "repeat much later", route: "/docs", now: 30_000 }));
	assert.equal(collection.filter((item) => item.message === hydration.message).length, 1, "duplicates coalesce across intervening messages");
	assert.equal(collection.find((item) => item.message === hydration.message).repeatCount, 3, "later repeats increment the count");
	assert.deepEqual(collection.find((item) => item.message === hydration.message).routes, ["/", "/docs"], "identical issues on different routes are grouped");
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
	const whitespaceMappedSource = parseEngineDebugSourceLocation({
		location: "",
		message: "ENGINE_DEBUG_CAPTURE_SMOKE hydration mismatch at app/page.tsx:14:2",
		detail: "",
	});
	assert.deepEqual(whitespaceMappedSource, { path: "app/page.tsx", line: 14, column: 2 },
		"source locations are parsed even when a diagnostic path follows whitespace rather than a parenthesis");
	assert.equal(parseEngineDebugSchemaPath({
		location: "/",
		message: "EngineError(E001): [schema:root.children[2]] Unknown node type",
		detail: "",
	}), "root.children[2]", "schema diagnostics preserve their exact Engine node path");

	const {
		createEngineDebugSourcePreview,
		createEngineDebugSourceDocument,
		saveEngineDebugSourceDocument,
	} = require("../src/engine/debug/EngineDebugSourceRoute.ts");
	const {
		getEngineDebugAutoCompletions,
		getEngineDebugFixSuggestions,
	} = require("../src/engine/debug/EngineDebugCodeActions.ts");
	const sourcePreview = createEngineDebugSourcePreview(process.cwd(), "src/engine/debug/EngineDebugDiagnostics.ts", 1);
	assert.ok(sourcePreview, "development source preview reads an allowed workspace source file");
	assert.equal(sourcePreview.path, "src/engine/debug/EngineDebugDiagnostics.ts");
	assert.equal(sourcePreview.highlightLine, 1);
	assert.ok(sourcePreview.lines.some((line) => line.number === 1), "source preview includes the selected line");
	assert.equal(createEngineDebugSourcePreview(process.cwd(), "../.env", 1), null, "source preview rejects parent traversal");
	assert.equal(createEngineDebugSourcePreview(process.cwd(), ".env.local", 1), null, "source preview rejects hidden environment files");
	assert.equal(createEngineDebugSourcePreview(process.cwd(), "node_modules/typescript/lib/typescript.js", 1), null, "source preview rejects dependency directories");

	const brokenHookSource = '"use client";\nexport default function Page() { const [count, setCount] = useState(0); return <button onClick={() => setCount(count + 1)}>{count}</button>; }\n';
	const completions = getEngineDebugAutoCompletions("app/page.tsx", brokenHookSource);
	const hookCompletion = completions.find((action) => action.id === "react-hooks-import");
	assert.ok(hookCompletion, "autocomplete detects used but unimported React hooks");
	assert.match(hookCompletion.replacement, /^"use client";\nimport \{ useState \} from "react";/);
	assert.match(hookCompletion.beforePreview, /useState/);
	assert.match(hookCompletion.afterPreview, /from "react"/);
	const linkCompletion = getEngineDebugAutoCompletions("app/page.tsx", 'export default function Page() { return <Link href="/">Home</Link>; }\n');
	assert.match(linkCompletion.find((action) => action.id === "next-link-import")?.replacement ?? "", /import Link from "next\/link"/,
		"Next.js Link autocomplete uses its default import");
	const hookDiagnostic = {
		message: "ReferenceError: useState is not defined",
		detail: "useState was referenced while rendering app/page.tsx",
		location: "app/page.tsx:1:34",
		source: "runtime",
		category: "Runtime",
	};
	assert.ok(getEngineDebugFixSuggestions(hookDiagnostic, "app/page.tsx", brokenHookSource).some((action) => action.id === "react-hooks-import"),
		"Auto-Fix offers a focused import suggestion for a missing React hook");
	const clientDiagnostic = {
		message: "useState can only be used in a Client Component",
		detail: "Add a use client directive to this component",
		location: "app/page.tsx:1",
		source: "next-overlay",
		category: "SSR",
	};
	const clientFix = getEngineDebugFixSuggestions(clientDiagnostic, "app/page.tsx", 'export default function Page() { return useState(0); }\n');
	assert.match(clientFix.find((action) => action.id === "add-use-client")?.replacement ?? "", /^"use client";\n/);
	const typoDiagnostic = {
		message: "Cannot find name 'usState'. Did you mean 'useState'?",
		detail: "",
		location: "app/page.tsx:3",
		source: "next-overlay",
		category: "SSR",
	};
	assert.match(getEngineDebugFixSuggestions(typoDiagnostic, "app/page.tsx", "const count = usState(0);\n").find((action) => action.id === "replace-suggested-identifier")?.replacement ?? "", /useState/,
		"compiler-suggested identifier fixes are proposed in the editor buffer");


	const os = require("node:os");
	const editorRoot = fs.mkdtempSync(path.join(os.tmpdir(), "engine-debug-editor-"));
	try {
		fs.mkdirSync(path.join(editorRoot, "app"), { recursive: true });
		fs.writeFileSync(path.join(editorRoot, "app/page.tsx"), "before\\n", "utf8");
		const beforeEdit = createEngineDebugSourceDocument(editorRoot, "app/page.tsx");
		assert.ok(beforeEdit, "editor can load an allowed source file");
		const savedEdit = saveEngineDebugSourceDocument(editorRoot, beforeEdit.path, beforeEdit.sha256, "after\\n");
		assert.equal(savedEdit.status, "saved", "editor saves a version-matched file");
		assert.equal(fs.readFileSync(path.join(editorRoot, "app/page.tsx"), "utf8"), "after\\n");
		assert.equal(saveEngineDebugSourceDocument(editorRoot, beforeEdit.path, beforeEdit.sha256, "stale").status, "conflict", "stale edits are rejected");
		assert.equal(saveEngineDebugSourceDocument(editorRoot, "../.env", beforeEdit.sha256, "forbidden").status, "not-found", "editor rejects traversal");
	} finally { fs.rmSync(editorRoot, { recursive: true, force: true }); }

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
		"Source editor",
		"Search routes",
		"ResizeObserver",
		"unhandledrejection",
		"frameWindow.addEventListener(\"error\"",
		"summarizeNextOverlay",
		"dataset.engineDebugCapturedIssue",
		"inferRouteFromSourcePath",
		"console.error",
		"ErrorInspector",
		"Copy issue details",
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
	assert.ok(runtimeMonitorSource.includes("__NEXT_ENGINE_DEBUG_INLINE_ACTIVE__"), "normal-page instrumentation avoids double-patching console.error");
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
	]) assert.ok(sourceRouteSource.includes(required), "source preview route includes " + required);

	console.log("Generation 3 EngineDebug diagnostics smoke: ok");
} finally {
	if (previousTsLoader) require.extensions[".ts"] = previousTsLoader;
	else delete require.extensions[".ts"];
	if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
	else process.env.NODE_ENV = previousNodeEnv;
}
