# EngineTheme / createTheme / Pretty-please — Implementation Plan

**Status:** Implementation complete on `feat/enginetheme-foundation`; runtime, compiler, integration, docs, and regression coverage are in place.  
**Repository:** Kate-alt-69/nextjs-engine  
**Baseline inspected:** main-3, 2026-10-24

## 1. Outcome and constraints

Design and then implement a shared EngineTheme system, starting with EngineMarkdown while preserving Gen 3's server-first rendering and existing behavior.

The scope includes:

- A public createTheme() API imported from nextjs-engine.
- Theme groups, component themes, named variants, and local/global/remote scopes.
- A JSON .etr artifact emitted by NENC for every compiled theme group.
- Remote .etr resolution from a user-owned endpoint, with no Engine-operated hosting service required.
- Pretty-please: automatic or user-selected syntax highlighting, a provider/language list, and per-language custom palettes.
- UI templates that define structure, placement, styling, composition, and supported event behavior.
- A small event-driven Data-API that allocates/dispatches events to configured behavior. It is not a preview, inspection, explanation, or comparison API.
- A production font download/cache pipeline; dev mode uses the declared font links and does not download fonts through the Engine build pipeline.
- Existing inline EngineTheme configuration and EngineMarkdown props remain compatible unless a breaking change is explicitly approved.

**Security invariant:** theme data and remote .etr content are never executable JavaScript or JSX. Native React/Next.js components are trusted local code registered as adapters; remote theme data may reference an adapter ID but cannot provide source code for automatic execution.

## 2. Public API and ID rules

The createTheme() API defines a theme group. The root ID is the group's name, not the full component theme ID.

~~~ts
import { createTheme } from "nextjs-engine";

export const myTheme = createTheme({
  id: "mycoolthemes",
  scope: "global",

  markdown: {
    // Pretty-please, code blocks, tables, fonts, templates, etc.
  },

  // Other supported Engine components can be added here.
});
~~~

This is the supported public shape. Component namespaces currently include `markdown`; variants live under each component's `variants` object, and the same JSON-only model leaves room for other Engine components.

ID model:

- Group: mycoolthemes
- Component theme: mycoolthemes.markdown
- Variant: mycoolthemes.markdown.dark
- Nested variant: mycoolthemes.markdown.1.2.560
- Allow at most three subtheme segments after the component segment.
- Variants inherit their parent and state only the differences.
- Centrally validate IDs, references, duplicates, unknown components, inheritance cycles, and depth.
- Group IDs are a single safe segment and cannot contain dots. Dots unambiguously separate group, component, and inherited subtheme segments.

A schema can request a theme by ID:

~~~ts
{
  theme: {
    id: "mycoolthemes.markdown.dark"
  }
}
~~~

The current PageSchema.theme is an inline object with vars, fonts, and globalStyles. Preserve that API through a migration-safe union/resolver. The createTheme() call itself should be deterministic and should not perform network requests, publish themes, download fonts, or write build artifacts.

Scope semantics:

- local: available within its declared page/project context.
- global: registered for reuse across the application, but not inherently URL-addressable.
- remote: intended to be fetched by URL and consumed by another project/site.
- Every compiled group can produce .etr. Only remote scope means the artifact is intended for URL-based consumption; compiling and publishing are separate operations.

Resolution is deterministic: parent defaults are merged into child variants, nested Markdown style slots are merged rather than replaced wholesale, explicit node props override theme defaults, and local `markdownStyles` override matching resolved style slots. Semantic design tokens remain separate from syntax-token colors.

## 3. .etr format, remote hosting, and NENC

Generated artifact path:

~~~text
.nextjs-engine/gen3/theme/<theme_name>.etr
~~~

The `.etr` is UTF-8 JSON representing a compiled theme group. Its envelope contains the format identifier/version, `generatedBy: "NENC"`, group ID, the resolved Next.js and Engine versions, the source theme definition under `content`, and a SHA-256 digest of canonical JSON excluding the digest field.

Illustrative shape:

