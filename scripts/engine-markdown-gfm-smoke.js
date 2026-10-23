"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");

const parserPath = path.join(process.cwd(), "src", "engine", "core", "markdownParser.ts");
const parserSource = fs.readFileSync(parserPath, "utf8");
const parserModule = { exports: {} };
new Function("module", "exports", "require", ts.transpileModule(parserSource, {
	compilerOptions: {
		module: ts.ModuleKind.CommonJS,
		target: ts.ScriptTarget.ES2022,
	},
	fileName: parserPath,
}).outputText)(parserModule, parserModule.exports, require);

const {
	normalizeEngineMarkdownSource,
	parseEngineAnsi,
	slugifyMarkdownHeading,
} = parserModule.exports;

const iconPath = path.join(process.cwd(), "src", "engine", "core", "engineUrlIcon.ts");
const iconSource = fs.readFileSync(iconPath, "utf8");
const iconModule = { exports: {} };
new Function("module", "exports", "require", ts.transpileModule(iconSource, {
	compilerOptions: {
		module: ts.ModuleKind.CommonJS,
		target: ts.ScriptTarget.ES2022,
	},
	fileName: iconPath,
}).outputText)(iconModule, iconModule.exports, require);
const {
	normalizeEngineUrlIconSize,
	resolveEngineFaviconUrl,
	resolveEngineFaviconAssetUrl,
} = iconModule.exports;

