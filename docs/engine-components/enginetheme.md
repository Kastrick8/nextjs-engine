# EngineTheme

**Implementation layout:** EngineTheme runtime modules live in `src/engine/component/engineTheme/`. The Generation 3 theme artifact compiler lives in `src/engine/compiler/theme/3/compiler.ts`, the font compiler in `src/engine/compiler/font/3/compiler.ts`, and build orchestration in `src/engine/compiler/build.compiler.ts`. Next.js integration links and hooks remain in `src/engine/plugins/`.

EngineTheme is the data-only theming layer for Next.js Engine. The current foundation provides a validated createTheme() API, qualified theme IDs, local/global/explicitly preloaded remote theme resolution for Markdown, static NENC .etr generation, lightweight Pretty-please highlighting, safe declarative UI templates, and a typed event-driven Data-API.

## Module layout

`createTheme()`, ID resolution, highlighting, declarative templates, remote `.etr` loading, font URL policy, and the event-driven Data-API are implemented in `src/engine/component/engineTheme/`. `src/engine/compiler/theme/3/compiler.ts` owns static NENC theme extraction and `.etr` generation; `src/engine/compiler/font/3/compiler.ts` owns production font asset compilation. The `src/engine/plugins/gen3ThemeCompiler.js` file is only a compatibility link to the theme compiler. Runtime theme code and compiler logic do not live in `plugins/`.

## Define a theme group

~~~ts
import { createTheme } from "nextjs-engine";

export const darkFantasy = createTheme({
  id: "dark-fantasy",
  scope: "global",
  name: "Dark Fantasy",
  tokens: {
    colors: {
      surface: "#18181B",
      text: "#F4F4F5"
    }
  },
  markdown: {
    defaults: {
      codeBackground: "#241b38",
      codeColor: "#f5efff"
    },
    styles: {
      codeBlock: {
        borderColor: "#826f9b"
      }
    },
    variants: {
      dark: {
        defaults: {
          codeBackground: "#241b38"
        }
      }
    }
  }
});
~~~

The root ID names a theme group and must be one safe segment. Component configuration is placed underneath a namespace such as markdown; shared tokens can live under tokens. Semantic scalar tokens are flattened into safe CSS custom properties: `tokens.colors.accent` becomes `--e-theme-colors-accent`. Existing `vars` take precedence; unsafe CSS variable values are ignored.

createTheme() validates the definition as JSON data, clones and deeply freezes it, and never performs network requests, publishes a theme, downloads fonts, or evaluates theme content. Functions, accessors, cycles, symbols, non-finite numbers, reserved keys, excessive nesting, and oversized definitions are rejected.

## Theme IDs

A schema can refer to a component theme or variant by ID:

~~~ts
{
  theme: {
    id: "dark-fantasy.markdown.dark"
  },
  root: {
    type: "markdown",
    props: { content: "# Welcome" }
  }
}
~~~

The grammar is:

- dark-fantasy — group ID
- dark-fantasy.markdown — component theme
- dark-fantasy.markdown.dark — component variant
- dark-fantasy.markdown.1.2.560 — three nested subtheme segments

The limit is three subtheme segments after the component segment. Variants inherit from the prior definition; the resolver merges nested Markdown style slots and defaults. Explicit per-node Markdown props take precedence, and local markdownStyles properties override matching theme style properties.

Local themes can be supplied directly as a theme object. Global themes are registered in-process and can be referenced by ID. Missing global groups or variants produce an error. A remote ID resolves only after loadRemoteEngineTheme() explicitly loads and verifies its .etr artifact; render and module initialization never perform network requests.

## Migration and compatibility

The public import remains `nextjs-engine`; applications should not import the internal `src/engine/component/engineTheme/` files directly. Moving those implementation files does not change the public API.

Existing inline theme objects remain valid:

~~~ts
createPage({
  schema: {
    theme: {
      vars: { "--docs-accent": "#826f9b" },
      fonts: ["https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap"],
      globalStyles: ".docs-article { max-width: 72rem; }"
    },
    root: { type: "markdown", props: { filePath: "./docs/index.md" } }
  }
});
~~~

To share those settings or introduce component variants, move the definition into `createTheme()` and keep the same values under the group:

~~~ts
export const docsTheme = createTheme({
  id: "docs",
  scope: "global",
  vars: { "--docs-accent": "#826f9b" },
  fonts: ["https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap"],
  markdown: {
    defaults: { linkColor: "var(--docs-accent)" },
    variants: { compact: { defaults: { bodyLineHeight: 1.6 } } }
  }
});
~~~