~~~json
{
  "format": "nextjs-engine-theme",
  "formatVersion": 1,
  "generatedBy": "NENC",
  "id": "mycoolthemes",
  "createdWith": {
    "nextjs": "<resolved version>",
    "nextjsEngine": "<resolved version>"
  },
  "content": {
    "id": "mycoolthemes",
    "scope": "global",
    "name": "My Cool Themes",
    "tokens": { "colors": { "accent": "#826f9b" } },
    "markdown": { "defaults": { "codeBackground": "#241b38" } }
  },
  "sha256": "<SHA-256 of canonical envelope without sha256>"
}
~~~

Canonical serialization sorts object keys recursively; the checksum covers the entire envelope except `sha256` itself. The runtime validates this digest against the supplied artifact. SHA-256 detects content changes but does not authenticate the publisher.

Remote handling:

- A remote .etr may be hosted at a user-controlled endpoint such as https://example.net/nextjs-engine/theme/dark-fantasy.etr.
- Do not require an Engine-hosted registry for the initial release.
- A remote load takes an explicit source URL/path and `baseUrl` where needed; the caller supplies the exact HTTPS `allowedOrigins`, expected group ID, and expected Next.js/Engine versions. No registry lookup or URL guessing occurs.
- Validate the JSON shape, format/schema version, requested ID, checksum, compatibility, and supported component features before use.
- Apply bounded response size, timeout, redirect revalidation, and safe URL rules.
- Cache results with an explicit version/freshness strategy. A production build should not silently change after a remote theme revision unless its configured update policy allows it.
- Remote content can declare schema templates, event rules, and registered adapter IDs, never inline JavaScript, JSX, arbitrary imports, or executable source.

NENC emits deterministic `<theme-id>.etr` filenames, writes atomically, avoids rewriting identical artifacts, rejects unsafe output paths and unrelated-file overwrites, and tracks generated files in its ignored cache manifest. `.nextjs-engine/gen3/theme/` is ignored build output; publishing remains an explicit owner-controlled copy/hosting step.

Repository architecture: `src/engine/compiler/build.compiler.ts` coordinates Gen 3 source discovery and schema workers; `src/engine/compiler/schema-cache.compiler.js` owns persistent schema-output caching; and `src/engine/compiler/theme/3/compiler.ts` owns ETR extraction. `src/engine/plugins/nencPlugin.js` remains focused on command manifests and generated command/favicon routes. Keep compiler behavior in compiler modules rather than overloading a command-specific plugin.

## 4. Theme resolution and type compatibility

Shared semantic tokens are accepted as bounded JSON data and flattened to safe CSS custom properties. Markdown has component-specific defaults, nested style slots, variants, Pretty-please palettes, and declarative templates. Theme IDs are validated centrally; missing references fail clearly, variant depth is capped at three subtheme segments, and the legacy inline vars/fonts/globalStyles path remains supported.

Relevant existing integration points:

- src/engine/schema/types.ts defines EngineTheme, PageSchema.theme, MarkdownProps, and EngineMarkdown style slots.
- src/engine/createPage.tsx currently emits vars as root CSS variables and handles fonts/globalStyles.
- src/engine/index.ts is the public export barrel.
- src/engine/core/validateSchema.ts is the schema validation path.

## 5. Pretty-please highlighting

Pretty-please should support automatic mode plus explicit provider/language choices. Its available-options list must reflect providers and grammars actually registered in the project.

Requirements:

- A provider/adapter registry supports the built-in option and user-selected compatible providers.
- Engine Lite is the dependency-free default. For full TextMate/VS Code grammar support, consuming projects may install Shiki and register the first-party adapter around one initialized highlighter. Shiki is not a mandatory Engine dependency and is not bundled into every project.
- Normalize language aliases; unsupported language/provider combinations fall back to readable plain text.
- Keep the code-block layout/theme separate from the syntax-highlighting provider/theme.
- A custom palette applies to a selected language/profile and replaces that provider's syntax colors completely. Missing token categories use defined base foreground/background values, not arbitrary provider-default colors.
- Validate and normalize agreed HEX and RGB/sRGB forms.
- Node.js is normally a runtime/profile using JavaScript grammar, not automatically a separate grammar.
- Keep normal syntax highlighting on the Gen 3 server-first path where possible; do not pull a large highlighter bundle into browser routes just to color static code.
- Preserve direct EngineMarkdown compatibility and the existing ANSI path. ANSI fences must continue through parseEngineAnsi, not through a source-language highlighter.
- Preserve whitespace, safe Markdown rendering, language labels, and raw-HTML safety.

