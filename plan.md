# EngineTheme / createTheme / Pretty-please — Implementation Plan

**Status:** PLANNING ONLY. Do not implement until Kate explicitly says to proceed.  
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

This illustrates the shape only. Final variant syntax and exact property names must be settled before implementation.

ID model:

- Group: mycoolthemes
- Component theme: mycoolthemes.markdown
- Variant: mycoolthemes.markdown.dark
- Nested variant: mycoolthemes.markdown.1.2.560
- Allow at most three subtheme segments after the component segment.
- Variants inherit their parent and state only the differences.
- Centrally validate IDs, references, duplicates, unknown components, inheritance cycles, and depth.
- Define whether and how group-level naming may contain dots; avoid ambiguous parsing.

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

Define predictable precedence across defaults, inherited variants, shared tokens, component configuration, and explicit per-node overrides. Keep semantic UI tokens separate from syntax-highlight token colors.

## 3. .etr format, remote hosting, and NENC

Generated artifact path:

~~~text
.nextjs-engine/gen3/theme/<theme_name>.etr
~~~

The .etr is UTF-8 JSON representing a compiled theme group. Its envelope should include a format identifier/version, group ID/name, component definitions within a content field, the resolved Next.js and Engine versions used to generate it, and a SHA-256 digest.

Illustrative shape:

~~~json
{
  "format": "nextjs-engine-theme",
  "formatVersion": 1,
  "id": "mycoolthemes",
  "createdWith": {
    "nextjs": "<resolved version>",
    "nextjsEngine": "<resolved version>"
  },
  "sha256": "<digest of canonical payload>",
  "content": {
    "name": "My Cool Themes",
    "components": {
      "markdown": {}
    }
  }
}
~~~

This is not the final schema. Define canonical serialization, including exactly which fields are hashed and excluding the digest field itself. SHA-256 detects content changes relative to the supplied digest; it does not authenticate the publisher.

Remote handling:

- A remote .etr may be hosted at a user-controlled endpoint such as https://example.net/nextjs-engine/theme/dark-fantasy.etr.
- Do not require an Engine-hosted registry for the initial release.
- Decide how an ID resolves to a URL: explicit source URL, configured base URL, registry mapping, or another stable rule.
- Validate the JSON shape, format/schema version, requested ID, checksum, compatibility, and supported component features before use.
- Apply bounded response size, timeout, redirect revalidation, and safe URL rules.
- Cache results with an explicit version/freshness strategy. A production build should not silently change after a remote theme revision unless its configured update policy allows it.
- Remote content can declare schema templates, event rules, and registered adapter IDs, never inline JavaScript, JSX, arbitrary imports, or executable source.

All artifacts should be reproducible and incrementally cached. Theme changes and theme-compiler changes should invalidate the right artifacts without needlessly rebuilding unrelated schema output. Choose a safe deterministic filename and handle collisions. Decide whether generated artifacts are ignored build output, deployment artifacts, or copied by a publishing step.

Repository architecture note: gen3BuildCompiler.js is the Gen 3 source-discovery/schema-worker coordinator and gen3SchemaCache.js owns persistent schema-output caching. nencPlugin.js currently handles command manifests and generated command/favicon routes. Inspect call graphs before choosing the final integration point; prefer a focused theme-compiler module over overloading a command-specific module.

## 4. Theme resolution and type compatibility

Define shared tokens such as semantic colors, font stacks, spacing, borders/radii, and component surfaces. Define component-specific configuration for Markdown and later other Engine components.

Resolution needs deterministic inheritance and override rules, missing-ID errors, duplicate handling, cycle detection, and schema/version validation. Keep the existing vars/fonts/globalStyles behavior functional while ID resolution is introduced.

Relevant existing integration points:

- src/engine/schema/types.ts defines EngineTheme, PageSchema.theme, MarkdownProps, and EngineMarkdown style slots.
- src/engine/createPage.tsx currently emits vars as root CSS variables and handles fonts/globalStyles.
- src/engine/index.ts is the public export barrel.
- src/engine/core/validateSchema.ts is the schema validation path.

## 5. Pretty-please highlighting

Pretty-please should support automatic mode plus explicit provider/language choices. Its available-options list must reflect providers and grammars actually registered in the project.

Requirements:

- A provider/adapter registry supports the built-in option and user-selected compatible providers.
- Evaluate Shiki for the VS Code-like preset, but confirm language loading, bundle impact, and server rendering before adding it as a dependency.
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
- Supports composition events such as a table-header part joining from the left, right, top, or bottom; finalize exact event names and semantics before coding.
- Passes enough context for the handler to deal with existing content and the requested composition.
- Routes to a validated Engine Schema behavior or an explicitly registered trusted local React/Next.js handler.
- Defines deterministic missing-handler, unsupported-event, and error behavior.

Do not implement Data-API as inspect/preview/explain/compare tooling. Those operations came from a misunderstanding of the requirement.

EngineMarkdown currently documents CommonMark/GFM, blockquotes, and tables but has no documented dedicated information-block syntax. Decide the authoring syntax for information blocks alongside the template contract.

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

