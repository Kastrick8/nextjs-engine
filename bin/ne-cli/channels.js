"use strict";

const fs = require("node:fs");
const path = require("node:path");

const PACKAGE_NAME = "@kastrick/nextjs-engine";
const GITHUB_RELEASES_URL = "https://api.github.com/repos/Kate-alt-69/nextjs-engine/releases?per_page=100";
const GITHUB_LATEST_ALPHA_URL = "https://api.github.com/repos/Kate-alt-69/nextjs-engine/releases/tags/channel-alpha-latest";
const NPM_LATEST_URL = "https://registry.npmjs.org/@kastrick%2fnextjs-engine/latest";
const CACHE_RELATIVE_PATH = path.join(".nextjs-engine", "cache", "ne-channels-cache.json");
const CACHE_TTL_MS = 2 * 60 * 1000;
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RELEASES = 100;

function parseVersion(version) {
	if (typeof version !== "string") return null;
	const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
	if (!match) return null;
	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
		prerelease: match[4] || null,
		raw: version.trim(),
	};
}

function compareVersions(left, right) {
	const a = parseVersion(left);
	const b = parseVersion(right);
	if (!a && !b) return 0;
	if (!a) return -1;
	if (!b) return 1;
	for (const key of ["major", "minor", "patch"]) {
		if (a[key] !== b[key]) return a[key] > b[key] ? 1 : -1;
	}
	if (a.prerelease === b.prerelease) return 0;
	if (a.prerelease === null) return 1;
	if (b.prerelease === null) return -1;
	const ap = a.prerelease.split(".");
	const bp = b.prerelease.split(".");
	const count = Math.max(ap.length, bp.length);
	for (let index = 0; index < count; index += 1) {
		if (ap[index] === undefined) return -1;
		if (bp[index] === undefined) return 1;
		if (ap[index] === bp[index]) continue;
		const an = /^\d+$/.test(ap[index]);
		const bn = /^\d+$/.test(bp[index]);
		if (an && bn) return Number(ap[index]) > Number(bp[index]) ? 1 : -1;
		if (an !== bn) return an ? -1 : 1;
		return ap[index] > bp[index] ? 1 : -1;
	}
	return 0;
}

async function fetchJson(url, label) {
	const response = await fetch(url, {
		headers: {
			Accept: "application/vnd.github+json, application/json",
			"User-Agent": "nextjs-engine-ne-cli",
		},
		signal: AbortSignal.timeout(12000),
	});
	if (!response.ok) {
		throw new Error(label + " returned HTTP " + response.status + ".");
	}
	return response.json();
}

function parseManifestFromBody(body) {
	if (typeof body !== "string") return null;
	const match = body.match(/<!-- NE-CHANNEL-MANIFEST-START -->\s*([\s\S]*?)\s*<!-- NE-CHANNEL-MANIFEST-END -->/);
	if (!match) return null;
	try {
		return JSON.parse(match[1]);
	} catch {
		return null;
	}
}

function validateReleaseManifest(manifest, release) {
	if (!manifest || manifest.schemaVersion !== 1) return null;
	if (manifest.packageName !== PACKAGE_NAME) return null;
	if (!["alpha", "beta"].includes(manifest.track)) return null;
	if (typeof manifest.version !== "string" || !parseVersion(manifest.version)) return null;
	if (manifest.track === "alpha" && !/-alpha\.\d+$/.test(manifest.version)) return null;
	if (manifest.track === "beta" && !/-beta\.\d+$/.test(manifest.version)) return null;
	if (!/^[0-9a-f]{40}$/.test(manifest.sourceCommit || "")) return null;
	if (!/^[0-9a-f]{64}$/.test(manifest.sha256 || "")) return null;
	if (typeof manifest.assetName !== "string" || !/^nextjs-engine-.+\.tgz$/.test(manifest.assetName)) return null;
	if (manifest.tag !== release.tag_name) return null;
	if (manifest.floating !== undefined && typeof manifest.floating !== "boolean") return null;
	if (manifest.floating === true && (manifest.track !== "alpha" || release.tag_name !== "channel-alpha-latest")) return null;

	const asset = Array.isArray(release.assets)
		? release.assets.find((item) => item.name === manifest.assetName && item.state === "uploaded" && item.size > 0)
		: null;
	if (!asset || !asset.browser_download_url) return null;

	return {
		version: manifest.version,
		track: manifest.track,
		channel: manifest.track,
		floating: manifest.floating === true,
		source: "github",
		sourceLabel: "GitHub Release",
		sourceBranch: manifest.sourceBranch || "unknown",
		sourceCommit: manifest.sourceCommit,
		sha256: manifest.sha256,
		artifactName: manifest.assetName,
		artifactUrl: asset.browser_download_url,
		publishedAt: release.published_at || release.created_at || "",
		releaseUrl: release.html_url || "",
		installSpec: asset.browser_download_url,
		description: manifest.summary || ("Generation 3 " + manifest.track + " package."),
	};
}

function stableFromRegistry(metadata) {
	if (!metadata || typeof metadata.version !== "string" || !parseVersion(metadata.version)) return null;
	if (parseVersion(metadata.version).prerelease !== null) return null;
	return {
		version: metadata.version,
		track: "stable",
		channel: "stable",
		source: "npm",
		sourceLabel: "npm Registry",
		sourceBranch: null,
		sourceCommit: null,
		sha256: null,
		artifactName: null,
		artifactUrl: null,
		publishedAt: "",
		releaseUrl: "https://www.npmjs.com/package/" + PACKAGE_NAME + "?activeTab=versions",
		installSpec: PACKAGE_NAME + "@" + metadata.version,
		description: "Published stable package from the npm registry.",
	};
}

