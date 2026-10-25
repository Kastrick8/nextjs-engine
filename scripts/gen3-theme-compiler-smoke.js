"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const {
	canonicalJson,
	compileEngineThemeArtifacts,
	ETR_FORMAT,
} = require("../src/engine/compiler/EngineThemeCompiler");
const pluginCompilerLink = require("../src/engine/plugins/gen3ThemeCompiler");
assert.equal(pluginCompilerLink.compileEngineThemeArtifacts, compileEngineThemeArtifacts, "the Next.js plugin forwards to the dedicated EngineTheme compiler");

async function testPublicThemeApi() {
	const previousTsExtension = Module._extensions[".ts"];
	const previousTsxExtension = Module._extensions[".tsx"];
	const transpileThemeModule = (loadedModule, filePath) => {
		const sourceText = fs.readFileSync(filePath, "utf8");
		const transpiled = ts.transpileModule(sourceText, {
			compilerOptions: {
				module: ts.ModuleKind.CommonJS,
				target: ts.ScriptTarget.ES2020,
				jsx: ts.JsxEmit.ReactJSX,
			},
			fileName: filePath,
			reportDiagnostics: true,
		});
		const errors = (transpiled.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error);
		assert.deepEqual(errors, [], filePath + " must transpile without syntax diagnostics");
		loadedModule._compile(transpiled.outputText, filePath);
	};
	Module._extensions[".ts"] = transpileThemeModule;
	Module._extensions[".tsx"] = transpileThemeModule;

	try {
		const themePath = path.resolve(__dirname, "../src/engine/component/engineTheme/createTheme.ts");
		const resolverPath = path.resolve(__dirname, "../src/engine/component/engineTheme/resolveTheme.ts");
		const { createTheme, parseEngineThemeId } = require(themePath);
		const { resolveEngineThemeSchema } = require(resolverPath);
		const { compileEngineThemeFonts } = require(path.resolve(__dirname, "../src/engine/compiler/font/3/compiler.ts"));
		const { loadRemoteEngineTheme, clearRemoteEngineThemeCache, getRemoteEngineThemeCacheSize, unregisterRemoteEngineTheme } = require(path.resolve(__dirname, "../src/engine/component/engineTheme/remoteTheme.ts"));
		const {
			highlightEngineCode,
			listEngineHighlighterProviders,
			listEngineHighlighterLanguages,
			listEngineHighlighterThemes,
			registerEngineHighlighterProvider,
			unregisterEngineHighlighterProvider,
			normalizeEngineThemeColor,
			getEngineHighlighterColor,
			getEngineHighlighterPalette,
		} = require(path.resolve(__dirname, "../src/engine/component/engineTheme/highlighting.ts"));
		const { createShikiEngineHighlighterProvider } = require(path.resolve(__dirname, "../src/engine/component/engineTheme/shikiProvider.ts"));
		const {
			dispatchEngineThemeDataEvent,
			listEngineThemeDataHandlers,
			registerEngineThemeDataHandler,
			unregisterEngineThemeDataHandler,
		} = require(path.resolve(__dirname, "../src/engine/component/engineTheme/dataApi.ts"));
		const React = require("react");
		const { normalizeEngineMarkdownSource } = require(path.resolve(__dirname, "../src/engine/core/markdownParser.ts"));
		const { normalizeEngineThemeFontHref, normalizeEngineThemeFontHrefs } = require(path.resolve(__dirname, "../src/engine/component/engineTheme/fontUrls.ts"));
		const { flattenEngineThemeTokens, normalizeEngineThemeVariables } = require(path.resolve(__dirname, "../src/engine/component/engineTheme/tokens.ts"));
		const {
			renderEngineThemeTemplate,
			listEngineThemeTemplateAdapters,
			registerEngineThemeTemplateAdapter,
			unregisterEngineThemeTemplateAdapter,
		} = require(path.resolve(__dirname, "../src/engine/component/engineTheme/templates.tsx"));

		const definition = createTheme({
			id: "safe-theme",
			tokens: { colors: { text: "#fff" } },
			markdown: { variants: { dark: { defaults: { codeBackground: "#111" } } } },
		});
		assert.equal(definition.scope, "local", "scope defaults to local");
		assert.equal(Object.isFrozen(definition), true, "returned theme group is frozen");
		assert.equal(Object.isFrozen(definition.tokens.colors), true, "nested theme values are frozen");
		assert.deepEqual(parseEngineThemeId("mycoolthemes.markdown.1.2.560"), {
			groupId: "mycoolthemes", componentId: "markdown", subthemes: ["1", "2", "560"],
		});
		assert.throws(() => parseEngineThemeId("mycoolthemes.markdown.a.b.c.d"), /at most three subtheme segments/);
		assert.throws(() => createTheme({ id: "my.theme" }), /group ID without dots/);
		assert.throws(() => createTheme({ id: "function-theme", markdown: { build: () => true } }), /JSON data/);

		let getterCalled = false;
		const accessorTheme = {};
		Object.defineProperty(accessorTheme, "id", { enumerable: true, get() { getterCalled = true; return "unsafe"; } });
		assert.throws(() => createTheme(accessorTheme), /accessors/);
		assert.equal(getterCalled, false, "accessor validation must not execute the getter");

		assert.equal(normalizeEngineThemeFontHref("https://fonts.example.invalid/theme.css"), "https://fonts.example.invalid/theme.css");
		assert.equal(normalizeEngineThemeFontHref("/fonts/theme.css"), "/fonts/theme.css");
		assert.equal(normalizeEngineThemeFontHref("//evil.example.invalid/theme.css"), undefined, "protocol-relative font URLs are rejected");
		assert.equal(normalizeEngineThemeFontHref("http://fonts.example.invalid/theme.css"), undefined, "absolute font stylesheets require HTTPS");
		assert.equal(normalizeEngineThemeFontHref("javascript:alert(1)"), undefined, "font URLs cannot use executable schemes");
		assert.deepEqual(normalizeEngineThemeFontHrefs(["/fonts/theme.css", "/fonts/theme.css", "javascript:alert(1)", "https://fonts.example.invalid/theme.css"]), ["/fonts/theme.css", "https://fonts.example.invalid/theme.css"], "font stylesheet lists are filtered and deduplicated");
		const nestedFenceInfo = normalizeEngineMarkdownSource(":::info Example" + "\n" + "```text" + "\n" + "::: not a closing directive" + "\n" + "```" + "\n" + "Body" + "\n" + ":::");
		assert.ok(nestedFenceInfo.includes("> ::: not a closing directive"), "a directive inside a nested code fence is not treated as the block close");
		assert.ok(nestedFenceInfo.includes("> Body"), "text after a nested code fence stays inside the info block");
		assert.deepEqual(flattenEngineThemeTokens({ colors: { accent: "#826f9b", surface: "color(srgb 0.1 0.2 0.3)" }, typography: { bodyFontFamily: "Inter, system-ui, sans-serif", scale: 1.25, unsafe: "red; --escape: true", tracked: "url(https://evil.invalid/x)" }, ignored: true }), { "--e-theme-colors-accent": "#826f9b", "--e-theme-colors-surface": "color(srgb 0.1 0.2 0.3)", "--e-theme-typography-body-font-family": "Inter, system-ui, sans-serif", "--e-theme-typography-scale": "1.25" }, "safe semantic tokens are flattened to bounded CSS variables");
		assert.deepEqual(normalizeEngineThemeVariables({ accent: "#fff", "--legacy-gap": "1rem", unsafe: "red; color: black", tracked: "url(https://evil.invalid/x)" }), { "--accent": "#fff", "--legacy-gap": "1rem" }, "legacy CSS vars preserve safe values and discard injection vectors");
		const normalizedInfo = normalizeEngineMarkdownSource(":::warning Build note\nRead this carefully.\n:::");
		assert.ok(normalizedInfo.includes("> [!ENGINE-INFO warning] Build note"), "info blocks normalize to a safe blockquote marker");
		assert.ok(normalizedInfo.includes("> Read this carefully."), "info block body remains Markdown text");
		const fencedInfo = normalizeEngineMarkdownSource("```text\n:::info this is code\n```");
		assert.ok(fencedInfo.includes(":::info this is code"), "directives inside code fences remain code");
		const highlighted = highlightEngineCode(
			"const value: number = 42; // safe",
			"typescript",
		);
		assert.ok(highlighted, "the lightweight provider recognizes TypeScript");
		assert.equal(highlighted.map((token) => token.text).join(""), "const value: number = 42; // safe",
			"highlighting preserves every source character");
		assert.ok(highlighted.some((token) => token.kind === "keyword" && token.text === "const"));
		assert.ok(highlighted.some((token) => token.kind === "type" && token.text === "number"));
		assert.ok(highlighted.some((token) => token.kind === "number" && token.text === "42"));
		assert.ok(highlighted.some((token) => token.kind === "comment" && token.text.includes("safe")));
		assert.ok(highlightEngineCode("console.log(1)", "nodejs"), "Node.js aliases to the JavaScript grammar");
		assert.equal(highlightEngineCode("console.log(1)", "ansi"), null, "ANSI is never passed through syntax highlighting");
		assert.equal(highlightEngineCode("x = 1", "not-a-real-language"), null, "unknown languages fall back to plain text");
		assert.ok(listEngineHighlighterLanguages().includes("typescript"));
		assert.ok(listEngineHighlighterProviders().some((provider) => provider.id === "engine-lite"));
		assert.equal(normalizeEngineThemeColor("#1a2b3c"), "#1a2b3c");
		assert.equal(normalizeEngineThemeColor("rgb(30, 40, 50)"), "rgb(30, 40, 50)");
		assert.equal(normalizeEngineThemeColor("color(srgb 0.2 0.4 0.8 / 0.5)"), "color(srgb 0.2 0.4 0.8 / 0.5)");
		assert.equal(normalizeEngineThemeColor("rgb(999, 10, 20)"), undefined, "RGB channels must be in range");
		assert.equal(normalizeEngineThemeColor("color(srgb 2 0 0)"), undefined, "sRGB channels must be in range");
		assert.equal(normalizeEngineThemeColor("rgba(10, 20, 30, 200%)"), undefined, "alpha must be in range");
		assert.equal(normalizeEngineThemeColor("url(javascript:alert(1))"), undefined);
		assert.deepEqual(listEngineHighlighterThemes().map((theme) => theme.id), ["vscode-dark", "vscode-light"]);
		assert.equal(getEngineHighlighterColor("keyword", {
			theme: "vscode-dark",
			palette: { foreground: "#fafafa" },
		}), "#fafafa", "custom palettes replace provider colors for all unspecified categories");
		const languagePaletteConfig = {
			palette: { foreground: "#eeeeee" },
			languagePalettes: {
				typescript: { foreground: "#cccccc", keyword: "#ff00ff" },
				javascript: { foreground: "#dddddd" },
				nodejs: { foreground: "#aaffaa" },
			},
		};
		assert.equal(getEngineHighlighterPalette(languagePaletteConfig, "typescript").foreground, "#cccccc");
		assert.equal(getEngineHighlighterPalette(languagePaletteConfig, "ts").foreground, "#cccccc", "ts aliases to the TypeScript palette");
		assert.equal(getEngineHighlighterPalette(languagePaletteConfig, "nodejs").foreground, "#aaffaa", "Node.js can override JavaScript’s grammar palette");
		assert.equal(getEngineHighlighterPalette(languagePaletteConfig, "javascript").foreground, "#dddddd");
		assert.equal(getEngineHighlighterPalette(languagePaletteConfig, "python").foreground, "#eeeeee", "unconfigured languages use the shared palette");
		const customProvider = {
			id: "smoke-provider",
			name: "Smoke Provider",
			languages: ["json"],
			highlight: (code) => [{ kind: "plain", text: code }],
		};
		registerEngineHighlighterProvider(customProvider);
		assert.ok(listEngineHighlighterProviders().some((provider) => provider.id === "smoke-provider"));
		assert.deepEqual(highlightEngineCode('{"ok":true}', "json", { provider: "smoke-provider" }), [
			{ kind: "plain", text: '{"ok":true}' },
		]);
		assert.equal(unregisterEngineHighlighterProvider("smoke-provider"), true);

		const shikiProvider = createShikiEngineHighlighterProvider({
			getLoadedLanguages: () => ["typescript"],
			getLoadedThemes: () => ["github-dark", "github-light"],
			codeToTokens(code, options) {
				assert.equal(options.includeExplanation, true, "the TextMate adapter requests token scopes");
				assert.equal(options.lang, "typescript");
				assert.ok(["github-dark", "github-light"].includes(options.theme));
				const firstLine = [
					{ content: "const", color: "#569cd6", explanation: [{ scopes: [{ scopeName: "keyword.control.ts" }] }] },
					{ content: " value = ", color: "#d4d4d4", explanation: [{ scopes: [{ scopeName: "source.ts" }] }] },
					{ content: "42", color: "#b5cea8", explanation: [{ scopes: [{ scopeName: "constant.numeric.ts" }] }] },
					{ content: ";", color: "#d4d4d4", explanation: [{ scopes: [{ scopeName: "punctuation.terminator.statement.ts" }] }] },
				];
				return { tokens: code.endsWith("\n") ? [firstLine, []] : [firstLine] };
			},
		}, { id: "shiki-smoke", defaultTheme: "github-dark" });
		registerEngineHighlighterProvider(shikiProvider);
		const shikiSource = "const value = 42;\n";
		const shikiTokens = highlightEngineCode(shikiSource, "typescript", {
			provider: "shiki-smoke",
			theme: "github-light",
		});
		assert.ok(shikiTokens, "the initialized Shiki adapter produces safe tokens");
		assert.equal(shikiTokens.map((token) => token.text).join(""), shikiSource,
			"the TextMate adapter preserves source whitespace and line endings exactly");
		assert.equal(shikiTokens.find((token) => token.text === "const").kind, "keyword");
		assert.equal(shikiTokens.find((token) => token.text === "42").kind, "number");
		assert.equal(shikiTokens.find((token) => token.text === "const").color, "#569cd6");
		assert.ok(listEngineHighlighterThemes("shiki-smoke").some((theme) => theme.id === "github-light"));
		assert.ok(highlightEngineCode(shikiSource, "typescript", {
			provider: "shiki-smoke",
			theme: "github-light",
			palette: { foreground: "#eeeeee" },
		}), "custom palettes remain compatible with TextMate providers");
		assert.equal(unregisterEngineHighlighterProvider("shiki-smoke"), true);

		let allocatedEvent;
		const existingContext = { label: "Name" };
		const incomingContext = { icon: "sort" };
		const dataHandler = (event) => {
			allocatedEvent = event;
			return { operation: "append", value: event.context.incoming };
		};
		assert.throws(() => registerEngineThemeDataHandler("constructor", dataHandler), /cannot be reserved names/);
		registerEngineThemeDataHandler("smoke-theme.table-join", dataHandler);
		assert.ok(listEngineThemeDataHandlers().includes("smoke-theme.table-join"));
		assert.deepEqual(dispatchEngineThemeDataEvent("join:left", {
			handlerId: "smoke-theme.table-join",
		}, {
			themeId: "theme-runtime-smoke.markdown.dark",
			componentId: "markdown",
			slotId: "table.header",
			direction: "left",
			existing: existingContext,
			incoming: incomingContext,
		}), { operation: "append", value: { icon: "sort" } });
		assert.equal(allocatedEvent.type, "join:left");
		assert.equal(Object.isFrozen(allocatedEvent), true);
		assert.equal(Object.isFrozen(allocatedEvent.context), true);
		assert.equal(Object.isFrozen(allocatedEvent.context.existing), true);
		existingContext.label = "mutated after dispatch";
		incomingContext.icon = "changed";
		assert.equal(allocatedEvent.context.existing.label, "Name", "handler context is isolated from later caller mutation");
		assert.equal(allocatedEvent.context.incoming.icon, "sort", "nested event payloads are cloned and frozen");
		assert.throws(() => dispatchEngineThemeDataEvent("join:left", "missing-handler", {
			themeId: "theme-runtime-smoke.markdown.dark",
			componentId: "markdown",
			slotId: "table.header",
		}), /is not registered/);
		assert.throws(() => dispatchEngineThemeDataEvent("join:left", "smoke-theme.table-join", {
			themeId: "theme-runtime-smoke.markdown.dark",
			componentId: "markdown",
			slotId: "table.header",
			direction: "right",
		}), /direction must match/);
		assert.throws(() => dispatchEngineThemeDataEvent("join:left", "smoke-theme.table-join", {
			themeId: "theme-runtime-smoke.markdown.dark",
			componentId: "markdown",
			slotId: "table.header",
			incoming: { run: () => true },
		}), /must be JSON data/);
		assert.equal(unregisterEngineThemeDataHandler("smoke-theme.table-join"), true);

		const schemaTemplate = {
			schema: {
				type: "stack",
				props: { direction: "row", gap: "6px", align: "center", style: { background: "{{codeBackground}}" } },
				children: [
					{ type: "slot", props: { name: "leading" } },
					{ type: "slot", props: { name: "content" } },
					{ type: "text", props: { content: "{{language}}" } },
				],
			},
		};
		const schemaTemplateResult = renderEngineThemeTemplate(schemaTemplate, {
			componentId: "markdown",
			block: "tableHeader",
			language: "typescript",
			codeBackground: "#123456",
			slots: {
				leading: React.createElement("b", null, "icon"),
				content: React.createElement("span", null, "Feature"),
			},
		});
		assert.equal(schemaTemplateResult.type, "div", "Engine Schema templates render as safe React elements");
		assert.equal(schemaTemplateResult.props.style.flexDirection, "row");
		assert.equal(schemaTemplateResult.props.style.gap, "6px");
		const slotElement = React.createElement("span", null, "prebuilt slot");
		const slottedTemplate = renderEngineThemeTemplate({ schema: { type: "box", children: [{ type: "slot", props: { name: "content" } }] } }, { slots: { content: slotElement } });
		assert.equal(slottedTemplate.props.children[0].key, "theme-template.0", "trusted React slot elements receive stable template keys");
		const slottedArrayTemplate = renderEngineThemeTemplate({ schema: { type: "box", children: [{ type: "slot", props: { name: "content" } }] } }, { slots: { content: [React.createElement("span", null, "first"), React.createElement("span", null, "second")] } });
		assert.equal(slottedArrayTemplate.props.children[0].type, React.Fragment, "array-valued slots get a keyed fragment wrapper");
		assert.ok(slottedArrayTemplate.props.children[0].props.children.every((child) => child.key !== null), "array slot children receive stable keys");
		assert.equal(schemaTemplateResult.props.style.background, "#123456", "schema templates can bind safe block style values");
		assert.equal(schemaTemplateResult.props.children[2].props.children, "typescript");
		const fallbackTemplate = renderEngineThemeTemplate({
			schema: {
				type: "box",
				props: { style: { background: "url(https://unsafe.invalid/pixel)" } },
				children: ["literal <script> text"],
			},
		}, {});
		assert.equal(fallbackTemplate.props.style.background, undefined, "template CSS URLs are dropped");
		assert.deepEqual(fallbackTemplate.props.children, ["literal <script> text"], "template text stays in React children and is never interpreted as raw HTML");
		assert.equal(renderEngineThemeTemplate({
			schema: { type: "box", props: { dangerouslySetInnerHTML: { __html: "x" } } },
		}, {}), undefined, "raw HTML and dangerous props invalidate a template");
		const localAdapter = (props) => React.createElement("aside", null, props.label);
		registerEngineThemeTemplateAdapter("smoke.markdown.header", localAdapter);
		assert.ok(listEngineThemeTemplateAdapters().includes("smoke.markdown.header"));
		const adapterElement = renderEngineThemeTemplate({ adapterId: "smoke.markdown.header" }, { label: "custom" });
		assert.equal(adapterElement.type, localAdapter, "only the explicitly registered local adapter is returned");
		assert.equal(unregisterEngineThemeTemplateAdapter("smoke.markdown.header"), true);
		assert.equal(renderEngineThemeTemplate({ adapterId: "missing.remote.adapter" }, {}), undefined, "unregistered adapters fail closed");

		createTheme({
			id: "theme-runtime-smoke",
			scope: "global",
			vars: { "--runtime-accent": "#aabbcc" },
			fonts: ["https://fonts.example.invalid/theme.css"],
			markdown: {
				defaults: {
					codeBackground: "#111111",
					codeColor: "#eeeeee",
				},
				styles: {
					codeBlock: { borderRadius: "10px", color: "#e0e0e0" },
				},
				templates: { tableHeader: { schema: { type: "slot", props: { name: "content" } } } },
				variants: {
					dark: {
						defaults: { codeBackground: "#222222" },
						styles: { codeBlock: { boxShadow: "0 0 2px #fff" } },
					},
				},
			},
		});
		const pageSchema = {
			theme: { id: "theme-runtime-smoke.markdown.dark" },
			root: {
				type: "section",
				children: [{
					type: "markdown",
					props: {
						content: "test",
						codeBackground: "#333333",
						markdownStyles: { codeBlock: { padding: "8px" } },
					},
				}],
			},
		};
		const resolvedPage = resolveEngineThemeSchema(pageSchema);
		assert.equal(resolvedPage.theme.id, "theme-runtime-smoke", "qualified references retain the group theme for CSS/fonts");
		assert.equal(resolvedPage.theme.vars["--runtime-accent"], "#aabbcc");
		assert.equal(resolvedPage.theme.fonts.length, 1);
		const markdownProps = resolvedPage.root.children[0].props;
		assert.equal(markdownProps.codeBackground, "#333333", "explicit node props beat theme defaults");
		assert.equal(markdownProps.codeColor, "#eeeeee", "base theme defaults survive variant overrides");
		assert.equal(markdownProps.markdownStyles.codeBlock.borderRadius, "10px");
		assert.equal(markdownProps.markdownStyles.codeBlock.boxShadow, "0 0 2px #fff");
		assert.equal(markdownProps.markdownStyles.codeBlock.padding, "8px", "local style-slot properties merge last");
		assert.equal(markdownProps.themeTemplates.tableHeader.schema.type, "slot", "theme templates reach Markdown props through ID resolution");

		const localTheme = createTheme({
			id: "local-theme-runtime-smoke",
			scope: "local",
			markdown: { defaults: { codeColor: "#abcdef" } },
		});
		const previousNodeEnv = process.env.NODE_ENV;
		try {
			process.env.NODE_ENV = "production";
			const productionFontTheme = createTheme({
				id: "production-font-theme-smoke",
				scope: "global",
				fonts: ["https://fonts.googleapis.com/css2?family=Fixture"],
			});
			assert.deepEqual(productionFontTheme.fonts, ["/nextjs-engine/fonts/production-font-theme-smoke.css"],
				"production local/global themes use the NENC-local stylesheet path");
		} finally {
			if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
			else process.env.NODE_ENV = previousNodeEnv;
		}
		const localPage = resolveEngineThemeSchema({
			theme: localTheme,
			root: { type: "markdown", props: { content: "local" } },
		});
		assert.equal(localPage.root.props.codeColor, "#abcdef", "a local theme definition can be applied directly");

		assert.throws(() => resolveEngineThemeSchema({
			theme: { id: "missing-theme.markdown.dark" },
			root: { type: "markdown", props: { content: "missing" } },
		}), /not globally registered/);
		assert.throws(() => resolveEngineThemeSchema({
			theme: { id: "remote-theme.markdown.dark", sourceUrl: "https://example.invalid/theme.etr" },
			root: { type: "markdown", props: { content: "remote" } },
		}), /loadRemoteEngineTheme/);

		const remoteContent = {
			id: "remote-smoke",
			scope: "remote",
			name: "Remote smoke theme",
			vars: { "--remote-accent": "#aabbcc" },
			fonts: ["/engine-theme-fonts.css"],
			markdown: {
				defaults: { codeColor: "#ffeeaa" },
				variants: { dark: { defaults: { codeBackground: "#121212" } } },
			},
		};
		const remotePayload = {
			format: "nextjs-engine-theme",
			formatVersion: 1,
			generatedBy: "NENC",
			id: "remote-smoke",
			createdWith: { nextjs: "16.4.2", nextjsEngine: "3.0.0-alpha.1" },
			content: remoteContent,
		};
		const remoteTextFor = (id, content) => {
			const payload = { ...remotePayload, id, content };
			const digest = crypto.createHash("sha256").update(canonicalJson(payload), "utf8").digest("hex");
			return JSON.stringify({ ...payload, sha256: digest });
		};
		const remoteText = remoteTextFor("remote-smoke", remoteContent);
		let remoteFetchCalls = 0;
		const remoteFetch = async (_url, init) => {
			remoteFetchCalls += 1;
			assert.equal(init.redirect, "error", "remote ETR redirects are disabled");
			assert.equal(init.credentials, "omit", "remote ETR credentials are never sent");
			return new Response(remoteText, { status: 200, headers: { "content-type": "application/json" } });
		};
		const remoteOptions = {
			allowedOrigins: ["https://themes.example.com"],
			expectedNextjsVersion: "16.4.2",
			expectedEngineVersion: "3.0.0-alpha.1",
			expectedId: "remote-smoke",
			fetchImpl: remoteFetch,
		};
		const loadedRemote = await loadRemoteEngineTheme("https://themes.example.com/dark.etr", remoteOptions);
		assert.equal(loadedRemote.scope, "remote");
		assert.equal(Object.isFrozen(loadedRemote), true, "loaded remote theme definitions are frozen");
		assert.equal(loadedRemote.vars["--remote-accent"], "#aabbcc");
		assert.deepEqual(loadedRemote.fonts, ["https://themes.example.com/engine-theme-fonts.css"], "remote font URLs are normalized to an allowlisted HTTPS origin");
		const cacheHit = await loadRemoteEngineTheme("https://themes.example.com/dark.etr", remoteOptions);
		assert.equal(cacheHit, loadedRemote, "repeated loads reuse the in-process cache entry");
		assert.equal(remoteFetchCalls, 1, "cache hits do not issue another request");
		const resolvedRemotePage = resolveEngineThemeSchema({
			theme: { id: "remote-smoke.markdown.dark", scope: "remote" },
			root: { type: "markdown", props: { content: "remote" } },
		});
		assert.equal(resolvedRemotePage.root.props.codeColor, "#ffeeaa", "loaded remote theme defaults are available by ID");
		assert.equal(resolvedRemotePage.root.props.codeBackground, "#121212", "loaded remote subthemes resolve");
		await assert.rejects(
			loadRemoteEngineTheme("https://attacker.example.com/theme.etr", remoteOptions),
			/not in allowedOrigins/,
		);
		assert.equal(remoteFetchCalls, 1, "disallowed origins are rejected before fetch");

		await assert.rejects(
			loadRemoteEngineTheme("https://127.0.0.1/private.etr", {
				...remoteOptions,
				allowedOrigins: ["https://127.0.0.1"],
			}),
			/local\/private hosts are not permitted/,
		);
		await assert.rejects(
			loadRemoteEngineTheme("https://localhost/private.etr", {
				...remoteOptions,
				allowedOrigins: ["https://localhost"],
			}),
			/local\/private hosts are not permitted/,
		);

		const corruptRemoteOptions = {
			...remoteOptions,
			expectedId: "remote-corrupt",
			fetchImpl: async () => new Response(JSON.stringify({
				...remotePayload,
				id: "remote-corrupt",
				content: { ...remoteContent, id: "remote-corrupt" },
				sha256: "0".repeat(64),
			}), { status: 200, headers: { "content-type": "application/json" } }),
		};
		await assert.rejects(
			loadRemoteEngineTheme("https://themes.example.com/corrupt.etr", corruptRemoteOptions),
			/SHA-256 verification failed/,
		);
		await assert.rejects(
			loadRemoteEngineTheme("https://themes.example.com/wrong-version.etr", {
				...remoteOptions,
				expectedNextjsVersion: "16.4.3",
			}),
			/version mismatch/,
		);
		const unsafeCssContent = { ...remoteContent, id: "remote-unsafe-css", vars: { "--remote-value": "red; background:url(https://evil.invalid/x)" } };
		await assert.rejects(
			loadRemoteEngineTheme("https://themes.example.com/unsafe-css.etr", {
				...remoteOptions, expectedId: "remote-unsafe-css",
				fetchImpl: async () => new Response(remoteTextFor("remote-unsafe-css", unsafeCssContent), { status: 200, headers: { "content-type": "application/json" } }),
			}),
			/unsafe CSS\/network primitive|unsafe CSS value/,
		);
		const unsafeFontContent = { ...remoteContent, id: "remote-unsafe-font", fonts: ["https://evil.invalid/fonts.css"] };
		await assert.rejects(
			loadRemoteEngineTheme("https://themes.example.com/unsafe-font.etr", {
				...remoteOptions, expectedId: "remote-unsafe-font",
				fetchImpl: async () => new Response(remoteTextFor("remote-unsafe-font", unsafeFontContent), { status: 200, headers: { "content-type": "application/json" } }),
			}),
			/font stylesheet origin must be HTTPS and included in allowedOrigins/,
		);
		const unsafeNestedStyleContent = {
			...remoteContent,
			id: "remote-unsafe-nested-style",
			markdown: { defaults: { codeBackground: "url(https://evil.invalid/pixel)" } },
		};
		await assert.rejects(
			loadRemoteEngineTheme("https://themes.example.com/unsafe-style.etr", {
				...remoteOptions,
				expectedId: "remote-unsafe-nested-style",
				fetchImpl: async () => new Response(remoteTextFor("remote-unsafe-nested-style", unsafeNestedStyleContent), {
					status: 200, headers: { "content-type": "application/json" },
				}),
			}),
			/unsafe CSS\/network primitive/,
		);
		const unsafeGlobalStylesContent = { ...remoteContent, id: "remote-unsafe-css-text", globalStyles: "body { display:none }" };
		await assert.rejects(
			loadRemoteEngineTheme("https://themes.example.com/unsafe-global-styles.etr", {
				...remoteOptions, expectedId: "remote-unsafe-css-text",
				fetchImpl: async () => new Response(remoteTextFor("remote-unsafe-css-text", unsafeGlobalStylesContent), { status: 200, headers: { "content-type": "application/json" } }),
			}),
			/globalStyles are disabled/,
		);

		assert.ok(getRemoteEngineThemeCacheSize() >= 1);
		clearRemoteEngineThemeCache();
		assert.equal(getRemoteEngineThemeCacheSize(), 0, "remote response cache can be cleared");
		assert.equal(unregisterRemoteEngineTheme("remote-smoke"), true, "verified remote definitions can be unregistered");
		assert.throws(() => resolveEngineThemeSchema({
			theme: { id: "remote-smoke.markdown.dark", scope: "remote" },
			root: { type: "markdown" },
		}), /loadRemoteEngineTheme/);

		const fontRoot = fs.mkdtempSync(path.join(os.tmpdir(), "nextjs-engine-font-cache-smoke-"));
		const fontThemeDir = path.join(fontRoot, ".nextjs-engine", "gen3", "theme");
		fs.mkdirSync(fontThemeDir, { recursive: true });
		fs.writeFileSync(path.join(fontThemeDir, "font-smoke.etr"), JSON.stringify({
			id: "font-smoke",
			content: { id: "font-smoke", scope: "global", fonts: ["https://fonts.googleapis.com/css2?family=Fixture"] },
		}));
		const fontUrls = [];
		const fakeFontCss = "@font-face{font-family:'Fixture';font-style:normal;font-weight:400;font-display:swap;src:url(https://fonts.gstatic.com/s/fixture/font.woff2) format('woff2');unicode-range:U+0000-00FF;}";
		const fakeFontBytes = Buffer.from("fake-woff2-fixture-font");
		const fakeFontFetch = async (url, init) => {
			fontUrls.push(url);
			assert.equal(init.redirect, "error");
			assert.equal(init.credentials, "omit");
			if (url === "https://fonts.googleapis.com/css2?family=Fixture") {
				return new Response(fakeFontCss, { status: 200, headers: { "content-type": "text/css; charset=utf-8" } });
			}
			if (url === "https://fonts.gstatic.com/s/fixture/font.woff2") {
				return new Response(fakeFontBytes, { status: 200, headers: { "content-type": "font/woff2" } });
			}
			throw new Error("Unexpected fake font URL: " + url);
		};
		try {
			const firstFontBuild = await compileEngineThemeFonts(fontRoot, [
				{ id: "font-smoke", fileName: "font-smoke.etr" },
			], { production: true, fetchImpl: fakeFontFetch, cacheTtlMs: 60000 });
			assert.equal(firstFontBuild.themeCount, 1);
			assert.equal(firstFontBuild.downloadedFonts, 1);
			assert.equal(firstFontBuild.fallbackThemes, 0);
			assert.equal(fontUrls.length, 2, "only the stylesheet and selected font are fetched");
			const localCssPath = path.join(fontRoot, "public", "nextjs-engine", "fonts", "font-smoke.css");
			const localCss = fs.readFileSync(localCssPath, "utf8");
			assert.ok(localCss.includes("/nextjs-engine/fonts/font-"), "generated CSS points at a local content-addressed font");
			assert.ok(!localCss.includes("fonts.gstatic.com"), "generated CSS no longer points at the external font host");
			const emittedFont = fs.readdirSync(path.dirname(localCssPath)).find((name) => /^font-[a-f0-9]{64}\.woff2$/.test(name));
			assert.ok(emittedFont, "font file names use a content hash rather than source names");
			assert.equal(fs.readFileSync(path.join(path.dirname(localCssPath), emittedFont)).toString(), fakeFontBytes.toString());
			const secondFontBuild = await compileEngineThemeFonts(fontRoot, [
				{ id: "font-smoke", fileName: "font-smoke.etr" },
			], { production: true, fetchImpl: async () => { throw new Error("cache hit must not fetch"); }, cacheTtlMs: 60000 });
			assert.equal(secondFontBuild.cacheHits, 1);
			assert.equal(fontUrls.length, 2, "a warm production build does not refetch fonts");

			const offlineBuild = await compileEngineThemeFonts(fontRoot, [
				{ id: "font-smoke", fileName: "font-smoke.etr" },
			], {
				production: true,
				offline: true,
				fetchImpl: async () => { throw new Error("offline mode must never fetch"); },
				cacheTtlMs: 60000,
			});
			assert.equal(offlineBuild.cacheHits, 1, "offline mode reuses a valid fresh local cache");
			assert.equal(fontUrls.length, 2, "offline cache reuse makes no remote requests");

			const fontManifestPath = path.join(fontRoot, ".nextjs-engine", ".cache", "gen3", "fonts", "manifest.json");
			const expiredManifest = JSON.parse(fs.readFileSync(fontManifestPath, "utf8"));
			expiredManifest.themes["font-smoke"].updatedAt = 0;
			expiredManifest.themes["font-smoke"].fontAssets.forEach((asset) => { asset.updatedAt = 0; });
			fs.writeFileSync(fontManifestPath, JSON.stringify(expiredManifest, null, 2));
			const expiredFontBuild = await compileEngineThemeFonts(fontRoot, [
				{ id: "font-smoke", fileName: "font-smoke.etr" },
			], { production: true, fetchImpl: fakeFontFetch, cacheTtlMs: 1 });
			assert.equal(expiredFontBuild.downloadedFonts, 1, "expired URL-based font entries are refreshed instead of reused forever");
			assert.equal(fontUrls.length, 4, "expiry refresh re-fetches the stylesheet and font file");
			const previousNodeEnvForFonts = process.env.NODE_ENV;
			try {
				process.env.NODE_ENV = "development";
				const devFontBuild = await compileEngineThemeFonts(fontRoot, [
					{ id: "font-smoke", fileName: "font-smoke.etr" },
				], { fetchImpl: async () => { throw new Error("dev must not fetch"); } });
				assert.equal(devFontBuild.skipped, true, "development never fetches or writes font assets");
			} finally {
				if (previousNodeEnvForFonts === undefined) delete process.env.NODE_ENV;
				else process.env.NODE_ENV = previousNodeEnvForFonts;
			}

			const writeFontFixture = (id, sourceUrl) => {
				fs.writeFileSync(path.join(fontThemeDir, id + ".etr"), JSON.stringify({
					id,
					content: { id, scope: "global", fonts: [sourceUrl] },
				}));
			};

			const previousProviderCssOrigins = process.env.ENGINE_THEME_FONT_CSS_ORIGINS;
			const previousProviderFileOrigins = process.env.ENGINE_THEME_FONT_FILE_ORIGINS;
			try {
				process.env.ENGINE_THEME_FONT_CSS_ORIGINS = "https://fonts.fixture.example.com";
				process.env.ENGINE_THEME_FONT_FILE_ORIGINS = "https://cdn.fixture.example.com";
				writeFontFixture("provider-font", "https://fonts.fixture.example.com/css?family=Fixture");
				const providerCss = fakeFontCss.replace("https://fonts.gstatic.com/s/fixture/font.woff2", "https://cdn.fixture.example.com/s/fixture/font.woff2");
				const providerBuild = await compileEngineThemeFonts(fontRoot, [
					{ id: "provider-font", fileName: "provider-font.etr" },
				], {
					production: true,
					lookupImpl: async () => [{ address: "93.184.216.34", family: 4 }],
					fetchImpl: async (url, init) => {
						assert.equal(init.redirect, "error");
						if (url === "https://fonts.fixture.example.com/css?family=Fixture") {
							return new Response(providerCss, { status: 200, headers: { "content-type": "text/css; charset=utf-8" } });
						}
					if (url === "https://cdn.fixture.example.com/s/fixture/font.woff2") {
							return new Response(fakeFontBytes, { status: 200, headers: { "content-type": "font/woff2" } });
						}
					throw new Error("Unexpected non-Google provider URL: " + url);
					},
				});
				assert.equal(providerBuild.downloadedFonts, 1, "explicitly allowed non-Google CSS/font origins are compiled locally");
				const providerLocalCss = fs.readFileSync(path.join(fontRoot, "public", "nextjs-engine", "fonts", "provider-font.css"), "utf8");
				assert.ok(providerLocalCss.includes("/nextjs-engine/fonts/font-"));
				assert.ok(!providerLocalCss.includes("fixture.example.com"), "provider CSS emits only local font URLs");
			} finally {
				if (previousProviderCssOrigins === undefined) delete process.env.ENGINE_THEME_FONT_CSS_ORIGINS;
				else process.env.ENGINE_THEME_FONT_CSS_ORIGINS = previousProviderCssOrigins;
				if (previousProviderFileOrigins === undefined) delete process.env.ENGINE_THEME_FONT_FILE_ORIGINS;
				else process.env.ENGINE_THEME_FONT_FILE_ORIGINS = previousProviderFileOrigins;
			}
			const previousBunnyCssOrigins = process.env.ENGINE_THEME_FONT_CSS_ORIGINS;
			const previousBunnyFileOrigins = process.env.ENGINE_THEME_FONT_FILE_ORIGINS;
			try {
				process.env.ENGINE_THEME_FONT_CSS_ORIGINS = "https://fonts.bunny.net";
				process.env.ENGINE_THEME_FONT_FILE_ORIGINS = "https://fonts.bunny.net";
				writeFontFixture("bunny-fixture", "https://fonts.bunny.net/css?family=BunnyFixture:400");
				const bunnyFixtureCss = fakeFontCss
					.replace("Fixture", "BunnyFixture")
					.replace("https://fonts.gstatic.com/s/fixture/font.woff2", "https://fonts.bunny.net/files/fixture.woff2");
				const bunnyFixtureBuild = await compileEngineThemeFonts(fontRoot, [
					{ id: "bunny-fixture", fileName: "bunny-fixture.etr" },
				], {
					production: true,
					lookupImpl: async () => [{ address: "93.184.216.34", family: 4 }],
					fetchImpl: async (url, init) => {
						assert.equal(init.redirect, "error");
						if (url === "https://fonts.bunny.net/css?family=BunnyFixture:400") {
							return new Response(bunnyFixtureCss, { status: 200, headers: { "content-type": "text/css; charset=utf-8" } });
						}
						if (url === "https://fonts.bunny.net/files/fixture.woff2") {
							return new Response(fakeFontBytes, { status: 200, headers: { "content-type": "font/woff2" } });
						}
						throw new Error("Unexpected Bunny Fonts fixture URL: " + url);
					},
				});
				assert.equal(bunnyFixtureBuild.downloadedFonts, 1, "Bunny Fonts-style same-origin assets compile to local files");
				const bunnyCssPath = path.join(fontRoot, "public", "nextjs-engine", "fonts", "bunny-fixture.css");
				const bunnyCss = fs.readFileSync(bunnyCssPath, "utf8");
				assert.ok(!bunnyCss.includes("fonts.bunny.net"), "Bunny fixture output contains only local font URLs");
			} finally {
				if (previousBunnyCssOrigins === undefined) delete process.env.ENGINE_THEME_FONT_CSS_ORIGINS;
				else process.env.ENGINE_THEME_FONT_CSS_ORIGINS = previousBunnyCssOrigins;
				if (previousBunnyFileOrigins === undefined) delete process.env.ENGINE_THEME_FONT_FILE_ORIGINS;
				else process.env.ENGINE_THEME_FONT_FILE_ORIGINS = previousBunnyFileOrigins;
			}
			writeFontFixture("blocked-font", "https://untrusted.example/fonts.css");
			const blockedFallback = await compileEngineThemeFonts(fontRoot, [
				{ id: "blocked-font", fileName: "blocked-font.etr" },
			], {
				production: true,
				fetchImpl: async () => { throw new Error("unapproved origin must be rejected before fetch"); },
			});
			assert.equal(blockedFallback.fallbackThemes, 1);
			const blockedCss = fs.readFileSync(path.join(fontRoot, "public", "nextjs-engine", "fonts", "blocked-font.css"), "utf8");
			assert.ok(!blockedCss.includes("untrusted.example") && !blockedCss.includes("@import"),
				"failure fallback never emits a browser @import for an unapproved font origin");

			const previousCssOrigins = process.env.ENGINE_THEME_FONT_CSS_ORIGINS;
			try {
				process.env.ENGINE_THEME_FONT_CSS_ORIGINS = "https://127.0.0.1";
				writeFontFixture("private-font", "https://127.0.0.1/fonts.css");
				const privateFallback = await compileEngineThemeFonts(fontRoot, [
					{ id: "private-font", fileName: "private-font.etr" },
				], {
					production: true,
					fetchImpl: async () => { throw new Error("private origin must be rejected before fetch"); },
				});
				assert.equal(privateFallback.fallbackThemes, 1);
				const privateCss = fs.readFileSync(path.join(fontRoot, "public", "nextjs-engine", "fonts", "private-font.css"), "utf8");
				assert.ok(!privateCss.includes("127.0.0.1") && !privateCss.includes("@import"),
					"private-host rejection also applies to browser fallback CSS");
			} finally {
				if (previousCssOrigins === undefined) delete process.env.ENGINE_THEME_FONT_CSS_ORIGINS;
				else process.env.ENGINE_THEME_FONT_CSS_ORIGINS = previousCssOrigins;
			}

			writeFontFixture("strict-font", "https://fonts.googleapis.com/css2?family=StrictFixture");
			await assert.rejects(() => compileEngineThemeFonts(fontRoot, [
				{ id: "strict-font", fileName: "strict-font.etr" },
			], {
				production: true,
				failurePolicy: "error",
				fetchImpl: async () => { throw new Error("fixture provider unavailable"); },
			}), /Strict failure policy rejected theme 'strict-font'/,
			"strict mode fails the build when no valid cached local font output exists");
			assert.ok(!fs.existsSync(path.join(fontRoot, "public", "nextjs-engine", "fonts", "strict-font.css")),
				"strict mode does not create a browser-import fallback stylesheet");

			writeFontFixture("offline-miss", "https://fonts.googleapis.com/css2?family=OfflineMiss");
			await assert.rejects(() => compileEngineThemeFonts(fontRoot, [
				{ id: "offline-miss", fileName: "offline-miss.etr" },
			], {
				production: true,
				offline: true,
				fetchImpl: async () => { throw new Error("offline mode must never fetch"); },
			}), /Offline mode requires a valid cached local font build for theme 'offline-miss'/,
			"offline mode rejects missing cache instead of quietly creating a network-dependent fallback");

			const previousFontTtl = process.env.ENGINE_THEME_FONT_CACHE_TTL_MS;
			try {
				process.env.ENGINE_THEME_FONT_CACHE_TTL_MS = "invalid";
				await assert.rejects(() => compileEngineThemeFonts(fontRoot, [
					{ id: "font-smoke", fileName: "font-smoke.etr" },
				], { production: true, fetchImpl: fakeFontFetch }),
				/ENGINE_THEME_FONT_CACHE_TTL_MS must be an integer/,
				"invalid cache lifetime configuration is rejected explicitly");
			} finally {
				if (previousFontTtl === undefined) delete process.env.ENGINE_THEME_FONT_CACHE_TTL_MS;
				else process.env.ENGINE_THEME_FONT_CACHE_TTL_MS = previousFontTtl;
			}
		} finally {
			fs.rmSync(fontRoot, { recursive: true, force: true });
		}

	} finally {
		if (previousTsExtension) Module._extensions[".ts"] = previousTsExtension;
		else delete Module._extensions[".ts"];
		if (previousTsxExtension) Module._extensions[".tsx"] = previousTsxExtension;
		else delete Module._extensions[".tsx"];
	}
}

