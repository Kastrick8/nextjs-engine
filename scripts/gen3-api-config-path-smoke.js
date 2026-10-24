"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const withEngineAPI = require("../src/engine/plugins/engineApiPlugin");
const enginePlugin = require("../src/engine/plugins/enginePlugin");

const originalCwd = process.cwd();
const originalWatch = process.env.NEXTJS_ENGINE_API_WATCH;
const originalSecret = process.env.ENGINE_API_TOKEN;
const roots = [];

function write(filePath, content) {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, content, "utf8");
}

function makeProject(label) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "nextjs-engine-" + label + "-"));
	roots.push(root);
	write(path.join(root, ".EngineAPIConfig", "main.api"), [
		"[provider.main]",
		'endpoint = "https://api.example.com/v1"',
		'method = "POST"',
		"",
		"[provider.main.auth]",
		'type = "bearer"',
		'token = "$ENGINE_API_TOKEN"',
		"",
		"[versions]",
		'V1 = "/v1"',
		"",
	].join("\n"));
	return root;
}

function pluginOptions(overrides = {}) {
	return {
		configDir: ".EngineAPIConfig",
		endpointDir: "data/endpoint",
		staticOutputDir: "public/_static/endpoint",
		staticManifestFile: "manifest.json",
		...overrides,
	};
}

try {
	process.env.NEXTJS_ENGINE_API_WATCH = "0";
	process.env.ENGINE_API_TOKEN = "gen3-api-config-smoke-secret";

	const gen3Root = makeProject("gen3-api-config");
	process.chdir(gen3Root);
	write(path.join(gen3Root, ".engine-api-compiled.json"), JSON.stringify({ stale: true }));
	enginePlugin.withGeneration3APIConfig({}, pluginOptions());
	const gen3Output = path.join(gen3Root, ".nextjs-engine", "config", ".apiconfig.json");
	assert.equal(fs.existsSync(gen3Output), true, "Gen 3 writes provider JSON under .nextjs-engine/config");
	assert.equal(fs.existsSync(path.join(gen3Root, ".engine-api-compiled.json")), false,
		"Gen 3 removes stale root output after successful generation");
	const compiled = JSON.parse(fs.readFileSync(gen3Output, "utf8"));
	assert.equal(compiled.providers.main.endpoint, "https://api.example.com/v1");
	assert.equal(compiled.providers.main.auth.token, "gen3-api-config-smoke-secret",
		"environment variables are expanded into generated config");
	assert.equal(compiled.versions.V1, "/v1");

	const customRoot = makeProject("gen3-custom-api-config");
	process.chdir(customRoot);
	write(path.join(customRoot, ".engine-api-compiled.json"), JSON.stringify({ keep: true }));
	enginePlugin.withGeneration3APIConfig({}, pluginOptions({ outputFile: "custom/config.json" }));
	assert.equal(fs.existsSync(path.join(customRoot, "custom", "config.json")), true,
		"explicit outputFile is respected and parent directories are created");
	assert.equal(fs.existsSync(path.join(customRoot, ".engine-api-compiled.json")), true,
		"custom output does not trigger legacy cleanup");

	const gen2Root = makeProject("gen2-legacy-api-config");
	process.chdir(gen2Root);
	withEngineAPI({}, pluginOptions());
	assert.equal(fs.existsSync(path.join(gen2Root, ".engine-api-compiled.json")), true,
		"standalone Gen 2 plugin keeps its legacy root output");
	assert.equal(fs.existsSync(path.join(gen2Root, ".nextjs-engine", "config", ".apiconfig.json")), false,
		"standalone Gen 2 plugin does not create the Gen 3 config path");

	console.log("Generation 3 API config path migration smoke: ok");
} finally {
	process.chdir(originalCwd);
	if (originalWatch === undefined) delete process.env.NEXTJS_ENGINE_API_WATCH;
	else process.env.NEXTJS_ENGINE_API_WATCH = originalWatch;
	if (originalSecret === undefined) delete process.env.ENGINE_API_TOKEN;
	else process.env.ENGINE_API_TOKEN = originalSecret;
	for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
}