function normaliseCatalog(cache, stable, github) {
	const byVersion = new Map();
	for (const release of [...(github || []), ...(stable ? [stable] : [])]) {
		const key = release.floating ? "floating:" + release.track : release.version;
		const existing = byVersion.get(key);
		if (!existing || (release.source === "github" && existing.source !== "github")) {
			byVersion.set(key, release);
		}
	}
	const releases = Array.from(byVersion.values()).sort((a, b) => {
		const cmp = compareVersions(b.version, a.version);
		if (cmp !== 0) return cmp;
		return String(b.publishedAt).localeCompare(String(a.publishedAt));
	});
	return {
		fetchedAt: new Date().toISOString(),
		releases: releases.slice(0, MAX_RELEASES),
	};
}

function cachePath(rootDir) {
	return path.join(rootDir, CACHE_RELATIVE_PATH);
}

function readCache(rootDir) {
	try {
		const value = JSON.parse(fs.readFileSync(cachePath(rootDir), "utf8"));
		if (!value || !Array.isArray(value.releases) || typeof value.cachedAt !== "number") return null;
		return value;
	} catch {
		return null;
	}
}

function writeCache(rootDir, catalog) {
	const file = cachePath(rootDir);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	const temporary = file + ".tmp";
	fs.writeFileSync(temporary, JSON.stringify({
		cachedAt: Date.now(),
		releases: catalog.releases,
	}, null, 2) + "\n", "utf8");
	fs.renameSync(temporary, file);
}

async function loadChannelCatalog(rootDir, options) {
	const force = Boolean(options && options.force);
	const cached = readCache(rootDir);
	if (!force && cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
		return { releases: cached.releases, cached: true, fetchedAt: cached.cachedAt };
	}

	let stable = null;
	let github = [];
	let stableSucceeded = false;
	let githubSucceeded = false;
	let rollingAlphaSucceeded = false;
	const results = await Promise.allSettled([
		fetchJson(NPM_LATEST_URL, "npm Registry"),
		fetchJson(GITHUB_RELEASES_URL, "GitHub Releases"),
		fetchJson(GITHUB_LATEST_ALPHA_URL, "GitHub latest Alpha release"),
	]);

	if (results[0].status === "fulfilled") {
		stableSucceeded = true;
		stable = stableFromRegistry(results[0].value);
	}
	if (results[1].status === "fulfilled" && Array.isArray(results[1].value)) {
		githubSucceeded = true;
		github = results[1].value
			.map((release) => validateReleaseManifest(parseManifestFromBody(release.body), release))
			.filter(Boolean);
	}
	if (results[2].status === "fulfilled") {
		const rolling = validateReleaseManifest(parseManifestFromBody(results[2].value.body), results[2].value);
		if (rolling && rolling.floating) {
			rollingAlphaSucceeded = true;
			github.push(rolling);
		}
	}

	if (!stableSucceeded && cached) {
		stable = cached.releases.find((release) => release.track === "stable") || null;
	}
	if (!githubSucceeded && cached) {
		github = cached.releases.filter((release) => release.source === "github" && !release.floating);
	}
	if (!rollingAlphaSucceeded && cached) {
		github.push(...cached.releases.filter((release) => release.source === "github" && release.floating));
	}
	if (!stableSucceeded && !githubSucceeded && !rollingAlphaSucceeded) {
		if (cached && Date.now() - cached.cachedAt <= CACHE_MAX_AGE_MS) {
			return { releases: cached.releases, cached: true, fetchedAt: cached.cachedAt };
		}
		throw new Error("The channel feed could not be reached and no recent cached feed is available. Check your connection and retry.");
	}

	const catalog = normaliseCatalog(cached, stable, github);
	writeCache(rootDir, catalog);
	return { releases: catalog.releases, cached: false, fetchedAt: Date.now() };
}

function resolveRelease(catalog, options) {
	const items = catalog && Array.isArray(catalog.releases) ? catalog.releases : [];
	const requestedVersion = options && options.version;
	const requestedChannel = options && options.channel;

	if (requestedVersion) {
		return items.find((item) => item.version === requestedVersion && !item.floating) || null;
	}
	if (requestedChannel === "stable") {
		return items.filter((item) => item.track === "stable").sort((a, b) => compareVersions(b.version, a.version))[0] || null;
	}
	if (requestedChannel === "alpha") {
		return items.find((item) => item.track === "alpha" && item.floating)
			|| items.filter((item) => item.track === "alpha").sort((a, b) => compareVersions(b.version, a.version))[0]
			|| null;
	}
	if (requestedChannel === "beta") {
		return items.filter((item) => item.track === "beta").sort((a, b) => compareVersions(b.version, a.version))[0] || null;
	}
	if (requestedChannel === "latest-green") {
		return items.filter((item) => item.track === "stable" || item.track === "beta")
			.sort((a, b) => compareVersions(b.version, a.version))[0] || null;
	}
	return null;
}

function channelLabel(release) {
	if (release.floating) return "ALPHA / LATEST COMMIT";
	if (release.track === "alpha") return "ALPHA";
	if (release.track === "beta") return "LATEST GREEN / BETA";
	return "STABLE";
}

module.exports = {
	PACKAGE_NAME,
	GITHUB_RELEASES_URL,
	GITHUB_LATEST_ALPHA_URL,
	NPM_LATEST_URL,
	parseVersion,
	compareVersions,
	parseManifestFromBody,
	validateReleaseManifest,
	loadChannelCatalog,
	resolveRelease,
	channelLabel,
};
