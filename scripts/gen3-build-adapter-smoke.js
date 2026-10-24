"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const plugin = require("../src/engine/plugins/enginePlugin");
const adapter = require("../src/engine/plugins/engineBuildAdapter");

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
		if (originalDelegate === undefined) delete process.env.NEXTJS_ENGINE_DELEGATE_ADAPTER;
		else process.env.NEXTJS_ENGINE_DELEGATE_ADAPTER = originalDelegate;
		fs.rmSync(root, { recursive: true, force: true });
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
