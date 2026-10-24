"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const plugin = require("../src/engine/plugins/enginePlugin");
const adapter = require("../src/engine/plugins/engineBuildAdapter");
const nencLogger = require("../src/engine/plugins/nencTerminalLogger");

const defaultCacheConfig = plugin.withEngineTurbopackCache({ experimental: { keepUserSetting: true } });
assert.equal(defaultCacheConfig.experimental.turbopackFileSystemCacheForDev, true,
	"Engine opts into Next.js Turbopack cache for development");
assert.equal(defaultCacheConfig.experimental.turbopackFileSystemCacheForBuild, true,
	"Engine opts into Next.js Turbopack cache for repeat production builds");
assert.equal(defaultCacheConfig.experimental.keepUserSetting, true, "unrelated Next.js experimental options survive");
const explicitCacheOptOut = plugin.withEngineTurbopackCache({ experimental: {
	turbopackFileSystemCacheForDev: false,
	turbopackFileSystemCacheForBuild: false,
} });
assert.equal(explicitCacheOptOut.experimental.turbopackFileSystemCacheForDev, false,
	"apps can explicitly disable the development cache");
assert.equal(explicitCacheOptOut.experimental.turbopackFileSystemCacheForBuild, false,
	"apps can explicitly disable the build cache");

assert.deepEqual(nencLogger.classifyNextBuildLine("○ Compiling /request, /guide, emd ..."), {
	level: "route-start", routes: ["/request", "/guide", "emd"],
	message: "Compiling /request, /guide, emd", suppressible: true,
}, "development route compilation is recognized from actual Next.js output");
assert.deepEqual(nencLogger.classifyNextBuildLine("✓ Compiled /request in 1050ms (434 modules)"), {
	level: "route-done", route: "/request", details: "1050ms, 434 modules",
	message: "compiled /request (1050ms, 434 modules)", suppressible: true,
}, "route completion preserves Next.js's real duration and module count");
assert.deepEqual(nencLogger.classifyNextBuildLine("GET / 200 in 89ms (compile: 23ms, render: 66ms)"), {
	level: "request", method: "GET", route: "/", statusCode: 200, compileDuration: "23ms", suppressible: false,
}, "request completion uses Next.js's actual reported compile duration");
assert.deepEqual(nencLogger.classifyNextBuildLine("  Creating an optimized production build ..."), {
	level: "status", message: "NEXT.JS COMPILING APPLICATION", suppressible: true,
}, "a Next.js build phase is mirrored to the pinned row");
assert.deepEqual(nencLogger.classifyNextBuildLine("✓ Compiled successfully in 2.1s"), {
	level: "done", message: "NEXT.JS COMPILED APPLICATION", suppressible: true,
}, "a complete Next.js compile step becomes a DONE line");
assert.deepEqual(nencLogger.classifyNextBuildLine("  Linting and checking validity of types ..."), {
	level: "status", message: "NEXT.JS CHECKING TYPES", suppressible: true,
}, "Next.js type-checking progress is exposed");
assert.deepEqual(nencLogger.classifyNextBuildLine("  Generating static pages (3/8) ..."), {
	level: "status", message: "NEXT.JS GENERATING STATIC PAGES (3/8, 37.5%)", suppressible: true,
}, "static page progress keeps its current count");
assert.deepEqual(nencLogger.classifyNextBuildLine("✓ Generating static pages (8/8) in 243ms"), {
	level: "done", message: "GENERATED STATIC PAGES (8/8, 100%)", suppressible: true,
}, "finished static-page generation gets a completion line");
assert.deepEqual(nencLogger.classifyNextBuildLine("Failed to compile."), {
	level: "failed", message: "NEXT.JS BUILD FAILED", suppressible: true,
}, "Next.js compile failure is mapped without swallowing other error output");
assert.equal(nencLogger.classifyNextBuildLine("the compiler emitted a warning"), null,
	"unrecognized Next.js output is not rewritten");