async function main() {
	const compactNas = "For `<ROOT>`:\n\n```text <ROOT>/rbe/ ├── storage/ │ └── <object-sha256>/ └── chunks/<chunk-sha256>.chunk```";
	const normalizedNas = normalizeEngineMarkdownSource(compactNas);
	assert.equal(
		normalizedNas,
		"For `<ROOT>`:\n\n```text\n<ROOT>/rbe/ ├── storage/ │ └── <object-sha256>/ └── chunks/<chunk-sha256>.chunk\n```",
		"compact one-line code fences must retain their language and code payload",
	);

	const standardFence = "```ts\nconst stable = true;\n```";
	assert.equal(normalizeEngineMarkdownSource(standardFence), standardFence, "valid CommonMark fences must remain byte-stable");
	assert.equal(
		normalizeEngineMarkdownSource("~~~text tree/ └── leaf~~~"),
		"~~~text\ntree/ └── leaf\n~~~",
		"tilde fences must receive the same compact compatibility repair",
	);
	assert.equal(
		normalizeEngineMarkdownSource("Use ```text as prose, without a closing fence."),
		"Use ```text as prose, without a closing fence.",
		"ordinary prose containing backticks must not be rewritten",
	);
	assert.equal(slugifyMarkdownHeading("**NAS** layout `v3`"), "nas-layout-v3");

	const githubIcon = resolveEngineFaviconUrl("https://github.com/Kate-alt-69/nextjs-engine?private=do-not-forward", 18);
	assert.ok(githubIcon.startsWith("https://www.google.com/s2/favicons?"), "external links should resolve through the favicon provider");
	const proxiedGithubIcon = resolveEngineFaviconAssetUrl("https://github.com/private/path?token=must-not-leak", 18);
	assert.ok(proxiedGithubIcon.startsWith("/_static/emd/favicon?"), "rendered favicons should use the server asset route");
	assert.ok(proxiedGithubIcon.includes("domain=github.com"), "the asset route receives only the normalized hostname");
	assert.ok(proxiedGithubIcon.includes("sz=36"), "the requested icon size should be preserved for the provider");
	assert.doesNotMatch(proxiedGithubIcon, /private|token|must-not-leak/, "the asset route must not expose the link path or query");

	assert.ok(githubIcon.includes("domain_url=https%3A%2F%2Fgithub.com"), "favicon lookups must use the domain origin");
	assert.doesNotMatch(githubIcon, /Kate-alt-69|private|do-not-forward/, "favicon lookup must not expose the path or query");
	assert.equal(
		resolveEngineFaviconUrl("http://github.com/another-path"),
		resolveEngineFaviconUrl("https://github.com"),
		"favicon lookup cache keys should normalize HTTP and HTTPS to the same hostname",
	);
	assert.equal(
		resolveEngineFaviconUrl("http://[::ffff:127.0.0.1]"),
		undefined,
		"IPv4-mapped IPv6 loopback must be skipped",
	);
	assert.equal(resolveEngineFaviconUrl("/relative/path"), undefined, "relative links must not receive favicons");
	assert.equal(resolveEngineFaviconUrl("javascript:alert(1)"), undefined, "unsafe schemes must not receive favicons");
	assert.equal(resolveEngineFaviconUrl("http://127.0.0.1:3000"), undefined, "loopback destinations must be skipped");
	assert.equal(resolveEngineFaviconUrl("http://localhost:3000"), undefined, "localhost destinations must be skipped");
	assert.equal(normalizeEngineUrlIconSize("auto"), "1em", "automatic icon size should track text size");
	assert.equal(normalizeEngineUrlIconSize(1000), 64, "numeric icon size must be clamped to the documented maximum");
	assert.equal(normalizeEngineUrlIconSize(2), 8, "numeric icon size must be clamped to the documented minimum");


	const ansi = parseEngineAnsi("\u001b[1;31mERROR\u001b[0m plain \u001b[38;2;12;34;56mRGB");
	assert.equal(ansi.length, 3, "ANSI SGR sequences should split terminal output into styled text segments");
	assert.equal(ansi[0].text, "ERROR");
	assert.equal(ansi[0].style.fontWeight, 700, "ANSI bold should map to font weight");
	assert.equal(ansi[0].style.color, "#aa0000", "ANSI basic colors should use the configurable palette defaults");
	assert.equal(ansi[1].text, " plain ");
	assert.equal(ansi[2].style.color, "rgb(12, 34, 56)", "ANSI truecolor should preserve RGB values");
	const customAnsi = parseEngineAnsi("\u001b[91mbright\u001b[0m", { brightRed: "#ff0066" });
	assert.equal(customAnsi[0].style.color, "#ff0066", "ANSI palette colors should be theme-overridable");
	assert.equal(parseEngineAnsi("\u001b[38;5;196m256-color")[0].style.color, "rgb(255, 0, 0)", "ANSI 256-color codes should map to the xterm palette");
	assert.equal(parseEngineAnsi("\u001b[4munderlined\u001b[0m")[0].style.textDecoration, "underline");
	assert.equal(parseEngineAnsi("safe \u001b[31mtext\u001b[0m")[0].text, "safe ");

	const [{ default: ReactMarkdown }, { default: remarkGfm }] = await Promise.all([
		import("react-markdown"),
		import("remark-gfm"),
	]);
	const gfm = `${normalizedNas}\n\n| Feature | Ready |\n| --- | --- |\n| Fences | yes |\n\n> durable quote\n\n- [x] parsed\n\n~~legacy~~`;
	const html = renderToStaticMarkup(React.createElement(ReactMarkdown, { remarkPlugins: [remarkGfm] }, gfm));
	assert.match(html, /<code>&lt;ROOT&gt;<\/code>/, "inline code must render semantically");
	assert.match(html, /<pre><code class="language-text">[\s\S]*├── storage/, "fenced code must preserve the NAS tree");
	assert.match(html, /<table>/, "GFM tables must render natively");
	assert.match(html, /<blockquote>/, "blockquotes must render natively");
	assert.match(html, /type="checkbox"[^>]*checked/, "GFM task lists must render checked state");
	assert.match(html, /<del>legacy<\/del>/, "GFM strikethrough must render semantically");

	const componentSource = fs.readFileSync(path.join(process.cwd(), "src", "engine", "components", "EngineMarkdown.tsx"), "utf8");
	const rendererSource = fs.readFileSync(path.join(process.cwd(), "src", "engine", "components", "EngineMarkdownRenderer.tsx"), "utf8");
	const serverSource = fs.readFileSync(path.join(process.cwd(), "src", "engine", "compiler", "EngineServerRenderer.tsx"), "utf8");
	const publicApiSource = fs.readFileSync(path.join(process.cwd(), "src", "engine", "index.ts"), "utf8");
	const linkSource = fs.readFileSync(path.join(process.cwd(), "src", "engine", "components", "EngineLink.tsx"), "utf8");
	const navSource = fs.readFileSync(path.join(process.cwd(), "src", "engine", "components", "EngineNav.tsx"), "utf8");
	const iconComponentSource = fs.readFileSync(path.join(process.cwd(), "src", "engine", "components", "EngineUrlIcon.tsx"), "utf8");
	const faviconRouteSource = fs.readFileSync(path.join(process.cwd(), "app", "%5Fstatic", "emd", "favicon", "route.ts"), "utf8");
	const markdownDocs = fs.readFileSync(path.join(process.cwd(), "docs", "engine-components", "enginemarkdown.md"), "utf8");
	assert.doesNotMatch(componentSource, /import ReactMarkdown/, "the compatibility adapter must not own the AST implementation");
	assert.match(componentSource, /EngineMarkdownRenderer/, "direct component imports must retain the shared renderer");
	assert.match(rendererSource, /import ReactMarkdown/);
	assert.match(rendererSource, /remarkPlugins=\{\[remarkGfm\]\}/);
	assert.match(rendererSource, /skipHtml/, "raw HTML must remain disabled");
	assert.match(rendererSource, /overflowX: "auto"/, "wide code and tables must scroll inside their container");
	assert.match(rendererSource, /safeMarkdownUrl/, "links and images must pass through the Engine URL policy");
	assert.match(rendererSource, /parseEngineAnsi/, "ANSI fenced blocks must use the safe ANSI parser");
	assert.match(rendererSource, /ansiPalette/, "ANSI colors must be configurable through the renderer API");
	assert.match(rendererSource, /markdownStyles/, "semantic Markdown styles must be overridable through the renderer API");
	assert.match(publicApiSource, /EngineMarkdownStyles/, "Markdown theme types must be publicly exported");
	assert.match(rendererSource, /"emd_show-url-icon": showUrlIcon = false/, "Markdown favicons must be opt-in by default");
	assert.match(rendererSource, /EngineUrlIcon/, "Markdown link rendering must include the favicon component");
	assert.match(linkSource, /"emd_show-url-icon": showUrlIcon/, "EngineLink must forward favicon props");
	assert.match(navSource, /emd_show-url-icon/, "EngineNav items must accept favicon props");
	assert.match(serverSource, /withUrlIcon/, "server-rendered schema links must support favicons");
	assert.match(iconComponentSource, /referrerPolicy="no-referrer"/, "favicon lookup must not receive a full-page referrer");
	assert.match(faviconRouteSource, /\\[NENC\\] Downloading private asset: favicon =/);
	assert.match(faviconRouteSource, /\\[NENC\\] DONE private asset: favicon =/);
	assert.match(faviconRouteSource, /\\[NENC\\] FAILED private asset: favicon =/);
	assert.match(faviconRouteSource, /MAX_ICON_BYTES/, "upstream icon bytes must have a size limit");

	assert.match(publicApiSource, /export { EngineUrlIcon }/, "the HTML/JSX favicon component must be exported");
	assert.match(markdownDocs, /External-link favicons/, "favicon defaults and usage must be documented");
	assert.match(serverSource, /collector\.add\(ENGINE_MARKDOWN_CSS\)/, "server rendering must collect Markdown CSS without a client effect");
	assert.match(serverSource, /case "markdown"/, "the Gen 3 server renderer must own schema Markdown nodes");

	console.log("EngineMarkdown CommonMark/GFM smoke: ok");
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
