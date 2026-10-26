/**
 * CSS values are data, not executable theme code. Decode CSS escapes before
 * looking for network/execution primitives so escaped spellings cannot bypass
 * the same checks applied to literal \`url(...)\`, \`expression(...)\`, etc.
 */
const UNSAFE_CSS_NETWORK_PATTERN = /url\s*\(|expression\s*\(|javascript\s*:|vbscript\s*:|@import\b|-moz-binding\s*:|behavior\s*:/i;

function decodeCssEscapes(value: string): string {
\treturn value.replace(
\t\t/\\([0-9a-fA-F]{1,6})[ \t\r\n\f]?|\\(?:\r\n|[\n\r\f])|\\([^\r\n\f])/g,
\t\t(_match, hex: string | undefined, escaped: string | undefined) => {
\t\t\tif (hex !== undefined) {
\t\t\t\tconst codePoint = Number.parseInt(hex, 16);
\t\t\t\tif (codePoint === 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
\t\t\t\t\treturn "\uFFFD";
\t\t\t\t}
\t\t\t\treturn String.fromCodePoint(codePoint);
\t\t\t}
\t\t\treturn escaped ?? "";
\t\t},
\t);
}

/** Detect CSS network/execution primitives after interpreting CSS escapes. */
export function hasUnsafeEngineThemeCssNetworkPrimitive(value: string): boolean {
\treturn UNSAFE_CSS_NETWORK_PATTERN.test(decodeCssEscapes(value));
}

/** Validate a single bounded CSS scalar before it reaches a style or token. */
export function isSafeEngineThemeCssValue(value: unknown, maxLength = 256): value is string {
\tif (typeof value !== "string" || value.length > maxLength) return false;
\tconst decoded = decodeCssEscapes(value);
\treturn !/[\u0000-\u001f\u007f{};<>]/.test(value)
\t\t&& !/[\u0000-\u001f\u007f{};<>]/.test(decoded)
\t\t&& !/\/\*|\*\//.test(decoded)
\t\t&& !UNSAFE_CSS_NETWORK_PATTERN.test(decoded);
}
