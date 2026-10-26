import { hasUnsafeEngineThemeCssNetworkPrimitive, isSafeEngineThemeCssValue } from "./cssSafety";
import type { EngineThemeDefinition } from "../../schema/types";
import {
	registerLoadedRemoteEngineTheme,
	unregisterLoadedRemoteEngineTheme,
} from "./createTheme";

export interface EngineThemeArtifact {
	format: "nextjs-engine-theme";
	formatVersion: 1;
	schemaVersion: 1;
	generatedBy: "NENC";
	id: string;
	createdWith: {
		nextjs: string;
		nextjsEngine: string;
	};
	content: EngineThemeDefinition;
	sha256: string;
}

export interface LoadRemoteEngineThemeOptions {
	/** Exact trusted origins, for example ["https://docs.example.com"]. Wildcards are not accepted. */
	allowedOrigins: readonly string[];
	/** Base URL used only when url is a relative path such as /nextjs-engine/theme/dark.etr. */
	baseUrl?: string;
	/** Both versions are required and must match the artifact metadata exactly. */
	expectedNextjsVersion: string;
	expectedEngineVersion: string;
	/** Optional group ID check, not a component/subtheme-qualified ID. */
	expectedId?: string;
	/** Maximum JSON response size; capped at 1 MiB. Defaults to 512 KiB. */
	maxBytes?: number;
	/** Fetch timeout in milliseconds; clamped to 1–30000. Defaults to 5000. */
	timeoutMs?: number;
	/** Cache time in milliseconds; clamped to 0–3600000. Defaults to 300000. */
	cacheTtlMs?: number;
	/** Optional injectable fetcher for tests/controlled transports. */
	fetchImpl?: typeof fetch;
	/** Optional caller cancellation signal. */
	signal?: AbortSignal;
}

interface CacheEntry {
	theme: Readonly<EngineThemeDefinition & { scope: "remote" }>;
	expiresAt: number;
}

const MAX_ARTIFACT_BYTES = 1024 * 1024;
const DEFAULT_ARTIFACT_BYTES = 512 * 1024;
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 32;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<Readonly<EngineThemeDefinition & { scope: "remote" }>>>();

function canonicalJson(value: unknown): string {
	if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
	if (typeof value === "number") {
		if (!Number.isFinite(value)) throw new TypeError("ETR data contains a non-finite number.");
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
	if (!value || typeof value !== "object") throw new TypeError("ETR data contains a non-JSON value.");
	const record = value as Record<string, unknown>;
	const keys = Object.keys(record).sort();
	return "{" + keys.map((key) => JSON.stringify(key) + ":" + canonicalJson(record[key])).join(",") + "}";
}

function isPrivateOrNonPublicAddress(address: string): boolean {
	const value = String(address).toLowerCase().split("%")[0];
	if (value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd")
		|| value.startsWith("ff") || value.startsWith("2001:db8:") || /^fe[89ab]/.test(value)) return true;
	const ipv4 = value.match(/^(?:::ffff:)?(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/i);
	if (!ipv4) return false;
	const octets = ipv4.slice(1).map(Number);
	if (octets.some((part) => part < 0 || part > 255)) return true;
	const [a, b, c] = octets;
	return a === 0 || a === 10 || a === 127 || a >= 224
		|| (a === 100 && b >= 64 && b <= 127)
		|| (a === 169 && b === 254)
		|| (a === 172 && b >= 16 && b <= 31)
		|| (a === 192 && b === 168)
		|| (a === 192 && b === 0 && c === 0)
		|| (a === 192 && b === 0 && c === 2)
		|| (a === 198 && (b === 18 || b === 19 || b === 51 && c === 100))
		|| (a === 203 && b === 0 && c === 113);
}

function assertRemoteOriginIsPublic(url: URL): void {
	const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
	if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")
		|| hostname.endsWith(".local") || hostname.endsWith(".lan")
		|| hostname.endsWith(".internal") || hostname.endsWith(".home.arpa")
		|| hostname.endsWith(".test") || hostname.endsWith(".invalid")
		|| !hostname.includes(".") && !hostname.includes(":")
		|| isPrivateOrNonPublicAddress(hostname)) {
		throw new Error("Remote EngineTheme hosts must be public; local/private hosts are not permitted: " + hostname + ".");
	}
}

function normalizeAllowedOrigins(origins: readonly string[], allowHttp: boolean): Set<string> {
	if (!Array.isArray(origins) || origins.length === 0 || origins.length > 64) {
		throw new TypeError("loadRemoteEngineTheme() requires 1–64 exact allowedOrigins.");
	}
	const normalized = new Set<string>();
	for (const origin of origins) {
		if (typeof origin !== "string" || origin.length > 512 || origin.includes("*")) {
			throw new TypeError("Remote theme origins must be exact origin URLs without wildcards.");
		}
		let parsed: URL;
		try {
			parsed = new URL(origin);
		} catch {
			throw new TypeError("Invalid remote theme allowlist origin: " + origin);
		}
		if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
			throw new TypeError("Allowed origins must contain only scheme, host and optional port.");
		}
		if (parsed.protocol !== "https:" && !(allowHttp && parsed.protocol === "http:")) {
			throw new TypeError("Remote theme origins must use HTTPS.");
		}
		assertRemoteOriginIsPublic(parsed);
		normalized.add(parsed.origin);
	}
	return normalized;
}