Then set the schema's theme reference to `{ id: "docs.markdown.compact" }`. Inline node props still override theme defaults, and local `markdownStyles` overrides matching style slots. Group IDs remain one safe segment; dots separate the component ID and up to three inherited variant segments.

### Updating a remote theme

A generated `.etr` is data, not a live registry entry. Generate it, publish it at an owner-controlled URL, and explicitly load it with `loadRemoteEngineTheme()`. The artifact's Next.js and Engine versions are checked exactly; after upgrading either dependency, regenerate/re-publish the artifact and update the expected versions together. The loader's in-process response cache defaults to five minutes, can be set to zero to refetch on each call, and is bounded to 32 entries. Use `clearRemoteEngineThemeCache()` when an application needs to force revalidation and `unregisterRemoteEngineTheme()` when it no longer trusts a previously loaded group.

## Generation 3 .etr artifacts

NENC extracts statically resolvable createTheme({...}) calls during its Gen 3 source pass and writes:

~~~text
.nextjs-engine/gen3/theme/<theme-id>.etr
~~~

The artifact is UTF-8 JSON containing a format/version identifier, group ID, generator metadata, the Next.js and Engine versions used to create it, the definition in content, and a SHA-256 digest of canonical JSON excluding the digest field itself.

The static compiler resolves literal values and local constants. It rejects dynamic calls, spreads, functions, accessors, computed keys, and unsupported expressions instead of executing them to discover a theme definition. Group IDs are validated before they become filenames. Output writes are atomic, unchanged artifacts are not rewritten, symlinked output paths are rejected, and unrelated files are not overwritten. A manifest under the ignored .nextjs-engine/.cache/ directory records generated artifacts.

Generated .etr output is ignored build output by default. Publishing a remote theme means copying or serving the generated JSON through the owner's endpoint; generating an artifact does not publish it automatically.

## Explicit remote theme loading

Use loadRemoteEngineTheme() only when the application intentionally trusts a remote theme host. The loader requires exact HTTPS origins and expected Next.js/Engine versions, caps the response body, disables redirects and credentials, verifies canonical SHA-256, and caches successful fetches in a small bounded in-process cache.

~~~ts
import { loadRemoteEngineTheme } from "nextjs-engine";

await loadRemoteEngineTheme("/nextjs-engine/theme/dark-fantasy.etr", {
  baseUrl: "https://docs.example.com",
  allowedOrigins: ["https://docs.example.com"],
  expectedNextjsVersion: "16.4.2",
  expectedEngineVersion: "3.0.0-alpha.1",
  expectedId: "dark-fantasy",
});
~~~

After it resolves, schemas can refer to dark-fantasy.markdown.dark by ID. Callers can clear the response cache or unregister a verified remote group explicitly. Loader failures (checksum/version mismatch, untrusted origin, redirect, oversized JSON, raw globalStyles, unsafe CSS variables, or unapproved font stylesheet origins) fail closed.

Remote themes cannot supply raw globalStyles. Custom properties are limited to safe names/values, and remote font stylesheet links must use HTTPS origins in the same explicit allowlist. These theme font URLs are linked rather than downloaded into local files by this implementation.


## Safe block templates and info blocks

Theme templates control structure as well as CSS. They are data-only Engine Schema trees with named slots. A trusted project may register a local React adapter and reference its ID; a remote theme can reference an adapter ID but cannot include its implementation.

~~~ts
import { createTheme } from "nextjs-engine";

export const darkDocs = createTheme({
  id: "dark-docs",
  scope: "global",
  markdown: {
    templates: {
      codeBlock: {
        schema: {
          type: "stack",
          props: { as: "figure", direction: "column", gap: "0" },
          children: [
            { type: "slot", props: { name: "languageLabel" } },
            { type: "slot", props: { name: "content" } }
          ]
        }
      },
      tableHeader: {
        schema: {
          type: "stack",
          props: { direction: "row", align: "center", gap: "0.4rem" },
          children: [
            { type: "slot", props: { name: "content" } }
          ]
        }
      },
      infoBlock: {
        schema: {
          type: "stack",
          props: { as: "aside", direction: "column", gap: "0.4rem" },
          children: [
            { type: "text", props: { content: "{{title}}" } },
            { type: "slot", props: { name: "content" } }
          ]
        }
      }
    }
  }
});
~~~