Existing files: src/engine/components/EngineMarkdownRenderer.tsx currently special-cases language-ansi while other fenced languages remain plain code; src/engine/core/markdownParser.ts contains ANSI parsing; src/engine/compiler/EngineServerRenderer.tsx is the Gen 3 server-first Markdown integration point.

## 6. UI templates and event-driven Data-API

Theme UI-code must control how a building block is composed and behaves, not just its CSS. Start with named templates/slots for code blocks, table header/body cells, and information blocks (title, icon, content, optional footer/actions).

Templates must describe layout placement (left/right/top/bottom), alignment, spacing, order, wrapping and responsive behavior. Placement and merge rules are separate: a part may append to content, replace a named slot, wrap existing content, or use another explicitly supported composition rule.

Portable Engine Schema is the preferred declarative format. Trusted native React/Next.js code is supported only through explicitly registered project-local adapters. Remote .etr data can reference such adapters by ID but cannot include their source.

The Data-API is a small event-driven dispatch/allocation API:

- Receives a defined event type plus component/slot/context.
- Allocates or dispatches the event to the selected configured behavior/handler.
- Supports `join:left`, `join:right`, `join:top`, and `join:bottom` composition events with typed existing/incoming context and deterministic handler lookup.
- Passes enough context for the handler to deal with existing content and the requested composition.
- Routes to a validated Engine Schema behavior or an explicitly registered trusted local React/Next.js handler.
- Defines deterministic missing-handler, unsupported-event, and error behavior.

Do not implement Data-API as inspect/preview/explain/compare tooling. Those operations came from a misunderstanding of the requirement.

EngineMarkdown supports `:::info`, `:::note`, `:::tip`, `:::warning`, `:::danger`, and `:::success` blocks closed by `:::`. Directives inside code fences remain literal, and an unclosed directive is left as Markdown text.

## 7. Font and static-asset pipeline

Development must keep using the declared font stylesheet/link (including providers such as Google Fonts); the Engine build pipeline must not download font files in dev mode.

During production compilation:

- Resolve the requested font families, weights, and styles to actual font files.
- Download permitted files, cache them, emit them as local production assets, and rewrite generated CSS URLs.
- Use valid cached files without downloading again.
- Key cache entries by canonical source plus relevant font metadata and content SHA-256, not filename alone.
- Use atomic writes and define explicit refresh behavior.
- If a source is unavailable, reuse a valid cache where allowed or emit the documented warning/error.
- Prefer WOFF2/WOFF for web output and document whether TTF is accepted.

The font compiler cache is `.nextjs-engine/.cache/gen3/fonts/`; manifest metadata and cached source assets are separate from emitted CSS/font files under `public/nextjs-engine/fonts/`. Downloads run in the production compiler path, never in runtime rendering or development requests. Fetches have exact HTTPS origin allowlists, public-host checks, redirect denial, bounded timeouts/sizes/content types, and symlink/path guards.

## 8. Implemented repository map