function resolveAllowedUrl(input: string, options: LoadRemoteEngineThemeOptions): { url: URL; origin: string } {
	if (typeof input !== "string" || input.length === 0 || input.length > 2048) {
		throw new TypeError("Remote theme URL must be a non-empty string of at most 2048 characters.");
	}
	let url: URL;
	try {
		url = options.baseUrl ? new URL(input, options.baseUrl) : new URL(input);
	} catch {
		throw new TypeError("Remote theme URL must be absolute or have an explicit baseUrl.");
	}
	if (url.username || url.password || url.hash) throw new TypeError("Remote theme URLs cannot contain credentials or fragments.");
	if (url.protocol !== "https:") {
		throw new TypeError("Remote EngineTheme URLs must use HTTPS.");
	}
	assertRemoteOriginIsPublic(url);
	const allowed = normalizeAllowedOrigins(options.allowedOrigins, false);
	if (!allowed.has(url.origin)) {
		throw new Error("Remote EngineTheme origin '" + url.origin + "' is not in allowedOrigins.");
	}
	return { url, origin: url.origin };
}

function clampInteger(value: number | undefined, fallback: number, minimum: number, maximum: number): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
	return Math.max(minimum, Math.min(maximum, Math.floor(value)));
}

function bytesToHex(bytes: Uint8Array): string {
	let output = "";
	for (const byte of bytes) output += byte.toString(16).padStart(2, "0");
	return output;
}

async function computeSha256(value: string): Promise<string> {
	const subtle = globalThis.crypto?.subtle;
	if (!subtle) {
		throw new Error("This runtime does not expose Web Crypto SHA-256; remote theme integrity checks cannot run.");
	}
	const digest = await subtle.digest("SHA-256", new TextEncoder().encode(value));
	return bytesToHex(new Uint8Array(digest));
}

