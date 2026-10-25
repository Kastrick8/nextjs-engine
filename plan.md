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
- The versioned `.etr` format is deterministic UTF-8 JSON with separate envelope `formatVersion` and theme `schemaVersion`, NENC generator metadata, exact Next.js/Engine versions, and a canonical SHA-256 excluding the digest field. The digest is integrity metadata rather than a publisher signature. Generated output under `.nextjs-engine/gen3/theme/` is ignored build output; publication is an explicit owner-controlled hosting/copy step.
- Data-API events are `join:left`, `join:right`, `join:top`, and `join:bottom`. Handler code is trusted project-local code; contexts are bounded cloned/frozen JSON data. Declarative templates can bind handlers through `dataApi`; results can provide `operation` plus `value` and render through the `dataResult` slot. These synchronous render-time transforms must be deterministic and side-effect-free; unknown handlers/events fail deterministically.
- Template composition keeps `merge` and `placement` independent. For `append`/`prepend`, all four physical sides are valid; missing placement defaults to bottom/top respectively. The flex axis reverses when necessary, while DOM order continues to follow merge semantics.
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
- Safe declarative Engine Schema templates for code blocks, table headers/cells, and typed info-block syntax; `wrap`, `replace`, `append`, and `prepend` merge modes are distinct from physical `placement`, with bounded responsive layout options. The template Data-API is wired to registered local handlers and exposes results through `dataResult`; local React adapters are registered by trusted code and never embedded in remote theme data.
- Typed event-driven Data-API join dispatch for left/right/top/bottom. It allocates events to local handlers and is not a preview/inspection API.
- Explicit remote `.etr` loader with exact HTTPS origin allowlists, redirect denial, bounded streaming, timeouts/cancellation, checksum/format/version validation, recursive bounded theme-data checks, CSS/network primitive rejection, local/private host rejection, safe CSS-variable/font validation, cache deduplication, and explicit unregister/cache-clear functions.
- Production-only NENC font compilation in `src/engine/compiler/font/3/compiler.ts` for local/global themes: bounded, allowlisted CSS/font downloads; local WOFF2/WOFF/TTF/OTF assets; content-hashed filenames; disk-cache reuse; explicit refresh; strict development-mode skip; configurable cache lifetime; offline cache-only mode; strict build-failure mode; and allowlist-constrained browser fallback.
- Updated EngineMarkdown demo, docs, and smoke/browser regression coverage.
- Deterministic Bunny Fonts-compatible CSS/font fixtures plus a real Google Fonts and Bunny Fonts strict-mode matrix in `.github/workflows/theme-font-providers.yml`.

### Verification

Completion commit `e80c01ff83efad92298da999c6027be33ccb4c3a` passed all three GitHub Actions workflows:

