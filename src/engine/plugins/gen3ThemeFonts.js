"use strict";

const crypto = require("node:crypto");
const dns = require("node:dns").promises;
const fs = require("node:fs");
const path = require("node:path");

const GENERATED_BY = "NENC_ENGINE_THEME_FONTS";
const FORMAT_VERSION = 1;
const MAX_STYLE_SHEETS = 16;
const MAX_CSS_BYTES = 512 * 1024;
const MAX_FONT_BYTES = 12 * 1024 * 1024;
const MAX_TOTAL_FONT_BYTES = 64 * 1024 * 1024;
const MAX_FONT_ASSETS_PER_THEME = 128;
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_CSS_ORIGINS = ["https://fonts.googleapis.com"];
const DEFAULT_FONT_ORIGINS = ["https://fonts.gstatic.com"];
const SAFE_THEME_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const FONT_EXTENSIONS = new Set(["woff2", "woff", "ttf", "otf"]);

function sha256(buffer) {
	return crypto.createHash("sha256").update(buffer).digest("hex");
}

function canonicalJson(value) {
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
	const record = value;
	return "{" + Object.keys(record).sort().map((key) =>
		JSON.stringify(key) + ":" + canonicalJson(record[key])).join(",") + "}";
}

function isWithin(root, target) {
	const relative = path.relative(root, target);
	return relative === "" || (relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative));
}

function assertSafeChildPath(root, target) {
	const relative = path.relative(root, target);
	if (!isWithin(root, target)) throw new Error("[EngineTheme fonts] Output escapes the project root.");
	let cursor = root;
	for (const segment of relative.split(path.sep).filter(Boolean)) {
		cursor = path.join(cursor, segment);
		if (!fs.existsSync(cursor)) continue;
		const stat = fs.lstatSync(cursor);
		if (stat.isSymbolicLink()) throw new Error("[EngineTheme fonts] Refusing to follow a symbolic link: " + path.relative(root, cursor));
	}
}

function ensureDirectory(root, target) {
	assertSafeChildPath(root, target);
	const relative = path.relative(root, target);
	let cursor = root;
	for (const segment of relative.split(path.sep).filter(Boolean)) {
		cursor = path.join(cursor, segment);
		if (fs.existsSync(cursor)) {
			const stat = fs.lstatSync(cursor);
			if (stat.isSymbolicLink() || !stat.isDirectory()) {
				throw new Error("[EngineTheme fonts] Unsafe cache/output path: " + path.relative(root, cursor));
			}
		} else {
			fs.mkdirSync(cursor);
		}
	}
}

function atomicWrite(root, target, value) {
	assertSafeChildPath(root, target);
	ensureDirectory(root, path.dirname(target));
	const temporary = target + "." + process.pid + "." + crypto.randomBytes(6).toString("hex") + ".tmp";
	try {
		fs.writeFileSync(temporary, value, { flag: "wx", mode: 0o600 });
		fs.renameSync(temporary, target);
	} catch (error) {
		try { fs.rmSync(temporary, { force: true }); } catch { /* Preserve the original error. */ }
		throw error;
	}
}

function readJson(target) {
	try {
		const value = JSON.parse(fs.readFileSync(target, "utf8"));
		return value && typeof value === "object" && !Array.isArray(value) ? value : null;
	} catch {
		return null;
	}
}

function parseOrigins(envName, defaults) {
	const configured = (process.env[envName] || "").split(",").map((part) => part.trim()).filter(Boolean);
	const values = configured.length > 0 ? configured : defaults;
	const origins = new Set();
	for (const value of values) {
		if (value.includes("*")) throw new TypeError("[EngineTheme fonts] " + envName + " does not accept wildcards.");
		let url;
		try { url = new URL(value); } catch { throw new TypeError("[EngineTheme fonts] Invalid origin in " + envName + ": " + value); }
		if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
			throw new TypeError("[EngineTheme fonts] " + envName + " must contain exact HTTPS origins only.");
		}
		origins.add(url.origin);
	}
	return origins;
}