| Path | Implemented responsibility |
|---|---|
| `src/engine/component/engineTheme/` | Public `createTheme` model, ID parsing/resolution, tokens, remote ETR loading, safe templates, Data-API handlers, and highlighter/provider registry. |
| `src/engine/compiler/theme/3/compiler.ts` | Static NENC extraction, deterministic ETR generation, atomic output, and stale-artifact tracking. |
| `src/engine/compiler/font/3/compiler.ts` | Production-only font CSS/font downloading, local asset output, origin and DNS policy, and cache/fallback/offline behavior. |
| `src/engine/compiler/build.compiler.ts` | Coordinates Generation 3 discovery, compilation, and build integrations. |
| `src/engine/plugins/gen3ThemeCompiler.js` | Thin compatibility link to the dedicated theme compiler. |
| `src/engine/plugins/nencPlugin.js` | NENC command manifests and generated command/favicon routes; not the home of theme compiler logic. |
| `src/engine/schema/types.ts` | Theme group, scope, qualified IDs, templates, Data-API events, palettes, and public Markdown theme types while preserving old props. |
| `src/engine/index.ts` | Public exports for `createTheme`, remote loading, Data-API, templates, highlighter APIs, and the optional Shiki adapter. |
| `src/engine/createPage.tsx` and `src/engine/core/validateSchema.ts` | Preserve legacy inline theme behavior and validate schema references. |
| `src/engine/components/EngineMarkdownRenderer.tsx` | Markdown theme resolution, palettes, provider tokens, templates, tables, info blocks, and ANSI compatibility. |
| `src/engine/core/markdownParser.ts` | ANSI parsing and Markdown source normalization, including safe info-block directive handling. |
| `src/engine/compiler/EngineServerRenderer.tsx` | Keeps Gen 3 Markdown rendering server-first where possible. |
| `scripts/gen3-theme-compiler-smoke.js` | API, ETR, remote safety, resolver, template, Data-API, highlighter, and font-cache regression coverage. |
| `scripts/gen3-font-provider-live-smoke.js` and `.github/workflows/theme-font-providers.yml` | Real Google Fonts and Bunny Fonts strict-mode validation matrix. |
| `app/engine-markdown-test/page.tsx`, `tests/browser/engine-markdown.spec.ts`, and EngineTheme docs | Theme/highlighting examples, browser regressions, and public behavior documentation. |
| `.gitignore` | Ignores generated ETRs, schema/font caches, and emitted local font assets; publishing remains explicit. |

Runtime modules stay in `src/engine/component/engineTheme/`, with static compile logic under `src/engine/compiler/theme/3/compiler.ts` and font compilation under `src/engine/compiler/font/3/compiler.ts`. Next.js hooks and compatibility links remain in `src/engine/plugins/`.

## 9. Implementation record — complete

### API contracts, theme model, and compatibility

- Locked group/component/subtheme ID grammar, scope behavior, variant inheritance, precedence, remote trust requirements, Data-API contracts, information-block syntax, and font cache/failure behavior.
- Added public `createTheme()`, bounded JSON validation, deep freezing, ID resolution, scoped registration, and a migration-safe path for existing inline theme objects.

### ETR compiler and remote resolver

- Implemented deterministic UTF-8 JSON with NENC generator metadata and canonical SHA-256, safe filenames/paths, atomic writes, and cache-manifest tracking.
- Added explicit remote loading with exact HTTPS origin allowlists, redirects disabled, response-size/time limits, checksum/format/version/group-ID verification, bounded cache deduplication, and fail-closed validation of remote style/font/template data.
- Remote artifacts remain user-hosted and data-only; loading a theme never executes remote code or publishes an artifact.

### Pretty-please highlighting

- Added Engine Lite tokenization, provider/language/theme discovery, aliases, bounded safe tokens, custom and per-language palettes, and color validation.
- Added the optional Shiki/TextMate adapter for initialized consumer-owned highlighters without a mandatory dependency; provider tokens are mapped to safe React text spans and never injected as HTML.
- Preserved the existing ANSI parser and plain-text fallback.

### Declarative templates and Data-API

- Connected safe declarative templates to code-block wrappers, table headers/data cells, and information blocks. Template adapters are trusted, registered project-local code; remote ETRs can reference adapter IDs but cannot include implementation source.
- Implemented typed `join:left`, `join:right`, `join:top`, and `join:bottom` dispatch with bounded cloned/frozen JSON context and deterministic missing-handler/event behavior.

### Production font assets

- Implemented production-only CSS/font downloads, content-addressed WOFF2/WOFF/TTF/OTF output, safe local URL rewriting, a disk cache, stale-cache reuse, explicit refresh, TTL configuration, offline cache-only mode, strict failure policy, and origin/DNS/filesystem guards.
- Added deterministic fixtures for Google-style CSS and Bunny Fonts-compatible same-origin assets plus a real live-provider matrix. The lightweight Engine Lite path and development flow perform no font downloads.

### Documentation and regression verification

