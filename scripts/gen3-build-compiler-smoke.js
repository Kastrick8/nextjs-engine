"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
	ASCII_WORDMARK,
	BOTTOM_TEXT,
	compileProject,
	emitArtifacts,
	printBanner,
	printBannerOnce,
	releaseBanner,
	renderBannerLines,
	summarizeNextOutputs,
} = require("./gen3-build-compiler");

const {
	formatDoneLine,
	formatStatusLine,
	formatWorkerStatus,
	formatBytesPerSecond,
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
]), "Compiling /guide (33.3%) · Downloading ICON:google.com (8202 B/s)",
"mixed compilation and icon-download jobs show the correct metric for each worker");
assert.equal(formatBytesPerSecond(8202), "8202 B/s");

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
	assert.ok(logs.some((line) => line.includes("DONE COMPILED /about —")),
		"schema completion reports the URL route id");
	assert.ok(logs.some((line) => /NENC ROUTES 0\/3 complete \(0%\)/.test(line)),
		"route analysis starts at an actual 0 of 3 routes completed");
	assert.ok(logs.some((line) => /NENC ROUTES 3\/3 complete \(100%\)/.test(line)),
		"route analysis ends at the actual 3 of 3 routes completed");
	assert.ok(logs.some((line) => line.includes("COMPILING CUSTOM COMPONENT : notice")),
		"custom components get a dedicated progress status");
	assert.ok(logs.some((line) => line.startsWith("DONE SCHEMA CACHE — 0 hit(s), 3 compile miss(es), 3 output(s) persisted")),
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
	assert.ok(!logs.some((line) => line.startsWith("DONE COMPILED /about —")),
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
	assert.ok(logs.some((line) => line.startsWith("DONE COMPILED /about —")),
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
