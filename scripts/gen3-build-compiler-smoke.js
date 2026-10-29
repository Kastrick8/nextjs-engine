"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
	ASCII_WORDMARK,
	BOTTOM_TEXT,
	compileProject,
	createWorkerTaskPlan,
	emitArtifacts,
	printBanner,
	printBannerOnce,
	releaseBanner,
	renderBannerLines,
	summarizeNextOutputs,
	formatCompiledSchemaLine,
	formatSchemaSourcePath,
	formatFontBuildSummary,
	planThemeFontWork,
} = require("../src/engine/compiler/gen3-build-compiler");

const {
	formatDoneLine,
	formatStatusLine,
	formatWorkerStatus,
	formatBytesPerSecond,
	formatWorkerPanel,
	formatWorkerOperation,
	renderProgressDots,
	colorizeLogLine,
	formatErroredLine,
} = require("../src/engine/plugins/nencTerminalLogger");
const { schemaOutputCachePath } = require("../src/engine/plugins/gen3SchemaCache");

assert.equal(formatDoneLine("COMPILED PAGE : app/page.tsx"), "[NENC] DONE COMPILED PAGE : app/page.tsx");
assert.ok(formatStatusLine("COMPILING CUSTOM COMPONENT : Notice", 32).startsWith("[NENC] "));
assert.ok(formatStatusLine("COMPILING CUSTOM COMPONENT : Notice", 32).length <= 31,
	"the pinned status must fit one terminal row without wrapping");
assert.equal(formatWorkerStatus([
	{ operation: "Compiling", target: "/guide", mode: "percent", progress: 43 },
	{ operation: "Compiling", target: "emd", mode: "percent", progress: 57 },
	{ operation: "Compiling", target: "ec", mode: "percent", progress: 80 },
]), "Compiling /guide, emd, ec · (43% - 57% - 80%)",
"three live compilation workers share one compact status line with independent real progress");
assert.equal(formatWorkerStatus([
	{ operation: "Compiling", target: "/guide", mode: "percent", progress: 33.3 },
	{ operation: "Downloading", target: "ICON:google.com", mode: "rate", bytesPerSecond: 8202 },
]), "Compiling /guide (33.3%) · Downloading: ICON:google.com (8 KB/s)",
"mixed compilation and icon-download jobs show the correct metric for each worker");
assert.equal(formatWorkerOperation("Downloading"), "Downloading:");
assert.equal(formatWorkerOperation("Downloading: fonts: Inter"), "Downloading:");
assert.equal(formatBytesPerSecond(8202), "8 KB/s");
assert.equal(formatBytesPerSecond(239000), "239 KB/s");
assert.equal(formatSchemaSourcePath("app/(marketing)/about/page.tsx"), "app/about/page.tsx",
	"route group folders are omitted from human-facing completion paths");
assert.equal(formatCompiledSchemaLine(
	{ sourcePath: "app/work/page.tsx", pageId: "/work" },
	{ summary: { clientIslands: 1, assetCount: 2 } },
	{ durationMs: 19 },
	58,
), "compiled app/work/page.tsx -> /work · 58 Engine modules · 19ms · 1 client island · 2 assets",
"schema completion combines real module count, elapsed time, client islands, and assets");
assert.equal(formatCompiledSchemaLine(
	{ sourcePath: "app/about/page.tsx", pageId: "/about" },
	{ summary: { clientIslands: 0, assetCount: 0 } },
	{ durationMs: 22 },
	0,
), "compiled app/about/page.tsx -> /about · 22ms",
"zero modules, client islands, and assets are omitted rather than printed as noise");

const dashboard = formatWorkerPanel([
	{ operation: "Compiling", target: "/privacy-policy", mode: "percent", progress: 34.2 },
	{ operation: "Compiling", target: "/", mode: "percent", progress: 21.7 },
	{ operation: "Downloading", target: "fonts: Inter, JetBrains Mono", mode: "rate", bytesPerSecond: 239000 },
], 100, false);
assert.equal(dashboard.length, 4, "the status panel has one header and exactly three CW rows");
assert.ok(dashboard[0].startsWith("════ NENC"), "the dashboard has a Cargo-style NENC header");
assert.match(dashboard[1], /^CW1\s+Compiling \/privacy-policy/);
assert.match(dashboard[1], /34\.2%$/);
assert.match(dashboard[2], /^CW2\s+Compiling \/.*21\.7%$/);
assert.match(dashboard[3], /^CW3\s+Downloading: fonts: Inter, JetBrains Mono/);
assert.ok(dashboard[3].endsWith("239 KB/s"), "download row uses the measured KB/s rate");
assert.ok(renderProgressDots(50, 10, true).includes("\u001b["), "progress dots support ANSI contrast");
assert.ok(colorizeLogLine("[NENC] DONE compiled /work", true).includes("\u001b["), "completion lines support ANSI colors");
assert.equal(formatErroredLine("COMPONENT ERRORED app/broken/page.tsx -> /broken"),
	"[NENC] ERRORED COMPONENT ERRORED app/broken/page.tsx -> /broken");
