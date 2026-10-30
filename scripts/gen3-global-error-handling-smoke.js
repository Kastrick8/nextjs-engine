"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

function containsExactUrl(text, expectedValue) {
	const expected = new URL(expectedValue);
	return String(text).split(/\\s+/).some((part) => {
		const candidate = part.replace(/[),.;]+$/, "");
		try {
			const actual = new URL(candidate);
			return actual.protocol === expected.protocol
				&& actual.host === expected.host
				&& actual.pathname === expected.pathname
				&& actual.search === expected.search
				&& actual.hash === expected.hash;
		} catch {
			return false;
		}
	});
}


const { GENERATED_MARKER, prepareEngineErrorHandling } = require("../src/engine/plugins/engineErrorHandling");
const {
	createEngineErrorReport,
	formatEngineErrorReport,
	reportEngineError,
	installEngineUncaughtExceptionMonitor,
} = require("../src/engine/errors/engineErrorReporter");

function makeRoot(prefix) {
	return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function compile(source, jsx, label) {
	const result = ts.transpileModule(source, {
		reportDiagnostics: true,
		compilerOptions: {
			target: ts.ScriptTarget.ES2022,
			module: ts.ModuleKind.CommonJS,
			jsx: jsx ? ts.JsxEmit.ReactJSX : ts.JsxEmit.Preserve,
			esModuleInterop: true,
		},
	});
	const errors = (result.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error);
	assert.equal(errors.length, 0, label + ": " + errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n"));
}

const root = makeRoot("nextjs-engine-errors-");
try {
	fs.mkdirSync(path.join(root, "app"), { recursive: true });
	const first = prepareEngineErrorHandling({ rootDir: root, development: true });
	assert.deepEqual(first.preserved, [], "fresh projects should not have user-owned files to preserve");
	assert.ok(first.generated.includes("app/error.tsx"), "a route error UI is generated");
	assert.ok(first.generated.includes("app/global-error.tsx"), "the root-layout error UI is generated");
	assert.ok(first.generated.includes("instrumentation.ts"), "request error instrumentation is generated");
	const errorSource = fs.readFileSync(path.join(root, "app", "error.tsx"), "utf8");
	const globalSource = fs.readFileSync(path.join(root, "app", "global-error.tsx"), "utf8");
	const instrumentation = fs.readFileSync(path.join(root, "instrumentation.ts"), "utf8");
	assert.ok(errorSource.startsWith(GENERATED_MARKER));
	assert.match(errorSource, /NECORE4001/);
	assert.match(globalSource, /NECORE4002/);
	assert.match(globalSource, /<html lang="en">/);
	assert.match(instrumentation, /onRequestError/);
	assert.match(instrumentation, /NECORE4003/, "the request hook uses the stable Error Book code");
	assert.match(instrumentation, /installEngineUncaughtExceptionMonitor/);
	assert.match(errorSource, /\.\.\/\.\.\/\.\.\/.*src\/engine\/errors\/engineErrorReporter/,
		"consumer projects without a local src tree import the reporter beside the installed Engine plugin");
	compile(errorSource, true, "generated app/error.tsx");
	compile(globalSource, true, "generated app/global-error.tsx");
	compile(instrumentation, false, "generated instrumentation.ts");
	const second = prepareEngineErrorHandling({ rootDir: root, development: true });
	assert.equal(second.generated.length, 3, "re-running setup is idempotent");
} finally {
	fs.rmSync(root, { recursive: true, force: true });
}

const customRoot = makeRoot("nextjs-engine-custom-errors-");
try {
	fs.mkdirSync(path.join(customRoot, "app"), { recursive: true });
	fs.writeFileSync(path.join(customRoot, "app", "error.tsx"), "// application-owned route boundary\nexport default function ErrorPage() { return null; }\n", "utf8");
	fs.writeFileSync(path.join(customRoot, "instrumentation.ts"), "// application-owned instrumentation\nexport function register() {}\n", "utf8");
	const result = prepareEngineErrorHandling({ rootDir: customRoot, development: true });
	assert.ok(result.preserved.includes("app/error.tsx"), "custom route boundaries are never overwritten");
	assert.ok(result.preserved.includes("instrumentation.ts"), "custom instrumentation is never overwritten");
	assert.match(fs.readFileSync(path.join(customRoot, "app", "error.tsx"), "utf8"), /application-owned/);
	assert.match(fs.readFileSync(path.join(customRoot, "instrumentation.ts"), "utf8"), /application-owned/);
	assert.ok(fs.existsSync(path.join(customRoot, "app", "global-error.tsx")), "an absent global boundary can still be generated");
} finally {
	fs.rmSync(customRoot, { recursive: true, force: true });
}

const report = createEngineErrorReport(
	Object.assign(new Error("Request failed?token=secret-token Bearer very-secret"), {
		cause: new TypeError("Underlying lookup failed because api_key=private-api-key"),
	}),
	{
		code: "NE-TEST-01",
		source: "smoke-test",
		location: "src/app/page.tsx:14:2",
		route: "/guide?access_token=private-route-token",
		requestMethod: "GET",
		requestPath: "/guide?token=private-query-token",
		includeStack: true,
	},
);
const formatted = formatEngineErrorReport(report, { color: false });
assert.match(formatted, /\[nextjs-engine\]\[ERROR NE-TEST-01\]/);
assert.match(formatted, /src\/app\/page\.tsx:14:2/, "file locations use VS Code-clickable path:line:column notation");
assert.match(formatted, /Route: \/guide/, "route query strings are not printed");
assert.match(formatted, /Request: GET \/guide/, "request query strings are not printed");
assert.match(formatted, /Caused by: TypeError: Underlying lookup failed/, "nested error causes are shown");
assert.ok(containsExactUrl(formatted, "https://kastrick.vercel.app/project/nextjs-engine"), "terminal diagnostics include the exact Kastrick website project link");
assert.ok(formatted.includes("Error Book · NE-TEST-01"), "formatted report names the Error Book");
assert.ok(containsExactUrl(formatted, "https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes"), "custom codes fall back to the exact Error Book index URL");
assert.doesNotMatch(formatted, /secret-token|very-secret|private-route-token|private-query-token|private-api-key/, "token-like values are redacted");
assert.doesNotMatch(formatted, /\u001b\[/, "plain-text mode emits no ANSI escapes");
const colored = formatEngineErrorReport(report, { color: true });
assert.match(colored, /\u001b\[31m/, "color mode applies ANSI severity styling");

const consoleMessages = [];
const originalConsoleError = console.error;
console.error = (value) => consoleMessages.push(String(value));
try {
	reportEngineError(new Error("error reporter smoke"), { code: "NE-TEST-02", source: "smoke-test", location: "app/page.tsx:2:4", includeStack: false });
} finally {
	console.error = originalConsoleError;
}
assert.match(consoleMessages.join("\n"), /NE-TEST-02/, "reportEngineError writes structured terminal output");
assert.ok(containsExactUrl(consoleMessages.join("\n"), "https://kastrick.vercel.app/project/nextjs-engine"), "runtime logging includes the exact Kastrick website project link");
assert.ok(consoleMessages.join("\n").includes("Help:"), "runtime logging includes an Error Book help URL");

const monitorCount = process.listenerCount("uncaughtExceptionMonitor");
const stopMonitor = installEngineUncaughtExceptionMonitor();
assert.equal(process.listenerCount("uncaughtExceptionMonitor"), monitorCount + 1, "the monitor observes uncaught exceptions");
stopMonitor();
assert.equal(process.listenerCount("uncaughtExceptionMonitor"), monitorCount, "the monitor can be cleanly uninstalled");
console.log("Generation 3 global error-handling smoke test passed.");
