"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { ASCII_WORDMARK, compileProject, emitArtifacts, printBanner, renderPeggaText } = require("./gen3-build-compiler");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "nextjs-engine-gen3-build-smoke-"));
try {
	const banner = [];
	printBanner((line) => banner.push(line));
	const creditSourceRows = renderPeggaText("INDEPENDENT PROJECT BY KASTRICK");
	const disclaimerSourceRows = renderPeggaText("NOT AFFILIATED WITH NEXT.JS NOR VERCEL");
	const bannerWidth = Math.max(
		...ASCII_WORDMARK.map((line) => line.length),
		...creditSourceRows.map((line) => line.length),
		...disclaimerSourceRows.map((line) => line.length),
	);
	const centerBannerLine = (line) => {
		const left = Math.max(0, Math.floor((bannerWidth - line.length) / 2));
		return " ".repeat(left) + line + " ".repeat(Math.max(0, bannerWidth - left - line.length));
	};
	assert.deepEqual(banner.slice(0, ASCII_WORDMARK.length), ASCII_WORDMARK.map(centerBannerLine),
		"the supplied updated wordmark is centered and emitted exactly");
	const creditRows = creditSourceRows.map(centerBannerLine);
	const disclaimerRows = disclaimerSourceRows.map(centerBannerLine);
	assert.deepEqual(banner.slice(ASCII_WORDMARK.length, ASCII_WORDMARK.length + creditRows.length), creditRows,
		"the project credit uses the matching Pegga-style pixel font");
	assert.deepEqual(banner.slice(ASCII_WORDMARK.length + creditRows.length,
		ASCII_WORDMARK.length + creditRows.length + disclaimerRows.length), disclaimerRows,
		"the combined Next.js and Vercel disclaimer uses the Pegga-style pixel font");
	assert.ok(!banner.some((line) => /x\s+next\.js/i.test(line)), "the old x next.js subtitle is removed");
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