const redErroredLine = colorizeLogLine("[NENC] ERRORED COMPONENT ERRORED app/broken/page.tsx -> /broken", true);
assert.ok(redErroredLine.includes("\u001b[31m") && redErroredLine.includes("COMPONENT ERRORED"),
	"component error records render their full status message in red");
assert.equal(colorizeLogLine("[NENC] DONE compiled /work", false), "[NENC] DONE compiled /work");

const fontPlan = planThemeFontWork([{
	id: "studio",
	content: JSON.stringify({
		format: "nextjs-engine-theme",
		content: {
			scope: "global",
			fonts: ["https://fonts.googleapis.com/css2?family=Inter:wght@400&family=JetBrains+Mono:wght@400"],
		},
	}),
}]);
assert.equal(fontPlan.label, "fonts: Inter, JetBrains Mono", "font work is listed before it is dispatched to a CW");
assert.equal(formatFontBuildSummary({
	themeCount: 1, downloadedFonts: 1, fontAssetsReused: 0, fontAssetsWritten: 1,
	fallbackThemes: 0, downloadedBytes: 184 * 1024,
}), "1 theme, 1 font downloaded, 184 KB transferred", "font summaries omit zero-valued details");
const workerTaskPlan = createWorkerTaskPlan(
	[{ taskId: "schema-work", pageId: "/work" }, { taskId: "schema-about", pageId: "/about" }],
	[{ taskId: "font-download", operation: "Downloading", target: "Inter.woff2" }],
);
assert.deepEqual(workerTaskPlan.map((task) => task.taskType + ":" + task.taskId), [
	"schema:schema-work", "external:font-download", "schema:schema-about",
], "one interleaved static queue schedules downloads and schemas through the same available CW slots");

