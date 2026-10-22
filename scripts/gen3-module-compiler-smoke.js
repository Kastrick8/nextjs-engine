"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { analyzeProjectModules } = require("../src/engine/plugins/gen3ModuleCompiler");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "nextjs-engine-module-compiler-smoke-"));
function write(relative, content) {
	const target = path.join(root, relative);
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.writeFileSync(target, content, "utf8");
	return target;
}
try {
	write("package.json", JSON.stringify({ name: "module-compiler-fixture", version: "1.0.0" }, null, 2));
	write("tsconfig.json", JSON.stringify({
		compilerOptions: {
			module: "ESNext",
			moduleResolution: "Bundler",
			target: "ES2022",
			baseUrl: ".",
			paths: {
				"@/engine": ["./src/engine/index.ts"],
				"@/*": ["./*"],
			},
		},
	}, null, 2));
	const homePage = write("app/page.tsx", [
		'import { EngineCanvas } from "@/engine";',
		'import Showcase from "../components/Showcase";',
		'export default function Home() { return <><EngineCanvas /><Showcase /></>; }',
		"",
	].join("\n"));
	const packagePage = write("app/about/page.tsx", [
		'import { EngineCanvas } from "nextjs-engine";',
		'export default function About() { return null; }',
		"",
	].join("\n"));
	write("components/Showcase.tsx", [
		'import { EngineCanvas as Canvas } from "@/engine";',
		'export default function Showcase() { return <Canvas />; }',
		"",
	].join("\n"));
	write("src/engine/index.ts", [
		'export { EngineCanvas } from "./components/EngineCanvas";',
		'export { EngineScheduler } from "./core/EngineScheduler";',
		'export { createPage } from "./createPage";',
		"",
	].join("\n"));
	write("src/engine/components/EngineCanvas.tsx", [
		'import { EngineScheduler } from "../core/EngineScheduler";',
		'export function EngineCanvas() { return EngineScheduler ? null : null; }',
		"",
	].join("\n"));
	write("src/engine/core/EngineScheduler.ts", [
		'import { frame } from "./frame";',
		'export const EngineScheduler = { frame };',
		"",
	].join("\n"));
	write("src/engine/core/frame.ts", [
		'export function frame() { return 0; }',
		"",
	].join("\n"));
	write("src/engine/createPage.ts", 'export function createPage(value: unknown) { return value; }\n');

	const files = [homePage, packagePage].map((file) => path.resolve(file));
	const schemaSymbolsByFile = new Map([[path.resolve(homePage), new Set(["EngineCanvas"])]]);
	const schemaCandidateCountsByFile = new Map([[path.resolve(homePage), 1]]);
	const logs = [];
	const result = analyzeProjectModules(root, {
		files,
		sourceByPath: new Map(),
		schemaSymbolsByFile,
		schemaCandidateCountsByFile,
		log: (line) => logs.push(line),
	});

	assert.equal(result.summary.routeEntryCount, 2, "both App Router entry modules are analyzed");
	assert.equal(result.summary.analyzedRouteCount, 2, "each discovered route gets an Engine module graph");
	assert.deepEqual(result.routes.map((route) => route.routePath).sort(), ["/", "/about"],
		"route paths are normalized for the root and nested page");
	assert.equal(result.routes.find((route) => route.routePath === "/").schemaCandidateCount, 1,
		"static schema candidates are attached to their route records");

	const component = result.modules.find((module) => module.name === "EngineCanvas" && module.sourcePath);
	assert.equal(component?.sourcePath, "src/engine/components/EngineCanvas.tsx",
		"the public Engine barrel resolves EngineCanvas to its concrete source file");
	assert.ok(result.modules.some((module) => module.name === "EngineScheduler"
		&& module.sourcePath === "src/engine/core/EngineScheduler.ts"),
		"transitive Engine dependencies are included once");
	assert.ok(result.modules.some((module) => module.sourcePath === "src/engine/core/frame.ts"),
		"the reachable module graph follows local dependencies below Engine modules");
	assert.equal(result.modules.filter((module) => module.sourcePath === "src/engine/components/EngineCanvas.tsx").length, 1,
		"the same EngineCanvas module is deduplicated when imported through multiple routes/components");
	assert.ok(result.modules.some((module) => module.importName === "@engine/EngineCanvas"
		&& module.sourcePath === null && module.resolution === "package"),
		"package-only Engine imports fall back to the stable @engine import name");
	assert.ok(logs.some((line) => line.includes("COMPILING EC : src/engine/components/EngineCanvas.tsx")),
		"the module log uses the EC abbreviation and resolved source path");
	assert.ok(logs.some((line) => line.includes("COMPILING EC : @engine/EngineCanvas")),
		"the module log uses the import alias when the source is package-only");
	assert.ok(logs.some((line) => line.includes("COMPILING PAGE : app/page.tsx")),
		"the pass logs the actual page entry point");
	assert.ok(!result.modules.some((module) => module.name === "EngineCanvasProps"),
		"type-only imports do not become runtime module jobs");

	console.log("Generation 3 module compiler smoke: ok");
} finally {
	fs.rmSync(root, { recursive: true, force: true });
}