function source(filePath, text) {
	return {
		filePath,
		sourceFile: ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
	};
}

function readArtifact(filePath) {
	return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function verifyDigest(artifact) {
	const { sha256, ...payload } = artifact;
	const actual = crypto.createHash("sha256").update(canonicalJson(payload), "utf8").digest("hex");
	assert.equal(actual, sha256, "the SHA-256 digest matches canonical artifact content");
}

async function run() {
	testPublicThemeApi();
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "nextjs-engine-theme-smoke-"));
	try {
		const themeSource = path.join(root, "app", "theme.tsx");
		const input = source(themeSource, [
			'import { createTheme } from "nextjs-engine";',
			'const markdown = { prettyPlease: { mode: "auto" }, table: { header: { placement: "left" } } };',
			'export const theme = createTheme({ id: "dark-fantasy", scope: "remote", name: "Dark Fantasy", markdown });',
			"",
		].join("\n"));
		const options = { nextjsVersion: "16.4.2", engineVersion: "3.0.0-alpha.1" };
		const first = compileEngineThemeArtifacts(root, [input], options);
		assert.equal(first.createdCount, 1);
		assert.equal(first.updatedCount, 0);
		assert.equal(first.unchangedCount, 0);
		assert.equal(first.artifacts[0].id, "dark-fantasy");
		assert.equal(first.artifacts[0].status, "created");

		const artifactPath = path.join(root, ".nextjs-engine", "gen3", "theme", "dark-fantasy.etr");
		const artifactText = fs.readFileSync(artifactPath, "utf8");
		const artifact = readArtifact(artifactPath);
		assert.equal(artifact.format, ETR_FORMAT);
		assert.equal(artifact.formatVersion, 1);
		assert.equal(artifact.generatedBy, "NENC");
		assert.equal(artifact.id, "dark-fantasy");
		assert.equal(artifact.createdWith.nextjs, "16.4.2");
		assert.equal(artifact.createdWith.nextjsEngine, "3.0.0-alpha.1");
		assert.equal(artifact.content.scope, "remote");
		assert.deepEqual(artifact.content.markdown.table.header, { placement: "left" });
		verifyDigest(artifact);

		const warm = compileEngineThemeArtifacts(root, [input], options);
		assert.equal(warm.createdCount, 0);
		assert.equal(warm.updatedCount, 0);
		assert.equal(warm.unchangedCount, 1, "identical artifacts are recognized without rewriting the output");
		assert.equal(fs.readFileSync(artifactPath, "utf8"), artifactText);

		const changed = source(themeSource, [
			'import { createTheme } from "nextjs-engine";',
			'export const theme = createTheme({ id: "dark-fantasy", scope: "remote", markdown: { prettyPlease: { mode: "auto", theme: "new-colors" } } });',
			"",
		].join("\n"));
		const update = compileEngineThemeArtifacts(root, [changed], options);
		assert.equal(update.updatedCount, 1);
		assert.equal(update.createdCount, 0);
		verifyDigest(readArtifact(artifactPath));

		const previousGoodOutput = fs.readFileSync(artifactPath, "utf8");
		assert.throws(() => compileEngineThemeArtifacts(root, [
			changed,
			source(path.join(root, "app", "other.tsx"),
				'import { createTheme } from "nextjs-engine"; createTheme({ id: "dark-fantasy", scope: "remote", markdown: { theme: "conflict" } });'),
		], options), /Duplicate theme group ID/);
		assert.equal(fs.readFileSync(artifactPath, "utf8"), previousGoodOutput,
			"invalid duplicate IDs fail before existing artifacts are changed");

		assert.throws(() => compileEngineThemeArtifacts(root, [
			source(path.join(root, "app", "dynamic.tsx"),
				'import { createTheme } from "nextjs-engine"; const makeTheme = () => ({ id: "dynamic" }); createTheme(makeTheme());'),
		], options), /function calls are not allowed/);

		assert.throws(() => compileEngineThemeArtifacts(root, [
			source(path.join(root, "app", "bad-id.tsx"),
				'import { createTheme } from "nextjs-engine"; createTheme({ id: "../outside", scope: "global" });'),
		], options), /theme id must be one plain group segment/);

		const protectedPath = path.join(root, ".nextjs-engine", "gen3", "theme", "user-owned.etr");
		fs.writeFileSync(protectedPath, JSON.stringify({ hello: "user file" }));
		assert.throws(() => compileEngineThemeArtifacts(root, [
			source(path.join(root, "app", "user-owned.tsx"),
				'import { createTheme } from "nextjs-engine"; createTheme({ id: "user-owned", scope: "global" });'),
		], options), /Refusing to overwrite non-generated theme artifact/);
		assert.equal(fs.readFileSync(protectedPath, "utf8"), JSON.stringify({ hello: "user file" }),
			"the compiler never overwrites an unrelated file with an artifact-name collision");

		const cleanup = compileEngineThemeArtifacts(root, [], options);
		assert.equal(cleanup.removedCount, 1, "stale artifacts previously owned by the compiler are removed");
		assert.equal(fs.existsSync(artifactPath), false);
		assert.equal(fs.existsSync(protectedPath), true, "stale cleanup never deletes files not owned by NENC");

		const symlinkRoot = fs.mkdtempSync(path.join(os.tmpdir(), "nextjs-engine-theme-symlink-"));
		const outsideDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "nextjs-engine-theme-outside-"));
		try {
			fs.mkdirSync(path.join(symlinkRoot, ".nextjs-engine"), { recursive: true });
			fs.symlinkSync(outsideDirectory, path.join(symlinkRoot, ".nextjs-engine", "gen3"), "dir");
			assert.throws(() => compileEngineThemeArtifacts(symlinkRoot, [
				source(path.join(symlinkRoot, "app", "symlink-theme.tsx"),
					'import { createTheme } from "nextjs-engine"; createTheme({ id: "symlink-theme" });'),
			], options), /symbolic link/);
			assert.deepEqual(fs.readdirSync(outsideDirectory), [],
				"the compiler refuses to write through a symlink outside the project");
		} finally {
			fs.rmSync(symlinkRoot, { recursive: true, force: true });
			fs.rmSync(outsideDirectory, { recursive: true, force: true });
		}

		console.log("Generation 3 EngineTheme compiler smoke: ok");
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
}

run().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
