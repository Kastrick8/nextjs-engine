"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const previousTsExtension = Module._extensions[".ts"];
Module._extensions[".ts"] = (loadedModule, filePath) => {
	const source = fs.readFileSync(filePath, "utf8");
	const output = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2020,
			jsx: ts.JsxEmit.ReactJSX,
		},
		fileName: filePath,
		reportDiagnostics: true,
	});
	const errors = (output.diagnostics || []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
	assert.deepEqual(errors, [], filePath + " must transpile without syntax diagnostics");
	loadedModule._compile(output.outputText, filePath);
};

const { compileEngineThemeFonts } = require(path.resolve(__dirname, "../src/engine/compiler/font/3/compiler.ts"));
const PROVIDERS = {
	google: {
		cssUrl: "https://fonts.googleapis.com/css2?family=Roboto:wght@400&display=swap&text=EngineTheme",
		cssOrigins: "https://fonts.googleapis.com",
		fileOrigins: "https://fonts.gstatic.com",
	},
	bunny: {
		cssUrl: "https://fonts.bunny.net/css?family=Roboto:400&text=EngineTheme",
		cssOrigins: "https://fonts.bunny.net",
		fileOrigins: "https://fonts.bunny.net",
	},
};

async function runProvider(name) {
	const provider = PROVIDERS[name];
	if (!provider) throw new Error("Unknown provider '" + name + "'. Choose google or bunny.");
	const previousEnv = {
		nodeEnv: process.env.NODE_ENV,
		cssOrigins: process.env.ENGINE_THEME_FONT_CSS_ORIGINS,
		fileOrigins: process.env.ENGINE_THEME_FONT_FILE_ORIGINS,
		failurePolicy: process.env.ENGINE_THEME_FONT_FAILURE_POLICY,
		ttl: process.env.ENGINE_THEME_FONT_CACHE_TTL_MS,
	};
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "nextjs-engine-live-font-" + name + "-"));
	const id = "live-" + name;
	try {
		process.env.NODE_ENV = "production";
		process.env.ENGINE_THEME_FONT_CSS_ORIGINS = provider.cssOrigins;
		process.env.ENGINE_THEME_FONT_FILE_ORIGINS = provider.fileOrigins;
		process.env.ENGINE_THEME_FONT_FAILURE_POLICY = "error";
		process.env.ENGINE_THEME_FONT_CACHE_TTL_MS = "0";
		const themeDir = path.join(root, ".nextjs-engine", "gen3", "theme");
		fs.mkdirSync(themeDir, { recursive: true });
		fs.writeFileSync(path.join(themeDir, id + ".etr"), JSON.stringify({
			id,
			content: { id, scope: "local", fonts: [provider.cssUrl] },
		}));
		const result = await compileEngineThemeFonts(root, [{ id, fileName: id + ".etr" }], {
			production: true,
			failurePolicy: "error",
			forceRefresh: true,
			timeoutMs: 10000,
		});
		assert.equal(result.fallbackThemes, 0, name + " must compile without a browser-network fallback");
		assert.equal(result.themeCount, 1);
		assert.ok(result.downloadedFonts > 0, name + " must download at least one real font file");
		assert.ok(result.downloadedBytes > 0);
		const cssPath = path.join(root, "public", "nextjs-engine", "fonts", id + ".css");
		assert.ok(fs.existsSync(cssPath), name + " must emit a local stylesheet");
		const css = fs.readFileSync(cssPath, "utf8");
		assert.ok(css.includes("/nextjs-engine/fonts/font-"));
		assert.ok(!/https?:\/\//i.test(css), name + " output CSS must not retain remote URLs");
		const fontFiles = fs.readdirSync(path.dirname(cssPath)).filter((file) => /^font-[a-f0-9]{64}\.(?:woff2?|ttf|otf)$/.test(file));
		assert.ok(fontFiles.length > 0, name + " must emit content-addressed local font files");
		for (const file of fontFiles) {
			const bytes = fs.statSync(path.join(path.dirname(cssPath), file)).size;
			assert.ok(bytes > 0 && bytes <= 12 * 1024 * 1024, name + " font files remain within the per-file limit");
		}
		console.log("[EngineTheme live fonts] " + name + ": PASS (" + result.downloadedFonts + " fonts, " + result.downloadedBytes + " bytes)");
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
		if (previousEnv.nodeEnv === undefined) delete process.env.NODE_ENV;
		else process.env.NODE_ENV = previousEnv.nodeEnv;
		if (previousEnv.cssOrigins === undefined) delete process.env.ENGINE_THEME_FONT_CSS_ORIGINS;
		else process.env.ENGINE_THEME_FONT_CSS_ORIGINS = previousEnv.cssOrigins;
		if (previousEnv.fileOrigins === undefined) delete process.env.ENGINE_THEME_FONT_FILE_ORIGINS;
		else process.env.ENGINE_THEME_FONT_FILE_ORIGINS = previousEnv.fileOrigins;
		if (previousEnv.failurePolicy === undefined) delete process.env.ENGINE_THEME_FONT_FAILURE_POLICY;
		else process.env.ENGINE_THEME_FONT_FAILURE_POLICY = previousEnv.failurePolicy;
		if (previousEnv.ttl === undefined) delete process.env.ENGINE_THEME_FONT_CACHE_TTL_MS;
		else process.env.ENGINE_THEME_FONT_CACHE_TTL_MS = previousEnv.ttl;
	}
}

async function main() {
	const selected = process.argv.slice(2);
	for (const name of selected.length ? selected : Object.keys(PROVIDERS)) await runProvider(name);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
}).finally(() => {
	if (previousTsExtension) Module._extensions[".ts"] = previousTsExtension;
	else delete Module._extensions[".ts"];
});