function isPrivateAddress(address) {
	const value = String(address).toLowerCase().split("%")[0];
	if (value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") || /^fe[89ab]/.test(value)) return true;
	const ipv4 = value.match(/^(?:\:\:ffff:)?(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/i);
	if (!ipv4) return false;
	const octets = ipv4.slice(1).map(Number);
	if (octets.some((part) => part < 0 || part > 255)) return true;
	const [a, b] = octets;
	return a === 0 || a === 10 || a === 127 || a >= 224
		|| (a === 169 && b === 254)
		|| (a === 172 && b >= 16 && b <= 31)
		|| (a === 192 && b === 168)
		|| (a === 100 && b >= 64 && b <= 127)
		|| (a === 198 && (b === 18 || b === 19));
}

async function assertPublicHost(url, trustedBuiltInHosts) {
	const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
	if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")
		|| hostname.endsWith(".internal") || hostname.endsWith(".test") || hostname.endsWith(".invalid")
		|| isPrivateAddress(hostname)) {
		throw new Error("[EngineTheme fonts] Private, local, and test hosts are not permitted: " + hostname);
	}
	if (trustedBuiltInHosts.has(hostname)) return;
	let records;
	try { records = await dns.lookup(hostname, { all: true, verbatim: true }); }
	catch { throw new Error("[EngineTheme fonts] Could not resolve public font host: " + hostname); }
	if (!records.length || records.some((record) => isPrivateAddress(record.address))) {
		throw new Error("[EngineTheme fonts] Host resolves to a private or non-public address: " + hostname);
	}
}

function normalizeSourceUrl(input, allowedOrigins, label) {
	if (typeof input !== "string" || input.length === 0 || input.length > 2048) {
		throw new TypeError("[EngineTheme fonts] " + label + " must be a URL string no longer than 2048 characters.");
	}
	let url;
	try { url = new URL(input); } catch { throw new TypeError("[EngineTheme fonts] " + label + " must be an absolute HTTPS URL."); }
	if (url.protocol !== "https:" || url.username || url.password || url.hash || !allowedOrigins.has(url.origin)) {
		throw new Error("[EngineTheme fonts] " + label + " must use an allowlisted HTTPS origin.");
	}
	return url;
}

function clampInteger(value, fallback, minimum, maximum) {
	if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
	return Math.max(minimum, Math.min(maximum, Math.floor(value)));
}

async function readResponseBytes(response, maxBytes, allowedType, label) {
	if (!response.ok) throw new Error("[EngineTheme fonts] " + label + " request failed with HTTP " + response.status + ".");
	if (response.redirected) throw new Error("[EngineTheme fonts] Redirects are disabled for " + label + ".");
	const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
	if (!allowedType(contentType)) throw new Error("[EngineTheme fonts] Unexpected content type for " + label + ": " + (contentType || "(missing)") + ".");
	const lengthHeader = response.headers.get("content-length");
	if (lengthHeader !== null) {
		const length = Number(lengthHeader);
		if (Number.isFinite(length) && length > maxBytes) throw new Error("[EngineTheme fonts] " + label + " exceeds the size limit.");
	}
	if (!response.body) {
		const bytes = Buffer.from(await response.arrayBuffer());
		if (bytes.byteLength > maxBytes) throw new Error("[EngineTheme fonts] " + label + " exceeds the size limit.");
		return { bytes, contentType };
	}
	const reader = response.body.getReader();
	const parts = [];
	let total = 0;
	try {
		while (true) {
			const item = await reader.read();
			if (item.done) break;
			total += item.value.byteLength;
			if (total > maxBytes) {
				try { await reader.cancel(); } catch { /* Preserve the size limit error. */ }
				throw new Error("[EngineTheme fonts] " + label + " exceeds the size limit.");
			}
			parts.push(Buffer.from(item.value));
		}
	} finally {
		try { reader.releaseLock(); } catch { /* The stream may already be closed. */ }
	}
	return { bytes: Buffer.concat(parts, total), contentType };
}

async function fetchBounded(url, options) {
	const fetcher = options.fetchImpl || globalThis.fetch;
	if (typeof fetcher !== "function") throw new Error("[EngineTheme fonts] Node.js fetch() is unavailable.");
	const controller = new AbortController();
	const timeoutMs = clampInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS, 1, 30000);
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetcher(url.href, {
			method: "GET",
			redirect: "error",
			credentials: "omit",
			referrerPolicy: "no-referrer",
			cache: "no-store",
			headers: options.headers || {},
			signal: controller.signal,
		});
		return await readResponseBytes(response, options.maxBytes, options.allowedType, options.label);
	} catch (error) {
		if (controller.signal.aborted) throw new Error("[EngineTheme fonts] Timed out fetching " + options.label + ".");
		throw error;
	} finally {
		clearTimeout(timer);
	}
}

