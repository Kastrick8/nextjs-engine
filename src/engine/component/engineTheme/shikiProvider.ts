import type {
	EngineHighlighterContext,
	EngineHighlighterProvider,
	EngineHighlighterThemeInfo,
	EngineHighlighterToken,
} from "./highlighting";
import { normalizeEngineHighlightLanguage, normalizeEngineThemeColor } from "./highlighting";

export interface EngineShikiToken {
	content: string;
	color?: string;
	explanation?: unknown;
}
export interface EngineShikiHighlighter {
	codeToTokens(code: string, options: { lang: string; theme: string; includeExplanation: true }):
		{ tokens: readonly (readonly EngineShikiToken[])[] };
	getLoadedLanguages?: () => readonly string[];
	getLoadedThemes?: () => readonly string[];
}
export interface EngineShikiProviderOptions {
	id?: string;
	name?: string;
	languages?: readonly string[];
	themes?: readonly string[];
	defaultTheme?: string;
}

const SAFE_ID = /^[a-z0-9][a-z0-9._-]{0,63}$/i;

function validNames(values: readonly string[], maximum: number, label: string): string[] {
	if (values.length > maximum) throw new TypeError("Shiki provider " + label + " exceeds its size limit.");
	const unique = new Set<string>();
	for (const value of values) {
		if (typeof value !== "string" || !SAFE_ID.test(value)) throw new TypeError("Shiki provider has an invalid " + label + " ID.");
		unique.add(value);
	}
	return [...unique];
}
function tokenScopes(explanation: unknown): string[] {
	if (!Array.isArray(explanation)) return [];
	const result: string[] = [];
	for (const item of explanation) {
		if (!item || typeof item !== "object") continue;
		const record = item as { scopeName?: unknown; scopes?: unknown };
		if (typeof record.scopeName === "string") result.push(record.scopeName);
		if (Array.isArray(record.scopes)) for (const scope of record.scopes) {
			if (scope && typeof scope === "object" && typeof (scope as { scopeName?: unknown }).scopeName === "string") {
				result.push((scope as { scopeName: string }).scopeName);
			}
		}
	}
	return result.map((scope) => scope.toLowerCase());
}
function tokenKind(scopes: readonly string[]): EngineHighlighterToken["kind"] {
	const value = scopes.join(" ");
	if (/comment/.test(value)) return "comment";
	if (/string|regexp/.test(value)) return "string";
	if (/constant\.numeric/.test(value)) return "number";
	if (/constant\.(language|character)|support\.constant|variable\.language/.test(value)) return "constant";
	if (/entity\.name\.(type|class|struct|interface|enum)|support\.type|storage\.type/.test(value)) return "type";
	if (/entity\.name\.function|support\.function|meta\.function-call/.test(value)) return "function";
	if (/variable\.other\.(property|object\.property)|meta\.object-literal\.key|entity\.name\.tag/.test(value)) return "property";
	if (/keyword\.operator|\boperator\b/.test(value)) return "operator";
	if (/keyword|storage\.modifier/.test(value)) return "keyword";
	if (/punctuation/.test(value)) return "punctuation";
	return "plain";
}

/** Adapts an initialized Shiki highlighter; Engine does not import Shiki itself. */
export function createShikiEngineHighlighterProvider(highlighter: EngineShikiHighlighter, options: EngineShikiProviderOptions = {}): EngineHighlighterProvider {
	if (!highlighter || typeof highlighter.codeToTokens !== "function") {
		throw new TypeError("Shiki provider requires an initialized highlighter with codeToTokens().");
	}
	const languages = validNames(options.languages ?? highlighter.getLoadedLanguages?.() ?? [], 500, "language")
		.map(normalizeEngineHighlightLanguage).filter((language) => Boolean(language) && !["ansi", "text", "plain"].includes(language));
	const themeIds = validNames(options.themes ?? highlighter.getLoadedThemes?.() ?? [], 200, "theme");
	if (!languages.length) throw new TypeError("Shiki provider requires at least one explicitly loaded language.");
	if (!themeIds.length) throw new TypeError("Shiki provider requires at least one explicitly loaded theme.");
	const defaultTheme = options.defaultTheme ?? themeIds[0];
	if (!themeIds.includes(defaultTheme)) throw new TypeError("Shiki provider defaultTheme must be a loaded theme.");
	const themes: EngineHighlighterThemeInfo[] = themeIds.map((id) => ({ id, name: id }));
	return Object.freeze({
		id: options.id ?? "shiki",
		name: options.name ?? "Shiki (TextMate grammar)",
		languages: Object.freeze([...new Set(languages)]),
		themes: Object.freeze(themes.map((theme) => Object.freeze(theme))),
		highlight(code: string, language: string, context?: EngineHighlighterContext): readonly EngineHighlighterToken[] | null {
			const theme = context?.theme && themeIds.includes(context.theme) ? context.theme : defaultTheme;
			const result = highlighter.codeToTokens(code, {
				lang: normalizeEngineHighlightLanguage(language), theme, includeExplanation: true,
			});
			if (!result || !Array.isArray(result.tokens)) return null;
			const separators = code.match(/\r\n|\r|\n/g) ?? [];
			const lines = code.split(/\r\n|\r|\n/);
			if (result.tokens.length !== lines.length) return null;
			const tokens: EngineHighlighterToken[] = [];
			for (let lineIndex = 0; lineIndex < result.tokens.length; lineIndex += 1) {
				const lineTokens = result.tokens[lineIndex];
				if (!Array.isArray(lineTokens) || lineTokens.map((token) => token?.content ?? "").join("") !== lines[lineIndex]) return null;
				for (const token of lineTokens) {
					if (!token || typeof token.content !== "string" || token.content.length === 0) continue;
					const color = token.color === undefined ? undefined : normalizeEngineThemeColor(token.color);
					if (token.color !== undefined && color === undefined) return null;
					tokens.push({ kind: tokenKind(tokenScopes(token.explanation)), text: token.content, ...(color ? { color } : {}) });
				}
				if (lineIndex < separators.length) tokens.push({ kind: "plain", text: separators[lineIndex] });
			}
			return tokens;
		},
	});
}
