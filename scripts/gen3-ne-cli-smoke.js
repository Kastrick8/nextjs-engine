"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const channels = require("../bin/ne-cli/channels");
const terminal = require("../bin/ne-cli/terminal");
const cli = require("../bin/ne-cli/cli");
const project = require("../bin/ne-cli/project");

assert.equal(channels.compareVersions("3.0.0-alpha.1", "3.0.0-alpha.2"), -1);
assert.equal(channels.compareVersions("3.0.0-alpha.2", "3.0.0-beta.1"), -1);
assert.equal(channels.compareVersions("3.0.0-beta.1", "2.7.0"), 1);
assert.equal(channels.compareVersions("2.7.0", "2.7.0"), 0);
assert.equal(channels.parseVersion("3.0.0.alpha.1"), null);

const manifest = {
	schemaVersion: 1,
	packageName: "@kastrick/nextjs-engine",
	version: "3.0.0-alpha.2",
	track: "alpha",
	tag: "package-alpha.3.0.0-alpha.2",
	sourceBranch: "main-3",
	sourceCommit: "a".repeat(40),
	sha256: "b".repeat(64),
	assetName: "nextjs-engine-3.0.0-alpha.2.tgz",
	summary: "Gen 3 prerelease channel smoke fixture.",
};
const release = {
	tag_name: manifest.tag,
	body: "<!-- NE-CHANNEL-MANIFEST-START -->\n" + JSON.stringify(manifest, null, 2) + "\n<!-- NE-CHANNEL-MANIFEST-END -->",
	published_at: "2026-10-28T00:00:00Z",
	html_url: "https://github.com/Kate-alt-69/nextjs-engine/releases/tag/package-alpha.3.0.0-alpha.2",
	assets: [{
		name: manifest.assetName,
		size: 4096,
		state: "uploaded",
		browser_download_url: "https://github.com/Kate-alt-69/nextjs-engine/releases/download/package-alpha.3.0.0-alpha.2/" + manifest.assetName,
	}],
};
const parsedManifest = channels.parseManifestFromBody(release.body);
assert.equal(parsedManifest.version, manifest.version);
const parsedRelease = channels.validateReleaseManifest(parsedManifest, release);
assert.equal(parsedRelease.version, "3.0.0-alpha.2");
assert.equal(parsedRelease.sourceCommit, "a".repeat(40));
assert.equal(parsedRelease.sha256, "b".repeat(64));
assert.equal(channels.validateReleaseManifest({ ...manifest, sha256: "not-a-hash" }, release), null);

const fixtureCatalog = {
	releases: [
		{ version: "2.7.0", track: "stable", source: "npm" },
		{ version: "3.0.0-alpha.2", track: "alpha", source: "github" },
		{ version: "3.0.0-beta.1", track: "beta", source: "github" },
	],
};
assert.equal(channels.resolveRelease(fixtureCatalog, { channel: "alpha" }).version, "3.0.0-alpha.2");
assert.equal(channels.resolveRelease(fixtureCatalog, { channel: "latest-green" }).version, "3.0.0-beta.1");
assert.equal(channels.resolveRelease(fixtureCatalog, { version: "3.0.0-alpha.2" }).track, "alpha");

const args = cli.parseArgs([
	"update", "--channel", "alpha", "--yes",
	"--and=git status", "-and=npm test", "--and-terminal=10",
]);
assert.deepEqual(args.positional, ["update"]);
assert.equal(args.options.channel, "alpha");
assert.equal(args.options.yes, true);
assert.deepEqual(args.options.andCommands, ["git status", "npm test"]);
assert.equal(args.options.andTerminal, 10);
assert.match(cli.getHelp(), /ne build/);
assert.match(cli.getHelp(), /ne updater/);
assert.match(cli.getHelp(), /ne update --channel/);

const dashboard = terminal.renderDashboard(2, {
	projectName: "demo",
	version: "3.0.0-alpha.2",
	channel: "alpha",
	cacheStatus: "ready",
});
assert.match(dashboard, /Production Build/);
assert.match(dashboard, /Channel Updater/);
assert.doesNotMatch(dashboard, /[\u{1F300}-\u{1FAFF}]/u);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ne-cli-smoke-"));
try {
	fs.writeFileSync(path.join(temp, "package.json"), JSON.stringify({
		name: "fixture",
		version: "1.0.0",
		dependencies: { "@kastrick/nextjs-engine": "2.6.2" },
	}, null, 2));
	fs.writeFileSync(path.join(temp, "package-lock.json"), "{\"name\":\"fixture\",\"lockfileVersion\":3}\n");
	fs.writeFileSync(path.join(temp, "next.config.js"), 'module.exports = { distDir: "dist" };\n');
	fs.mkdirSync(path.join(temp, "dist"), { recursive: true });
	fs.mkdirSync(path.join(temp, ".nextjs-engine", "cache", "ne-backups"), { recursive: true });
	fs.writeFileSync(path.join(temp, ".nextjs-engine", "cache", "ne-backups", "keep.txt"), "keep");
	const backup = project.captureDependencyFiles(temp);
	fs.writeFileSync(path.join(temp, "package.json"), "{\"name\":\"changed\"}\n");
	project.restoreDependencyFiles(temp, backup);
	assert.equal(JSON.parse(fs.readFileSync(path.join(temp, "package.json"), "utf8")).name, "fixture");
	assert.ok(project.cleanTargets(temp).includes("dist"));
	project.runClean(temp, false).then(() => {
		assert.equal(fs.existsSync(path.join(temp, "dist")), false);
		assert.equal(fs.existsSync(path.join(temp, ".nextjs-engine", "cache", "ne-backups", "keep.txt")), true);
	}).catch((error) => {
		process.stderr.write(error.stack + "\n");
		process.exitCode = 1;
	}).finally(() => fs.rmSync(temp, { recursive: true, force: true }));
} catch (error) {
	fs.rmSync(temp, { recursive: true, force: true });
	throw error;
}

console.log("Gen 3 NE CLI smoke assertions passed.");