function extensionFromUrl(url) {
	const name = path.posix.basename(url.pathname).toLowerCase();
	const match = /\.(woff2?|ttf|otf)$/.exec(name);
	return match ? match[1] : "";
}

function extensionFromType(contentType) {
	if (contentType === "font/woff2" || contentType === "application/font-woff2") return "woff2";
	if (contentType === "font/woff" || contentType === "application/font-woff") return "woff";
	if (contentType === "font/ttf" || contentType === "application/x-font-ttf" || contentType === "application/font-sfnt") return "ttf";
	if (contentType === "font/otf" || contentType === "application/vnd.ms-opentype") return "otf";
	return "";
}

function extractUrlCandidates(src) {
	const results = [];
	const pattern = /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"\s]+))\s*\)/gi;
	let match;
	while ((match = pattern.exec(src)) !== null) {
		const value = match[1] || match[2] || match[3];
		if (value) results.push(value.trim());
	}
	return results;
}

function chooseFontUrl(src, baseUrl) {
	const candidates = extractUrlCandidates(src).map((value) => {
		try { return new URL(value, baseUrl); } catch { return null; }
	}).filter(Boolean);
	const rank = (url) => {
		const ext = extensionFromUrl(url);
		return ext === "woff2" ? 0 : ext === "woff" ? 1 : ext === "ttf" ? 2 : ext === "otf" ? 3 : 4;
	};
	candidates.sort((a, b) => rank(a) - rank(b));
	return candidates[0] || null;
}

function parseFontFaces(css) {
	const faces = [];
	const pattern = /@font-face\s*\{([^{}]{1,16384})\}/gi;
	let match;
	while ((match = pattern.exec(css)) !== null) {
		if (faces.length >= MAX_FONT_ASSETS_PER_THEME) break;
		const declarations = Object.create(null);
		for (const item of match[1].split(";")) {
			const colon = item.indexOf(":");
			if (colon <= 0) continue;
			const name = item.slice(0, colon).trim().toLowerCase();
			const value = item.slice(colon + 1).trim();
			if (name && value && !Object.prototype.hasOwnProperty.call(declarations, name)) declarations[name] = value;
		}
		if (declarations.src && declarations["font-family"]) faces.push({ declarations });
	}
	return faces;
}