- [Engine runtime CI](https://github.com/Kate-alt-69/nextjs-engine/actions/runs/40201234530) — EngineTheme artifact/compiler smoke, NENC integration, TypeScript type-check, Generation 3 production build, EngineDebug exclusion, production bundle budgets, and the combined browser/device/network suite all passed.
- [Chromium, Firefox, and WebKit compatibility](https://github.com/Kate-alt-69/nextjs-engine/actions/runs/40201234585) — all three browser jobs passed.
- [Strict live Google Fonts and Bunny Fonts pipeline](https://github.com/Kate-alt-69/nextjs-engine/actions/runs/40201234537) — both real-provider builds passed with strict failure policy and locally emitted content-hashed assets.

The focused smoke script also covers .etr schema-version rejection, palette inheritance/replacement, all four Data-API join directions, placement/merge combinations, Data-API result slots, Shiki token safety, ANSI compatibility, and font cache/offline/failure behavior. CI artifacts and test results are the verification source because local shell execution is not available through the connected repository workflow in this session.

### Completion status

The remaining font-provider and full-grammar work is implemented rather than deferred: the optional adapter uses an already-initialized Shiki/TextMate highlighter, and the live-font workflow exercises real Google Fonts and Bunny Fonts retrieval plus local content-hashed output under strict failure policy. Engine Lite remains the dependency-free low-memory default.

Remote loading remains explicit and data-only. Theme files do not execute remote code. Font URLs are allowlisted for compile-time downloads and any browser fallback. Offline builds can reuse verified stale local cache entries but fail on a cache miss; strict failure mode avoids browser-import fallback when local output cannot be produced.
## 14. Custom UI components, registry integration, and EngineTheme bindings

This section is a separate proposal for a future custom-component authoring path. The EngineTheme work recorded above is implemented; the distinct `defineComponent()` authoring API and its generic registry/theme binding remain open design work. This proposal does not mean EngineTheme itself is unfinished.

### What exists today on `main-3`

The current API already exports `createComponent()`, `registerComponent()`, `unregisterComponent()`, `getComponent()`, `hasComponent()`, and `registeredTypes()`.

- `createComponent(options)` accepts a `PageSchema` (or direct schema options) and returns a React component that renders that schema. It is currently a schema-backed composition helper, not a factory for defining a new component type.
- `registerComponent(type, component)` puts a trusted React component into the runtime schema-node registry. Schema nodes can then refer to that registered node type.
- EngineTheme now supports reusable groups, `components` namespaces, named variants/qualified IDs, local/global/remote scopes, Markdown theme resolution, deterministic `.etr` artifacts, and explicit verified remote loading. What remains open is the general contract binding EngineTheme IDs/values to arbitrary registered schema-node components, props and slots.
- The registry is currently a module-level mutable map. That is simple, but custom registrations need clear ownership and isolation rules for multi-app builds, tests, server rendering, and development hot reload.

These facts mean the pieces are adjacent, but a stable custom-component contract and a request-safe, general EngineTheme-to-custom-component binding path still need to be designed. The existing Markdown resolver and EngineTheme Data-API contracts should remain compatible.

### Recommended API boundary

Do not repurpose the existing `createComponent(schema)` call to mean something different. Keep it backward-compatible for composing schema trees, and introduce a distinct authoring API—provisionally `defineComponent()`—for trusted custom React components. A separately named API is easier to type, explain, and maintain than a heavily overloaded function.

The proposed responsibilities are:

1. **`createTheme()`** defines reusable theme data: shared tokens, a component's default appearance, named variants, and safe declarative templates.
2. **`defineComponent()`** describes a custom component's stable ID, prop contract, trusted local React implementation/adapter, supported slots, and optional default theme reference.
3. **`registerComponent()` / component registry** makes that definition available to a schema-rendering context. Existing direct registry calls remain supported as a low-level compatibility path.
4. **`createComponent()`** continues to compose a schema-backed React component. It may accept an optional theme context/reference for the schema it wraps, but should not silently become the custom React-component factory.
5. **`defineSchema()` / `PageSchema`** references registered node types and selects theme IDs/variants without embedding executable component code.
6. **Data-API** describes supported events and declarative composition behavior. It must not become a generic JavaScript execution hook.

Names and exact type shapes are provisional until the API review. The important contract is the separation of *defining code*, *registering a component*, *selecting its theme*, and *composing schema data*.

### Illustrative API shape

The following is a design sketch for the future custom-component API, not code that should be copied as an implemented contract. `createTheme()` and its Markdown theme/variant resolution already exist; `defineComponent()`, custom-component `theme` bindings and the sample prop/slot schema are still proposals.

~~~tsx
import {
  createTheme,
  defineComponent,
  registerComponent,
  defineSchema,
  createComponent,
} from "nextjs-engine";
import type { EngineLinkProps } from "nextjs-engine";

export const siteTheme = createTheme({
  id: "site",
  scope: "global",
  components: {
    link: {
      defaults: {
        color: "var(--site-link)",
        textDecoration: "underline",
        underlineOffset: "0.2em",
      },
      variants: {
        quiet: { textDecoration: "none" },
        button: { /* declarative surface, spacing and focus tokens */ },
      },
    },
  },
});

// Trusted application code owns the actual behavior and accessibility.
export const CustomLink = defineComponent({
  id: "site-link",
  component: SiteLinkImplementation,
  props: linkPropsSchema,
  slots: ["children"],
  theme: "site.link",
});

registerComponent("site-link", CustomLink);

const schema = defineSchema({
  root: {
    type: "site-link",
    props: {
      href: "/guide",
      theme: "site.link.quiet",
      children: "Read the guide",
    },
  },
});

export const GuideLink = createComponent({ schema });
~~~

This sketch intentionally leaves the exact prop/slot representation open: current `SchemaNode` stores generic `props`, while React children and Engine's named slots have existing runtime semantics that must be reconciled before finalizing the syntax. Do not assume that passing a `theme` prop alone applies styling; the renderer must resolve the theme ID, validate it, and deliver the resolved values to a supported component/theme adapter.

### Theme resolution and precedence

Use one shared resolver for built-in and custom components. The EngineTheme group/variant mechanism and Markdown-specific precedence are already implemented; the following precedence is proposed only for the future generic custom-component binding path, and must not silently change current Markdown behavior:

1. Engine/built-in component defaults.
2. Theme-group shared tokens and the component's base theme.
3. Inherited named variants.
4. Component-definition default theme reference.
5. Schema-node theme ID/variant.
6. Explicit, validated per-node style overrides.

Integrate this proposed precedence with the implemented group tokens, variant inheritance, `vars`, `fonts`, and `globalStyles` behavior without changing their existing contract. Do not allow a custom component to bypass schema validation or override reserved engine/runtime attributes. Unknown theme IDs, incompatible component IDs, inheritance cycles, and invalid values should produce actionable development diagnostics and deterministic production fallbacks.

The theme compiler should emit normalized declarative data, not a generated JavaScript module for arbitrary theme code. Theme lookup should happen during compilation/build when possible; avoid per-node network requests, repeated parsing, or expensive style recalculation during render. Reuse the existing deterministic cache/fingerprint approach, and invalidate only the affected theme/component artifacts.

### Custom links as the first end-to-end example

A custom link is a good proof of concept because the repo already has `EngineLink` and `EngineTransitionLink`, a registered `link` node, and shared schema rendering. The example should prove that users can:

- create a custom link implementation or adapter using normal typed React props;
- register it under an application-owned schema-node type without replacing the built-in `link`;
- define default styling and named variants in `createTheme()`;
- select a theme/variant in schema data and reuse the same component across pages;
- preserve safe URL handling, keyboard navigation, focus-visible styling, accessible names, and target/rel behavior;
- keep theme appearance separate from navigation behavior, transition behavior, and Data-API event handlers.

Do not require users to fork or edit Engine's built-in `EngineLink` just to create a differently styled link. Conversely, do not automatically let a remote theme replace the behavior of a trusted local link component.

### Registry and framework boundaries

- Custom React/Next.js implementations are trusted local code and must be imported/registered through a documented project-local entry point. Remote `.etr` files can name an already registered adapter ID; they cannot provide JSX, imports, JavaScript, or a module URL to execute.
- Review whether registrations should be explicit per-app/per-renderer registry instances rather than global mutation. Server rendering must not allow one request or tenant's registration/theme to leak into another.
- Preserve lazy-loading for optional/heavy components. A custom component should not force every route to eagerly import all registered components.
- Keep schema registration compatible with Gen 3's server-first rendering. Make client-only requirements explicit; do not silently force an entire page onto the legacy client renderer because a component uses one event handler.
- Keep browser behavior generic across Chromium, Firefox, and WebKit, and provide graceful fallback when optional capabilities are unavailable.
- Define how TypeScript prop schemas, runtime schema validation, slot values, serializability, and React children map to `SchemaNode`. Reject unsupported or unsafe values at the boundary.

### Data-API integration

The implemented EngineTheme Data-API already provides typed `join:left`, `join:right`, `join:top`, and `join:bottom` events and is wired to declarative Markdown-template composition through `dataApi` and `dataResult`. Preserve that contract. Any future custom-component/link activation events must be added as an explicit extension; the Data-API must remain a narrow declared behavior contract, not a general-purpose callback that evaluates arbitrary strings from schema/theme data.

- For any new custom-component events, define names, payloads, cancellation/error behavior, and whether each event is server-only, client-only, or serializable. Do not redesign the already implemented `join:*` event contract implicitly.
- Resolve handler names only against trusted local registrations supplied by the application; never evaluate a handler body from schema or remote theme data.
- Keep styling/template composition independent from event dispatch so users can change a link's appearance without changing its navigation or security behavior.
- Add bounds for recursion/template nesting and validate slot/placement rules before rendering.
- Document the trust boundary clearly: app code implements behavior; schema and themes select among declared capabilities.

### Suggested implementation order and acceptance criteria

1. Finalize the public type model and backward-compatibility tests for the existing `createComponent(schema)` and direct `registerComponent(type, component)` APIs.
2. Implement the custom component descriptor/authoring API and a safe registry integration path, including app/request isolation decisions.
3. Add component theme IDs and variant resolution to schema validation and the shared theme resolver.
4. Implement the custom link example as the first registered custom component, with keyboard/accessibility and URL-safety tests.
5. Connect the declarative Data-API contract only for explicitly supported events and slots.
6. Add server-first, browser-compatibility, cache invalidation, malformed theme, missing component, unknown theme, and cross-request isolation tests.
7. Update the simple and detailed documentation only after the API shape is stable and verified.

Acceptance criteria:

- Existing `createComponent({ schema })` calls continue to behave as before.
- A user can define and register a custom component without modifying Engine source or overwriting a built-in registry entry.
- A schema node can choose a registered component and a valid theme/variant ID.
- Built-in and custom components use the same deterministic theme-resolution rules.
- Theme data remains declarative and cannot execute remote code.
- Custom link variants preserve accessible, safe link behavior.
- Registry/theme state cannot leak between unrelated requests or app contexts.
- Gen 3 server-first rendering and optional-component code splitting remain intact.
- Type-check, targeted component/theme tests, build smoke tests, and Chromium/Firefox/WebKit regressions pass before this feature is marked complete.

### Decisions still open

- Whether the final public factory name is `defineComponent()`, `createCustomComponent()`, or another unambiguous name.
- Whether custom definitions register immediately or return a descriptor that is explicitly registered.
- Whether `createComponent()` accepts an optional theme reference for schema composition, and the exact placement of that option.
- The final typed prop-schema format and how named slots/children serialize through `SchemaNode`.
- Whether component registries are explicit objects passed through schema/render context or safely scoped registries created by a project bootstrap.
- Exact custom-link props and whether theme IDs live in a reserved schema field or validated component props.
- Any additional custom-component event list and how those events interact with the existing local-handler/slot contract.

## 15. General API and EnginePlugin system

This proposal expands Nextjs Engine from a collection of public helpers into a deliberate extension platform. The General API/EnginePlugin system is a separate future proposal, not an instruction to implement it now. EngineTheme itself is implemented as described in Section 13; any future extension system must preserve its public contracts and existing compatibility boundaries.

### Goal and terminology

Provide one discoverable General API through which first-party modules, custom UI/theme packages, and compatible third-party packages can integrate with supported parts of Nextjs Engine. Add an EnginePlugin host that loads trusted project plugin files and lets those plugins contribute to declared extension points.

The design should be approachable for a basic use case and expressive enough for advanced integrations:

- **General API** is the stable public facade for supported Engine capabilities and extension contracts. It provides one consistent route into the Engine workload without requiring packages to import private files from `src/engine/`.
- **EnginePlugin** is an opted-in integration module that declares its identity, compatibility, requested capabilities, target extension points, setup behavior, and optional lifecycle handlers.
- **Extension point** is a named, typed, versioned integration surface explicitly published by a package. A plugin can connect only to extension points the target package exposes and the host allows.
- **Adapter package** is a regular package that provides a small plugin or adapter module to connect its own functionality to Engine. The package may document how users install it and enable the corresponding local plugin.
- **Plugin host** discovers/loads enabled plugin modules, validates their declarations, creates scoped API contexts, orders registrations, and owns cleanup/error reporting.

Do not treat “General API” as permission to import or mutate every implementation detail. The API should make the workload discoverable while preserving stable boundaries, separate server/build/browser concerns, and clearly mark experimental or internal surfaces.

### Proposed public entry points

Names and package exports are provisional until the export map and versioning policy are reviewed.

- `nextjs-engine`: preserve the existing consumer-facing public API and backwards compatibility.
- `nextjs-engine/api`: stable, typed General API contracts and supported capability facades for packages integrating with Engine.
- `nextjs-engine/plugin`: plugin author helpers and types such as `defineEnginePlugin`; host-side loader APIs should be explicitly server/build-only and must not be imported into client components.
- `nextjs-engine/server`: continue to contain server-only APIs; never make server-only capabilities transitively available from the browser-safe root or API entry point.
- `nextjs-engine/experimental`: optional staging surface for contracts that are not yet stable, if the project wants to publish them before graduation.

The General API should group capabilities by domain instead of exposing one undifferentiated object full of private methods. Candidate domains include components/registry, themes, schema, Data-API, Markdown/rendering, compiler/build, assets, diagnostics, runtime profiles, and framework adapters. Each domain must explicitly declare its environment, mutability, stability, and version contract. The existing public exports are the compatibility baseline, not a reason to re-export every internal module.

### Extension ownership: no hooks into null

A plugin may integrate with “any package” only when that package provides a compatible, documented extension point or adapter. The host must reject unknown targets rather than guessing a private symbol, monkey-patching a dependency, rewriting installed package files, or silently falling back to internal imports.

Each package that wants to be extensible should publish a catalog of extension points with:

- a stable, namespaced ID and API/contract version;
- supported lifecycle phase and runtime environment (build, Node.js server, browser/client, or more than one when explicitly safe);
- the exact typed input/output or contribution schema;
- allowed operations/capabilities and whether a hook may return a value, add a contribution, or transform a value;
- ordering/composition rules, concurrency behavior, error semantics, and cleanup expectations;
- stability status (stable, experimental, deprecated) and compatibility/migration rules.

The Engine package can publish its own extension points; a third-party package must opt in by publishing an adapter interface, extension provider, or plugin API of its own. A plugin can then target that package's public contract. If a package offers no extension point, the supported answer is “not extensible through EnginePlugin yet,” with a request to add an adapter—not an unsafe promise that any dependency can be intercepted.

Potential first-party extension-point families:

- `engine.component.register`: contribute a uniquely named custom component descriptor.
- `engine.theme.define` / `engine.theme.resolve`: add theme data and validated resolution contributions.
- `engine.schema.validate`: add declared schema validators or schema-node kinds through a controlled contract.
- `engine.markdown.render`: register trusted local rendering adapters or declarative templates.
- `engine.compiler.beforeCompile`, `engine.compiler.afterCompile`, and narrowly scoped asset/diagnostic contributions: build-time integration only where the compiler contract explicitly permits it.
- `engine.runtime.profile`: contribute a compatible runtime profile through the existing runtime-profile contract.
- Framework-specific targets such as a Next.js build adapter must remain separate and versioned against the actual Next.js integration surface.

These are candidate names for design discussion, not existing APIs. Do not mark an extension point as stable until its lifecycle, types, ordering, and tests exist.

### Project plugin location and discovery

The user-facing project convention should support files under the consuming project's root `/plugins/` directory, not require edits inside `node_modules/nextjs-engine`. This lets a separately published package instruct users to install the package and add or import a thin plugin file into their own project.

Use a deliberately recognizable file pattern such as:

- `plugins/acme-theme.engine-plugin.ts`
- `plugins/acme-markdown.engine-plugin.js`

Do not execute every `.js` or `.ts` file found in the folder. The final design must select an explicit policy: either a deliberate allow-list in project Engine configuration or opt-in discovery limited to the recognized `*.engine-plugin.{js,ts}` pattern. In either design, loading plugins must be visibly enabled, deterministic, and easy to inspect. A discovered file that is not enabled must not run.

For initial ergonomics, support a local plugin file and a package-provided adapter where feasible. For example, an integration package could expose a public plugin entry that the project config references, or provide a small local file that imports its adapter. The package's installation instructions must state which approach it supports, the required package version, and the exact enablement step. Avoid requiring users to copy large or generated implementation files into their app.

The plugin loader must settle the JavaScript/TypeScript module contract before implementation:

- Support `.js` and `.ts` with a documented ESM/CommonJS policy compatible with the project's supported Node.js and build tool versions.
- Do not assume every supported Node.js runtime can execute TypeScript directly. Where transpilation is needed, use a deliberate supported build-time path and cache its output safely; do not use eval or ship the loader into browser code.
- Resolve only paths inside the project/plugin locations or supported installed package exports. Normalize paths, reject traversal and unexpected symlink escapes, and emit a clear diagnostic for invalid locations.
- Avoid remote JavaScript imports or downloading and executing a plugin from a URL. Remote theme/data artifacts remain non-executable and separate from trusted plugin code.
- Do not scan recursively on every route render or compiler pass. Discover and validate once in the correct host lifecycle, then reuse a bounded, deterministic plugin manifest/cache.

### Illustrative plugin authoring contract

This is a design sketch, not an implemented or finalized signature:

~~~ts
import { defineEnginePlugin } from "nextjs-engine/plugin";

export default defineEnginePlugin({
  id: "acme-site-theme",
  apiVersion: "^1",
  engineVersion: "^3",
  targets: ["engine.theme.define", "engine.component.register"],
  capabilities: ["theme.define", "component.register"],
  setup(api) {
    const theme = api.themes.define({
      id: "acme-site",
      components: {
        link: {
          defaults: { color: "var(--acme-link)" },
          variants: { quiet: { textDecoration: "none" } },
        },
      },
    });

    api.components.register({
      id: "acme-link",
      component: AcmeLink,
      theme: theme.component("link"),
    });
  },
});
~~~

The exact chaining and descriptor shapes are open. The contract should consistently separate these concerns:

1. The plugin manifest declares identity, compatibility range, target extension points, requested capabilities, dependencies, and environment needs.
2. The host validates the manifest and compatibility before running plugin code, then builds a scoped API from the capabilities actually allowed.
3. Setup registers descriptors/contributions through supported methods; it should not receive a mutable reference to internal global maps.
4. The package/host validates registrations, reports conflicts, and resolves contributions according to declared rules.
5. If a lifecycle exposes asynchronous operations, the phase must document whether they are awaited and what failure means.
6. Cleanup/disposal removes registrations and subscriptions owned by that plugin when a development reload or host context ends.

Do not force a beginner to write hooks, compiler passes, or low-level adapters just to publish a theme or component. Provide a simple mode that calls high-level helpers, while advanced plugins can use explicitly versioned lower-level extension contracts.

### General API responsibilities and extension boundaries

The General API should provide a consistent set of typed facades that map to existing subsystem APIs and future subsystem contracts:

- **Components:** define a custom component descriptor, validate its props/slots, register it under an application-owned ID, and preserve built-in registrations unless explicit replacement is supported by a deliberate override policy.
- **Themes:** create and extend theme data, reference tokens and component variants, and resolve the theme through the same shared resolver proposed in Section 14.
- **Schema:** declare custom node types and validators without embedding JavaScript in schema data.
- **Data-API:** declare supported event/slot contracts and bind named handlers to trusted local registrations; never evaluate code written into schema or theme values.
- **Compiler/build:** use named, typed compiler phases and contribution points. Do not allow arbitrary source replacement, mutation of compiler internals, or unrestricted rewrite passes by default.
- **Assets:** register declared asset types/resolvers with URL, size, origin, and content validation; cache work by stable fingerprints.
- **Diagnostics:** report plugin ID, target, phase, path, and actionable cause, with severity and production/development behavior.
- **Framework integration:** expose a separate adapter boundary for Next.js and any other cooperating framework, versioned to that framework's published API.

A capability should not be exposed just because a module happens to export a function today. First define its behavior and compatibility. Use explicit stable, experimental, and internal classifications, and avoid exporting mutable internal registries as the integration mechanism.

### EnginePlugin lifecycle and deterministic composition

The host should define a single, documented lifecycle. A candidate order is:

1. **Discover:** locate only enabled plugin entry points using the configured policy.
2. **Load and describe:** import the module in a permitted build/server environment and read its manifest.
3. **Validate:** check the manifest schema, duplicate IDs, Engine/API version compatibility, declared target IDs, requested capabilities, and module environment.
4. **Plan order:** resolve declared plugin dependencies and ordering constraints; reject missing dependencies and ordering cycles. Use a deterministic tie-break rule for otherwise independent plugins.
5. **Register:** create the scoped API and collect component/theme/schema/adapter contributions without mutating process-global singletons.
6. **Execute phase hooks:** invoke only hooks supported for the current phase; await async handlers only where the contract allows it.
7. **Finalize:** produce a normalized plugin/contribution manifest that the relevant compiler and cache can fingerprint.
8. **Dispose/reload:** release subscriptions, remove owned contributions, and rebuild the affected context during HMR or shutdown.

Define duplicate-ID and conflict behavior explicitly. In general, collisions should produce a clear diagnostic rather than “last plugin wins.” Override behavior, where needed, should be opt-in, scoped, visible in the plugin manifest, and prohibited for reserved internal/system-owned IDs.

Plugin errors should identify the plugin, extension point, and lifecycle phase. Required plugin failures should fail the relevant build/startup phase rather than silently producing a partly configured app; optional plugins may declare an explicit optional policy and warning/fallback behavior. Never swallow errors without an actionable diagnostic.

### Permissions, trust, and security model

EnginePlugin files are trusted local JavaScript/TypeScript code and normally execute with the privileges of the process loading them. A declared capability list is an allow-list enforced by the EnginePlugin host; it is not a security sandbox against malicious code that imports Node.js filesystem, networking, or process APIs directly. Documentation and diagnostics must not imply otherwise.

- Require each plugin to declare the capabilities it requests; expose only those capability methods through its scoped General API context.
- Require the project to enable the plugin and approve any sensitive capability category defined by the policy. No permission should be inferred only from a package name or a file's presence.
- Separate build, server, and client code. Build/server plugins must never be imported into a client bundle. Client contributions must be deliberately serializable or explicitly imported through React's supported client/server component boundaries.
- Keep server/request state and registry instances isolated per application or render context where needed. One tenant, build, test, or request must not leak component registrations, theme changes, handlers, or secrets into another.
- Treat plugins as trusted dependency code: inspect the source and package provenance before enabling unfamiliar plugins. A manifest or permission declaration alone cannot make arbitrary third-party code safe.
- Never give plugin APIs a broader mutation mechanism than an extension point requires. Do not provide raw internal maps, unbounded file/network helpers, shell execution, or secret-bearing environment snapshots as convenience features.
- Validate paths, URL schemes/origins, serialized data, payload sizes, recursion depth, and all cross-boundary values. Keep remote .etr theme content declarative and non-executable as established in the existing plan.
- Include a future-compatible option for an isolated worker/process or constrained declarative plugin format if genuinely untrusted extensions become a requirement; do not promise that an in-process JavaScript plugin is sandboxed.

### Compatibility with Next.js and other packages

EnginePlugin is Nextjs Engine's plugin system; it must not be confused with a promise that Next.js exposes all of its internal hooks. Framework integration must use the supported boundary for the specific operation and version.

Current official Next.js documentation describes `experimental.adapterPath` as an experimental build adapter entry point ([Next.js adapterPath documentation](https://nextjs.org/docs/app/api-reference/config/next-config-js/adapterPath)). The custom webpack configuration documentation warns that webpack config changes are not covered by semver ([Next.js webpack configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/webpack)). The instrumentation registration lifecycle is for server-startup integrations, not a general hook into arbitrary package internals ([Next.js instrumentation](https://nextjs.org/docs/app/guides/instrumentation)). These are distinct mechanisms and must not be wrapped in a false claim of a universal Next.js plugin API.

For any framework-specific adapter, record the framework version/range, supported lifecycle phase, behavior under dev/build/production, and the corresponding compatibility tests. If the necessary framework hook is experimental, label the integration experimental and do not make it a core stable guarantee.

A third-party package should integrate through a small public adapter rather than ask users to patch code in Engine or the dependency. If the package has no compatible extension contract, a package maintainer must first expose one or Engine must add a deliberate adapter.

### Performance and low-end hardware requirements

- Keep plugin discovery and manifest validation out of per-component and per-request hot paths unless request-scoped semantics explicitly require it.
- Create separate immutable or controlled registry snapshots for each app/build context. Cache normalized contributions using deterministic fingerprints that include plugin identity/version, API contract version, declared targets, and relevant configuration—not transient object identity alone.
- Invalidate only affected components, themes, schema validators, compiled pages, or asset outputs when a plugin changes.
- Do not eagerly load every optional UI implementation. Preserve the registry's lazy-loading approach and allow plugin metadata registration without importing a heavy browser-only dependency.
- Bound plugin counts, manifest size, recursion, async work, generated output, and cache growth; report budget violations clearly.
- Keep browser work independent from build-time plugin initialization. Prefer server/build processing for metadata, theme normalization, and compilation when the result can be safely serialized.
- Use predictable failure/fallback behavior on constrained environments. Avoid making a plugin system mandatory for ordinary Engine apps; a project with zero plugins should have effectively no recurring plugin overhead.

### Suggested implementation phases

1. **Inventory and contract map:** inspect package/export boundaries, all existing registries, compiler phase entry points, theme/schema/Markdown/Data-API integrations, current config conventions, and server/client separation. Classify every candidate extension point as stable, experimental, or internal. Do not decide on names from assumptions alone.
2. **General API design:** agree on public subpaths, stable types, capability names, compatibility/version policy, context ownership, and how existing root exports map to the new facade. Preserve old APIs while gradually routing supported extensibility through shared contracts.
3. **Plugin manifest and configuration:** define the manifest, project plugin location, recognized filename convention, allow-list/discovery policy, .js/.ts module strategy, compatibility validation, diagnostics, and developer inspection output.
4. **Host and lifecycle:** implement discovery/loading, capability-scoped API construction, dependency ordering, idempotent registration, error handling, context isolation, cleanup, and HMR behavior.
5. **First end-to-end Engine use case:** create a plugin that registers a custom component and extends EngineTheme using the shared resolver from Section 14. Start with a custom link variant, prove safe URL/accessibility behavior, and keep theme styling separate from link behavior.
6. **Package-to-package integration:** add one narrow extension point in a cooperating Engine package and one example adapter package. Demonstrate the real installation and enablement workflow. Only then broaden the extension catalog.
7. **Verification and documentation:** add contract, security, compatibility, performance, and regression tests; document basic and advanced plugin authoring; publish stable API contracts only after the implementation and tests justify them.

### Acceptance criteria

- A public, discoverable General API exists with typed, versioned contracts and clear environment/stability classifications.
- Existing exports and existing component registrations continue to behave as documented; the new system does not require users to rewrite simple Engine usage.
- A user can enable a local `.js` or `.ts` plugin through the documented `/plugins/` workflow without editing `node_modules`.
- Plugin files execute only under the selected explicit enablement/discovery policy; unrelated files in `/plugins/` are not accidentally executed.
- Invalid manifests, unsupported API versions, unknown target points, missing capabilities/dependencies, duplicate IDs, unsafe paths, and dependency cycles fail with actionable diagnostics.
- An opted-in package can be extended through its declared public contract; a package with no extension point is rejected rather than silently monkey-patched.
- Component/theme/schema/Data-API contributions use the General API and Section 14's shared resolution rules, with request/context isolation.
- Build, server, and client plugin work remains separated; server-only code does not enter client bundles.
- Remote .etr/theme/schema data cannot execute plugin code or import modules.
- Cache invalidation is deterministic and scoped; no-plugin apps pay no significant recurring discovery/render cost.
- Tests cover plugin ordering, conflict policy, API-version mismatch, permissions, loader behavior for supported JS/TS modes, HMR disposal, SSR/request isolation, malformed plugin data, build failure semantics, and low-end performance budgets.
- Type-check, build, focused plugin/component/theme smoke tests, and relevant Chromium/Firefox/WebKit regressions pass before the system is considered complete.

### Decisions still open

- Final public names and export map: whether the facade is named `EngineGeneralAPI`, what lives at `nextjs-engine/api`, and which helpers live at `nextjs-engine/plugin`.
- Whether plugin discovery is explicit-config-only, recognized-pattern auto-discovery after global opt-in, or a supported combination.
- Minimum Node.js/toolchain requirements and the supported module/transpilation strategy for `.js` and `.ts` plugins.
- Final manifest shape, package metadata convention, capability vocabulary, and whether permissions are grouped by risk or by API domain.
- The lifecycle hook list, ordering/conflict policy, async behavior, cleanup contract, and which contribution types can mutate or only add data.
- Whether plugin contexts are per build, per application, per request, or composed across these scopes; request state must never be stored in a process-global registry.
- Which initial extension points are stable and which remain experimental, including the future-facing Next.js adapter boundary.
- The smallest package-to-package proof of concept after the extension-point inventory.