// Simulate terminal writes so the bridge contract is checked even in CI/non-TTY environments.
const originalWrite = process.stdout.write;
const originalCI = process.env.CI;
const passedThrough = [];
process.env.CI = "true";
process.stdout.write = function (chunk) {
	passedThrough.push(Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk));
	return true;
};
const stopOutputBridge = nencLogger.installNextBuildOutputBridge({ mode: "dev" });
try {
	process.stdout.write("  Creating an optimized production build ...\n");
	assert.ok(passedThrough.some((chunk) => chunk.includes("[NENC] NEXT.JS COMPILING APPLICATION")),
		"recognized status messages remain visible without a pinned TTY row");

	passedThrough.length = 0;
	process.stdout.write("○ Compiling /request, /guide, emd ...\n");
	assert.ok(passedThrough.some((chunk) => chunk.includes("[NENC] Compiling /request, /guide, emd")),
		"route progress cannot silently disappear when the output is redirected");

	passedThrough.length = 0;
	process.stdout.write("✓ Compiled /request in 1050ms (434 modules)\n");
	assert.ok(passedThrough.some((chunk) => chunk.includes("[NENC] DONE compiled /request (1050ms, 434 modules)")),
		"route completion emits the actual duration and module count");

	passedThrough.length = 0;
	process.stdout.write("GET / 200 in 89ms (compile: 23ms, render: 66ms)\n");
	assert.ok(passedThrough.some((chunk) => chunk.includes("[NENC] DONE compiled / — compile 23ms")),
		"a request log can finish the exact route using Next.js's reported compile duration");

	passedThrough.length = 0;
	process.stdout.write("custom warning that should remain visible\n");
	assert.ok(passedThrough.some((chunk) => chunk.includes("custom warning that should remain visible")),
		"unrecognized diagnostics remain untouched");
} finally {
	nencLogger.clearStatus();
	stopOutputBridge();
	process.stdout.write = originalWrite;
	if (originalCI === undefined) delete process.env.CI;
	else process.env.CI = originalCI;
}
const originalDelegate = process.env.NEXTJS_ENGINE_DELEGATE_ADAPTER;

async function main() {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "nextjs-engine-adapter-smoke-"));
	try {
		const delegatePath = path.join(root, "custom-adapter.cjs");
		const callbackMarker = path.join(root, "on-build-complete.json");
		fs.writeFileSync(delegatePath, [
			'const fs = require("node:fs");',
			"module.exports = {",
			"\tasync modifyConfig(config, context) {",
			"\t\treturn { ...config, delegatedPhase: context.phase };",
			"\t},",
			"\tasync onBuildComplete(context) {",
			"\t\tfs.writeFileSync(" + JSON.stringify(callbackMarker) + ", JSON.stringify({ projectDir: context.projectDir }));",
			"\t},",
			"};",
			"",
		].join("\n"));

		const config = plugin.withEngineBuildAdapter({ distDir: "proof-dist" }, { adapterPath: delegatePath });
		assert.equal(config.adapterPath, require.resolve("../src/engine/plugins/engineBuildAdapter"),
			"the combined Engine plugin configures its own Next.js lifecycle adapter");
		assert.equal(process.env.NEXTJS_ENGINE_DELEGATE_ADAPTER, delegatePath,
			"an existing application adapter is preserved as the Engine adapter's delegate");

		const modified = await adapter.modifyConfig({ answer: 42 }, { phase: "phase-development-server" });
		assert.equal(modified.answer, 42, "the original config survives adapter delegation");
		assert.equal(modified.delegatedPhase, "phase-development-server", "the existing adapter's modifyConfig hook is chained");
		await adapter.onBuildComplete({ projectDir: root, distDir: path.join(root, "proof-dist") });
		assert.deepEqual(JSON.parse(fs.readFileSync(callbackMarker, "utf8")), { projectDir: root },
			"the existing adapter's onBuildComplete hook is chained after Engine finalization");

		console.log("Generation 3 build adapter smoke: ok");
	} finally {
		adapter.stopDevelopmentBridge();
		if (originalDelegate === undefined) delete process.env.NEXTJS_ENGINE_DELEGATE_ADAPTER;
		else process.env.NEXTJS_ENGINE_DELEGATE_ADAPTER = originalDelegate;
		fs.rmSync(root, { recursive: true, force: true });
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
