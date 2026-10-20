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
} = require("./gen3-build-compiler");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "nextjs-engine-gen3-build-smoke-"));
try {
	const banner = [];
	printBanner((line) => banner.push(line));
	assert.deepEqual(banner, renderBannerLines(), "the output is exactly the shared framed banner render");
	assert.equal(ASCII_WORDMARK.length, 6, "the compact supplied wordmark has six rows");
	assert.equal(BOTTOM_TEXT.length, 9, "the supplied footer keeps its two four-row messages");
	assert.equal(BOTTOM_TEXT.filter((line) => line === "").length, 1, "the two footer messages have one blank row between them");
	assert.equal(banner.length, 18, "the banner has a top and bottom border plus its spaced content rows");
	assert.ok(banner[0].startsWith("╭") && banner[banner.length - 1].startsWith("╰"), "the banner has a light frame");
	assert.equal(new Set(banner.map((line) => line.length)).size, 1, "all frame and content rows align to one width");
	const framedBlankRows = banner.filter((line) => line.startsWith("│") && line.slice(1, -1).trim() === "");
	assert.equal(framedBlankRows.length, 2, "the wordmark and footer are separated, and the footer messages do not overlap");
	assert.ok(banner.some((line) => line.includes("███████╗███╗   ██╗ ██████╗")), "the compact supplied wordmark is rendered");
	assert.ok(banner.some((line) => line.includes(" __  _  __ _____")), "the updated bottom-text artwork is rendered");
	assert.ok(!banner.some((line) => line.includes("██████   █████ ██████████")), "the oversized previous wordmark is removed");

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
	assert.ok(logs.some((line) => line.includes("nextjs-engine | Compiling app/(marketing)/about/page.tsx")),
		"page compilation reports a source path");
	assert.ok(logs.some((line) => line.includes("nextjs-engine | Compiling Custom Component notice")),
		"custom components get a dedicated progress line");

	const inputPath = path.join(root, "worker-manifest.json");
	fs.writeFileSync(inputPath, JSON.stringify(manifest));
	const emitted = emitArtifacts(root, inputPath, "dist");
	assert.equal(emitted, path.join(root, "dist", "nextjs-engine", "compiler-manifest.json"));
	assert.ok(fs.existsSync(emitted), "post-build metadata is emitted under the configured Next.js output directory");
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