async function readBoundedResponse(response: Response, limit: number): Promise<string> {
	const lengthHeader = response.headers.get("content-length");
	if (lengthHeader !== null) {
		const declared = Number(lengthHeader);
		if (Number.isFinite(declared) && declared > limit) throw new Error("Remote .etr artifact exceeds the configured size limit.");
	}
	const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
	if (contentType.includes("text/html")) throw new Error("Remote theme endpoint returned HTML, not a .etr JSON artifact.");

	if (!response.body) {
		const text = await response.text();
		if (new TextEncoder().encode(text).byteLength > limit) throw new Error("Remote .etr artifact exceeds the configured size limit.");
		return text;
	}

	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	try {
		while (true) {
			const item = await reader.read();
			if (item.done) break;
			const chunk = item.value;
			total += chunk.byteLength;
			if (total > limit) {
				try { await reader.cancel(); } catch { /* Preserve the size-limit error. */ }
				throw new Error("Remote .etr artifact exceeds the configured size limit.");
			}
			chunks.push(chunk);
		}
	} finally {
		try { reader.releaseLock(); } catch { /* A cancelled stream may already release its lock. */ }
	}
	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function validateArtifactShape(value: unknown): asserts value is EngineThemeArtifact {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Remote .etr artifact must be a JSON object.");
	const artifact = value as Record<string, unknown>;
	if (artifact.format !== "nextjs-engine-theme" || artifact.formatVersion !== 1 || artifact.schemaVersion !== 1 || artifact.generatedBy !== "NENC") {
		throw new Error("Remote .etr artifact format, envelope version, or theme schema version is not supported by this EngineTheme loader.");
	}
	if (typeof artifact.id !== "string" || !SAFE_ID.test(artifact.id)) {
		throw new TypeError("Remote .etr artifact has an invalid group ID.");
	}
	if (!artifact.createdWith || typeof artifact.createdWith !== "object" || Array.isArray(artifact.createdWith)) {
		throw new TypeError("Remote .etr artifact is missing createdWith version metadata.");
	}
	const createdWith = artifact.createdWith as Record<string, unknown>;
	if (typeof createdWith.nextjs !== "string" || typeof createdWith.nextjsEngine !== "string") {
		throw new TypeError("Remote .etr artifact has incomplete version metadata.");
	}
	if (!artifact.content || typeof artifact.content !== "object" || Array.isArray(artifact.content)) {
		throw new TypeError("Remote .etr artifact content must be a theme definition object.");
	}
	const content = artifact.content as Record<string, unknown>;
	if (content.id !== artifact.id || content.scope !== "remote") {
		throw new Error("Remote .etr artifact content ID/scope does not match its envelope.");
	}
	if (typeof artifact.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(artifact.sha256)) {
		throw new TypeError("Remote .etr artifact has an invalid SHA-256 field.");
	}
}



/** Bound and reject CSS/network primitives throughout JSON theme data before registration. */
function assertSafeRemoteThemeStrings(
	value: unknown,
	path: string,
	state: { nodes: number },
	depth = 0,
): void {
	state.nodes += 1;
	if (state.nodes > 10_000 || depth > 32) {
		throw new Error("Remote EngineTheme exceeds the nested-data validation budget at " + path + ".");
	}
	if (typeof value === "string") {
		if (hasUnsafeEngineThemeCssNetworkPrimitive(value)) {
			throw new Error("Remote EngineTheme contains an unsafe CSS/network primitive at " + path + ".");
		}
		return;
	}
	if (Array.isArray(value)) {
		for (let index = 0; index < value.length; index += 1) {
			assertSafeRemoteThemeStrings(value[index], path + "[" + index + "]", state, depth + 1);
		}
		return;
	}
	if (value && typeof value === "object") {
		for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
			assertSafeRemoteThemeStrings(item, path + "." + key, state, depth + 1);
		}
	}
}

