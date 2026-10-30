"use strict";

const fs = require("node:fs");
const path = require("node:path");

const PACKAGE_NAME = "@kastrick/nextjs-engine";
const GITHUB_RELEASES_URL = "https://api.github.com/repos/Kastrick8/nextjs-engine/releases?per_page=100";
const GITHUB_LATEST_ALPHA_URL = "https://api.github.com/repos/Kastrick8/nextjs-engine/releases/tags/channel-alpha-latest";
const NPM_LATEST_URL = "https://registry.npmjs.org/@kastrick%2fnextjs-engine/latest";
const NPM_PACKUMENT_URL = "https://registry.npmjs.org/@kastrick%2fnextjs-engine";
const GITHUB_PACKAGE_TAGS_URL = "https://api.github.com/repos/Kastrick8/nextjs-engine/git/matching-refs/tags/?per_page=100";
const CACHE_RELATIVE_PATH = path.join(".nextjs-engine", "cache", "ne-channels-cache.json");
const CACHE_TTL_MS = 2 * 60 * 1000;
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_REMOTE_PAGES = 100;
const SOURCE_LABELS = Object.freeze({
	github: "GitHub Release",
	npm: "npm Registry",
	"git-tag": "Git Tag",
});

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

async function fetchJsonResponse(url, label) {
	const isNpmRegistry = new URL(url).hostname === "registry.npmjs.org";
	const response = await fetch(url, {
		headers: {
			Accept: isNpmRegistry ? "application/vnd.npm.install-v1+json" : "application/vnd.github+json, application/json",
			"User-Agent": "nextjs-engine-ne-cli",
		},
		signal: AbortSignal.timeout(isNpmRegistry ? 20000 : 12000),
	});
	if (!response.ok) {
		throw new Error(label + " returned HTTP " + response.status + ".");
	}
	return {
		body: await response.json(),
		nextUrl: nextPageUrl(response.headers && response.headers.get ? response.headers.get("link") : null),
	};
}

function nextPageUrl(linkHeader) {
	if (typeof linkHeader !== "string" || !linkHeader) return null;
	const nextLink = linkHeader.split(/,(?=\s*<)/).find((part) => /;\s*rel="?next"?/i.test(part));
	const match = nextLink && nextLink.match(/<([^>]+)>/);
	if (!match) return null;
	try {
		const url = new URL(match[1], GITHUB_RELEASES_URL);
		if (url.protocol !== "https:" || url.hostname !== "api.github.com") return null;
		return url.toString();
	} catch {
		return null;
	}
}

async function fetchJson(url, label) {
	return (await fetchJsonResponse(url, label)).body;
}

async function fetchJsonPages(url, label) {
	const values = [];
	let pageUrl = url;
	let page = 0;
	while (pageUrl && page < MAX_REMOTE_PAGES) {
		const result = await fetchJsonResponse(pageUrl, label + " page " + (page + 1));
		if (!Array.isArray(result.body)) {
			throw new Error(label + " returned an unexpected response shape.");
		}
		values.push(...result.body);
		pageUrl = result.nextUrl;
		page += 1;
	}
	if (pageUrl) throw new Error(label + " exceeded the safe pagination limit of " + MAX_REMOTE_PAGES + " pages.");
	return values;
}

function trackForVersion(version) {
	const parsed = parseVersion(version);
	if (!parsed) return null;
	if (parsed.prerelease === null) return "stable";
	if (/^alpha\./.test(parsed.prerelease)) return "alpha";
	if (/^beta\./.test(parsed.prerelease)) return "beta";
	return "prerelease";
}