Use an Engine-owned cache below .nextjs-engine/.cache/gen3/; select the exact subdirectory after inspecting the build flow. Keep cache metadata separate from emitted build assets. Remote font and ETR fetches need HTTP(S) rules, redirect checks, timeouts, response-size/content-type limits, and protection against localhost/private-network access and arbitrary filesystem writes.

Inspect scripts/gen3-prepare-production.js and the existing production-build hooks before choosing where font work belongs. Do not introduce downloads into runtime rendering or dev-server requests.

## 8. Repository impact map

| Path | Planned role |
|---|---|
| src/engine/schema/types.ts | New typed theme-group, scope, ID reference, variant, template, event, palette and font contracts; retain old props. |
| src/engine/index.ts | Publicly export createTheme and its public types. |
| src/engine/createPage.tsx | Resolve theme IDs and keep legacy inline theme behavior. |
| src/engine/core/validateSchema.ts | Validate declarative theme references and structures. |
| src/engine/components/EngineMarkdownRenderer.tsx | Highlighting, palette application, layout/templates, table and information-block rendering. |
| src/engine/compiler/EngineServerRenderer.tsx | Integrate theme-driven Markdown into server-first output without unnecessary client hydration. |
| src/engine/core/markdownParser.ts | Preserve ANSI; add only language/color normalization that belongs here. |
| src/engine/compiler/EngineCompiler.ts | Check whether theme references/assets must be represented in compiler graph or dependencies. |
| src/engine/plugins/gen3BuildCompiler.js | Coordinate theme discovery/build and ETR generation or invoke a focused theme compiler. |
| src/engine/plugins/gen3SchemaCache.js | Include theme inputs in the correct cache fingerprints/invalidation paths if applicable. |
| src/engine/plugins/nencPlugin.js | Review integration boundary; retain command-manifest responsibility. |
| scripts/gen3-prepare-production.js | Review production asset integration for font compilation. |
| app/engine-markdown-test/page.tsx | Extend demo with theme IDs, highlighting, palettes, templates and information blocks. |
| tests/browser/engine-markdown.spec.ts | Add browser regressions without removing current ANSI/safety assertions. |
| docs/engine-components/enginemarkdown.md | Document public Markdown/theme/highlighting contracts. |
| docs/gen3/build-compiler.md | Document artifact generation, caching and font-build behavior. |
| package.json and existing lockfile, if present | Add only a justified highlighter dependency and focused smoke-test command after evaluation. |
| .gitignore | Decide explicitly how generated .etr artifacts are tracked or published; currently .nextjs-engine/.cache/ is ignored, not the whole theme output directory. |

Proposed new area: src/engine/theme/ for public construction/types, ID resolution, ETR serialization/validation, event dispatch, provider registry, and font cache helpers. Split files only where each has a clear responsibility. A dedicated Gen 3 theme compiler is preferred if it keeps the existing build coordinator manageable.

## 9. Implementation phases

### Phase 0 — Lock API contracts (no production implementation)

Finalize variant declaration syntax, ID grammar/depth cap, scope semantics, inheritance/override precedence, remote ID-to-URL mapping, .etr JSON/hash/version policy, Data-API event names/payload/results, adapter registration, info-block syntax, highlighter/palette fallback semantics, and font source/failure/cache rules.

### Phase 1 — Public theme model and backward compatibility

Add createTheme and public types, ID validation/resolution, scoped registries and subtheme inheritance. Support ID-only schema references without breaking inline EngineTheme. Add targeted tests for IDs, depth limit, conflicts, missing references, inheritance, and legacy behavior.

### Phase 2 — ETR compiler and remote resolver

Implement deterministic JSON serialization and SHA-256 validation. Integrate generation at .nextjs-engine/gen3/theme/<theme_name>.etr, add cache fingerprints/invalidation, resolve user-hosted remote ETR files safely, and add smoke tests in an isolated temporary project.

### Phase 3 — Pretty-please

Add provider/language discovery, automatic and explicit selection, aliases/fallback, a VS Code-like preset, language-specific authoritative palettes, and HEX/RGB/sRGB validation. Preserve ANSI output and Gen 3 server-first rendering. Verify bundle cost before accepting dependencies.

### Phase 4 — Templates and Data-API

Add declarative templates for code blocks, table cells, and information blocks. Implement placement independently from merge behavior; add typed event dispatch and trusted local adapter registration. Reject arbitrary code in remote data and test all supported join directions plus missing-handler behavior.

### Phase 5 — Production fonts

Keep dev links unchanged. Resolve/download permitted fonts during production build, emit local assets, rewrite CSS URLs, and cache by source plus content identity. Test cache hits, changed sources, corrupt cache, remote failures, URL safety and size/type restrictions.

### Phase 6 — Docs, demos, and regression verification

Update EngineMarkdown and Gen 3 compiler docs, extend the demo route, add focused theme/ETR/font smoke coverage, expand Playwright regressions, verify package exports, and review the complete diff for generated/cache files or unrelated changes.