- Updated the EngineTheme and Gen 3 compiler documentation, the EngineMarkdown demo, public exports, smoke tests, and browser regression coverage.
- The post-implementation runtime/build, cross-browser, and live-provider workflow results are recorded in Section 13.

## 10. Acceptance criteria

1. createTheme is exported, typed and side-effect-free with respect to network, publication and font downloads.
2. Existing inline EngineTheme and EngineMarkdown props still work.
3. Qualified component/subtheme references resolve; more than three subtheme segments fail validation.
4. NENC emits deterministic JSON .etr artifacts at the requested path for compiled groups.
5. The ETR contains group/component content, Next.js/Engine/schema version metadata, and a verified canonical SHA-256.
6. Local/global/remote have documented distinct behavior; remote hosting remains user-controlled.
7. Invalid, corrupted, incompatible, oversized or unsafe remote files are rejected; remote data never executes code or arbitrary imports.
8. Pretty-please supports auto/provider choice, discoverable languages, plain-text fallback, a VS Code-like lightweight preset, and optional Shiki/TextMate grammars.
9. Custom language palettes fully replace provider syntax colors and agreed HEX/RGB/sRGB values validate.
10. ANSI handling remains intact.
11. Templates define both appearance and composition; Data-API event dispatch matches its agreed contract and is not preview/inspection tooling.
12. Native React/Next components run only through trusted local adapter registration.
13. Dev does not download font files; production emits local font assets and reuses valid cache entries.
14. Type-check, Generation 3 production build, focused smoke tests, production bundle budgets, browser/device/network checks, cross-browser regressions, and the strict live font-provider matrix pass on the completion commit.

## 11. Verification plan

The repository provides `npm run type-check`, `npm run build`, `npm run test:theme`, `npm run test:theme:live-fonts`, and `npm run test:browser`. The focused EngineTheme smoke script covers ID grammar, artifact/checksum stability, safe remote loading, palette replacement, ANSI compatibility, templates, Data-API dispatch, Shiki adapter token safety, and font cache/offline/error behavior.

The live font script validates Google Fonts and Bunny Fonts using real HTTPS/DNS requests and strict failure policy; `.github/workflows/theme-font-providers.yml` runs both providers for pull requests, manual dispatch, and weekly scheduled checks. Cross-browser regression uses Chromium, Firefox, and WebKit.

## 12. Locked implementation decisions

- Variants are declared under each component's `variants` object. IDs use one safe group segment, a component segment, and at most three inherited subtheme segments.
- Remote URLs are explicit inputs to `loadRemoteEngineTheme()`. There is no Engine-hosted registry or implicit runtime fetch. Remote artifacts are pinned to exact Next.js/Engine versions and checked with canonical SHA-256; the digest is integrity metadata, not publisher authentication.
- The versioned `.etr` format is deterministic UTF-8 JSON with NENC generator metadata and a canonical digest excluding the digest field. Generated output under `.nextjs-engine/gen3/theme/` is ignored build output; publication is an explicit owner-controlled hosting/copy step.
- Data-API events are `join:left`, `join:right`, `join:top`, and `join:bottom`. Handler code is trusted project-local code; contexts are bounded cloned/frozen JSON data. Unknown handlers/events fail deterministically.
- Information blocks use `:::info`, `:::note`, `:::tip`, `:::warning`, `:::danger`, and `:::success` directives closed by `:::`. Directives in fenced code are left untouched.
- Provider token scopes are normalized to portable token categories. Provider colors are used only without a custom palette; explicit per-language palettes override the shared palette, and omitted token categories use the palette foreground.
- Font CSS/files require exact HTTPS origins. Google Fonts is built in; other providers including Bunny Fonts must be explicitly allowlisted. Development never downloads fonts; production supports fallback or strict-error behavior, bounded cache TTL, explicit refresh, and offline cache-only mode.
- Engine Lite is the dependency-free low-memory default. The optional `createShikiEngineHighlighterProvider()` adapts an initialized Shiki/TextMate tokenizer without adding Shiki to Engine's mandatory dependencies or loading extra grammars into every application.

## 13. Current status