function npmReleasesFromPackument(metadata) {
	if (!metadata || metadata.name !== PACKAGE_NAME || !metadata.versions || typeof metadata.versions !== "object") {
		throw new Error("npm Registry did not return the full package version catalog for " + PACKAGE_NAME + ".");
	}
	const time = metadata.time && typeof metadata.time === "object" ? metadata.time : {};
	const distTags = metadata["dist-tags"] && typeof metadata["dist-tags"] === "object" ? metadata["dist-tags"] : {};
	const tagsByVersion = new Map();
	for (const [tag, version] of Object.entries(distTags)) {
		if (typeof version !== "string") continue;
		const tags = tagsByVersion.get(version) || [];
		tags.push(tag);
		tagsByVersion.set(version, tags);
	}
	const releases = [];
	for (const [version, packageMetadata] of Object.entries(metadata.versions)) {
		const track = trackForVersion(version);
		if (!track) continue;
		if (packageMetadata && packageMetadata.name && packageMetadata.name !== PACKAGE_NAME) continue;
		if (packageMetadata && packageMetadata.version && packageMetadata.version !== version) continue;
		const publishedAt = typeof time[version] === "string" ? time[version] : "";
		releases.push({
			version,
			track,
			channel: track,
			source: "npm",
			sourceLabel: SOURCE_LABELS.npm,
			sourceBranch: null,
			sourceCommit: null,
			sha256: null,
			artifactName: null,
			artifactUrl: null,
			publishedAt,
			releaseUrl: "https://www.npmjs.com/package/" + PACKAGE_NAME + "?activeTab=versions&version=" + encodeURIComponent(version),
			installSpec: PACKAGE_NAME + "@" + version,
			npmDistTags: tagsByVersion.get(version) || [],
			gitTags: [],
			installable: track === "stable",
			description: packageMetadata && typeof packageMetadata.description === "string" && packageMetadata.description.trim()
				? packageMetadata.description.trim()
				: track === "stable"
					? "Published stable package from the npm registry."
					: "Published npm prerelease; NE requires a verified GitHub channel artifact to install prereleases.",
		});
	}
	return releases;
}