function sanitizeRemoteThemeContent(
	content: EngineThemeDefinition,
	artifactUrl: URL,
	options: LoadRemoteEngineThemeOptions,
): EngineThemeDefinition {
	const safe = JSON.parse(JSON.stringify(content)) as EngineThemeDefinition & Record<string, unknown>;
	assertSafeRemoteThemeStrings(safe, "theme", { nodes: 0 });

	// Arbitrary CSS is executable browser styling and can issue requests; it is
	// not accepted from a remote theme artifact. Component styles are rendered
	// through React style props / the safe template renderer instead.
	if (typeof safe.globalStyles === "string" && safe.globalStyles.trim().length > 0) {
		throw new Error("Remote EngineTheme globalStyles are disabled; use declarative tokens and component styles.");
	}
	delete safe.globalStyles;

	if (safe.vars !== undefined) {
		if (!safe.vars || typeof safe.vars !== "object" || Array.isArray(safe.vars)) {
			throw new TypeError("Remote EngineTheme vars must be a plain object of CSS custom properties.");
		}
		const entries = Object.entries(safe.vars as Record<string, unknown>);
		if (entries.length > 128) throw new Error("Remote EngineTheme vars exceed the property limit.");
		const normalizedVars: Record<string, string> = {};
		for (const [key, value] of entries) {
			if (!/^--[A-Za-z0-9_-]{1,80}$/.test(key)) {
				throw new Error("Remote EngineTheme CSS variable names must start with -- and use safe identifier characters.");
			}
			if (typeof value !== "string" || !isSafeEngineThemeCssValue(value, 256)) {
				throw new Error("Remote EngineTheme CSS variable '" + key + "' contains an unsafe CSS value.");
			}
			normalizedVars[key] = value;
		}
		safe.vars = normalizedVars;
	}

	if (safe.fonts !== undefined) {
		if (!Array.isArray(safe.fonts) || safe.fonts.length > 16) {
			throw new Error("Remote EngineTheme fonts must contain at most 16 allowlisted stylesheet URLs.");
		}
		const allowedOrigins = normalizeAllowedOrigins(options.allowedOrigins, false);
		const fontUrls = new Set<string>();
		for (const font of safe.fonts) {
			if (typeof font !== "string" || font.length === 0 || font.length > 2048) {
				throw new TypeError("Remote EngineTheme font URLs must be short non-empty strings.");
			}
			let parsed: URL;
			try {
				parsed = new URL(font, artifactUrl.href);
			} catch {
				throw new TypeError("Remote EngineTheme contains an invalid font stylesheet URL.");
			}
			if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.hash
				|| !allowedOrigins.has(parsed.origin)) {
				throw new Error("Remote EngineTheme font stylesheet origin must be HTTPS and included in allowedOrigins.");
			}
			fontUrls.add(parsed.href);
		}
		safe.fonts = [...fontUrls];
	}

	return safe as EngineThemeDefinition;
}

async function parseAndRegisterArtifact(
	text: string,
	url: URL,
	options: LoadRemoteEngineThemeOptions,
): Promise<Readonly<EngineThemeDefinition & { scope: "remote" }>> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new Error("Remote theme response is not valid JSON.");
	}
	validateArtifactShape(parsed);
	const artifact = parsed as EngineThemeArtifact;
	if (options.expectedId && artifact.id !== options.expectedId) {
		throw new Error("Remote .etr group ID '" + artifact.id + "' did not match expectedId '" + options.expectedId + "'.");
	}
	if (artifact.createdWith.nextjs !== options.expectedNextjsVersion) {
		throw new Error("Remote .etr Next.js version mismatch: artifact " + artifact.createdWith.nextjs
			+ ", expected " + options.expectedNextjsVersion + ".");
	}
	if (artifact.createdWith.nextjsEngine !== options.expectedEngineVersion) {
		throw new Error("Remote .etr Engine version mismatch: artifact " + artifact.createdWith.nextjsEngine
			+ ", expected " + options.expectedEngineVersion + ".");
	}
	const payload: Record<string, unknown> = { ...artifact };
	delete payload.sha256;
	const expectedDigest = await computeSha256(canonicalJson(payload));
	if (expectedDigest !== artifact.sha256.toLowerCase()) {
		throw new Error("Remote .etr SHA-256 verification failed.");
	}
	const safeContent = sanitizeRemoteThemeContent(artifact.content, url, options);
	const registered = registerLoadedRemoteEngineTheme(safeContent);
	return registered as Readonly<EngineThemeDefinition & { scope: "remote" }>;
}

