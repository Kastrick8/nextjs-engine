const MAX_FONT_URL_LENGTH = 2048;
const MAX_FONT_URLS = 16;
const MAX_FONT_URL_SCAN = 64;

/**
 * Normalize a theme font stylesheet URL without fetching it.
 * Absolute URLs must use HTTPS; root-relative and ordinary relative paths
 * remain supported for local/public assets. Protocol-relative and executable
 * schemes are rejected.
 */
export function normalizeEngineThemeFontHref(value: unknown): string | undefined {
	if (typeof value !== "string" || value.length === 0 || value.length > MAX_FONT_URL_LENGTH) return undefined;
	const href = value.trim();
	if (!href || /[\u0000-\u001f\u007f\\]/.test(href) || href.includes("#")) return undefined;
	if (href.startsWith("//") || /^(?:javascript|data|blob|file|vbscript):/i.test(href)) return undefined;

	if (href.startsWith("/")) return href;

	if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(href)) {
		try {
			const url = new URL(href);
			if (url.protocol !== "https:" || url.username || url.password || url.hash) return undefined;
			return url.href;
		} catch {
			return undefined;
		}
	}

	if (/^[A-Za-z][A-Za-z0-9+.-]*:/i.test(href) || href.startsWith("?")) return undefined;
	return href;
}

/**
 * Dedupe and cap stylesheet links. The fixed scan limit bounds work even if a
 * legacy caller passes an unexpectedly large fonts array.
 */
export function normalizeEngineThemeFontHrefs(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	const result: string[] = [];
	const seen = new Set<string>();
	const scanLimit = Math.min(value.length, MAX_FONT_URL_SCAN);
	for (let index = 0; index < scanLimit && result.length < MAX_FONT_URLS; index += 1) {
		const href = normalizeEngineThemeFontHref(value[index]);
		if (!href || seen.has(href)) continue;
		seen.add(href);
		result.push(href);
	}
	return result;
}

