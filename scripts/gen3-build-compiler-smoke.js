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
	fs.mkdirSync(pageDirectory, { recursive: true });
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

	const logs = [];
	const manifest = compileProject(root, { log: (line) => logs.push(line) });

	assert.equal(manifest.generation, 3, "build manifest identifies the Generation 3 compiler");
	assert.equal(manifest.summary.compiledPageCount, 1, "a statically defined PageSchema is compiled");
	assert.equal(manifest.pages[0].id, "/about", "App Router route groups do not leak into route identifiers");
	assert.ok(manifest.pages[0].customComponents.includes("notice"), "custom schema nodes appear in the page manifest");
	assert.ok(manifest.pages[0].compiledNodes.some((node) => node.type === "notice" && node.customComponent), "the emitted compiler graph includes custom-component classification");
	assert.ok(logs.some((line) => line.includes("COMPILING PAGE : app/(marketing)/about/page.tsx")),
		"route analysis reports the source path in Next.js-style progress output");
	assert.ok(logs.some((line) => line.includes("COMPILED ENGINE SCHEMA : app/(marketing)/about/page.tsx")),
		"the static schema pass separately reports successful Engine schema compilation");
	assert.ok(logs.some((line) => line.includes("COMPILING CUSTOM COMPONENT : notice")),
		"custom components get a dedicated Next.js-style progress line");

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