Templates can use slots such as `languageLabel` and `content`, plus context values such as `title`, `tone`, `language`, `label`, and `alignment`. Declare element order in the schema tree and use `stack` or `grid` layout props to choose placement; the table-header template composes content inside each semantic `<th>`, while the original cell still owns table semantics. Template interpolation is bounded and URL-based CSS, raw HTML, event handlers, and unknown adapter IDs are rejected.

Write an information block with a closing `:::` line:

~~~md
:::warning Important
This content is ordinary Markdown inside a themed information block.
:::
~~~

Supported tones are `info`, `note`, `tip`, `warning`, `danger`, and `success`. Directives inside fenced code are left unchanged, and an unclosed directive remains literal Markdown.

## Pretty-please highlighting

EngineMarkdown supports prettyPlease configuration in a theme or as a local Markdown prop:

~~~ts
prettyPlease: {
  mode: "auto",
  provider: "engine-lite",
  theme: "vscode-dark",
  palette: {
    foreground: "#f5efff",
    keyword: "#ff85c0",
    string: "#b6f09c",
    comment: "#9a91b8"
  },
  languagePalettes: {
    typescript: { foreground: "#d4d4d4", keyword: "#569cd6" },
    nodejs: { foreground: "#c5f1c5", keyword: "#a8cc7c" }
  }
}
~~~

The built-in engine-lite tokenizer is intentionally lightweight and bounded for low-memory devices. It offers VS Code-inspired colors for common languages and falls back to plain text for unknown or unsupported syntax. It is not a full TextMate/VS Code grammar engine; projects can register a compatible trusted local provider.

The public provider/list APIs are:
- registerEngineHighlighterProvider()
- unregisterEngineHighlighterProvider()
- listEngineHighlighterProviders()
- listEngineHighlighterLanguages()
- listEngineHighlighterThemes()

Aliases include ts/typescript and nodejs/javascript. The built-in palettes are vscode-dark and vscode-light. Use `listEngineHighlighterThemes("engine-lite")` or `listEngineHighlighterThemes("shiki")` to list themes exposed by one provider.

### Optional TextMate/VS Code grammar support

Engine Lite remains dependency-free and is the default for low-memory builds. For full TextMate grammar highlighting, install Shiki in the consuming application and register an already initialized highlighter. EngineTheme does not import Shiki automatically or include all grammar/theme bundles in every project.

```sh
npm install shiki
```

Initialize only the language grammars and themes the app needs, then register once before EngineMarkdown renders:

```ts
import { createHighlighter } from "shiki";
import {
  createShikiEngineHighlighterProvider,
  registerEngineHighlighterProvider
} from "nextjs-engine";

const highlighter = await createHighlighter({
  langs: ["typescript", "javascript", "json", "tsx"],
  themes: ["github-dark", "github-light"]
});

registerEngineHighlighterProvider(createShikiEngineHighlighterProvider(highlighter, {
  id: "shiki",
  defaultTheme: "github-dark"
}));
```

Set `prettyPlease.provider: "shiki"` and select a loaded Shiki theme with `prettyPlease.theme`. Provider themes are discoverable with `listEngineHighlighterThemes("shiki")`. The adapter requests TextMate scope explanations, maps them into EngineTheme token categories, validates provider colors, and emits tokens rendered as React text—not HTML. Custom global or per-language palettes fully override provider colors. ANSI fences continue through the ANSI parser. Keep the initialized highlighter as an application/server singleton instead of creating it during rendering.

Custom palettes replace provider token colors authoritatively. If a token category is omitted or invalid, it uses the palette foreground (or the code foreground fallback), never the provider's default color. Supported palette values are HEX, bounded RGB/RGBA, and bounded color(srgb ...) values.

Fences labeled ansi continue through the existing ANSI parser; ANSI is not sent through syntax highlighting. Code is emitted as React text spans, not injected HTML. Code-length and token-count limits trigger plain-text fallback rather than unbounded tokenization.

## Event-driven Data-API

The Data-API dispatches a supported event to a handler registered by trusted project code. It is not a preview or inspection API.

~~~ts
import {
  registerEngineThemeDataHandler,
  dispatchEngineThemeDataEvent
} from "nextjs-engine";

registerEngineThemeDataHandler("docs.table-join", (event) => {
  return {
    operation: "append",
    incoming: event.context.incoming ?? null
  };
});

dispatchEngineThemeDataEvent("join:left", "docs.table-join", {
  themeId: "dark-fantasy.markdown.dark",
  componentId: "markdown",
  slotId: "table.header",
  direction: "left",
  existing: { label: "Name" },
  incoming: { icon: "sort" }
});
~~~