function safeFontDeclaration(name, value) {
	if (typeof value !== "string" || value.length > 512 || /[\u0000-\u001f\u007f{};]/.test(value)
		|| /url\s*\(|expression\s*\(|javascript\s*:|@import/i.test(value)) return undefined;
	if (name === "font-family") {
		const family = value.replace(/^['"]|['"]$/g, "").replace(/['"]/g, "");
		if (!/^[A-Za-z0-9 _,-]{1,160}$/.test(family)) return undefined;
		return '"' + family + '"';
	}
	if (name === "font-style") return /^(normal|italic|oblique(?:\s+-?\d+(?:deg|grad|rad|turn))?)$/i.test(value) ? value : undefined;
	if (name === "font-weight") return /^(normal|bold|[1-9]00(?:\s+[1-9]00)?)$/i.test(value) ? value : undefined;
	if (name === "font-stretch") return /^(normal|ultra-condensed|extra-condensed|condensed|semi-condensed|semi-expanded|expanded|extra-expanded|ultra-expanded|[\d.]+%)$/i.test(value) ? value : undefined;
	if (name === "font-display") return /^(auto|block|swap|fallback|optional)$/i.test(value) ? value : undefined;
	if (name === "unicode-range") return /^U\+[0-9A-F?,-]+(?:\s*,\s*U\+[0-9A-F?,-]+)*$/i.test(value) ? value : undefined;
	return undefined;
}

function safePublicCss(css) {
	return typeof css === "string" && css.length <= 2 * 1024 * 1024 && !/[\u0000]/.test(css);
}

function validCachedFile(root, filename, expectedSha) {
	if (typeof filename !== "string" || !/^[A-Za-z0-9._-]{1,180}$/.test(filename)
		|| typeof expectedSha !== "string" || !/^[a-f0-9]{64}$/.test(expectedSha)) return false;
	const target = path.join(root, filename);
	try {
		const stat = fs.lstatSync(target);
		return stat.isFile() && !stat.isSymbolicLink() && sha256(fs.readFileSync(target)) === expectedSha;
	} catch {
		return false;
	}
}

function validThemeCache(entry, themeId, sourceUrls, cacheAssetRoot) {
	if (!entry || entry.id !== themeId || !Array.isArray(entry.sourceUrls)
		|| canonicalJson(entry.sourceUrls) !== canonicalJson(sourceUrls)
		|| typeof entry.cssContent !== "string" || !safePublicCss(entry.cssContent)
		|| sha256(Buffer.from(entry.cssContent, "utf8")) !== entry.cssSha256
		|| !Array.isArray(entry.fontAssets)) return false;
	return entry.fontAssets.every((asset) => asset && validCachedFile(cacheAssetRoot, asset.cacheFileName, asset.sha256));
}

function loadFontManifest(manifestPath) {
	const manifest = readJson(manifestPath);
	if (!manifest || manifest.generatedBy !== GENERATED_BY || manifest.formatVersion !== FORMAT_VERSION
		|| !manifest.themes || typeof manifest.themes !== "object" || Array.isArray(manifest.themes)) {
		return { generatedBy: GENERATED_BY, formatVersion: FORMAT_VERSION, themes: Object.create(null) };
	}
	return manifest;
}

function fontAssetFromCache(sourceUrl, manifest, cacheAssetRoot) {
	for (const entry of Object.values(manifest.themes)) {
		if (!entry || !Array.isArray(entry.fontAssets)) continue;
		for (const asset of entry.fontAssets) {
			if (asset.sourceUrl === sourceUrl && validCachedFile(cacheAssetRoot, asset.cacheFileName, asset.sha256)) return asset;
		}
	}
	return undefined;
}

function writePublicAssets(root, publicFontRoot, cacheAssetRoot, entry, previousEntry) {
	ensureDirectory(root, publicFontRoot);
	const assetRecords = [];
	for (const asset of entry.fontAssets) {
		const cached = path.join(cacheAssetRoot, asset.cacheFileName);
		const output = path.join(publicFontRoot, asset.fileName);
		assertSafeChildPath(root, output);
		ensureDirectory(root, path.dirname(output));
		if (fs.existsSync(output)) {
			const stat = fs.lstatSync(output);
			if (!stat.isFile() || stat.isSymbolicLink() || sha256(fs.readFileSync(output)) !== asset.sha256) {
				throw new Error("[EngineTheme fonts] Refusing to overwrite a non-generated font asset: " + path.relative(root, output));
			}
		} else {
			atomicWrite(root, output, fs.readFileSync(cached));
		}
		assetRecords.push({ sourceUrl: asset.sourceUrl, sha256: asset.sha256, fileName: asset.fileName, cacheFileName: asset.cacheFileName, bytes: asset.bytes });
	}
	const cssPath = path.join(publicFontRoot, entry.cssFileName);
	assertSafeChildPath(root, cssPath);
	if (fs.existsSync(cssPath)) {
		const stat = fs.lstatSync(cssPath);
		const currentHash = stat.isFile() && !stat.isSymbolicLink() ? sha256(fs.readFileSync(cssPath)) : "";
		const ownedHash = previousEntry && previousEntry.cssSha256;
		if (currentHash !== entry.cssSha256 && currentHash !== ownedHash) {
			throw new Error("[EngineTheme fonts] Refusing to overwrite a CSS file not owned by NENC: " + path.relative(root, cssPath));
		}
		if (currentHash !== entry.cssSha256) atomicWrite(root, cssPath, entry.cssContent);
	} else {
		atomicWrite(root, cssPath, entry.cssContent);
	}
	return assetRecords;
}

function fontFormat(extension) {
	return extension === "woff2" ? "woff2" : extension === "woff" ? "woff" : extension === "ttf" ? "truetype" : "opentype";
}

function fallbackStylesheetCss(sourceUrls) {
	return sourceUrls.map((url) => '@import url("' + url.replace(/["\\\r\n]/g, "") + '");').join("\n") + "\n";
}

async function compileOneTheme(root, theme, sourceUrls, manifest, options, stats) {
	const themeId = theme.id;
	const cacheAssetRoot = path.join(root, ".nextjs-engine", ".cache", "gen3", "fonts", "assets");
	const publicFontRoot = path.join(root, "public", "nextjs-engine", "fonts");
	const previous = manifest.themes[themeId];
	const now = Date.now();
	const ttlMs = clampInteger(options.cacheTtlMs, DEFAULT_CACHE_TTL_MS, 0, 30 * 24 * 60 * 60 * 1000);
	const refresh = options.forceRefresh === true || process.env.ENGINE_THEME_FONT_REFRESH === "1";
	const sourceKey = sha256(Buffer.from(canonicalJson(sourceUrls), "utf8"));
	const cssFileName = themeId + ".css";
	const cacheCssRoot = path.join(root, ".nextjs-engine", ".cache", "gen3", "fonts", "css");
	const trustedBuiltInHosts = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);

	if (!refresh && previous && previous.sourceKey === sourceKey && now - previous.updatedAt <= ttlMs
		&& validThemeCache(previous, themeId, sourceUrls, cacheAssetRoot)) {
		const publicEntry = { ...previous, cssFileName };
		writePublicAssets(root, publicFontRoot, cacheAssetRoot, publicEntry, previous);
		stats.cacheHits += 1;
		stats.fontAssetsReused += previous.fontAssets.length;
		return publicEntry;
	}

	try {
		const cssOrigins = parseOrigins("ENGINE_THEME_FONT_CSS_ORIGINS", DEFAULT_CSS_ORIGINS);
		const fontOrigins = parseOrigins("ENGINE_THEME_FONT_FILE_ORIGINS", DEFAULT_FONT_ORIGINS);
		const faces = [];
		for (const source of sourceUrls) {
			const stylesheetUrl = normalizeSourceUrl(source, cssOrigins, "font stylesheet URL");
			await assertPublicHost(stylesheetUrl, trustedBuiltInHosts);
			const fetched = await fetchBounded(stylesheetUrl, {
				maxBytes: MAX_CSS_BYTES,
				timeoutMs: options.timeoutMs,
				fetchImpl: options.fetchImpl,
				label: "font stylesheet",
				allowedType: (type) => type === "text/css" || type === "text/plain",
				headers: {
					Accept: "text/css,*/*;q=0.1",
					"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36",
				},
			});
			const css = new TextDecoder("utf-8", { fatal: true }).decode(fetched.bytes);
			for (const face of parseFontFaces(css)) {
				const src = face.declarations.src;
				const selected = chooseFontUrl(src, stylesheetUrl);
				if (!selected) continue;
				face.sourceUrl = selected.href;
				face.stylesheetUrl = stylesheetUrl.href;
				faces.push(face);
				if (faces.length > MAX_FONT_ASSETS_PER_THEME) throw new Error("[EngineTheme fonts] A theme has too many font faces.");
			}
		}

		const seenSourceUrls = new Set();
		const fontAssets = [];
		const generatedFaces = [];
		let totalBytes = 0;
		for (const face of faces) {
			if (seenSourceUrls.has(face.sourceUrl)) continue;
			seenSourceUrls.add(face.sourceUrl);
			const fontUrl = normalizeSourceUrl(face.sourceUrl, fontOrigins, "font file URL");
			await assertPublicHost(fontUrl, trustedBuiltInHosts);
			let asset = !refresh ? fontAssetFromCache(fontUrl.href, manifest, cacheAssetRoot) : undefined;
			if (!asset) {
				const fetched = await fetchBounded(fontUrl, {
					maxBytes: MAX_FONT_BYTES,
					timeoutMs: options.timeoutMs,
					fetchImpl: options.fetchImpl,
					label: "font file",
					allowedType: (type) => /^(font\/(woff2?|ttf|otf|sfnt)|application\/(font-woff2?|x-font-ttf|vnd\.ms-opentype|octet-stream))$/.test(type),
					headers: { Accept: "font/woff2,font/woff,font/ttf,font/otf,application/octet-stream;q=0.9,*/*;q=0.1" },
				});
				const extension = extensionFromUrl(fontUrl) || extensionFromType(fetched.contentType);
				if (!FONT_EXTENSIONS.has(extension)) throw new Error("[EngineTheme fonts] Unsupported font file type from " + fontUrl.origin + ".");
				totalBytes += fetched.bytes.byteLength;
				if (fetched.bytes.byteLength === 0 || totalBytes > MAX_TOTAL_FONT_BYTES) {
					throw new Error("[EngineTheme fonts] Theme font payload exceeds the total size limit.");
				}
				const digest = sha256(fetched.bytes);
				const filename = "font-" + digest + "." + extension;
				const cacheFileName = digest + "." + extension;
				ensureDirectory(root, cacheAssetRoot);
				const cacheFile = path.join(cacheAssetRoot, cacheFileName);
				if (!fs.existsSync(cacheFile)) atomicWrite(root, cacheFile, fetched.bytes);
				else if (sha256(fs.readFileSync(cacheFile)) !== digest) throw new Error("[EngineTheme fonts] Font cache hash mismatch.");
				asset = { sourceUrl: fontUrl.href, sha256: digest, fileName: filename, cacheFileName, extension, bytes: fetched.bytes.byteLength };
				stats.downloadedFonts += 1;
			} else {
				asset = { ...asset };
				stats.fontAssetsReused += 1;
			}
			fontAssets.push(asset);
			const declarations = face.declarations;
			const emitted = [];
			for (const key of ["font-family", "font-style", "font-weight", "font-stretch", "font-display", "unicode-range"]) {
				if (declarations[key] === undefined) continue;
				const safe = safeFontDeclaration(key, declarations[key]);
				if (safe !== undefined) emitted.push(key + ":" + safe);
			}
			const ext = asset.extension || extensionFromUrl(fontUrl) || "woff2";
			emitted.push('src:url("/nextjs-engine/fonts/' + asset.fileName + '") format("' + fontFormat(ext) + '")');
			generatedFaces.push("@font-face{" + emitted.join(";") + ";}");
		}

		if (generatedFaces.length === 0) throw new Error("[EngineTheme fonts] No supported @font-face declarations were found.");
		const cssContent = generatedFaces.join("\n") + "\n";
		if (!safePublicCss(cssContent)) throw new Error("[EngineTheme fonts] Generated font CSS exceeded its size limit.");
		const cssSha256 = sha256(Buffer.from(cssContent, "utf8"));
		const cacheCssFileName = cssSha256 + ".css";
		ensureDirectory(root, cacheCssRoot);
		const cacheCssPath = path.join(cacheCssRoot, cacheCssFileName);
		if (!fs.existsSync(cacheCssPath)) atomicWrite(root, cacheCssPath, cssContent);
		else if (sha256(fs.readFileSync(cacheCssPath)) !== cssSha256) throw new Error("[EngineTheme fonts] CSS cache hash mismatch.");
		const entry = {
			id: themeId,
			sourceKey,
			sourceUrls,
			updatedAt: now,
			cssFileName,
			cacheCssFileName,
			cssContent,
			cssSha256,
			fontAssets,
			status: "downloaded",
		};
		writePublicAssets(root, publicFontRoot, cacheAssetRoot, entry, previous);
		stats.generatedStylesheets += 1;
		stats.fontAssetsWritten += fontAssets.length;
		return entry;
	} catch (error) {
		if (previous && previous.sourceKey === sourceKey && validThemeCache(previous, themeId, sourceUrls, cacheAssetRoot)) {
			const staleEntry = { ...previous, cssFileName };
			writePublicAssets(root, publicFontRoot, cacheAssetRoot, staleEntry, previous);
			stats.staleCacheHits += 1;
			stats.fontAssetsReused += previous.fontAssets.length;
			return staleEntry;
		}
		stats.fallbackThemes += 1;
		const cssContent = fallbackStylesheetCss(sourceUrls);
		const cssSha256 = sha256(Buffer.from(cssContent, "utf8"));
		const entry = {
			id: themeId,
			sourceKey,
			sourceUrls,
			updatedAt: now,
			cssFileName,
			cssContent,
			cssSha256,
			fontAssets: [],
			status: "fallback",
			warning: error instanceof Error ? error.message : String(error),
		};
		const cssPath = path.join(publicFontRoot, cssFileName);
		assertSafeChildPath(root, cssPath);
		ensureDirectory(root, path.dirname(cssPath));
		if (fs.existsSync(cssPath)) {
			const stat = fs.lstatSync(cssPath);
			const currentHash = stat.isFile() && !stat.isSymbolicLink() ? sha256(fs.readFileSync(cssPath)) : "";
			const ownedHash = previous && previous.cssSha256;
			if (currentHash !== cssSha256 && currentHash !== ownedHash) {
				throw new Error("[EngineTheme fonts] Refusing to overwrite a CSS file not owned by NENC: " + path.relative(root, cssPath));
			}
			if (currentHash !== cssSha256) atomicWrite(root, cssPath, cssContent);
		} else atomicWrite(root, cssPath, cssContent);
		return entry;
	}
}

/**
 * Compile project-local EngineTheme fonts at production-build time.
 * Development mode deliberately performs no file writes, CSS requests, or
 * font downloads. Uses WOFF2 first, then WOFF/TTF/OTF fallback.
 */
function compileEngineThemeFonts(projectRoot, artifacts, options = {}) {
	if (process.env.NODE_ENV !== "production" && options.production !== true) {
		return {
			skipped: true,
			themeCount: 0,
			downloadedFonts: 0,
			fontAssetsReused: 0,
			fontAssetsWritten: 0,
			generatedStylesheets: 0,
			fallbackThemes: 0,
			staleCacheHits: 0,
		};
	}

	const root = fs.realpathSync(path.resolve(projectRoot));
	const cacheRoot = path.join(root, ".nextjs-engine", ".cache", "gen3", "fonts");
	const cacheAssetRoot = path.join(cacheRoot, "assets");
	const manifestPath = path.join(cacheRoot, "manifest.json");
	const themeRoot = path.join(root, ".nextjs-engine", "gen3", "theme");
	const publicFontRoot = path.join(root, "public", "nextjs-engine", "fonts");
	assertSafeChildPath(root, cacheRoot);
	assertSafeChildPath(root, manifestPath);
	assertSafeChildPath(root, themeRoot);
	assertSafeChildPath(root, publicFontRoot);

	const manifest = loadFontManifest(manifestPath);
	const previousEntries = manifest.themes;
	const nextEntries = Object.create(null);
	const stats = {
		skipped: false,
		themeCount: 0,
		downloadedFonts: 0,
		fontAssetsReused: 0,
		fontAssetsWritten: 0,
		generatedStylesheets: 0,
		fallbackThemes: 0,
		staleCacheHits: 0,
		warnings: [],
	};
	const seenThemes = new Set();
	const themeArtifacts = Array.isArray(artifacts) ? artifacts : [];
	for (const artifact of themeArtifacts) {
		if (!artifact || typeof artifact.id !== "string" || !SAFE_THEME_ID.test(artifact.id)
			|| typeof artifact.fileName !== "string" || artifact.fileName !== artifact.id + ".etr") continue;
		seenThemes.add(artifact.id);
		const artifactPath = path.join(themeRoot, artifact.fileName);
		assertSafeChildPath(root, artifactPath);
		const data = readJson(artifactPath);
		const fonts = data && data.content && Array.isArray(data.content.fonts)
			? data.content.fonts.filter((value) => typeof value === "string" && value.length > 0)
			: [];
		if (fonts.length === 0) continue;
		stats.themeCount += 1;
		if (fonts.length > MAX_STYLE_SHEETS) {
			throw new Error("[EngineTheme fonts] Theme " + artifact.id + " declares more than " + MAX_STYLE_SHEETS + " font stylesheets.");
		}
		const entry = await compileOneTheme(root, data.content, [...new Set(fonts)], manifest, options, stats);
		nextEntries[artifact.id] = entry;
		if (entry.warning) stats.warnings.push({ themeId: artifact.id, warning: entry.warning });
	}

	// Keep the last manifest entries for themes not present in this compiler scan,
	// since the build may run on a filtered set of reachable source modules.
	for (const [id, entry] of Object.entries(previousEntries)) {
		if (seenThemes.has(id) || !entry || typeof entry !== "object") continue;
		nextEntries[id] = entry;
	}
	const nextManifest = {
		generatedBy: GENERATED_BY,
		formatVersion: FORMAT_VERSION,
		themes: nextEntries,
	};
	const manifestText = JSON.stringify(nextManifest, null, 2) + "\n";
	ensureDirectory(root, cacheRoot);
	if (!fs.existsSync(manifestPath) || fs.readFileSync(manifestPath, "utf8") !== manifestText) {
		atomicWrite(root, manifestPath, manifestText);
	}
	return stats;
}

module.exports = {
	compileEngineThemeFonts,
};
