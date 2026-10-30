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
const tasks = require("../bin/ne-cli/tasks");
const presentation = require("../bin/ne-cli/presentation");
const diagnostics = require("../bin/ne-cli/diagnostics");
const { evaluateGreenRuns } = require("./gen3-assert-green-commit");

async function main() {
	assert.equal(tasks.MAX_WORKERS, 3, "NE command workers are capped at three concurrent worker threads");
	const { spawnSync } = require("node:child_process");
	const neExecutable = path.resolve(__dirname, "../bin/ne.js");

	assert.equal(presentation.visibleWidth("\x1b[31mERROR\x1b[0m"), 5,
		"ANSI escape sequences do not affect calculated terminal width");
	const adaptiveBanner = presentation.renderBanner({
		type: "warning",
		title: "NE CLI · EXPERIMENTAL",
		message: "The NE CLI is experimental and may change or be removed in a future version.",
		details: ["Review the selected channel before applying updates."],
		width: 58,
		color: true,
	});
	const bannerWidths = adaptiveBanner.split("\n").map(presentation.visibleWidth);
	assert.equal(new Set(bannerWidths).size, 1, "every adaptive banner row aligns to the same visible width");
	assert.ok(bannerWidths[0] <= 58, "adaptive banners stay within the requested terminal width");
	assert.match(adaptiveBanner, /NE CLI · EXPERIMENTAL/);
	const asciiBanner = presentation.renderBanner({
		type: "error",
		title: "ERROR",
		code: "NE1001",
		message: "Unknown command.",
		width: 48,
		ascii: true,
		color: false,
	});
	assert.match(asciiBanner, /^\+/);
	assert.ok(asciiBanner.split("\n").every((line) => !/[╭╮╰╯│─]/.test(line)),
		"ASCII mode contains no Unicode box drawing characters");

	const codeFrame = presentation.renderCodeFrame(
		"const first = true;\nconst value = );\nconst last = false;",
		{ line: 2, column: 15 },
		{ width: 72 }
	);
	assert.match(codeFrame, /›\s+2 │ const value = \);/);
	assert.match(codeFrame, /\^/);
	const syntaxError = diagnostics.createCliError("Unexpected token ')'.", {
		code: "NE1004",
		location: { file: "app/page.tsx", line: 12, column: 18 },
		source: "const placeholder = 0;\\n".repeat(11) + "const value = );\\n",
		suggestion: "Check the expression before this token.",
	});
	const syntaxBanner = presentation.renderError(syntaxError, { width: 72, color: false });
	assert.match(syntaxBanner, /NE1004/);
	assert.match(syntaxBanner, /app\/page\.tsx:line 12:column 18/);
	assert.match(syntaxBanner, /\^/);

	const commandTypo = diagnostics.unknownCommand("bulid", [
		"updater", "update", "dev", "build", "start", "check", "clean", "rollback", "help",
	]);
	assert.equal(commandTypo.neCode, "NE1001");
	assert.match(commandTypo.neSuggestion, /ne build/);
	const optionTypo = diagnostics.unknownOption("--verison", [
		"--channel", "--version", "--and", "--yes", "--check", "--json", "--dry-run", "--force",
	]);
	assert.equal(optionTypo.neCode, "NE1002");
	assert.match(optionTypo.neSuggestion, /--version/);
	assert.equal(diagnostics.missingOptionValue("--channel").neCode, "NE1003");

	const typoResult = spawnSync(process.execPath, [neExecutable, "bulid"], {
		cwd: os.tmpdir(), encoding: "utf8", timeout: 5000,
	});
	assert.equal(typoResult.status, 1);
	assert.match(typoResult.stderr, /NE1001/);
	assert.match(typoResult.stderr, /Did you mean "ne build"/);

	const typoOptionResult = spawnSync(process.execPath, [neExecutable, "--verison"], {
		cwd: os.tmpdir(), encoding: "utf8", timeout: 5000,
	});
	assert.equal(typoOptionResult.status, 1);
	assert.match(typoOptionResult.stderr, /NE1002/);
	assert.match(typoOptionResult.stderr, /--version/);

	const executable = neExecutable;
	const startupPackageManifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8"));
	const versionStarted = process.hrtime.bigint();
	const versionResult = spawnSync(process.execPath, [executable, "--version"], {
		cwd: os.tmpdir(),
		encoding: "utf8",
		timeout: 5000,
	});
	const versionElapsedMs = Number(process.hrtime.bigint() - versionStarted) / 1e6;
	assert.equal(versionResult.status, 0, "ne --version works without a project directory");
	assert.equal(versionResult.stdout.trim(), startupPackageManifest.version);
	assert.equal(versionResult.stderr, "");
	assert.ok(versionElapsedMs < 1000, "the standalone version path completes within the one-second startup budget");
	const shortVersionResult = spawnSync(process.execPath, [executable, "-v"], {
		cwd: os.tmpdir(),
		encoding: "utf8",
		timeout: 5000,
	});
	assert.equal(shortVersionResult.status, 0);
	assert.equal(shortVersionResult.stdout.trim(), startupPackageManifest.version);

	const helpResult = spawnSync(process.execPath, [executable, "--help"], {
		cwd: os.tmpdir(),
		encoding: "utf8",
		timeout: 5000,
	});
	assert.equal(helpResult.status, 0, "ne --help does not require a project package.json");
	assert.match(helpResult.stdout, /Open the interactive dashboard/);
	assert.equal(helpResult.stderr, "");

	const cliModulePath = path.resolve(__dirname, "../bin/ne-cli/cli.js");
	const lazyProbe = [
		"const cliPath = " + JSON.stringify(cliModulePath) + ";",
		"require(cliPath);",
		"const path = require('node:path');",
		"const root = path.dirname(cliPath);",
		"const names = ['channels', 'terminal', 'project', 'tasks'];",
		"const eager = names.filter((name) => require.cache[require.resolve(path.join(root, name + '.js'))]);",
		"if (eager.length) { process.stderr.write('Eager CLI imports: ' + eager.join(', ')); process.exitCode = 1; }",
		"require(path.join(root, 'project.js'));",
		"if (require.cache[require.resolve(path.join(root, 'tasks.js'))]) { process.stderr.write('Project runner eagerly loaded NE task workers'); process.exitCode = 1; }",
	].join("\n");
	const lazyResult = spawnSync(process.execPath, ["-e", lazyProbe], {
		cwd: os.tmpdir(),
		encoding: "utf8",
		timeout: 5000,
	});
	assert.equal(lazyResult.status, 0, "loading the CLI router does not load command-specific modules");
	assert.equal(lazyResult.stderr, "");
	process.stdout.write("[NE-CLI] Fast startup: version " + versionElapsedMs.toFixed(1) + "ms; command modules and worker runtime lazy-load verified.\n");
	const windowsNode = "C:\\Program Files\\nodejs\\node.exe";
	const windowsNpmScript = "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js";
	assert.deepEqual(project.resolveProcessInvocation("npm", ["install", "--save-exact", "next"], {
		platform: "win32",
		execPath: windowsNode,
		existsSync: (candidate) => candidate === windowsNpmScript,
	}), {
		command: windowsNode,
		args: [windowsNpmScript, "install", "--save-exact", "next"],
	});
	assert.throws(() => project.resolveProcessInvocation("npm.cmd", ["install"], {
		platform: "win32",
	}), /does not execute \.cmd\/.bat wrappers through a shell/);
	const stdoutDescriptor = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
	const stderrDescriptor = Object.getOwnPropertyDescriptor(process.stderr, "isTTY");
	const noColor = process.env.NO_COLOR;
	try {
		Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: true });
		Object.defineProperty(process.stderr, "isTTY", { configurable: true, value: true });
		delete process.env.NO_COLOR;
		const treeFixture = Object.create(tasks.TaskTree.prototype);
		treeFixture.root = { id: "root", label: "ne build", parentId: null, status: "running", detail: "" };
		treeFixture.nodes = [
			{ id: "prepare", label: "ne prepare:production", parentId: "root", status: "success", detail: "" },
			{ id: "prepare-script", label: "node scripts/prepare.js", parentId: "prepare", status: "success", detail: "" },
			{ id: "check", label: "ne check", parentId: "root", status: "success", detail: "" },
			{ id: "type-check", label: "npm run type-check", parentId: "check", status: "running", detail: "" },
			{ id: "diagnostics", label: "Gen 3 migration diagnostics", parentId: "check", status: "pending", detail: "" },
			{ id: "next", label: "next build", parentId: "root", status: "pending", detail: "" },
		];
		treeFixture.byId = new Map([treeFixture.root, ...treeFixture.nodes].map((node) => [node.id, node]));
		treeFixture.frame = 1;
		const coloredRows = treeFixture.renderRows(76);
		assert.match(coloredRows[3].text, /\x1b\[32;1m├─>/,
			"the completed ne check branch connector is green");
		assert.match(coloredRows[3].text, /\x1b\[32;1mne check\x1b\[0m/,
			"the completed ne check label is green too");
		assert.match(coloredRows[4].text, /\x1b\[32;1m│  \x1b\[0m/,
			"child connector rails inherit the completed parent's green status");
		assert.match(coloredRows[4].text, /\x1b\[36;1m├─> \x1b\[0m/,
			"the currently running child branch is cyan");
		assert.match(coloredRows[5].text, /\x1b\[33;1m└─> \x1b\[0m/,
			"pending child branches are yellow");
	} finally {
		if (stdoutDescriptor) Object.defineProperty(process.stdout, "isTTY", stdoutDescriptor);
		else delete process.stdout.isTTY;
		if (stderrDescriptor) Object.defineProperty(process.stderr, "isTTY", stderrDescriptor);
		else delete process.stderr.isTTY;
		if (noColor === undefined) delete process.env.NO_COLOR;
		else process.env.NO_COLOR = noColor;
	}
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
	const rollingTag = channels.githubTagToRelease({ ref: "refs/tags/channel-alpha-latest" });
	assert.equal(rollingTag.version, "channel-alpha-latest");
	assert.equal(rollingTag.installable, false, "channel pointer tags are visible but never directly installable");
	assert.equal(channels.githubTagToRelease({ ref: "refs/tags/package.latest" }).tagName, "package.latest");
	assert.equal(channels.githubTagToRelease({ ref: "refs/tags/package.latest" }).installable, false);
	assert.equal(channels.githubTagToRelease({ ref: "refs/tags/Release-v2.6.2" }).tagName, "Release-v2.6.2");

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

	const greenContext = {
		repo: "Kastrick8/nextjs-engine",
		branch: "main-3",
		sha: "d".repeat(40),
	};
	const greenRun = (id, name, patch = {}) => ({
		id,
		name,
		event: "push",
		head_sha: greenContext.sha,
		head_branch: greenContext.branch,
		head_repository: { full_name: greenContext.repo },
		status: "completed",
		conclusion: "success",
		created_at: "2026-10-28T10:00:00Z",
		...patch,
	});
	const greenPayload = {
		workflow_runs: [
			greenRun(1, "Engine runtime CI"),
			greenRun(2, "Engine cross-browser compatibility"),
		],
	};
	assert.equal(evaluateGreenRuns(greenPayload, greenContext).ok, true);
	assert.equal(evaluateGreenRuns({
		workflow_runs: [greenRun(1, "Engine runtime CI"), greenRun(2, "Engine cross-browser compatibility", { event: "pull_request" })],
	}, greenContext).ok, false);
	assert.equal(evaluateGreenRuns({
		workflow_runs: [greenRun(1, "Engine runtime CI", { conclusion: "failure" }), greenRun(2, "Engine cross-browser compatibility")],
	}, greenContext).ok, false);
	assert.equal(evaluateGreenRuns({
		workflow_runs: [greenRun(1, "Engine runtime CI"), greenRun(2, "Engine cross-browser compatibility", { head_sha: "e".repeat(40) })],
	}, greenContext).ok, false);

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

	const packageManifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
	assert.equal(packageManifest.bin && packageManifest.bin.ne, "./bin/ne.js",
		"npm exposes the ne command directly through the package bin map");
	assert.match(fs.readFileSync(path.join(__dirname, "..", "bin", "ne.js"), "utf8"), /^#!\/usr\/bin\/env node/,
		"the ne executable has a Node.js shebang");

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
		cacheStatus: "loading",
		loading: true,
		spinner: "◓",
		activity: "Fetching release inventory",
		sourceStatus: { npm: { status: "loading" }, github: { status: "loading" }, alpha: { status: "loading" }, tags: { status: "loading" } },
	});
	assert.match(dashboard, /Production Build/);
	assert.match(dashboard, /Channel Updater/);
	assert.match(dashboard, /Activity.*Fetching release inventory/);
	assert.match(dashboard, /npm: loading.*github: loading/);
	assert.doesNotMatch(dashboard, /[\u{1F300}-\u{1FAFF}]/u);
	assert.match(terminal.renderReleaseList(0, { releases: [rollingRelease], cached: false }, {}), /ALPHA/);
	const loadingList = terminal.renderReleaseList(0, { releases: [], cached: true }, {
		loading: true,
		spinner: "◒",
		sourceStatus: { npm: { status: "loading" } },
	});
	assert.match(loadingList, /Contacting npm and GitHub/);
	assert.match(loadingList, /npm: loading/);
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
		const workerRun = await tasks.commandWorkers.run(process.execPath, [
			"-e",
			"process.stdout.write('NE_WORKER_OK'); process.stderr.write('NE_WORKER_STDERR');",
		], { cwd: temp });
		assert.equal(workerRun.code, 0);
		assert.equal(workerRun.stdout, "NE_WORKER_OK");
		assert.equal(workerRun.stderr, "NE_WORKER_STDERR");

		await assert.rejects(
			() => project.runProcess(process.execPath, [
				"-e",
				"process.stdout.write('WORKER_FAILURE_STDOUT'); process.stderr.write('WORKER_FAILURE_STDERR'); process.exitCode = 9;",
			], { cwd: temp, worker: true, captureOutput: true, taskTree: true }),
			(error) => {
				assert.match(error.output, /WORKER_FAILURE_STDOUT/);
				assert.match(error.output, /WORKER_FAILURE_STDERR/);
				return true;
			}
		);

		const buildRoot = path.join(temp, "build-project");
		fs.mkdirSync(path.join(buildRoot, "scripts"), { recursive: true });
		fs.mkdirSync(path.join(buildRoot, "node_modules", "next", "dist", "bin"), { recursive: true });
		fs.mkdirSync(path.join(buildRoot, "src", "engine", "plugins"), { recursive: true });
		fs.writeFileSync(path.join(buildRoot, "package.json"), JSON.stringify({
			name: "nextjs-engine",
			version: "3.0.0-alpha.1",
			scripts: {
				"type-check": "node scripts/type-check.js",
				"prepare:production": "node scripts/prepare.js",
			},
		}, null, 2) + "\n");
		fs.writeFileSync(path.join(buildRoot, "scripts", "type-check.js"),
			"process.stdout.write('TYPECHECK_WORKER_OK');\n");
		fs.writeFileSync(path.join(buildRoot, "scripts", "prepare.js"),
			"require('node:fs').writeFileSync('prepare.marker', 'prepared');\n");
		fs.writeFileSync(path.join(buildRoot, "src", "engine", "plugins", "gen3MigrationDiagnostics.js"),
			"module.exports = {};\n");
		fs.writeFileSync(path.join(buildRoot, "node_modules", "next", "dist", "bin", "next"),
			"require('node:fs').writeFileSync('next-build.marker', 'main-thread-build'); process.stdout.write('[NENC] Compiling app/page.tsx -> /\\n');\n");
		await project.runBuild(buildRoot);
		assert.equal(fs.readFileSync(path.join(buildRoot, "prepare.marker"), "utf8"), "prepared",
			"ne build executes prepare:production before checking");
		assert.equal(fs.readFileSync(path.join(buildRoot, "next-build.marker"), "utf8"), "main-thread-build",
			"next build runs on the CLI main process after ne check");


		const backup = project.captureDependencyFiles(temp);
		fs.writeFileSync(path.join(temp, "package.json"), "{\"name\":\"changed\"}\n");
		project.restoreDependencyFiles(temp, backup);
		assert.equal(JSON.parse(fs.readFileSync(path.join(temp, "package.json"), "utf8")).name, "fixture");
		assert.ok(project.cleanTargets(temp).includes("dist"));

		await project.runClean(temp, false);
		assert.equal(fs.existsSync(path.join(temp, "dist")), false);

		const failedBuildRoot = path.join(temp, "failed-build-project");
		fs.mkdirSync(path.join(failedBuildRoot, "scripts"), { recursive: true });
		fs.mkdirSync(path.join(failedBuildRoot, "node_modules", "next", "dist", "bin"), { recursive: true });
		fs.mkdirSync(path.join(failedBuildRoot, "src", "engine", "plugins"), { recursive: true });
		fs.writeFileSync(path.join(failedBuildRoot, "package.json"), JSON.stringify({
			name: "nextjs-engine",
			version: "3.0.0-alpha.1",
			scripts: { "type-check": "node scripts/type-check.js" },
		}, null, 2) + "\n");
		fs.writeFileSync(path.join(failedBuildRoot, "scripts", "type-check.js"),
			"process.stdout.write('TYPECHECK_FAILURE_OUTPUT'); process.stderr.write('TYPECHECK_FAILURE_STDERR'); process.exitCode = 7;\n");
		fs.writeFileSync(path.join(failedBuildRoot, "src", "engine", "plugins", "gen3MigrationDiagnostics.js"), "module.exports = {};\n");
		fs.writeFileSync(path.join(failedBuildRoot, "node_modules", "next", "dist", "bin", "next"),
			"require('node:fs').writeFileSync('next-build-ran.marker', 'unexpected');\n");
		await assert.rejects(() => project.runBuild(failedBuildRoot), (error) => {
			assert.equal(error.neTaskId, "check-type-check-script");
			assert.match(error.output, /TYPECHECK_FAILURE_OUTPUT/);
			assert.match(error.output, /TYPECHECK_FAILURE_STDERR/);
			assert.equal(error.neOutputDisplayed, true, "the task tree already displayed the failing child output");
			return true;
		});
		assert.equal(fs.existsSync(path.join(failedBuildRoot, "next-build-ran.marker")), false,
			"Next.js does not start after a failed ne check");

		assert.equal(fs.existsSync(path.join(temp, ".nextjs-engine", "cache", "ne-backups", "keep.txt")), true);

		const previousFetch = global.fetch;
		try {
			const feedRoot = path.join(temp, "feed-project");
			fs.mkdirSync(feedRoot, { recursive: true });
			const versions = {};
			const versionCount = 120;
			for (let index = 0; index < versionCount; index += 1) {
				const version = "1.0." + index;
				versions[version] = { name: "@kastrick/nextjs-engine", version };
			}
			const packument = {
				name: "@kastrick/nextjs-engine",
				"dist-tags": { latest: "1.0.119" },
				versions,
				time: { "1.0.119": "2026-10-01T00:00:00.000Z" },
			};
			const gitRefs = [
				{ ref: "refs/tags/package.1.0.119" },
				{ ref: "refs/tags/package-alpha.3.0.0-alpha.1" },
				{ ref: "refs/tags/channel-alpha-latest" },
				{ ref: "refs/tags/Release-v2.6.2" },
				{ ref: "refs/tags/package.latest" },
			];
			const sourceEvents = [];
			global.fetch = async (url) => {
				if (url === channels.NPM_PACKUMENT_URL) return new Response(JSON.stringify(packument), { status: 200 });
				if (url === channels.GITHUB_RELEASES_URL) return new Response("[]", { status: 200 });
				if (url === channels.GITHUB_LATEST_ALPHA_URL) return new Response(JSON.stringify(rollingAsset), { status: 200 });
				if (url === channels.GITHUB_PACKAGE_TAGS_URL) return new Response(JSON.stringify(gitRefs), { status: 200 });
				throw new Error("Unexpected updater feed URL: " + url);
			};
			const feedCatalog = await channels.loadChannelCatalog(feedRoot, {
				force: true,
				onSourceStatus: (event) => sourceEvents.push(event),
			});
			assert.equal(feedCatalog.releases.filter((item) => item.source === "npm" || item.isNpmPublished).length >= versionCount, true,
				"the complete npm packument is retained instead of only latest");
			assert.ok(feedCatalog.releases.some((item) => item.version === "1.0.119" && item.gitTags.includes("package.1.0.119")),
				"package/main Git tags merge onto their matching npm version");
			assert.ok(feedCatalog.releases.some((item) => item.tagName === "channel-alpha-latest"),
				"the rolling Alpha Git tag is visible in the updater");
			assert.ok(feedCatalog.releases.some((item) => item.version === "3.0.0-alpha.2" && item.floating === true),
				"the verified rolling Alpha artifact is listed as an installable Alpha channel");
			assert.ok(feedCatalog.releases.some((item) => item.tagName === "Release-v2.6.2"),
				"non-SemVer GitHub tags remain discoverable without becoming installable");
			assert.equal(feedCatalog.sourceStatus.npm.status, "ready");
			assert.equal(feedCatalog.sourceStatus.tags.status, "ready");
			assert.ok(sourceEvents.some((event) => event.source === "alpha" && event.status === "ready"),
				"the dashboard receives live status updates for the Alpha channel");
			const cachedFeed = channels.readCachedCatalog(feedRoot);
			assert.equal(cachedFeed.releases.length, feedCatalog.releases.length, "the full catalog is cached for an immediate next launch");

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
	process.stdout.write("Gen 3 NE CLI smoke assertions passed.\n");
}

main().catch((error) => {
	process.stderr.write((error && error.stack) || String(error));
	process.stderr.write("\n");
	process.exitCode = 1;
});