Initial events are join:left, join:right, join:top, and join:bottom. Dispatch validates context as bounded JSON data, clones/freezes it before calling the handler, rejects missing handler IDs, and never imports code based on a theme-provided ID. Handler implementations remain trusted local code.

Declarative templates now connect to actual code-block wrappers, table headers/data cells, and :::info/:::note/:::tip/:::warning/:::danger/:::success blocks. Templates are restricted Engine Schema trees or locally registered adapters; raw HTML, callbacks, and unregistered adapter IDs are not accepted. Data-API events remain a separate typed handler contract.

## Production font caching

In development, `createTheme()` leaves font stylesheet URLs unchanged; NENC skips font network and disk work entirely.

In production, NENC fetches supported font CSS and font files during the build, emits local files under `public/nextjs-engine/fonts/`, and local/global themes reference the generated `/nextjs-engine/fonts/<theme-id>.css` stylesheet. Font filenames include their SHA-256 content hash. The disk cache lives under `.nextjs-engine/.cache/gen3/fonts/`.

The default stylesheet origin is `https://fonts.googleapis.com` and the default font-file origin is `https://fonts.gstatic.com`. Additional exact HTTPS origins can be opted in using `ENGINE_THEME_FONT_CSS_ORIGINS` and `ENGINE_THEME_FONT_FILE_ORIGINS` (comma-separated origin URLs; wildcards are not accepted). Bunny Fonts can also be used by explicitly adding `https://fonts.bunny.net` to both origin variables; additional providers are never trusted by default.

Run deterministic font fixtures with `npm run test:theme`. Run a real Google Fonts/Bunny Fonts production-pipeline matrix with `npm run test:theme:live-fonts`; pass `google` or `bunny` to test one provider. The `.github/workflows/theme-font-providers.yml` workflow runs both providers on pull requests, manual dispatch, and weekly on a schedule. It uses strict failure mode so provider, DNS, TLS, response, or asset-emission failures cannot silently pass by emitting a browser `@import`. Redirects, local/private IPs and local-only hostnames, unexpected content types, oversized files, unsafe font CSS declarations, and remote theme strings containing CSS/network primitives such as `url(...)`, `expression(...)`, or `javascript:` are rejected. Because the allowlist is an explicit trust boundary, configured hostnames should be controlled by the project owner.

The cache policy is explicit and configurable:

- `ENGINE_THEME_FONT_CACHE_TTL_MS` controls freshness in milliseconds (default `604800000`, maximum 30 days, minimum `0`). The compiler option `cacheTtlMs` overrides the environment value.
- `ENGINE_THEME_FONT_REFRESH=1` or `forceRefresh: true` bypasses fresh stylesheet and font caches. If refresh fails, a previously verified matching cache may still be reused.
- `ENGINE_THEME_FONT_OFFLINE=1` (or `offline: true` in the compiler options) disables downloads and requires a valid local cache for each theme. Valid stale entries may be reused offline; a cache miss fails rather than silently introducing a browser network dependency. Offline mode cannot be combined with forced refresh.
- `ENGINE_THEME_FONT_FAILURE_POLICY=error` makes a build fail when the font source cannot be compiled and no valid previous local output is available. The default `fallback` policy logs a warning and preserves build availability, but its generated `@import` is emitted only for a stylesheet origin that passes the same exact allowlist as build-time fetching. Unapproved origins never get copied into fallback CSS.
- Extra public providers are supported through exact origins in `ENGINE_THEME_FONT_CSS_ORIGINS` and `ENGINE_THEME_FONT_FILE_ORIGINS`. The Google Fonts origins remain enabled by default; additional origins are added to those defaults, not substituted for them. Use only HTTPS origins under your control or explicitly trusted by the project. Wildcards, redirects, local/private hosts, unexpected content types, oversized files, and unsafe CSS remain rejected.

Set the environment variables in the production build environment. The runtime theme API never reads them to fetch fonts, and development mode continues to skip font downloads entirely.

## Backwards compatibility and verification

Existing EngineTheme vars, fonts, and globalStyles remain supported. Current EngineMarkdown props/styles and ANSI behavior remain covered by regression tests.

Focused validation commands:

~~~sh
npm run test:theme
npm run type-check
npm run build
npm run test:browser
~~~

Remote `.etr` retrieval is available only through the explicit validated loader above. The production compiler downloads allowlisted fonts, emits local CSS/assets, and stores content-verified cache entries; these font operations are skipped in development mode.