The EngineTheme implementation is complete on branch `feat/enginetheme-foundation`. Previously open provider and TextMate items now have implementation and executable verification paths.

### Implemented in the current foundation

- Public `createTheme()` with local/global/remote scope, safe one-segment group IDs, three-level subtheme depth, JSON-only validation, deep freezing, and ID-based resolution.
- NENC `.etr` artifacts with deterministic JSON/SHA-256, protected output paths, atomic writes, and stale-artifact tracking; static compiler logic is in `src/engine/compiler/theme/3/compiler.ts`, reached through a thin plugin adapter.
- Pretty-please lightweight highlighting, provider/language/theme discovery, authoritative custom palettes, and per-language palettes including TypeScript versus Node.js. An optional first-party Shiki/TextMate adapter is available without a mandatory dependency.
- Safe declarative Engine Schema templates for code blocks, table headers/cells, and typed info-block syntax; local React adapters are registered by trusted code and never embedded in remote theme data.
- Typed event-driven Data-API join dispatch for left/right/top/bottom. It allocates events to local handlers and is not a preview/inspection API.
- Explicit remote `.etr` loader with exact HTTPS origin allowlists, redirect denial, bounded streaming, timeouts/cancellation, checksum/format/version validation, recursive bounded theme-data checks, CSS/network primitive rejection, local/private host rejection, safe CSS-variable/font validation, cache deduplication, and explicit unregister/cache-clear functions.
- Production-only NENC font compilation in `src/engine/compiler/font/3/compiler.ts` for local/global themes: bounded, allowlisted CSS/font downloads; local WOFF2/WOFF/TTF/OTF assets; content-hashed filenames; disk-cache reuse; explicit refresh; strict development-mode skip; configurable cache lifetime; offline cache-only mode; strict build-failure mode; and allowlist-constrained browser fallback.
- Updated EngineMarkdown demo, docs, and smoke/browser regression coverage.
- Deterministic Bunny Fonts-compatible CSS/font fixtures plus a real Google Fonts and Bunny Fonts strict-mode matrix in `.github/workflows/theme-font-providers.yml`.

### Verification

- Engine runtime CI passed on commit `9bfa59674d9d347f3bfca4614d390648cf8baf47`: https://github.com/Kate-alt-69/nextjs-engine/actions/runs/40193812216
- Engine cross-browser compatibility passed on the same commit, with Chromium, Firefox, and WebKit all green: https://github.com/Kate-alt-69/nextjs-engine/actions/runs/40193812178
- Runtime CI covered the theme compiler smoke, font compiler smoke, NENC build adapter, EngineMarkdown smoke, TypeScript type-check, Gen 3 production build, production bundle budgets, and Generation 3 browser/device/network tests.
- Font compiler smoke uses mocked stylesheet/font responses to verify content-addressed output, cache reuse, expiry refresh, and development-mode no-network behavior.
- Local command execution is unavailable through the connected repository workflow in this session; GitHub Actions is the runtime verification source.

### Completion status

The remaining font-provider and full-grammar work is now implemented rather than deferred: the highlighter can adapt an initialized Shiki/TextMate instance, and the live font-provider workflow validates real CSS/file retrieval plus local content-hashed output in strict mode. Engine Lite remains the dependency-free default.

The completed implementation commit `44657176e19df25a32f74e3bc7648c62f9fb6bbe` passed:
- Engine runtime CI, including EngineTheme smoke, TypeScript type-check, Generation 3 production build, bundle budgets, and browser/device/network checks: https://github.com/Kate-alt-69/nextjs-engine/actions/runs/40197381881
- Chromium, Firefox, and WebKit compatibility: https://github.com/Kate-alt-69/nextjs-engine/actions/runs/40197381875
- Strict live Google Fonts and Bunny Fonts production pipeline tests: https://github.com/Kate-alt-69/nextjs-engine/actions/runs/40197381921

Remote loading remains explicit and data-only. Theme files do not execute remote code. Font URLs are allowlisted for compile-time downloads and any browser fallback. Offline builds can reuse verified stale local cache entries but fail on a cache miss; strict failure mode avoids browser-import fallback when local output cannot be produced.
