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
const presentation = require("../bin/ne-cli/presentation");
const diagnostics = require("../bin/ne-cli/diagnostics");

async function main() {
	const { spawnSync } = require("node:child_process");
	const executable = path.resolve(__dirname, "../bin/ne.js");
	const repoRoot = path.resolve(__dirname, "..");

	assert.equal(presentation.visibleWidth("\x1b[31mERROR\x1b[0m"), 5);
	const warningBanner = presentation.renderBanner({
		type: "warning",
		title: "NE CLI · NEW IN 2.7.0",
		message: "The NE CLI was newly introduced in v2.7.0. Its commands and behavior may change, and it could be removed in a future release.",
		details: ["Review the selected release before applying updates."],
		width: 58,
		color: true,
	});
	const warningWidths = warningBanner.split("\n").map(presentation.visibleWidth);
	assert.equal(new Set(warningWidths).size, 1, "the v2 warning banner has aligned borders and content");
	assert.match(warningBanner, /NEW IN 2\.7\.0/);
	assert.match(warningBanner, /removed in a future release/);

	const errorBanner = presentation.renderError(diagnostics.unknownCommand("bulid", [
		"updater", "update", "dev", "build", "start", "check", "clean", "rollback", "help",
	]), { width: 58, ascii: true, color: false });
	assert.match(errorBanner, /NE1001/);
	assert.ok(errorBanner.split("\n").every((line) => !/[╭╮╰╯│─]/.test(line)));

	const commandTypo = diagnostics.unknownCommand("bulid", [
		"updater", "update", "dev", "build", "start", "check", "clean", "rollback", "help",
	]);
	assert.match(commandTypo.neSuggestion, /ne build/);
	assert.match(diagnostics.unknownOption("--verison", ["--channel", "--version", "--yes"]).neSuggestion, /--version/);
	assert.equal(diagnostics.missingOptionValue("--channel").neCode, "NE1003");

	const typoResult = spawnSync(process.execPath, [executable, "bulid"], {
		cwd: repoRoot, encoding: "utf8", timeout: 5000,
	});
	assert.equal(typoResult.status, 1);
	assert.match(typoResult.stderr, /NE1001/);
	assert.match(typoResult.stderr, /Did you mean "ne build"/);

	const typoOptionResult = spawnSync(process.execPath, [executable, "--verison"], {
		cwd: repoRoot, encoding: "utf8", timeout: 5000,
	});
	assert.equal(typoOptionResult.status, 1);
	assert.match(typoOptionResult.stderr, /NE1002/);
	assert.match(typoOptionResult.stderr, /--version/);

	assert.equal(channels.compareVersions("3.0.0-alpha.1", "3.0.0-alpha.2"), -1);
	assert.equal(channels.compareVersions("3.0.0-alpha.2", "3.0.0-beta.1"), -1);
	assert.equal(channels.compareVersions("3.0.0-beta.1", "2.7.0"), 1);
	assert.equal(channels.compareVersions("2.7.0", "2.7.0"), 0);
	assert.equal(channels.parseVersion("3.0.0.alpha.1"), null);

	// The storefront catalog must enumerate every npm version, not just the latest tag.
	const npmCatalog = channels.npmReleasesFromPackument({
		name: "@kastrick/nextjs-engine",
		"dist-tags": { latest: "2.7.0", alpha: "3.0.0-alpha.2", beta: "3.0.0-beta.1" },
		time: {
			"2.7.0": "2026-01-01T00:00:00.000Z",
			"2.6.2": "2025-12-01T00:00:00.000Z",
			"3.0.0-alpha.2": "2026-10-01T00:00:00.000Z",
			"3.0.0-beta.1": "2026-10-02T00:00:00.000Z",
		},
		versions: {
			"2.7.0": { name: "@kastrick/nextjs-engine", version: "2.7.0" },
			"2.6.2": { name: "@kastrick/nextjs-engine", version: "2.6.2" },
			"3.0.0-alpha.2": { name: "@kastrick/nextjs-engine", version: "3.0.0-alpha.2" },
			"3.0.0-beta.1": { name: "@kastrick/nextjs-engine", version: "3.0.0-beta.1" },
			"not-semver": { name: "@kastrick/nextjs-engine", version: "not-semver" },
		},
	});
	assert.deepEqual(npmCatalog.map((item) => item.version).sort(), ["2.6.2", "2.7.0", "3.0.0-alpha.2", "3.0.0-beta.1"].sort());
	assert.deepEqual(npmCatalog.find((item) => item.version === "2.7.0").npmDistTags, ["latest"]);
	assert.equal(npmCatalog.find((item) => item.version === "3.0.0-alpha.2").installable, false);
	assert.throws(() => channels.npmReleasesFromPackument({ name: "wrong-package", versions: {} }), /full package version catalog/);

	const tagFixtures = [
		{ ref: "refs/tags/package.2.7.0" },
		{ ref: "refs/tags/package-alpha.3.0.0-alpha.2" },
		{ ref: "refs/tags/package-beta.3.0.0-beta.1" },
		{ ref: "refs/tags/package.latest" },
		{ ref: "refs/tags/package-alpha.invalid" },
	];
	const parsedTags = tagFixtures.map(channels.packageTagToRelease);
	assert.deepEqual(parsedTags.slice(0, 3).map((item) => item.version), ["2.7.0", "3.0.0-alpha.2", "3.0.0-beta.1"]);
	assert.equal(parsedTags[0].installable, false);
	assert.equal(parsedTags[3], null);
	assert.equal(parsedTags[4], null);

	const freeformGitHubRelease = channels.catalogOnlyGitHubRelease({
		tag_name: "historical-engine-prerelease",
		name: "Historical NE prerelease",
		body: "Release notes from before the manifest format",
		published_at: "2025-01-02T00:00:00.000Z",
		assets: [],
	});
	assert.equal(freeformGitHubRelease.version, "historical-engine-prerelease");
	assert.equal(freeformGitHubRelease.track, "release");
	assert.equal(freeformGitHubRelease.installable, false);
	const freeformCatalog = channels.normaliseCatalog([freeformGitHubRelease]);
	assert.equal(freeformCatalog.releases.length, 1, "non-SemVer GitHub release tags remain visible in the catalog");
	assert.equal(channels.channelLabel(freeformCatalog.releases[0]), "CATALOG ONLY");
	assert.equal(channels.resolveRelease(freeformCatalog, { version: "historical-engine-prerelease" }), null,
		"free-form GitHub release tags are not accepted as installation targets");

	const mergedCatalog = channels.normaliseCatalog([
		...npmCatalog,
		parsedTags[0],
		{
			version: "3.0.0-alpha.2",
			track: "alpha",
			channel: "alpha",
			source: "github",
			sourceLabel: "GitHub Release",
			sourceBranch: "main-3",
			sourceCommit: "a".repeat(40),
			sha256: "b".repeat(64),
			artifactUrl: "https://example.invalid/verified.tgz",
			installSpec: "https://example.invalid/verified.tgz",
			publishedAt: "2026-10-03T00:00:00.000Z",
			installable: true,
			floating: false,
			gitTags: [],
			npmDistTags: [],
		},
	]);
	assert.equal(mergedCatalog.releases.filter((item) => item.version === "2.7.0").length, 1);
	assert.equal(mergedCatalog.releases.find((item) => item.version === "2.7.0").isNpmPublished, true);
	assert.equal(mergedCatalog.releases.find((item) => item.version === "2.7.0").isGitTagged, true);
	const mergedAlpha = mergedCatalog.releases.find((item) => item.version === "3.0.0-alpha.2");
	assert.equal(mergedAlpha.source, "github");
	assert.equal(mergedAlpha.installable, true);
	assert.deepEqual(mergedAlpha.sources.sort(), ["github", "npm"]);
	assert.equal(channels.resolveRelease(mergedCatalog, { version: "3.0.0-alpha.2" }).source, "github");
	assert.equal(channels.resolveRelease({ releases: [parsedTags[0]] }, { version: "2.7.0" }), null);
	assert.equal(channels.channelLabel(parsedTags[0]), "TAG ONLY");

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
		html_url: "https://github.com/Kastrick8/nextjs-engine/releases/tag/package-alpha.3.0.0-alpha.2",
		assets: [{
			name: manifest.assetName,
			size: 4096,
			state: "uploaded",
			browser_download_url: "https://github.com/Kastrick8/nextjs-engine/releases/download/package-alpha.3.0.0-alpha.2/" + manifest.assetName,
		}],
	};
	const parsedManifest = channels.parseManifestFromBody(release.body);
	assert.equal(parsedManifest.version, manifest.version);
	const parsedRelease = channels.validateReleaseManifest(parsedManifest, release);
	assert.equal(parsedRelease.version, "3.0.0-alpha.2");
	assert.equal(parsedRelease.sourceCommit, "a".repeat(40));
	assert.equal(parsedRelease.sha256, "b".repeat(64));

	const unverifiedRelease = channels.catalogOnlyGitHubRelease({
		...release,
		body: "Release notes without a verified NE manifest",
		assets: [],
	});
	assert.equal(unverifiedRelease.version, "3.0.0-alpha.2");
	assert.equal(unverifiedRelease.source, "github");
	assert.equal(unverifiedRelease.installable, false, "unverified GitHub release artifacts remain non-installable");
	const catalogOnlyMerge = channels.normaliseCatalog([parsedTags[1], unverifiedRelease]).releases[0];
	assert.equal(catalogOnlyMerge.source, "github", "the GitHub release remains visible when merged with its matching version tag");
	assert.equal(catalogOnlyMerge.installable, false);
	assert.deepEqual(catalogOnlyMerge.sources.sort(), ["git-tag", "github"]);
	assert.equal(channels.channelLabel(catalogOnlyMerge), "CATALOG ONLY");
	assert.equal(channels.validateReleaseManifest({ ...manifest, sha256: "not-a-hash" }, release), null);
	assert.equal(channels.validateReleaseManifest({ ...manifest, sourceBranch: "unknown" }, release), null);
	const malformedAlpha = {
		...manifest,
		version: "3.0.0-preview-alpha.2",
		tag: "package-alpha.3.0.0-preview-alpha.2",
		assetName: "nextjs-engine-3.0.0-preview-alpha.2.tgz",
	};
	assert.equal(channels.validateReleaseManifest(malformedAlpha, {
		...release,
		tag_name: malformedAlpha.tag,
		assets: [{ ...release.assets[0], name: malformedAlpha.assetName }],
	}), null);
	const unexpectedAssetName = "nextjs-engine-" + manifest.version + "-unexpected.tgz";
	assert.equal(channels.validateReleaseManifest(
		{ ...manifest, assetName: unexpectedAssetName },
		{ ...release, assets: [{ ...release.assets[0], name: unexpectedAssetName }] }
	), null);
	assert.equal(channels.validateReleaseManifest(
		{ ...manifest, tag: "arbitrary-release-tag" },
		{ ...release, tag_name: "arbitrary-release-tag" }
	), null);

	const rollingManifest = {
		...manifest,
		tag: "channel-alpha-latest",
		floating: true,
		assetName: "nextjs-engine-3.0.0-alpha.2-" + manifest.sourceCommit + ".tgz",
	};
	const rollingAsset = {
		...release,
		tag_name: "channel-alpha-latest",
		body: "<!-- NE-CHANNEL-MANIFEST-START -->\n" + JSON.stringify(rollingManifest, null, 2) + "\n<!-- NE-CHANNEL-MANIFEST-END -->",
		assets: [{
			name: rollingManifest.assetName,
			size: 4096,
			state: "uploaded",
			browser_download_url: "https://github.com/Kastrick8/nextjs-engine/releases/download/channel-alpha-latest/" + rollingManifest.assetName,
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
		{ ...rollingManifest, sourceBranch: "main-2" },
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
			{ version: "2.7.0", track: "stable", source: "npm", installable: true, installSpec: "@kastrick/nextjs-engine@2.7.0" },
			{ version: "3.0.0-alpha.1", track: "alpha", source: "github", installable: true, installSpec: "https://downloads.example.test/alpha.1.tgz" },
			{ version: "3.0.0-alpha.2", track: "alpha", source: "github", installable: true, installSpec: "https://downloads.example.test/alpha-latest.tgz", floating: true, sourceCommit: "a".repeat(40) },
			{ version: "3.0.0-beta.1", track: "beta", source: "github", installable: true, installSpec: "https://downloads.example.test/beta.1.tgz" },
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
	assert.deepEqual(cli.tokenizeCommand("git status --short"), ["git", "status", "--short"]);
	const windowsNode = "C:\\Program Files\\nodejs\\node.exe";
	const windowsNpmScript = "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js";
	const windowsNpmInvocation = cli.resolveChainedCommand("npm", ["test", "--", "--runInBand"], {
		platform: "win32",
		execPath: windowsNode,
		existsSync: (candidate) => candidate === windowsNpmScript,
	});
	assert.deepEqual(windowsNpmInvocation, {
		executable: windowsNode,
		args: [windowsNpmScript, "test", "--", "--runInBand"],
	});
	assert.throws(() => cli.resolveChainedCommand("npm", ["test"], {
		platform: "win32",
		execPath: windowsNode,
		existsSync: () => false,
	}), /beside the active Node\.js installation/);
	assert.deepEqual(cli.resolveChainedCommand("C:\\tools\\helper.exe", ["--version"], {
		platform: "win32",
	}), {
		executable: "C:\\tools\\helper.exe",
		args: ["--version"],
	});
	assert.throws(() => cli.resolveChainedCommand("npm.cmd", ["test"], {
		platform: "win32",
	}), /does not execute .* wrappers through a shell/);
	const windowsUpdaterNpmScript = "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js";
	assert.deepEqual(project.resolveProcessInvocation("npm", ["install", "--save-exact", "next"], {
		platform: "win32",
		execPath: windowsNode,
		existsSync: (candidate) => candidate === windowsUpdaterNpmScript,
	}), {
		command: windowsNode,
		args: [windowsUpdaterNpmScript, "install", "--save-exact", "next"],
	});
	assert.throws(() => project.resolveProcessInvocation("npm.cmd", ["install"], {
		platform: "win32",
	}), /does not execute .* wrappers through a shell/);
	assert.throws(() => project.resolveProcessInvocation("pnpm", ["install"], {
		platform: "win32",
		execPath: windowsNode,
		existsSync: () => false,
	}), /could not locate the JavaScript entry point/);
	assert.deepEqual(project.resolveProcessInvocation("bun", ["install"], {
		platform: "win32",
	}), { command: "bun", args: ["install"] });
	assert.deepEqual(cli.tokenizeCommand('npm run "with space"'), ["npm", "run", "with space"]);
	assert.throws(() => cli.tokenizeCommand("git status && npm test"), /shell operators are not supported/);
	assert.throws(() => cli.tokenizeCommand("node -e 'unterminated"), /unterminated quoted argument/);
	assert.match(cli.getHelp(), /ne build/);
	assert.match(cli.getHelp(), /ne updater/);
	assert.match(cli.getHelp(), /ne update --channel/);
	assert.match(cli.getHelp(), /Shell operators are rejected/);

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
	const manyReleases = Array.from({ length: 40 }, (_, index) => ({
		...rollingRelease,
		version: "3.0.0-alpha." + String(index + 1),
		publishedAt: new Date(2026, 0, index + 1).toISOString(),
	}));
	const laterPage = terminal.renderReleaseList(35, { releases: manyReleases, cached: false }, {
		projectName: "fixture",
		installedVersion: "not installed",
	});
	const pageIndicator = laterPage.match(/Page (\d+)\/(\d+)/);
	assert.ok(pageIndicator, "release list reports page position for a large inventory");
	assert.ok(Number(pageIndicator[1]) >= 4, "release list can navigate past the first 24 entries");
	assert.match(laterPage, /of 40/, "release list reports the full release inventory size");

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
				artifactName: "nextjs-engine-3.0.0-alpha.2.tgz",
				artifactUrl: "https://github.com/Kastrick8/nextjs-engine/releases/download/package-alpha.3.0.0-alpha.2/nextjs-engine-3.0.0-alpha.2.tgz",
				sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
			};
			assert.equal(project.validateReleaseArtifactUrl(release), release.artifactUrl);
			assert.throws(() => project.validateReleaseArtifactUrl({
				...release,
				artifactUrl: "https://example.invalid/ne-test.tgz",
			}), /outside the verified Kastrick8\/nextjs-engine GitHub release path/);
			assert.throws(() => project.validateReleaseArtifactUrl({
				...release,
				artifactUrl: "http://github.com/Kastrick8/nextjs-engine/releases/download/package-alpha.3.0.0-alpha.2/nextjs-engine-3.0.0-alpha.2.tgz",
			}), /outside the verified Kastrick8\/nextjs-engine GitHub release path/);
			assert.throws(() => project.validateReleaseArtifactUrl({
				...release,
				artifactUrl: "https://github.com/Kastrick8/other-repo/releases/download/package-alpha.3.0.0-alpha.2/nextjs-engine-3.0.0-alpha.2.tgz",
			}), /outside the verified Kastrick8\/nextjs-engine GitHub release path/);
			let untrustedFetchCalled = false;
			global.fetch = async () => {
				untrustedFetchCalled = true;
				return new Response(bytes, { status: 200 });
			};
			await assert.rejects(
				() => project.downloadVerifiedArtifact(temp, { ...release, artifactUrl: "https://example.invalid/ne-test.tgz" }),
				/outside the verified Kastrick8\/nextjs-engine GitHub release path/
			);
			assert.equal(untrustedFetchCalled, false, "a file-derived URL is rejected before any outbound request");
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
			const remoteUrl = "https://github.com/Kastrick8/nextjs-engine/releases/download/channel-alpha-latest/" + path.basename(artifactPath);
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
	process.stdout.write("NE CLI smoke assertions passed.\n");
}

main().catch((error) => {
	process.stderr.write((error && error.stack) || String(error));
	process.stderr.write("\n");
	process.exitCode = 1;
});