async function main() {
const root = fs.mkdtempSync(path.join(os.tmpdir(), "nextjs-engine-gen3-build-smoke-"));
try {
	const banner = [];
	printBanner((line) => banner.push(line));
	assert.deepEqual(banner, renderBannerLines(), "the output is exactly the shared framed banner render");
	const bannerAssetDirectory = path.join(__dirname, "..", "src/engine/plugins/banner");
	const readBannerAsset = (name) => fs.readFileSync(path.join(bannerAssetDirectory, name), "utf8")
		.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n");
	assert.deepEqual(ASCII_WORDMARK, readBannerAsset("wordmark.txt"),
		"the main wordmark is loaded directly from its committed TXT asset");
	assert.deepEqual(BOTTOM_TEXT, readBannerAsset("bottom-text.txt"),
		"the footer art is loaded directly from its committed TXT asset");
	const customWordmark = ["X", "a substantially wider wordmark"];
	const customFooter = ["editable footer"];
	const customFrame = renderBannerLines(customWordmark, customFooter);
	const customArtWidth = Math.max(...[...customWordmark, ...customFooter].map((line) => line.length));
	assert.equal(customFrame[0].length, customArtWidth + 6,
		"the outer frame grows to fit the widest supplied art line");
	assert.equal(new Set(customFrame.map((line) => line.length)).size, 1,
		"custom art keeps every border and content row aligned");
	assert.ok(customFrame.some((line) => line.includes("a substantially wider wordmark")),
		"custom art content is preserved by the frame renderer");
	assert.ok(ASCII_WORDMARK.length > 0, "the editable wordmark asset contains at least one line");
	assert.ok(BOTTOM_TEXT.length > 0, "the editable footer asset contains at least one line");
	assert.equal(
		banner.length,
		ASCII_WORDMARK.length + BOTTOM_TEXT.length + 3,
		"banner height follows the current asset line counts plus one separator and two frame rows",
	);
	assert.ok(banner[0].startsWith("╭") && banner[banner.length - 1].startsWith("╰"), "the banner has a light frame");
	assert.equal(new Set(banner.map((line) => line.length)).size, 1, "all frame and content rows align to one width");
	const framedBlankRows = banner.filter((line) => line.startsWith("│") && line.slice(1, -1).trim() === "");
	const artworkBlankRows = [...ASCII_WORDMARK, ...BOTTOM_TEXT].filter((line) => line.trim() === "").length;
	assert.equal(framedBlankRows.length, artworkBlankRows + 1,
		"the renderer preserves whitespace-only artwork rows and inserts a separator between the two assets");
	const sampleWordmark = ASCII_WORDMARK.find((line) => line.trim().length > 0);
	const sampleBottomText = BOTTOM_TEXT.find((line) => line.trim().length > 0);
	assert.ok(sampleWordmark && banner.some((line) => line.includes(sampleWordmark)),
		"the current wordmark art is present in the rendered banner");
	assert.ok(sampleBottomText && banner.some((line) => line.includes(sampleBottomText)),
		"the current bottom-text art is present in the rendered banner");

	const adapterSummary = summarizeNextOutputs({
		nextVersion: "16.4.2",
		buildId: "adapter-fixture",
		outputs: {
			appPages: [{ pathname: "/" }, { pathname: "/about" }, { pathname: "/about.rsc" }],
			appRoutes: [{ pathname: "/api/search" }],
			pages: [{ pathname: "/legacy" }],
			pagesApi: [{ pathname: "/api/legacy" }],
			prerenders: [{ pathname: "/" }, { pathname: "/about" }],
			staticFiles: [{ pathname: "/robots.txt" }, { pathname: "/favicon.ico" }],
		},
	});
	assert.equal(adapterSummary.nextVersion, "16.4.2", "the Next.js version is preserved");
	assert.equal(adapterSummary.counts.appPages, 3, "App Router pages come from the real adapter output field");
	assert.equal(adapterSummary.counts.appRoutes, 1, "App Router handlers and metadata outputs are counted");
	assert.equal(adapterSummary.counts.pages, 1, "Pages Router output is counted separately");
	assert.equal(adapterSummary.counts.pagesApi, 1, "Pages API output is counted separately");
	assert.equal(adapterSummary.counts.prerenders, 2, "prerender output entries are counted");
	assert.equal(adapterSummary.counts.staticFiles, 2, "static files are counted without bloating the manifest with every asset path");
	assert.deepEqual(adapterSummary.paths.appPages, ["/", "/about", "/about.rsc"], "route paths from Next.js are captured and sorted");
	assert.equal(adapterSummary.routeOutputCount, 5, "the canonical route count deduplicates RSC output variants");
	assert.deepEqual(adapterSummary.routePaths, ["/", "/about", "/api/legacy", "/api/search", "/legacy"],
		"canonical route paths are included without .rsc output variants");
	assert.equal(adapterSummary.paths.staticFiles, undefined, "static asset path lists are omitted from the summary");

	const bannerProject = path.join(root, "banner-once-fixture");
	const firstBanner = [];
	const duplicateBanner = [];
	assert.equal(printBannerOnce(bannerProject, (line) => firstBanner.push(line)), true,
		"the first adapter instance claims and prints the banner");
	assert.equal(printBannerOnce(bannerProject, (line) => duplicateBanner.push(line)), false,
		"a duplicate adapter instance in the same build does not print the banner again");
	assert.deepEqual(firstBanner, renderBannerLines(), "the first claim emits the complete banner");
	assert.equal(duplicateBanner.length, 0, "a duplicate claim emits no banner rows");
	releaseBanner(bannerProject);
	assert.equal(printBannerOnce(bannerProject, () => {}), true, "the next build can print after the marker is released");
	releaseBanner(bannerProject);
	const pageDirectory = path.join(root, "app", "(marketing)", "about");
	const emdDirectory = path.join(root, "app", "emd");
	const ecDirectory = path.join(root, "app", "ec");
	for (const directory of [pageDirectory, emdDirectory, ecDirectory]) fs.mkdirSync(directory, { recursive: true });
	fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "engine-build-fixture", version: "1.0.0" }));
	fs.writeFileSync(path.join(root, "app", "components.tsx"), [
		'import { registerComponent } from "nextjs-engine";',
		'function Notice() { return null; }',
		'registerComponent("notice", Notice);',
		"",
	].join("\n"));
	fs.writeFileSync(path.join(pageDirectory, "page.tsx"), [
		'import { createPage, defineSchema } from "nextjs-engine";',
		'const pageSchema = defineSchema({',
		'\tmeta: { title: "Compiler fixture" },',
		'\troot: { type: "box", children: [{ type: "notice", props: { content: "DO_NOT_EMIT_SCHEMA_CONTENT" } }] },',
		'});',
		'export default createPage({ schema: pageSchema });',
		"",
	].join("\n"));
	const writeSimplePage = (directory, title, nodeType) => fs.writeFileSync(path.join(directory, "page.tsx"), [
		'import { createPage, defineSchema } from "nextjs-engine";',
		'const pageSchema = defineSchema({',
		'\tmeta: { title: ' + JSON.stringify(title) + ' },',
		'\troot: { type: ' + JSON.stringify(nodeType) + ', props: { content: ' + JSON.stringify(title) + ' } },',
		'});',
		'export default createPage({ schema: pageSchema });',
		"",
	].join("\n"));
	writeSimplePage(emdDirectory, "EMD fixture", "markdown");
	writeSimplePage(ecDirectory, "EC fixture", "canvas");

	const logs = [];
	const manifest = await compileProject(root, { log: (line) => logs.push(line) });

	assert.equal(manifest.generation, 3, "build manifest identifies the Generation 3 compiler");
	assert.equal(manifest.summary.compiledPageCount, 3, "all three statically defined PageSchemas are compiled");
	assert.equal(manifest.summary.schemaCacheHitCount, 0, "a cold build starts without persistent schema hits");
	assert.equal(manifest.summary.schemaCacheMissCount, 3, "each page has its own cold cache miss");
	assert.equal(manifest.summary.schemaCacheWriteCount, 3, "each compiled page persists its own output");
	assert.equal(manifest.summary.schemaCompilerWorkerCount, 3,
		"three independent cold schema jobs are compiled concurrently by three workers");
	assert.equal(manifest.summary.schemaCompilerWorkerLimit, 3, "NENC caps schema compilation concurrency at three workers");
	assert.equal(manifest.pages[0].id, "/about", "App Router route groups do not leak into route identifiers");
	assert.ok(manifest.pages[0].customComponents.includes("notice"), "custom schema nodes appear in the page manifest");
	assert.ok(manifest.pages[0].compiledNodes.some((node) => node.type === "notice" && node.customComponent), "the emitted compiler graph includes custom-component classification");
	assert.ok(logs.some((line) => line.includes("COMPILING PAGE : app/(marketing)/about/page.tsx")),
		"route analysis reports the source path in Next.js-style progress output");
	assert.ok(logs.some((line) => line.includes("DONE compiled app/about/page.tsx -> /about")),
		"schema completion reports the source path and URL route id");
	assert.ok(logs.some((line) => /NENC ROUTES 0\/3 complete \(0%\)/.test(line)),
		"route analysis starts at an actual 0 of 3 routes completed");
	assert.ok(logs.some((line) => /NENC ROUTES 3\/3 complete \(100%\)/.test(line)),
		"route analysis ends at the actual 3 of 3 routes completed");
	assert.ok(logs.some((line) => line.includes("COMPILING CUSTOM COMPONENT : notice")),
		"custom components get a dedicated progress status");
	assert.ok(logs.some((line) => line.startsWith("DONE SCHEMA CACHE — 3 compile misses, 3 outputs persisted")),
		"the cold-build cache summary reports actual misses and written outputs");
	assert.ok(!logs.some((line) => line.includes("nextjs-engine |")),
		"compiler progress must not use the old product-name pipe prefix");

	const cacheDirectory = path.join(root, ".nextjs-engine", ".cache", "gen3", "schema-output");
	const cacheFiles = fs.readdirSync(cacheDirectory).filter((name) => name.endsWith(".json")).sort();
	assert.equal(cacheFiles.length, 3, "each route output uses a separate on-disk cache entry");
	const initialCacheEntries = new Map(cacheFiles.map((name) => [name, fs.readFileSync(path.join(cacheDirectory, name), "utf8")]));

	logs.length = 0;
	const cachedManifest = await compileProject(root, { log: (line) => logs.push(line) });
	assert.deepEqual(cachedManifest.pages, manifest.pages, "a cache hit reconstructs the same manifest pages");
	assert.equal(cachedManifest.summary.schemaCacheHitCount, 3, "the second pass reuses all unchanged compiled pages");
	assert.equal(cachedManifest.summary.schemaCacheMissCount, 0, "an unchanged second pass compiles no schema jobs");
	assert.equal(cachedManifest.summary.schemaCompilerWorkerCount, 0, "a full cache hit does not start idle worker threads");
	assert.ok(logs.some((line) => line.startsWith("DONE REUSED CACHED COMPILED /about")),
		"cache hits are visible as reuse, not mislabeled as new compilation");
	assert.ok(!logs.some((line) => line.includes("DONE compiled app/about/page.tsx -> /about")),
		"an unchanged page is not recompiled on a warm pass");

	const aboutSource = path.join(pageDirectory, "page.tsx");
	fs.writeFileSync(aboutSource, fs.readFileSync(aboutSource, "utf8").replace('type: "notice"', 'type: "text"'));
	logs.length = 0;
	const partialManifest = await compileProject(root, { log: (line) => logs.push(line) });
	assert.equal(partialManifest.summary.schemaCacheHitCount, 2, "unchanged EMD and EC schemas remain cache hits");
	assert.equal(partialManifest.summary.schemaCacheMissCount, 1, "editing /about invalidates only its schema output");
	assert.equal(partialManifest.summary.schemaCacheWriteCount, 1, "only the edited route's cache entry is updated");
	assert.equal(partialManifest.summary.schemaCompilerWorkerCount, 1, "only one worker is started for one invalidated schema job");
	assert.ok(partialManifest.pages.find((page) => page.id === "/about").compiledNodes.some((node) => node.type === "text"),
		"the changed page output reflects its new schema");
	assert.ok(logs.some((line) => line.includes("DONE compiled app/about/page.tsx -> /about")),
		"the changed page is compiled again");
	assert.ok(logs.some((line) => line.startsWith("DONE REUSED CACHED COMPILED /emd")),
		"the unchanged EMD schema is reused");
	assert.ok(logs.some((line) => line.startsWith("DONE REUSED CACHED COMPILED /ec")),
		"the unchanged EC schema is reused");
	const finalCacheEntries = new Map(fs.readdirSync(cacheDirectory).filter((name) => name.endsWith(".json")).sort()
		.map((name) => [name, fs.readFileSync(path.join(cacheDirectory, name), "utf8")]));
	const changedCacheFiles = [...initialCacheEntries.keys()].filter((name) => initialCacheEntries.get(name) !== finalCacheEntries.get(name));
	assert.deepEqual(changedCacheFiles, [
		path.basename(schemaOutputCachePath(root, "app/(marketing)/about/page.tsx", "/about")),
	], "only the edited /about cache entry changes; /emd and /ec cache files remain byte-for-byte unchanged");

	// A component error should fail only its own schema task. The CWs doing
	// valid work finish, and a freed CW takes the next task from the shared queue.
	const recoveryRoot = path.join(root, "worker-error-isolation");
	const recoveryRoutes = [
		["a-good", "Good A", false],
		["b-broken", "Broken", true],
		["c-good", "Good C", false],
		["d-good", "Good D", false],
	];
	for (const [route, title, broken] of recoveryRoutes) {
		const directory = path.join(recoveryRoot, "app", route);
		fs.mkdirSync(directory, { recursive: true });
		if (!broken) {
			writeSimplePage(directory, title, "text");
			continue;
		}
		fs.writeFileSync(path.join(directory, "page.tsx"), [
			'import { createPage, defineSchema } from "nextjs-engine";',
			'const pageSchema = defineSchema({',
			'\tmeta: { title: "Broken component" },',
			'\troot: { type: "box", props: { apiKey: "literal-secret-must-not-compile" }, children: [{ type: "text", props: { content: "child compiles first" } }] },',
			'});',
			'export default createPage({ schema: pageSchema });',
			"",
		].join("\n"));
	}
	const recoveryLogs = [];
	const recoveryManifest = await compileProject(recoveryRoot, { log: (line) => recoveryLogs.push(line) });
	assert.equal(recoveryManifest.summary.failedSchemaCount, 1, "one schema failure is isolated instead of aborting the compiler pass");
	assert.equal(recoveryManifest.summary.failedTaskCount, 1, "the compiler pass reports the failed task");
	assert.equal(recoveryManifest.summary.compiledPageCount, 3, "all successful pages remain in the output manifest");
	assert.deepEqual(recoveryManifest.pages.map((page) => page.id).sort(), ["/a-good", "/c-good", "/d-good"],
		"the failed schema is excluded while unrelated schema results remain available");
	assert.equal(recoveryManifest.errors.length, 1, "the failed component remains as structured manifest diagnostics");
	assert.equal(recoveryManifest.errors[0].pageId, "/b-broken", "the error identifies the failed route");
	assert.equal(recoveryManifest.errors[0].componentType, "box", "the error identifies the actual component with the invalid property, not the last processed sibling");
	assert.equal(recoveryManifest.errors[0].nodePath, "root", "the error identifies the component path");
	assert.ok(recoveryLogs.some((line) => line.includes("ERRORED COMPONENT app/b-broken/page.tsx -> /b-broken · box at root")),
		"the failed component log names its source, route and component path");
	for (const route of ["/a-good", "/c-good", "/d-good"]) {
		assert.ok(recoveryLogs.some((line) => line.includes("DONE compiled app/" + route.slice(1) + "/page.tsx -> " + route)),
			"successful CW work is logged for " + route);
	}
	const failedCacheFile = schemaOutputCachePath(recoveryRoot, "app/b-broken/page.tsx", "/b-broken");
	assert.ok(!fs.existsSync(failedCacheFile), "a failed schema never writes a partial cache entry");
	for (const route of ["a-good", "c-good", "d-good"]) {
		assert.ok(fs.existsSync(schemaOutputCachePath(recoveryRoot, "app/" + route + "/page.tsx", "/" + route)),
			"successful route cache survives adjacent component failure: " + route);
	}
	const recoveryInput = path.join(recoveryRoot, "worker-manifest.json");
	fs.writeFileSync(recoveryInput, JSON.stringify(recoveryManifest));
	const recoveryOutput = emitArtifacts(recoveryRoot, recoveryInput, "dist", {
		nextVersion: "16.4.2",
		buildId: "worker-error-recovery",
		outputs: { appPages: [{ pathname: "/a-good" }, { pathname: "/c-good" }, { pathname: "/d-good" }], prerenders: [], staticFiles: [] },
	});
	const parsedRecovery = JSON.parse(fs.readFileSync(recoveryOutput, "utf8"));
	assert.equal(parsedRecovery.pages.length, 3, "the post-build artifact remains valid and excludes only the failed schema");
	assert.equal(parsedRecovery.errors.length, 1, "the valid artifact retains the error diagnostic for inspection");

	const inputPath = path.join(root, "worker-manifest.json");
	fs.writeFileSync(inputPath, JSON.stringify(manifest));
	const nextBuildContext = {
		nextVersion: "16.4.2",
		buildId: "completed-build-fixture",
		outputs: {
			appPages: [{ pathname: "/" }, { pathname: "/about" }],
			appRoutes: [{ pathname: "/api/search" }],
			pages: [],
			pagesApi: [],
			prerenders: [{ pathname: "/" }, { pathname: "/about" }],
			staticFiles: [{ pathname: "/robots.txt" }],
		},
	};
	const emitted = emitArtifacts(root, inputPath, "dist", nextBuildContext);
	assert.equal(emitted, path.join(root, "dist", "nextjs-engine", "compiler-manifest.json"));
	assert.ok(fs.existsSync(emitted), "post-build metadata is emitted under the configured Next.js output directory");
	const parsedOutput = JSON.parse(fs.readFileSync(emitted, "utf8"));
	assert.equal(parsedOutput.nextBuild.nextVersion, "16.4.2", "the manifest records Next.js build metadata");
	assert.equal(parsedOutput.summary.nextOutputCounts.appPages, 2, "the manifest records the real Next.js page count");
	assert.deepEqual(parsedOutput.nextBuild.paths.appPages, ["/", "/about"], "the manifest includes route paths from the Next adapter");
	const output = fs.readFileSync(emitted, "utf8");
	assert.ok(!output.includes("DO_NOT_EMIT_SCHEMA_CONTENT"), "compiler manifest contains summaries, not the source schema or arbitrary prop values");

	// A schema-level component/security error should be isolated to that task.
	// The other CW jobs must finish, and only successful outputs may be cached/emitted.
	const errorDirectory = path.join(root, "app", "error-case");
	const goodOneDirectory = path.join(root, "app", "good-one");
	const goodTwoDirectory = path.join(root, "app", "good-two");
	for (const directory of [errorDirectory, goodOneDirectory, goodTwoDirectory]) {
		fs.mkdirSync(directory, { recursive: true });
	}
	fs.writeFileSync(path.join(errorDirectory, "page.tsx"), [
		'import { createPage, defineSchema } from "nextjs-engine";',
		'const pageSchema = defineSchema({',
		'\tmeta: { title: "Errored component fixture" },',
		'\troot: { type: "text", props: { content: "safe text", password: "literal-secret-for-test" } },',
		'});',
		'export default createPage({ schema: pageSchema });',
		"",
	].join("\n"));
	writeSimplePage(goodOneDirectory, "CW success one", "text");
	writeSimplePage(goodTwoDirectory, "CW success two", "box");
	const errorCachePath = schemaOutputCachePath(root, "app/error-case/page.tsx", "/error-case");
	assert.equal(fs.existsSync(errorCachePath), false, "the failed route has no prior schema-cache artifact");
	const failureLogs = [];
	const erroredManifest = await compileProject(root, { log: (line) => failureLogs.push(line) });
	assert.equal(erroredManifest.summary.failedSchemaCount, 1, "one component-level schema failure is recorded without aborting the compiler pass");
	assert.equal(erroredManifest.errors.length, 1, "the partial manifest retains the failed route's error details");
	assert.equal(erroredManifest.errors[0].pageId, "/error-case");
	assert.match(erroredManifest.errors[0].message, /Security compilation failed/);
	assert.match(erroredManifest.errors[0].message, /root\.props\.password/,
		"the error identifies the schema component property that caused the failure without echoing its value");
	assert.ok(!erroredManifest.pages.some((page) => page.id === "/error-case"),
		"the failed route is omitted rather than represented by a corrupt/partial schema plan");
	assert.ok(erroredManifest.pages.some((page) => page.id === "/good-one")
		&& erroredManifest.pages.some((page) => page.id === "/good-two"),
		"other CW jobs finish and their valid schema plans remain in the manifest");
	assert.ok(failureLogs.some((line) => line.includes("ERRORED COMPONENT app/error-case/page.tsx -> /error-case")),
		"the failing component is logged as an explicit error line");
	assert.ok(failureLogs.some((line) => line.includes("DONE compiled app/good-one/page.tsx -> /good-one"))
		&& failureLogs.some((line) => line.includes("DONE compiled app/good-two/page.tsx -> /good-two")),
		"successful concurrent tasks still emit completion lines");
	assert.equal(fs.existsSync(errorCachePath), false, "a failed task never writes a cache artifact");
	for (const [sourcePath, pageId] of [
		["app/(marketing)/about/page.tsx", "/about"],
		["app/emd/page.tsx", "/emd"],
		["app/ec/page.tsx", "/ec"],
	]) {
		const cachePath = schemaOutputCachePath(root, sourcePath, pageId);
		const cacheName = path.basename(cachePath);
		assert.equal(fs.readFileSync(cachePath, "utf8"), finalCacheEntries.get(cacheName),
			"failed work does not alter an already-valid cached artifact: " + pageId);
	}
	const partialInputPath = path.join(root, "partial-worker-manifest.json");
	fs.writeFileSync(partialInputPath, JSON.stringify(erroredManifest));
	const partialOutputFile = emitArtifacts(root, partialInputPath, "dist-partial", nextBuildContext);
	assert.ok(fs.existsSync(partialOutputFile), "the partial-success manifest is safely emitted after the Next.js build");
	const emittedPartial = JSON.parse(fs.readFileSync(partialOutputFile, "utf8"));
	assert.equal(emittedPartial.errors.length, 1, "the emitted manifest preserves diagnostics for the failed component");
	assert.ok(emittedPartial.pages.some((page) => page.id === "/good-one")
		&& emittedPartial.pages.some((page) => page.id === "/good-two"),
		"valid artifacts survive emission when a different schema component errors");

	const unsafeRoot = path.join(root, "outside");
	fs.mkdirSync(unsafeRoot);
	assert.throws(() => emitArtifacts(root, inputPath, "../outside"), /outside the project build directory/,
		"artifact emission refuses output paths outside the project root");

	console.log("Generation 3 build compiler integration smoke: ok");
} finally {
	fs.rmSync(root, { recursive: true, force: true });
}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