function packageTagToRelease(value) {
	const rawName = typeof value === "string"
		? value
		: value && typeof value.name === "string"
			? value.name
			: value && typeof value.ref === "string"
				? value.ref.replace(/^refs\/tags\//, "")
				: "";
	let version = null;
	let track = null;
	let match = rawName.match(/^package\.(\d+\.\d+\.\d+)$/);
	if (match) {
		version = match[1];
		track = "stable";
	} else {
		match = rawName.match(/^package-alpha\.(\d+\.\d+\.\d+-alpha\.\d+)$/);
		if (match) {
			version = match[1];
			track = "alpha";
		} else {
			match = rawName.match(/^package-beta\.(\d+\.\d+\.\d+-beta\.\d+)$/);
			if (match) {
				version = match[1];
				track = "beta";
			}
		}
	}
	if (!version || trackForVersion(version) !== track) return null;
	const tagUrl = "https://github.com/Kastrick8/nextjs-engine/tree/" + encodeURIComponent(rawName);
	return {
		version,
		track,
		channel: track,
		source: "git-tag",
		sourceLabel: SOURCE_LABELS["git-tag"],
		sourceBranch: "package/main",
		sourceCommit: null,
		sha256: null,
		artifactName: null,
		artifactUrl: null,
		publishedAt: "",
		releaseUrl: tagUrl,
		tagName: rawName,
		tagUrl,
		gitTags: [rawName],
		npmDistTags: [],
		installSpec: null,
		installable: false,
		description: "Versioned package archive Git tag. Listed for discovery; NE needs a published npm package or verified GitHub Release artifact to install it.",
	};
}

function githubTagToRelease(value) {
	const rawName = typeof value === "string"
		? value.replace(/^refs\/tags\//, "")
		: value && typeof value.ref === "string"
			? value.ref.replace(/^refs\/tags\//, "")
			: value && typeof value.name === "string"
				? value.name
				: "";
	if (!rawName) return null;
	const packageRelease = packageTagToRelease(rawName);
	if (packageRelease) return packageRelease;
	const tagUrl = "https://github.com/Kastrick8/nextjs-engine/tree/" + encodeURIComponent(rawName);
	return {
		version: rawName,
		track: "tag",
		channel: "tag",
		source: "git-tag",
		sourceLabel: SOURCE_LABELS["git-tag"],
		sourceBranch: "package/main",
		sourceCommit: null,
		sha256: null,
		artifactName: null,
		artifactUrl: null,
		publishedAt: "",
		releaseUrl: tagUrl,
		tagName: rawName,
		tagUrl,
		gitTags: [rawName],
		npmDistTags: [],
		installSpec: null,
		catalogOnly: true,
		installable: false,
		description: "GitHub repository tag. Listed for discovery; tags are never treated as verified installation artifacts.",
	};
}

function sourceKinds(release) {
	if (Array.isArray(release && release.sources)) return release.sources.filter((source) => typeof source === "string");
	return release && typeof release.source === "string" ? [release.source] : [];
}

function isInstallableRelease(release) {
	if (!release || typeof release !== "object") return false;
	if (typeof release.installable === "boolean") return release.installable;
	if (release.source === "github") return Boolean(release.artifactUrl && release.sha256);
	if (release.source === "npm") return release.track === "stable" && typeof release.installSpec === "string";
	return false;
}

function sourcePriority(release) {
	if (release.source === "github" && release.artifactUrl && release.sha256) return 4;
	if (release.source === "npm" && release.track === "stable" && release.installSpec) return 3;
	if (release.source === "npm" && release.installSpec) return 2;
	if (release.source === "github") return 1.5;
	if (release.source === "git-tag") return 1;
	return 0;
}

function mergeCatalogEntry(existing, incoming) {
	const existingPriority = sourcePriority(existing);
	const incomingPriority = sourcePriority(incoming);
	const existingTime = Date.parse(existing.publishedAt || "") || 0;
	const incomingTime = Date.parse(incoming.publishedAt || "") || 0;
	const incomingWins = incomingPriority > existingPriority || (incomingPriority === existingPriority && incomingTime > existingTime);
	const preferred = incomingWins ? incoming : existing;
	const sources = Array.from(new Set([...sourceKinds(existing), ...sourceKinds(incoming)]));
	const npmDistTags = Array.from(new Set([...(existing.npmDistTags || []), ...(incoming.npmDistTags || [])]));
	const gitTags = Array.from(new Set([
		...(existing.gitTags || []),
		...(incoming.gitTags || []),
		...(existing.tagName ? [existing.tagName] : []),
		...(incoming.tagName ? [incoming.tagName] : []),
	]));
	const sourceLabels = sources.map((source) => SOURCE_LABELS[source] || source);
	return {
		...(incomingWins ? existing : incoming),
		...preferred,
		sources,
		sourceLabels,
		sourceLabel: sourceLabels.join(" + ") || preferred.sourceLabel || "Unknown",
		npmDistTags,
		gitTags,
		tagName: incoming.tagName || existing.tagName || null,
		tagUrl: incoming.tagUrl || existing.tagUrl || null,
		isNpmPublished: sources.includes("npm"),
		isGitTagged: sources.includes("git-tag"),
		installable: isInstallableRelease(preferred),
	};
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
	if (manifest.track === "alpha" && !/^\d+\.\d+\.\d+-alpha\.\d+$/.test(manifest.version)) return null;
	if (manifest.track === "beta" && !/^\d+\.\d+\.\d+-beta\.\d+$/.test(manifest.version)) return null;
	if (!/^[0-9a-f]{40}$/.test(manifest.sourceCommit || "")) return null;
	if (!/^[0-9a-f]{64}$/.test(manifest.sha256 || "")) return null;
	if (typeof manifest.assetName !== "string" || !/^nextjs-engine-.+\.tgz$/.test(manifest.assetName)) return null;
	if (manifest.tag !== release.tag_name) return null;
	if (!["main-2", "main-3"].includes(manifest.sourceBranch)) return null;
	if (manifest.floating !== undefined && typeof manifest.floating !== "boolean") return null;
	if (release.tag_name === "channel-alpha-latest" && manifest.floating !== true) return null;
	if (manifest.floating === true) {
		if (manifest.track !== "alpha" || manifest.sourceBranch !== "main-3" || release.tag_name !== "channel-alpha-latest") return null;
		const fullCommitSuffix = "-" + manifest.sourceCommit + ".tgz";
		const legacyCommitSuffix = "-" + manifest.sourceCommit.slice(0, 8) + ".tgz";
		if (!manifest.assetName.endsWith(fullCommitSuffix) && !manifest.assetName.endsWith(legacyCommitSuffix)) return null;
	} else {
		const expectedTag = "package-" + manifest.track + "." + manifest.version;
		if (manifest.tag !== expectedTag) return null;
		if (manifest.assetName !== "nextjs-engine-" + manifest.version + ".tgz") return null;
	}

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

function catalogOnlyGitHubRelease(release) {
	if (!release || typeof release !== "object" || typeof release.tag_name !== "string") return null;

	const tagName = release.tag_name.trim();
	if (!tagName) return null;
	const tag = packageTagToRelease(tagName);
	let version = tag && tag.version;
	let track = tag && tag.track;
	if (!version) {
		const match = tagName.match(/^v?(\d+\.\d+\.\d+(?:-(?:alpha|beta)\.\d+)?)$/);
		if (match) {
			version = match[1];
			track = trackForVersion(version);
		} else {
			// Keep other GitHub release tags visible, but never treat a free-form
			// tag label as a SemVer version or an installation target.
			version = tagName;
			track = "release";
		}
	}

	const releaseUrl = typeof release.html_url === "string"
		? release.html_url
		: "https://github.com/Kastrick8/nextjs-engine/releases/tag/" + encodeURIComponent(tagName);
	return {
		version,
		track,
		channel: track,
		source: "github",
		sourceLabel: SOURCE_LABELS.github,
		sourceBranch: null,
		sourceCommit: null,
		sha256: null,
		artifactName: null,
		artifactUrl: null,
		publishedAt: release.published_at || release.created_at || "",
		releaseUrl,
		tagName,
		tagUrl: "https://github.com/Kastrick8/nextjs-engine/releases/tag/" + encodeURIComponent(tagName),
		installSpec: null,
		npmDistTags: [],
		gitTags: [],
		catalogOnly: true,
		installable: false,
		description: "GitHub release " + tagName + " is listed for discovery, but its manifest and downloadable artifact did not pass NE verification.",
	};
}

function stableFromRegistry(metadata) {
	if (!metadata || metadata.name !== PACKAGE_NAME || typeof metadata.version !== "string" || !parseVersion(metadata.version)) return null;
	if (parseVersion(metadata.version).prerelease !== null) return null;
	return {
		version: metadata.version,
		track: "stable",
		channel: "stable",
		source: "npm",
		sourceLabel: SOURCE_LABELS.npm,
		sourceBranch: null,
		sourceCommit: null,
		sha256: null,
		artifactName: null,
		artifactUrl: null,
		publishedAt: "",
		releaseUrl: "https://www.npmjs.com/package/" + PACKAGE_NAME + "?activeTab=versions&version=" + encodeURIComponent(metadata.version),
		installSpec: PACKAGE_NAME + "@" + metadata.version,
		npmDistTags: [],
		gitTags: [],
		installable: true,
		description: "Published stable package from the npm registry.",
	};
}


function normaliseCatalog(entries) {
	const byVersion = new Map();
	for (const release of entries || []) {
		if (!release || typeof release.version !== "string" || !release.version.trim()) continue;
		if (!parseVersion(release.version) && release.catalogOnly !== true) continue;
		const key = release.floating ? "floating:" + release.track : release.version;
		const existing = byVersion.get(key);
		byVersion.set(key, existing ? mergeCatalogEntry(existing, release) : mergeCatalogEntry(release, release));
	}
	const releases = Array.from(byVersion.values()).sort((a, b) => {
		const cmp = compareVersions(b.version, a.version);
		if (cmp !== 0) return cmp;
		return String(b.publishedAt || "").localeCompare(String(a.publishedAt || ""));
	});
	return {
		fetchedAt: new Date().toISOString(),
		releases,
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
		sourceStatus: catalog.sourceStatus || {},
	}, null, 2) + "\n", "utf8");
	fs.renameSync(temporary, file);
}

function readCachedCatalog(rootDir) {
	const cached = readCache(rootDir);
	return cached
		? { releases: cached.releases, cached: true, fetchedAt: cached.cachedAt, sourceStatus: cached.sourceStatus || {} }
		: { releases: [], cached: true, fetchedAt: null, sourceStatus: {} };
}

async function loadChannelCatalog(rootDir, options) {
	const settings = options || {};
	const force = Boolean(settings.force);
	const cached = readCache(rootDir);
	if (!force && cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
		return {
			releases: cached.releases,
			cached: true,
			fetchedAt: cached.cachedAt,
			sourceStatus: cached.sourceStatus || {},
			sourceErrors: [],
		};
	}

	const sourceStatus = {
		npm: { status: "loading", message: "Fetching the complete npm version index" },
		github: { status: "loading", message: "Fetching GitHub Releases" },
		alpha: { status: "loading", message: "Resolving the rolling Alpha channel" },
		tags: { status: "loading", message: "Fetching repository Git tags" },
	};
	const notify = (source) => {
		if (typeof settings.onSourceStatus !== "function") return;
		try {
			settings.onSourceStatus({ source, ...sourceStatus[source], sources: { ...sourceStatus } });
		} catch {}
	};
	const setStatus = (source, status, message) => {
		sourceStatus[source] = { status, message: message || "" };
		notify(source);
	};
	for (const source of Object.keys(sourceStatus)) notify(source);

	const observeRequest = (source, promise) => promise.then((value) => {
		setStatus(source, "received", "Response received; validating feed data");
		return { status: "fulfilled", value };
	}).catch((reason) => {
		setStatus(source, "failed", reason && reason.message || String(reason));
		return { status: "rejected", reason };
	});
	const results = await Promise.all([
		observeRequest("npm", fetchJson(NPM_PACKUMENT_URL, "npm Registry full version catalog")),
		observeRequest("github", fetchJsonPages(GITHUB_RELEASES_URL, "GitHub Releases")),
		observeRequest("alpha", fetchJson(GITHUB_LATEST_ALPHA_URL, "GitHub latest Alpha release")),
		observeRequest("tags", fetchJsonPages(GITHUB_PACKAGE_TAGS_URL, "GitHub repository tags")),
	]);

	let npm = [];
	let github = [];
	let tags = [];
	let npmSucceeded = false;
	let githubSucceeded = false;
	let tagsSucceeded = false;
	let rollingAlphaSucceeded = false;
	let packageLatestTag = false;
	const sourceErrors = [];

	if (results[0].status === "fulfilled") {
		try {
			npm = npmReleasesFromPackument(results[0].value);
			npmSucceeded = true;
			setStatus("npm", "ready", "Loaded " + npm.length + " npm versions and dist-tags");
		} catch (error) {
			setStatus("npm", "partial", error.message);
			sourceErrors.push({ source: "npm", message: error.message });
		}
	} else {
		const error = results[0].reason;
		sourceErrors.push({ source: "npm", message: error && error.message || String(error) });
	}
	if (!npmSucceeded) {
		try {
			const fallback = stableFromRegistry(await fetchJson(NPM_LATEST_URL, "npm Registry latest stable fallback"));
			if (fallback) {
				npm = [fallback];
				npmSucceeded = true;
				setStatus("npm", "partial", "Full npm version index unavailable; showing latest stable fallback only");
			} else {
				setStatus("npm", "failed", "npm did not return a valid stable release or full version index");
			}
		} catch (error) {
			setStatus("npm", "failed", error.message || String(error));
		}
	}

	if (results[1].status === "fulfilled" && Array.isArray(results[1].value)) {
		githubSucceeded = true;
		github = results[1].value
			.map((release) => validateReleaseManifest(parseManifestFromBody(release.body), release)
				|| catalogOnlyGitHubRelease(release))
			.filter(Boolean);
		setStatus("github", "ready", "Loaded " + github.length + " GitHub releases");
	} else {
		const error = results[1].reason || new Error("GitHub Releases returned an unexpected response.");
		setStatus("github", "failed", error.message || String(error));
		sourceErrors.push({ source: "github", message: error.message || String(error) });
	}

	let rolling = null;
	if (results[2].status === "fulfilled") {
		rolling = validateReleaseManifest(parseManifestFromBody(results[2].value.body), results[2].value);
		if (!rolling) {
			const fromList = (results[1].status === "fulfilled" ? results[1].value : [])
				.find((release) => release && release.tag_name === "channel-alpha-latest");
			if (fromList) rolling = validateReleaseManifest(parseManifestFromBody(fromList.body), fromList);
		}
		if (rolling && rolling.floating) {
			rollingAlphaSucceeded = true;
			github.push(rolling);
			setStatus("alpha", "ready", "Verified rolling Alpha " + rolling.version + " from " + rolling.sourceCommit.slice(0, 8));
		} else {
			const message = "The Alpha tag was reached, but its manifest or artifact did not pass validation";
			setStatus("alpha", "partial", message);
			sourceErrors.push({ source: "alpha", message });
		}
	} else {
		const error = results[2].reason;
		const fromList = (results[1].status === "fulfilled" ? results[1].value : [])
			.find((release) => release && release.tag_name === "channel-alpha-latest");
		if (fromList) rolling = validateReleaseManifest(parseManifestFromBody(fromList.body), fromList);
		if (rolling && rolling.floating) {
			rollingAlphaSucceeded = true;
			github.push(rolling);
			setStatus("alpha", "partial", "Loaded rolling Alpha from the releases index; the direct channel lookup failed");
		} else {
			setStatus("alpha", "failed", error && error.message || String(error));
			sourceErrors.push({ source: "alpha", message: error && error.message || String(error) });
		}
	}

	if (results[3].status === "fulfilled" && Array.isArray(results[3].value)) {
		tagsSucceeded = true;
		packageLatestTag = results[3].value.some((tag) => tag && (tag.ref === "refs/tags/package.latest" || tag.name === "package.latest"));
		tags = results[3].value.map(githubTagToRelease).filter(Boolean);
		setStatus("tags", "ready", "Loaded " + tags.length + " Git tags");
	} else {
		const error = results[3].reason || new Error("GitHub tags returned an unexpected response.");
		setStatus("tags", "failed", error.message || String(error));
		sourceErrors.push({ source: "tags", message: error.message || String(error) });
	}

	const anyFreshSource = npmSucceeded || githubSucceeded || tagsSucceeded || rollingAlphaSucceeded;
	if (!anyFreshSource) {
		if (cached && Date.now() - cached.cachedAt <= CACHE_MAX_AGE_MS) {
			return {
				releases: cached.releases,
				cached: true,
				fetchedAt: cached.cachedAt,
				sourceStatus,
				sourceErrors,
			};
		}
		throw new Error("The release catalog could not be reached and no recent cached catalog is available. " +
			sourceErrors.map((item) => item.source + ": " + item.message).join("; "));
	}

	const records = [...npm, ...github, ...tags];
	if (cached && (!npmSucceeded || !githubSucceeded || !tagsSucceeded || !rollingAlphaSucceeded)) {
		records.push(...cached.releases);
	}
	const catalog = normaliseCatalog(records);
	if (packageLatestTag) {
		const latestTaggedStable = catalog.releases.find((release) => release.track === "stable" && release.npmDistTags && release.npmDistTags.includes("latest"))
			|| catalog.releases.find((release) => release.track === "stable" && isInstallableRelease(release));
		if (latestTaggedStable) {
			latestTaggedStable.gitTags = Array.from(new Set([...(latestTaggedStable.gitTags || []), "package.latest"]));
			latestTaggedStable.isGitTagged = true;
		}
	}
	writeCache(rootDir, { ...catalog, sourceStatus });
	return {
		releases: catalog.releases,
		cached: false,
		fetchedAt: Date.now(),
		sourceStatus,
		sourceErrors,
	};
}

function resolveRelease(catalog, options) {
	const items = catalog && Array.isArray(catalog.releases) ? catalog.releases : [];
	const installable = (item) => isInstallableRelease(item);
	const requestedVersion = options && options.version;
	const requestedChannel = options && options.channel;

	if (requestedVersion) {
		return items.find((item) => item.version === requestedVersion && !item.floating && installable(item)) || null;
	}
	if (requestedChannel === "stable") {
		return items.filter((item) => item.track === "stable" && installable(item)).sort((a, b) => compareVersions(b.version, a.version))[0] || null;
	}
	if (requestedChannel === "alpha") {
		return items.find((item) => item.track === "alpha" && item.floating && installable(item))
			|| items.filter((item) => item.track === "alpha" && installable(item)).sort((a, b) => compareVersions(b.version, a.version))[0]
			|| null;
	}
	if (requestedChannel === "beta") {
		return items.filter((item) => item.track === "beta" && installable(item)).sort((a, b) => compareVersions(b.version, a.version))[0] || null;
	}
	if (requestedChannel === "latest-green") {
		return items.filter((item) => (item.track === "stable" || item.track === "beta") && installable(item))
			.sort((a, b) => compareVersions(b.version, a.version))[0] || null;
	}
	return null;
}


function channelLabel(release) {
	if (!isInstallableRelease(release)) {
		if (release && release.source === "git-tag") return "TAG ONLY";
		return "CATALOG ONLY";
	}
	if (release.floating) return "ALPHA / LATEST COMMIT";
	if (release.track === "alpha") return "ALPHA";
	if (release.track === "beta") return "LATEST GREEN / BETA";
	if (release.track === "prerelease") return "PRERELEASE";
	return "STABLE";
}


module.exports = {
	PACKAGE_NAME,
	GITHUB_RELEASES_URL,
	GITHUB_LATEST_ALPHA_URL,
	GITHUB_PACKAGE_TAGS_URL,
	NPM_LATEST_URL,
	NPM_PACKUMENT_URL,
	parseVersion,
	compareVersions,
	trackForVersion,
	npmReleasesFromPackument,
	packageTagToRelease,
	githubTagToRelease,
	readCachedCatalog,
	parseManifestFromBody,
	validateReleaseManifest,
	catalogOnlyGitHubRelease,
	normaliseCatalog,
	isInstallableRelease,
	loadChannelCatalog,
	resolveRelease,
	channelLabel,
};