/**
 * Explicitly fetch and register a remote .etr theme. It performs no work at
 * module import time and requires an exact origin allowlist plus exact expected
 * Next.js/Engine versions. Redirects, credentials, HTML responses, oversized
 * bodies, incompatible versions and digest mismatches fail closed.
 */
export async function loadRemoteEngineTheme(
	input: string,
	options: LoadRemoteEngineThemeOptions,
): Promise<Readonly<EngineThemeDefinition & { scope: "remote" }>> {
	if (!options || typeof options !== "object") throw new TypeError("Remote theme loader options are required.");
	if (typeof options.expectedNextjsVersion !== "string" || !options.expectedNextjsVersion
		|| typeof options.expectedEngineVersion !== "string" || !options.expectedEngineVersion) {
		throw new TypeError("Remote theme loading requires expectedNextjsVersion and expectedEngineVersion.");
	}
	const { url } = resolveAllowedUrl(input, options);
	const maxBytes = clampInteger(options.maxBytes, DEFAULT_ARTIFACT_BYTES, 1024, MAX_ARTIFACT_BYTES);
	const timeoutMs = clampInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS, 1, 30_000);
	const ttlMs = clampInteger(options.cacheTtlMs, DEFAULT_CACHE_TTL_MS, 0, 3_600_000);
	const key = [url.href, options.expectedNextjsVersion, options.expectedEngineVersion, options.expectedId ?? "", maxBytes].join("|");
	const existing = cache.get(key);
	if (existing && existing.expiresAt > Date.now()) {
		cache.delete(key);
		cache.set(key, existing);
		return existing.theme;
	}
	if (existing) cache.delete(key);
	const running = inFlight.get(key);
	if (running) return running;

	const promise = (async () => {
		const fetcher = options.fetchImpl ?? globalThis.fetch;
		if (typeof fetcher !== "function") throw new Error("This runtime does not provide fetch() for remote themes.");
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		const onExternalAbort = () => controller.abort();
		options.signal?.addEventListener("abort", onExternalAbort, { once: true });
		try {
			const response = await fetcher(url.href, {
				method: "GET",
				redirect: "error",
				credentials: "omit",
				referrerPolicy: "no-referrer",
				cache: "no-store",
				headers: { Accept: "application/json" },
				signal: controller.signal,
			});
			if (response.redirected) throw new Error("Remote .etr redirects are disabled; serve the artifact at its final allowlisted URL.");
			if (!response.ok) throw new Error("Remote .etr request failed with HTTP " + response.status + ".");
			if (response.url) {
				const finalUrl = new URL(response.url);
				if (finalUrl.origin !== url.origin) throw new Error("Remote .etr response origin changed during retrieval.");
			}
			const text = await readBoundedResponse(response, maxBytes);
			const theme = await parseAndRegisterArtifact(text, url, options);
			if (ttlMs > 0) {
				cache.set(key, { theme, expiresAt: Date.now() + ttlMs });
				while (cache.size > MAX_CACHE_ENTRIES) {
					const firstKey = cache.keys().next().value;
					if (firstKey === undefined) break;
					cache.delete(firstKey);
				}
			}
			return theme;
		} catch (error) {
			if (controller.signal.aborted) throw new Error("Remote .etr retrieval timed out or was cancelled.");
			throw error;
		} finally {
			clearTimeout(timer);
			options.signal?.removeEventListener("abort", onExternalAbort);
		}
	})();
	inFlight.set(key, promise);
	try {
		return await promise;
	} finally {
		inFlight.delete(key);
	}
}

/** Clear cached URL responses; already registered verified themes remain active. */
export function clearRemoteEngineThemeCache(): void {
	cache.clear();
}

export function getRemoteEngineThemeCacheSize(): number {
	return cache.size;
}

export function unregisterRemoteEngineTheme(id: string): boolean {
	const removed = unregisterLoadedRemoteEngineTheme(id);
	if (removed) {
		for (const [key, entry] of cache) {
			if (entry.theme.id === id) cache.delete(key);
		}
	}
	return removed;
}