## 10. Acceptance criteria

1. createTheme is exported, typed and side-effect-free with respect to network, publication and font downloads.
2. Existing inline EngineTheme and EngineMarkdown props still work.
3. Qualified component/subtheme references resolve; more than three subtheme segments fail validation.
4. NENC emits deterministic JSON .etr artifacts at the requested path for compiled groups.
5. The ETR contains group/component content, Next.js/Engine/schema version metadata, and a verified canonical SHA-256.
6. Local/global/remote have documented distinct behavior; remote hosting remains user-controlled.
7. Invalid, corrupted, incompatible, oversized or unsafe remote files are rejected; remote data never executes code or arbitrary imports.
8. Pretty-please supports auto/provider choice, discoverable languages, fallback and a VS Code-like preset.
9. Custom language palettes fully replace provider syntax colors and agreed HEX/RGB/sRGB values validate.
10. ANSI handling remains intact.
11. Templates define both appearance and composition; Data-API event dispatch matches its agreed contract and is not preview/inspection tooling.
12. Native React/Next components run only through trusted local adapter registration.
13. Dev does not download font files; production emits local font assets and reuses valid cache entries.
14. Type-check, build, focused smoke tests, and browser regressions pass; skipped checks are reported honestly.

## 11. Verification plan

Package scripts currently include npm run type-check, npm run build, and npm run test:browser. The build runs production preparation, type-check, and Next.js build. A focused Playwright run can target tests/browser/engine-markdown.spec.ts if supported by the installed CLI/config.

Existing smoke-test conventions include scripts/gen3-build-compiler-smoke.js and scripts/gen3-nenc-plugin-smoke.js. Reuse that style rather than adding a new test framework by default. Add theme smoke coverage for ID grammar, stable artifact/checksum output, cache invalidation, remote validation/no execution, palette replacement, ANSI compatibility, event dispatch, and font cache-hit/no-download behavior.

Run browser regressions on Chromium, Firefox, and WebKit wherever the repository's Playwright configuration enables them.

## 12. Decisions to leave open until confirmed

- Exact variant declaration syntax under markdown.
- Remote URL mapping strategy and cache freshness/pinning.
- Final .etr schema, compatibility policy, and whether publisher signatures are required.
- Data-API event names, payload/result contract, and adapter registration API.
- Exact information-block authoring syntax.
- Cross-provider token mapping and palette fallback for omitted token categories.
- Allowed font origins, required/optional failure behavior, and offline-build policy.
- Generated .etr ignore/publish workflow.

## 13. Current status

This is a plan only. Repository files were inspected; no source code, dependencies, tests, font files, generated outputs, or runtime behavior have been changed or implemented. Wait for Kate's explicit implementation instruction before beginning implementation.


## 14. Custom UI components, registry integration, and EngineTheme bindings

This section extends the existing theme plan with a public custom-component authoring path. It is a proposal, not an implementation instruction; preserve the planning-only status above until Kate explicitly approves implementation.

### What exists today on `main-3`

The current API already exports `createComponent()`, `registerComponent()`, `unregisterComponent()`, `getComponent()`, `hasComponent()`, and `registeredTypes()`.

- `createComponent(options)` accepts a `PageSchema` (or direct schema options) and returns a React component that renders that schema. It is currently a schema-backed composition helper, not a factory for defining a new component type.
- `registerComponent(type, component)` puts a trusted React component into the runtime schema-node registry. Schema nodes can then refer to that registered node type.
- The current `EngineTheme` type only supports page-level `vars`, `fonts`, and `globalStyles`. It does not yet describe per-component themes, variants, or theme IDs.
- The registry is currently a module-level mutable map. That is simple, but custom registrations need clear ownership and isolation rules for multi-app builds, tests, server rendering, and development hot reload.

These facts mean the pieces are already adjacent, but a stable custom-component contract and the EngineTheme-to-component resolution path still need to be designed.

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

The following is a design sketch, not code that should be copied as an implemented contract:

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

Use one shared resolver for built-in and custom components. A proposed precedence, from weakest to strongest, is:

1. Engine/built-in component defaults.
2. Theme-group shared tokens and the component's base theme.
3. Inherited named variants.
4. Component-definition default theme reference.
5. Schema-node theme ID/variant.
6. Explicit, validated per-node style overrides.

Finalize precedence against the existing `vars` / `fonts` / `globalStyles` behavior before implementation. Do not allow a custom component to bypass schema validation or override reserved engine/runtime attributes. Unknown theme IDs, incompatible component IDs, inheritance cycles, and invalid values should produce actionable development diagnostics and deterministic production fallbacks.

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

The Data-API should be a typed, narrow event/slot contract for declared behavior (for example, a link activation or a template composition event), not a general-purpose callback that evaluates arbitrary strings from schema/theme data.

- Define supported event names, payloads, cancellation/error behavior, and whether each event is server-only, client-only, or serializable.
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
- The exact Data-API event list and handler registration contract.
