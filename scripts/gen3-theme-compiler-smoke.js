"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const {
	canonicalJson,
	compileEngineThemeArtifacts,
	ETR_FORMAT,
} = require("../src/engine/plugins/gen3ThemeCompiler");

function testPublicThemeApi() {
	const filePath = path.resolve(__dirname, "../src/engine/theme/createTheme.ts");
	const sourceText = fs.readFileSync(filePath, "utf8");
	const transpiled = ts.transpileModule(sourceText, {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
		fileName: filePath,
		reportDiagnostics: true,
	});
	const errors = (transpiled.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error);
	assert.deepEqual(errors, [], "createTheme source transpiles without syntax diagnostics");
	const loaded = new Module(filePath, module);
	loaded.filename = filePath;
	loaded.paths = Module._nodeModulePaths(path.dirname(loaded.filename));
	loaded._compile(transpiled.outputText, loaded.filename);
	const { createTheme, parseEngineThemeId } = loaded.exports;

	const definition = createTheme({
		id: "safe-theme",
		tokens: { colors: { text: "#fff" } },
		markdown: { variants: { dark: { codeBackground: "#111" } } },
	});
	assert.equal(definition.scope, "local", "scope defaults to local");
	assert.equal(Object.isFrozen(definition), true, "returned theme group is frozen");
	assert.equal(Object.isFrozen(definition.tokens.colors), true, "nested theme values are frozen");
	assert.deepEqual(parseEngineThemeId("mycoolthemes.markdown.1.2.560"), {
		groupId: "mycoolthemes", componentId: "markdown", subthemes: ["1", "2", "560"],
	});
	assert.throws(() => parseEngineThemeId("mycoolthemes.markdown.a.b.c.d"), /at most three subtheme segments/);
	assert.throws(() => createTheme({ id: "my.theme" }), /group ID without dots/);
	assert.throws(() => createTheme({ id: "function-theme", markdown: { build: () => true } }), /JSON data/);

	let getterCalled = false;
	const accessorTheme = {};
	Object.defineProperty(accessorTheme, "id", { enumerable: true, get() { getterCalled = true; return "unsafe"; } });
	assert.throws(() => createTheme(accessorTheme), /accessors/);
	assert.equal(getterCalled, false, "accessor validation must not execute the getter");
}

function source(filePath, text) {
	return {
		filePath,
		sourceFile: ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
	};
}

function readArtifact(filePath) {
	return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function verifyDigest(artifact) {
	const { sha256, ...payload } = artifact;
	const actual = crypto.createHash("sha256").update(canonicalJson(payload), "utf8").digest("hex");
	assert.equal(actual, sha256, "the SHA-256 digest matches canonical artifact content");
}

function run() {
	testPublicThemeApi();
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "nextjs-engine-theme-smoke-"));
	try {
		const themeSource = path.join(root, "app", "theme.tsx");
		const input = source(themeSource, [
			'import { createTheme } from "nextjs-engine";',
			'const markdown = { prettyPlease: { mode: "auto" }, table: { header: { placement: "left" } } };',
			'export const theme = createTheme({ id: "dark-fantasy", scope: "remote", name: "Dark Fantasy", markdown });',
			"",
		].join("\n"));
		const options = { nextjsVersion: "16.4.2", engineVersion: "3.0.0-alpha.1" };
		const first = compileEngineThemeArtifacts(root, [input], options);
		assert.equal(first.createdCount, 1);
		assert.equal(first.updatedCount, 0);
		assert.equal(first.unchangedCount, 0);
		assert.equal(first.artifacts[0].id, "dark-fantasy");
		assert.equal(first.artifacts[0].status, "created");

		const artifactPath = path.join(root, ".nextjs-engine", "gen3", "theme", "dark-fantasy.etr");
		const artifactText = fs.readFileSync(artifactPath, "utf8");
		const artifact = readArtifact(artifactPath);
		assert.equal(artifact.format, ETR_FORMAT);
		assert.equal(artifact.formatVersion, 1);
		assert.equal(artifact.generatedBy, "NENC");
		assert.equal(artifact.id, "dark-fantasy");
		assert.equal(artifact.createdWith.nextjs, "16.4.2");
		assert.equal(artifact.createdWith.nextjsEngine, "3.0.0-alpha.1");
		assert.equal(artifact.content.scope, "remote");
		assert.deepEqual(artifact.content.markdown.table.header, { placement: "left" });
		verifyDigest(artifact);

		const warm = compileEngineThemeArtifacts(root, [input], options);
		assert.equal(warm.createdCount, 0);
		assert.equal(warm.updatedCount, 0);
		assert.equal(warm.unchangedCount, 1, "identical artifacts are recognized without rewriting the output");
		assert.equal(fs.readFileSync(artifactPath, "utf8"), artifactText);

		const changed = source(themeSource, [
			'import { createTheme } from "nextjs-engine";',
			'export const theme = createTheme({ id: "dark-fantasy", scope: "remote", markdown: { prettyPlease: { mode: "auto", theme: "new-colors" } } });',
			"",
		].join("\n"));
		const update = compileEngineThemeArtifacts(root, [changed], options);
		assert.equal(update.updatedCount, 1);
		assert.equal(update.createdCount, 0);
		verifyDigest(readArtifact(artifactPath));

		const previousGoodOutput = fs.readFileSync(artifactPath, "utf8");
		assert.throws(() => compileEngineThemeArtifacts(root, [
			changed,
			source(path.join(root, "app", "other.tsx"),
				'import { createTheme } from "nextjs-engine"; createTheme({ id: "dark-fantasy", scope: "remote", markdown: { theme: "conflict" } });'),
		], options), /Duplicate theme group ID/);
		assert.equal(fs.readFileSync(artifactPath, "utf8"), previousGoodOutput,
			"invalid duplicate IDs fail before existing artifacts are changed");

		assert.throws(() => compileEngineThemeArtifacts(root, [
			source(path.join(root, "app", "dynamic.tsx"),
				'import { createTheme } from "nextjs-engine"; const makeTheme = () => ({ id: "dynamic" }); createTheme(makeTheme());'),
		], options), /function calls are not allowed/);

		assert.throws(() => compileEngineThemeArtifacts(root, [
			source(path.join(root, "app", "bad-id.tsx"),
				'import { createTheme } from "nextjs-engine"; createTheme({ id: "../outside", scope: "global" });'),
		], options), /theme id must be one plain group segment/);

		const protectedPath = path.join(root, ".nextjs-engine", "gen3", "theme", "user-owned.etr");
		fs.writeFileSync(protectedPath, JSON.stringify({ hello: "user file" }));
		assert.throws(() => compileEngineThemeArtifacts(root, [
			source(path.join(root, "app", "user-owned.tsx"),
				'import { createTheme } from "nextjs-engine"; createTheme({ id: "user-owned", scope: "global" });'),
		], options), /Refusing to overwrite non-generated theme artifact/);
		assert.equal(fs.readFileSync(protectedPath, "utf8"), JSON.stringify({ hello: "user file" }),
			"the compiler never overwrites an unrelated file with an artifact-name collision");

		const cleanup = compileEngineThemeArtifacts(root, [], options);
		assert.equal(cleanup.removedCount, 1, "stale artifacts previously owned by the compiler are removed");
		assert.equal(fs.existsSync(artifactPath), false);
		assert.equal(fs.existsSync(protectedPath), true, "stale cleanup never deletes files not owned by NENC");

		console.log("Generation 3 EngineTheme compiler smoke: ok");
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
}

run();
