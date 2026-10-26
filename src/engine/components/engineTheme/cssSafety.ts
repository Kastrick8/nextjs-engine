/**
 * CSS values are data, not executable theme code. Decode CSS escapes before
 * looking for network/execution primitives so escaped spellings cannot bypass
 * the same checks applied to literal url(...), expression(...), and similar forms.
 */
const UNSAFE_CSS_NETWORK_PATTERN = /url\s*\(|expression\s*\(|javascript\s*:|vbscript\s*:|@import\b|-moz-binding\s*:|behavior\s*:/i;

function decodeCssEscapes(value: string): string {
  return value.replace(
    /\\([0-9a-fA-F]{1,6})[ \t\r\n\f]?|\\(?:\r\n|[\n\r\f])|\\([^\r\n\f])/g,
    (_match, hex: string | undefined, escaped: string | undefined) => {
      if (hex !== undefined) {
        const codePoint = Number.parseInt(hex, 16);
        if (codePoint === 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
          return "\uFFFD";
        }
        return String.fromCodePoint(codePoint);
      }
      return escaped ?? "";
    },
  );
}

/** Detect CSS network/execution primitives after interpreting CSS escapes. */
export function hasUnsafeEngineThemeCssNetworkPrimitive(value: string): boolean {
  const decoded = decodeCssEscapes(value);
  if (UNSAFE_CSS_NETWORK_PATTERN.test(decoded)) return true;
  // CSS comments can split a dangerous token, e.g. u/**/rl(...).
  return UNSAFE_CSS_NETWORK_PATTERN.test(decoded.replace(/\/\*[\s\S]*?\*\//g, ""));
}

/** Validate a single bounded CSS scalar before it reaches a style or token. */
export function isSafeEngineThemeCssValue(value: unknown, maxLength = 256): value is string {
  if (typeof value !== "string" || value.length > maxLength) return false;
  const decoded = decodeCssEscapes(value);
  return !/[\u0000-\u001f\u007f{};<>]/.test(value)
    && !/[\u0000-\u001f\u007f{};<>]/.test(decoded)
    && !/\/\*|\*\//.test(decoded)
    && !UNSAFE_CSS_NETWORK_PATTERN.test(decoded);
}
