"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const channels = require("../bin/ne-cli/channels");
const terminal = require("../bin/ne-cli/terminal");
const cli = require("../bin/ne-cli/cli");
const project = require("../bin/ne-cli/project");

async function main() {
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

	const rollingManifest = {
		...manifest,
		tag: "channel-alpha-latest",
		floating: true,
		assetName: "nextjs-engine-3.0.0-alpha.2-" + rollingManifest.sourceCommit + ".tgz",
	};
	const rollingAsset = {
		...release,
		tag_name: "channel-alpha-latest",
		body: "<!-- NE-CHANNEL-MANIFEST-START -->\n" + JSON.stringify(rollingManifest, null, 2) + "\n<!-- NE-CHANNEL-MANIFEST-END -->",
		assets: [{
			name: rollingManifest.assetName,
			size: 4096,
			state: "uploaded",
			browser_download_url: "https://github.com/Kate-alt-69/nextjs-engine/releases/download/channel-alpha-latest/" + rollingManifest.assetName,
		}],
	};
	const rollingRelease = channels.validateReleaseManifest(
		channels.parseManifestFromBody(rollingAsset.body),
		rollingAsset
	);
	assert.equal(rollingRelease.floating, true);
	assert.equal(channels.validateReleaseManifest(
		{ ...rollingManifest, track: "beta" },
		rollingAsset
	), null);
	assert.equal(channels.validateReleaseManifest(
		{ ...rollingManifest, floating: false },
		rollingAsset
	), null);
	const mismatchedAssetName = "nextjs-engine-3.0.0-alpha.2-" + "b".repeat(40) + ".tgz";
	assert.equal(channels.validateReleaseManifest(
		{ ...rollingManifest, assetName: mismatchedAssetName },
		{ ...rollingAsset, assets: [{ ...rollingAsset.assets[0], name: mismatchedAssetName }] }
	), null);

	const fixtureCatalog = {
		releases: [
			{ version: "2.7.0", track: "stable", source: "npm" },
			{ version: "3.0.0-alpha.1", track: "alpha", source: "github" },
			{ version: "3.0.0-alpha.2", track: "alpha", source: "github", floating: true, sourceCommit: "a".repeat(40) },
			{ version: "3.0.0-beta.1", track: "beta", source: "github" },
		],
	};
	assert.equal(channels.resolveRelease(fixtureCatalog, { channel: "alpha" }).floating, true);
	assert.equal(channels.resolveRelease(fixtureCatalog, { channel: "latest-green" }).version, "3.0.0-beta.1");
	assert.equal(channels.resolveRelease(fixtureCatalog, { version: "3.0.0-alpha.1" }).track, "alpha");
	assert.equal(channels.resolveRelease(fixtureCatalog, { version: "3.0.0-alpha.2" }), null);
	assert.match(channels.channelLabel(fixtureCatalog.releases[2]), /LATEST COMMIT/);

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
	assert.match(terminal.renderReleaseList(0, { releases: [rollingRelease], cached: false }, {}), /ALPHA/);

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

		await project.runClean(temp, false);
		assert.equal(fs.existsSync(path.join(temp, "dist")), false);
		assert.equal(fs.existsSync(path.join(temp, ".nextjs-engine", "cache", "ne-backups", "keep.txt")), true);

		const previousFetch = global.fetch;
		try {
			const bytes = Buffer.from([0x1f, 0x8b, 0x08, 0x00]);
			const release = {
				version: "3.0.0-alpha.2",
				artifactUrl: "https://example.invalid/ne-test.tgz",
				sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
			};
			global.fetch = async () => new Response(bytes, { status: 200 });
			const downloaded = await project.downloadVerifiedArtifact(temp, release);
			assert.deepEqual(fs.readFileSync(downloaded.file), bytes);
			assert.equal(downloaded.sha512, crypto.createHash("sha512").update(bytes).digest("base64"));

			global.fetch = async () => new Response(bytes, {
				status: 200,
				headers: { "content-length": String(100 * 1024 * 1024 + 1) },
			});
			await assert.rejects(
				() => project.downloadVerifiedArtifact(temp, { ...release, sha256: "a".repeat(64) }),
				/larger than 100 MiB/
			);

			global.fetch = async () => new Response(bytes, { status: 200 });
			await assert.rejects(
				() => project.downloadVerifiedArtifact(temp, { ...release, sha256: "a".repeat(64) }),
				/SHA-256 mismatch/
			);

			const artifactPath = path.join(temp, ".nextjs-engine", "cache", "ne-downloads", "nextjs-engine-3.0.0-alpha.2-" + "c".repeat(12) + ".tgz");
			const remoteUrl = "https://github.com/Kate-alt-69/nextjs-engine/releases/download/channel-alpha-latest/" + path.basename(artifactPath);
			const artifactBytes = Buffer.from("verified fixture bytes");
			const artifact = {
				file: artifactPath,
				sha512: crypto.createHash("sha512").update(artifactBytes).digest("base64"),
			};
			fs.writeFileSync(artifactPath, artifactBytes);
			const fileSpec = "file:" + artifactPath;
			const manifest = {
				name: "fixture",
				version: "1.0.0",
				dependencies: { "@kastrick/nextjs-engine": fileSpec },
			};
			fs.writeFileSync(path.join(temp, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
			fs.writeFileSync(path.join(temp, "package-lock.json"), JSON.stringify({
				name: "fixture",
				version: "1.0.0",
				lockfileVersion: 3,
				packages: {
					"": { name: "fixture", version: "1.0.0", dependencies: { "@kastrick/nextjs-engine": fileSpec } },
					"node_modules/@kastrick/nextjs-engine": {
						version: "3.0.0-alpha.2",
						resolved: fileSpec,
						integrity: "sha512-" + artifact.sha512,
					},
				},
				dependencies: {
					"@kastrick/nextjs-engine": {
						version: "3.0.0-alpha.2",
						resolved: fileSpec,
						integrity: "sha512-" + artifact.sha512,
					},
				},
			}, null, 2) + "\n");
			project.normalizeArtifactDependency(temp, { version: "3.0.0-alpha.2", artifactUrl: remoteUrl }, artifact);
			const normalizedManifest = JSON.parse(fs.readFileSync(path.join(temp, "package.json"), "utf8"));
			const normalizedLock = JSON.parse(fs.readFileSync(path.join(temp, "package-lock.json"), "utf8"));
			assert.equal(normalizedManifest.dependencies["@kastrick/nextjs-engine"], remoteUrl);
			assert.equal(normalizedLock.packages[""].dependencies["@kastrick/nextjs-engine"], remoteUrl);
			assert.equal(normalizedLock.packages["node_modules/@kastrick/nextjs-engine"].resolved, remoteUrl);
			assert.equal(normalizedLock.packages["node_modules/@kastrick/nextjs-engine"].version, "3.0.0-alpha.2");
			assert.equal(normalizedLock.packages["node_modules/@kastrick/nextjs-engine"].integrity, "sha512-" + artifact.sha512);
			assert.equal(JSON.stringify(normalizedLock).includes(fileSpec), false);

			const textRoot = path.join(temp, "pnpm-project");
			fs.mkdirSync(textRoot, { recursive: true });
			fs.writeFileSync(path.join(textRoot, "package.json"), JSON.stringify({
				name: "fixture-pnpm",
				version: "1.0.0",
				packageManager: "pnpm@10.0.0",
				dependencies: { "@kastrick/nextjs-engine": fileSpec },
			}, null, 2) + String.fromCharCode(10));
			const pnpmLock = [
				"lockfileVersion: '9.0'",
				"importers:",
				"  .:",
				"    dependencies:",
				"      '@kastrick/nextjs-engine':",
				"        specifier: " + fileSpec,
				"        version: " + fileSpec,
				"packages:",
				"  '@kastrick/nextjs-engine@" + fileSpec + "':",
				"    resolution: {tarball: " + fileSpec + ", integrity: sha512-" + artifact.sha512 + "}",
				"snapshots:",
				"  '@kastrick/nextjs-engine@" + fileSpec + "': {}",
			].join(String.fromCharCode(10)) + String.fromCharCode(10);
			fs.writeFileSync(path.join(textRoot, "pnpm-lock.yaml"), pnpmLock);
			project.normalizeArtifactDependency(textRoot, { version: "3.0.0-alpha.2", artifactUrl: remoteUrl }, artifact);
			const normalizedPnpm = fs.readFileSync(path.join(textRoot, "pnpm-lock.yaml"), "utf8");
			assert.equal(normalizedPnpm.includes(remoteUrl), true);
			assert.equal(normalizedPnpm.includes(fileSpec), false);

		} finally {
			global.fetch = previousFetch;
		}
	} finally {
		fs.rmSync(temp, { recursive: true, force: true });
	}
	process.stdout.write("Gen 3 NE CLI smoke assertions passed.\n");
}

main().catch((error) => {
	process.stderr.write((error && error.stack) || String(error));
	process.stderr.write("\n");
	process.exitCode = 1;
});
