"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { writeFileAtomically } = require("./file-system");

const PACKAGE_NAME = "@kastrick/nextjs-engine";
const CACHE_RELATIVE = path.join(".nextjs-engine", "cache", "ne-hotfixes.json");
const CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 4500;

function readJson(file, fallback) {
	try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

function installedPackage(root) {
	return readJson(path.join(root, "node_modules", "@kastrick", "nextjs-engine", "package.json"), null);
}

function localState(root) {
	return readJson(path.join(root, ".nextjs-engine", "config", "ne.config.json"), {});
}

function installedVersion(root) {
	const installed = installedPackage(root);
	if (installed && installed.name === PACKAGE_NAME && typeof installed.version === "string") return installed.version;
	const project = readJson(path.join(root, "package.json"), {});
	return project.name === "nextjs-engine" && typeof project.version === "string" ? project.version : null;
}

function generationFor(version, state) {
	if (state && (state.engineGeneration === 2 || state.engineGeneration === 3)) return state.engineGeneration;
	const major = Number(String(version || "").split(".")[0]);
	return major === 2 || major === 3 ? major : null;
}

function manifestUrl(generation) {
	if (generation !== 2 && generation !== 3) return null;
	const branch = generation === 2 ? "main-2" : "main-3";
	return "https://raw.githubusercontent.com/Kastrick8/nextjs-engine/" + branch + "/.github/ne-cli-hotfixes.json";
}

function validateManifest(value, generation) {
	if (!value || value.schemaVersion !== 1 || value.packageName !== PACKAGE_NAME ||
		value.generation !== generation || !Array.isArray(value.hotfixes)) {
		throw new Error("The remote NE hotfix manifest has an unsupported schema or generation.");
	}
	const commit = /^[a-f0-9]{40}$/i;
	for (const entry of value.hotfixes) {
		if (!entry || typeof entry.id !== "string" || !/^[a-z0-9][a-z0-9.-]{2,79}$/i.test(entry.id) ||
			typeof entry.version !== "string" || !/^\d+\.\d+\.\d+(?:-(?:alpha|beta)\.\d+)?$/.test(entry.version) ||
			entry.generation !== generation || !Array.isArray(entry.compatibleVersions) ||
			!entry.compatibleVersions.includes(entry.version) ||
			!commit.test(entry.fromCommit || "") || !commit.test(entry.toCommit || "") ||
			!(/^[a-f0-9]{64}$/i.test(entry.sha256 || "")) ||
			typeof entry.artifactName !== "string" || entry.artifactName !== "nextjs-engine-" + entry.version + ".tgz" ||
			typeof entry.artifactUrl !== "string" || typeof entry.summary !== "string") {
			throw new Error("The remote NE hotfix manifest contains an invalid entry.");
		}
		const url = new URL(entry.artifactUrl);
		const parts = url.pathname.split("/");
		const expectedPrefix = "ne-hotfix-" + generation + "-" + entry.id;
		if (url.protocol !== "https:" || url.hostname !== "github.com" ||
			url.username || url.password || url.port || url.search || url.hash ||
			parts.length !== 7 || parts[1] !== "Kastrick8" || parts[2] !== "nextjs-engine" ||
			parts[3] !== "releases" || parts[4] !== "download" ||
			parts[5] !== expectedPrefix || parts[6] !== entry.artifactName) {
			throw new Error("The remote NE hotfix entry points outside its expected official GitHub release asset.");
		}
	}
	return value;
}

async function fetchManifest(generation) {
	const url = manifestUrl(generation);
	if (!url) return null;
	const response = await fetch(url, {
		headers: { Accept: "application/json", "User-Agent": "nextjs-engine-ne-cli" },
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	});
	if (!response.ok) throw new Error("GitHub returned HTTP " + response.status + " for the NE hotfix manifest.");
	return validateManifest(await response.json(), generation);
}

async function loadManifest(root, generation, options) {
	const settings = options || {};
	const cachePath = path.join(root, CACHE_RELATIVE);
	const cache = readJson(cachePath, null);
	const now = Date.now();
	if (!settings.force && cache && cache.generation === generation &&
		cache.savedAt && now - cache.savedAt < CACHE_TTL_MS) {
		try { return { manifest: validateManifest(cache.manifest, generation), cached: true }; } catch {}
	}
	try {
		const manifest = await fetchManifest(generation);
		if (!manifest) return { manifest: null, cached: false, unavailable: true };
		writeFileAtomically(cachePath, JSON.stringify({ generation, savedAt: now, manifest }, null, 2) + "\n", { mode: 0o600 });
		return { manifest, cached: false };
	} catch (error) {
		if (cache && cache.generation === generation) {
			try { return { manifest: validateManifest(cache.manifest, generation), cached: true, stale: true, warning: error.message }; } catch {}
		}
		return { manifest: null, cached: false, unavailable: true, warning: error.message };
	}
}

function applicableHotfix(root, manifest) {
	if (!manifest) return null;
	const version = installedVersion(root);
	if (!version) return null;
	const state = localState(root);
	const installedCommit = typeof state.installedCommit === "string" ? state.installedCommit.toLowerCase() : null;
	const candidates = manifest.hotfixes.filter((entry) =>
		entry.version === version && entry.compatibleVersions.includes(version) &&
		(!installedCommit || entry.fromCommit.toLowerCase() === installedCommit)
	);
	if (!candidates.length) return null;
	candidates.sort((left, right) => String(right.publishedAt || "").localeCompare(String(left.publishedAt || "")));
	return candidates[0];
}

async function checkForHotfix(root, options) {
	const version = installedVersion(root);
	const state = localState(root);
	const generation = generationFor(version, state);
	if (!generation) return { available: false, reason: "unknown-generation" };
	const loaded = await loadManifest(root, generation, options);
	if (!loaded.manifest) return { available: false, generation, unavailable: true, warning: loaded.warning };
	const entry = applicableHotfix(root, loaded.manifest);
	return {
		available: Boolean(entry),
		generation,
		version,
		installedCommit: state.installedCommit || (entry && entry.fromCommit) || null,
		entry,
		cached: loaded.cached,
		stale: loaded.stale,
		warning: loaded.warning,
	};
}

function formatHotfixWarning(report, options) {
	if (!report || !report.available || !report.entry) return "";
	const entry = report.entry;
	const from = String(report.installedCommit || entry.fromCommit).slice(0, 12);
	const to = entry.toCommit.slice(0, 12);
	const { renderBanner } = require("./presentation");
	return renderBanner({
		type: "warning",
		title: "NE SOURCE UPDATE AVAILABLE",
		message: "Your nextjs-engine@" + report.version + " installation has a compatible GitHub maintenance update.",
		details: [
			"Generation: Gen " + report.generation,
			"Source: " + from + " => " + to,
			entry.summary,
			"Run: ne update --source",
			"Only the Engine package is updated; your application source files are not changed.",
		],
		color: options && options.noColor ? false : undefined,
	});
}

async function warnBeforeBuild(root, options) {
	const report = await checkForHotfix(root);
	if (report.available) {
		const banner = formatHotfixWarning(report, options);
		if (banner) process.stderr.write(banner + "\n");
	} else if (report.unavailable && process.env.NE_DEBUG === "1") {
		process.stderr.write("[NE] Source maintenance check unavailable: " + (report.warning || "no remote manifest") + "\n");
	}
	return report;
}

async function installAvailableHotfix(project, root, options) {
	const report = await checkForHotfix(root, { force: true });
	if (!report.available || !report.entry) {
		process.stdout.write("[NE] No compatible GitHub source update is currently available for this installation.\n");
		if (report.unavailable && report.warning) process.stdout.write("[NE] GitHub check unavailable: " + report.warning + "\n");
		return { installed: false, report };
	}
	const entry = report.entry;
	process.stdout.write("[NE] Verified maintenance target: " + report.version + " · " +
		entry.fromCommit.slice(0, 12) + " => " + entry.toCommit.slice(0, 12) + "\n");
	process.stdout.write("[NE] Source: official GitHub release " + entry.id + "\n");
	const release = {
		version: entry.version,
		track: "stable",
		channel: "stable",
		source: "github",
		sourceLabel: "GitHub maintenance release",
		sourceBranch: report.generation === 2 ? "main-2" : "main-3",
		sourceCommit: entry.toCommit,
		sha256: entry.sha256.toLowerCase(),
		artifactName: entry.artifactName,
		artifactUrl: entry.artifactUrl,
		installSpec: entry.artifactUrl,
		description: entry.summary,
	};
	const installed = await project.installRelease(root, release, "source-hotfix", options || {});
	return { installed: true, package: installed, report };
}

async function fetchJson(url, label) {
	const response = await fetch(url, {
		headers: { Accept: "application/json", "User-Agent": "nextjs-engine-ne-cli" },
		signal: AbortSignal.timeout(7000),
	});
	if (!response.ok) throw new Error(label + " returned HTTP " + response.status + ".");
	return response.json();
}

async function getInfo(root, project) {
	const state = localState(root);
	const installed = installedPackage(root);
	const projectManifest = readJson(path.join(root, "package.json"), {});
	const version = installedVersion(root);
	const generation = generationFor(version, state);
	const manager = project.detectPackageManager(root);
	const local = {
		project: projectManifest.name || path.basename(root),
		enginePackage: installed && installed.name === PACKAGE_NAME ? installed.name : "not found in node_modules",
		version: version || "unknown",
		generation: generation ? "Gen " + generation : "unknown",
		packageManager: manager,
		node: process.version,
		platform: process.platform + "/" + process.arch,
		source: state.source || "npm / unrecorded",
		sourceBranch: state.sourceBranch || "not recorded",
		sourceCommit: state.installedCommit || "not recorded",
		channel: state.activeChannel || "not selected",
	};
	let remote = { available: false };
	if (generation) {
		try {
			const manifest = await fetchManifest(generation);
			const entry = applicableHotfix(root, manifest);
			const branch = generation === 2 ? "main-2" : "main-3";
			const head = await fetchJson("https://api.github.com/repos/Kastrick8/nextjs-engine/commits/" + branch, "GitHub branch head");
			remote = {
				available: true,
				branch,
				headCommit: head && head.sha ? head.sha : "unknown",
				hotfix: entry ? {
					id: entry.id,
					version: entry.version,
					fromCommit: entry.fromCommit,
					toCommit: entry.toCommit,
					summary: entry.summary,
				} : null,
				latestHotfixCommit: manifest.latestHotfixCommit || "none published",
				manifestUpdatedAt: manifest.updatedAt || "not recorded",
			};
		} catch (error) {
			remote = { available: false, warning: error.message };
		}
	}
	return { local, remote };
}

function formatInfo(info) {
	const lines = ["NE PROJECT INFORMATION", "", "LOCAL", ""];
	for (const [key, value] of Object.entries(info.local || {})) lines.push("  " + key.padEnd(16, " ") + String(value));
	lines.push("", "REMOTE", "");
	if (info.remote && info.remote.available) {
		lines.push("  branch           " + info.remote.branch);
		lines.push("  branch head      " + String(info.remote.headCommit).slice(0, 12));
		lines.push("  latest hotfix    " + info.remote.latestHotfixCommit);
		lines.push("  manifest updated " + info.remote.manifestUpdatedAt);
		if (info.remote.hotfix) {
			lines.push("  update available " + info.remote.hotfix.fromCommit.slice(0, 12) + " => " + info.remote.hotfix.toCommit.slice(0, 12));
			lines.push("  summary          " + info.remote.hotfix.summary);
		} else {
			lines.push("  update available none for this installed version");
		}
	} else {
		lines.push("  unavailable      " + ((info.remote && info.remote.warning) || "No generation-specific remote information"));
	}
	return lines.join("\n");
}

module.exports = {
	CACHE_RELATIVE,
	readJson,
	installedPackage,
	localState,
	installedVersion,
	generationFor,
	manifestUrl,
	validateManifest,
	fetchManifest,
	loadManifest,
	applicableHotfix,
	checkForHotfix,
	formatHotfixWarning,
	warnBeforeBuild,
	installAvailableHotfix,
	getInfo,
	formatInfo,
};
