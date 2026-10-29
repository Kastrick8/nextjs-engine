# Next.js Engine

**Next.js Engine (NE)** is a schema-driven rendering/runtime layer for React 19 and Next.js 16.

Instead of rebuilding the same rendering, responsive, lazy-loading, navigation, graphics, API, motion, and browser plumbing in every app, NE lets you describe UI as typed schema objects and routes that schema through shared Engine systems.

**Current Gen 3 source version:** `3.0.0-alpha.1` (`main-3/package.json`)  
**Rolling Alpha channel:** [Nextjs Engine Latest Alpha](https://github.com/Kate-alt-69/nextjs-engine/releases/tag/channel-alpha-latest) — currently labelled `3.0.0-alpha.1`; this channel can advance after a newer `main-3` commit passes the release gates.  
**Next numbered alpha target:** `3.0.0-alpha.2` — the next version in the numbered alpha sequence; it is not yet the version declared by `main-3/package.json`, and no alpha.2 release-note file is present on that branch.  
**Alpha.1 release notes:** [`docs/release/NE-v3-0-0-alpha-1.md`](./docs/release/NE-v3-0-0-alpha-1.md)  
**Latest published stable release:** [NE v2.6.2](https://github.com/Kate-alt-69/nextjs-engine/releases/tag/Release-v2.6.2)  
**Latest prepared v2 patch notes:** [`docs/release/NE-v2-6-2.md`](./docs/release/NE-v2-6-2.md)  
**Gen 3 source of truth:** [`main-3`](https://github.com/Kate-alt-69/nextjs-engine/tree/main-3)

> Generation 3 is a substantial, compiler-first and server-first architectural update from Generation 2. It is still an alpha track, not the stable 2.x contract. Keep existing production apps on their validated release line until their Gen 3 migration has been tested.

---

## What is in the current Engine?

| System | Purpose |
|---|---|
| Schema renderer | Turns `PageSchema` / `SchemaNode` trees into React components |
| Responsive style runtime | Compiles responsive Engine props into CSS variables + media queries |
| Primitive styling | Box, Stack, Grid, Text, Heading, Section, Button, Card, Spacer, Divider |
| Component registry | Built-in, split/lazy, and custom schema node types |
| EngineTransitions+ | 20 page/layout transition presets, shared morphs, programmatic navigation |
| EngineShader | Compiled `.shed` GPU surfaces, render stages, graph scheduling, runtime inputs |
| EngineCanvas | Callback mode, retained 2D, Three.js 3D, SVG, and EngineShader mode |
| EngineSVG | Retained SVG rendering plus ECScene import/export |
| EngineScroll | Points, movement, URL protocol, timelines, ranges, tracking, snapping, Director |
| EngineOverlay | Dialog, Drawer, Popover, focus management, stacking, portals, scroll lock |
| EngineManim | 2D timeline animation and demand-driven 3D model animation |
| EngineImage / Video | Viewport-aware media loading and responsive image behavior |
| EngineBrowser | SSR-safe capability, clipboard, media, speech, network, and interaction helpers |
| EngineForms | Schema-native form controls wired to named handlers |
| EngineMarkdown | Markdown rendering, heading anchors, styling, and safe links |
| EngineTheme | Theme tokens/variants, safe declarative templates and Data-API, `.etr` artifacts, font compilation, and typed custom-component theme bindings; integration is documented per component |
| EngineSEO | Schema-driven metadata, robots/sitemap, JSON-LD and social preview generation |
| EngineNav / Link | Next.js-aware internal routing plus optional Transitions+ navigation |
| EngineAPIResolver | External HTTP/API orchestration, provider config, auth, HMAC/PNP, FormData |
| NENC / EngineCookies | Opt-in server-owned command transport, session/device proofing, authorization, and replay-resistant request handling |
| NE CLI / channel manager | The `ne` executable and channel-aware version/update tooling with integrity checks |
| APIStatic | Compiled browser-side `.route` endpoint programs under `/_static/endpoint` |
| EngineDevice / Mobile | Shared device detection and server-side mobile schema patching |
| Diagnostics | Runtime validation, analyzer diagnostics, the Error Code Book, and the development-only EngineDebug workbench |

The public API is exported from [`src/engine/index.ts`](./src/engine/index.ts).

---

## Generation 3: the current architecture

Generation 3 is a compiler-first, server-first redesign of the Engine rather than a routine 2.x feature patch. Typed schemas are compiled into an explicit plan so build tooling can reason about rendering ownership, required browser features, compatibility fallbacks, and scheduled work.

### Compile into an execution plan

- `compilePage()` produces a deterministic execution plan and a used-feature manifest.
- `createPage()` uses the Generation 3 compilation and server-rendering path for schemas that meet the Gen 3 contract.
- Static and server-owned content stays on the server where possible; browser-dependent behavior is isolated into targeted client islands.
- Compatibility planning considers features a page actually uses and the available fallbacks, rather than requiring every browser capability for every page.

### Shared runtime and adaptive behavior

The shared scheduler, viewport/model systems, and adaptive compilation coordinate deferred or expensive work across EngineCanvas, image/video, scrolling, transitions, and other runtime features. Responsive style props normally compile to CSS instead of repeatedly branching on viewport size in React. Performance still depends on the schema and application code; use the production bundle report and runtime checks to measure real outcomes.

Read the [Generation 3 compiler deep dive](./docs/3/compiler-deep-dive.md) and [runtime performance notes](./docs/runtime-performance.md).

### EngineTheme and component UI

EngineTheme provides validated theme definitions, qualified theme IDs, local/global/explicitly preloaded remote theme resolution, `.etr` artifacts, safe declarative templates, the typed Data-API, lightweight code highlighting, and font compilation. The custom-component path supports declared props/slots and theme references for trusted local React implementations.

Theme integration is expanding across Engine UI systems; do not assume every built-in component has identical theme coverage yet. See [EngineTheme](./docs/3/engine-components/enginetheme.md). EngineOverlay already provides lazy-loaded `dialog`, `drawer`, and `popover` primitives with shared focus handling, Escape ownership, stacking, portals, focus restoration, and scroll-lock cleanup. See [EngineOverlay](./docs/3/engine-components/engineoverlay.md).

### NENC, EngineSEO, and private application work

The optional Generation 3 NENC path connects named commands to server-owned handlers; private operations and credentials should remain on the server. Use the documented combined plugin configuration and read the [networking and credential security model](./docs/3/networking-credentials-security.md) before enabling it. EngineSEO can generate Next.js metadata, canonical/OpenGraph/Twitter tags, verification values, sitemap/robots outputs, JSON-LD, and social preview cards. See [EngineSEO](./docs/3/engine-components/engineseo.md).

### Development-only diagnostics

During `next dev`, the combined plugin supplies the `/_engine/debug` workbench with route exploration, live preview, node picking, runtime-boundary overlays, scheduler inspection, and device/viewport simulation. The generated debug route is removed before production route discovery; it is not an authenticated or hidden production endpoint. The Error Code Book and global error reporting provide a separate reference/handling layer.

### Generation 2 remains a separate release line

Generation 2 is still maintained on `main-2`. Its latest published stable release is [NE v2.6.2](https://github.com/Kate-alt-69/nextjs-engine/releases/tag/Release-v2.6.2), which remains the reference for apps that have not migrated. The v2.x styling and API contract should not be conflated with Generation 3 alpha behavior.

---

## Release tracks and repository layout

The repository separates the Generation 2 and Generation 3 source lines from the immutable package snapshots created for distribution.

| Ref / location | Role |
|---|---|
| `main-2` | Generation 2 source and integration workspace |
| `main-3` | Generation 3 compiler/runtime source; currently declares `3.0.0-alpha.1` in its root `package.json` |
| `channel-alpha-latest` | Moving GitHub prerelease channel; its release title currently identifies `3.0.0-alpha.1` |
| `package/main` | Distributable package archive, including versioned snapshots; it is not a direct mirror of `main-3` |
| `alpha/version/3.alpha/version/3.0.0-alpha.1` | The numbered Generation 3 alpha.1 snapshot path in the package archive |

A numbered source release is prepared from an exact, pinned source commit. The publishing workflow checks the requested version against that commit's `package.json`, validates the commit against its source branch, prepares the package snapshot, and gates publication on the relevant checks. Versioned snapshots are intended to be immutable: updating `main-3` does not rewrite an already-created alpha.1 package into alpha.2.

### How `content.include` works

New package snapshots can copy additional repository files or folders listed in the source branch's root `content.include`. The file uses one repository-relative path per line; blank lines and comments are ignored, and unsafe, missing, or conflicting entries are rejected.

- On `main-3`, the current allowlist contains `bin/`, so a newly created Generation 3 package snapshot can include the `ne` CLI and its supporting files.
- On `main-2`, the file is an empty template until that release line needs additional package content.
- `content.include` is build-time metadata and is not included in the published npm package. Older snapshots remain unchanged.

This lets newer source commits opt into additional package content without breaking the packaging behavior of historical commits that predate the manifest.

---

## Package entrypoints

The source workspace's root `package.json` uses the unscoped name `nextjs-engine` for in-repository development. The distributable package archive normalizes the published package name to `@kastrick/nextjs-engine`; application imports below use the scoped distribution name.

For repeatable deployments, install an exact numbered version that has actually been published. Do not treat the moving `channel-alpha-latest` prerelease as a permanent version pin, and do not install `3.0.0-alpha.2` until its numbered package snapshot and publication are available.

## Quick start

```ts
// app/page.tsx
import { createPage, defineSchema } from "@kastrick/nextjs-engine"

const home = defineSchema({
	meta: {
		title: "My Site",
		description: "Rendered by Next.js Engine"
	},
	root: {
		type: "section",
		props: {
			contentMaxWidth: "1100px",
			px: { xs: "1rem", md: "2rem" },
			py: { xs: "3rem", md: "5rem" }
		},
		children: [
			{
				type: "heading",
				props: {
					level: 1,
					content: "Hello from NE"
				}
			},
			{
				type: "link",
				props: {
					href: "/docs",
					content: "Open docs",
					cprop: {
						link: {
							transition: "reveal"
						}
					}
				}
			}
		]
	}
})

export default createPage({ schema: home })
```

`createPage()` supplies Engine context and the core EngineScroll provider automatically.

For reusable schema-rendered application chrome, use `createComponent()` and named slots.

---

## Responsive styling

Responsive Engine values are generally compiled to CSS instead of reading `window.innerWidth` during component render:

```ts
props: {
	px: { xs: "1rem", md: "2rem", xl: "3rem" },
	columns: { xs: 1, md: 2, lg: 3 },
	bg: { xs: "#111827", md: "#030712" }
}
```

The intended primitive style precedence is:

```text
component defaults
	< schema/direct Engine props
	< explicit style={}
	< required runtime state
```

Full styling reference: [`docs/styling.md`](./docs/styling.md).

---

## APIStatic

APIStatic is NE's browser-executed static endpoint system.

Source:

```text
data/endpoint/**/*.route
```

Compiled output:

```text
public/_static/endpoint/
├── <route>-<stable-hash>.js
└── manifest.json
```

Application code addresses logical endpoint names rather than generated hashes:

```ts
import { APIStatic } from "@kastrick/nextjs-engine"

const response = await APIStatic.resolve(
	"math",
	"add",
	{ a: 20, b: 30 }
)
```

`.route` programs execute in the browser. Do not put secrets, private environment values, database credentials, or server-only session state in them. Use an explicitly configured backend/proxy bridge for trusted work.

Read [`docs/3/engine-components/apistatic.md`](./docs/3/engine-components/apistatic.md).

---

## Performance model

Current NE performance work includes:

- lazy module split-points for optional/heavier Engine systems;
- pooled `IntersectionObserver`s;
- shared RAF-coalesced viewport/breakpoint updates;
- responsive CSS instead of JS breakpoint branching for normal style props;
- retained EngineCanvas / EngineSVG / Three.js resources;
- demand-driven Canvas, Shader, Scroll, and Manim scheduling;
- offscreen and hidden-tab pausing;
- bounded responsive resolver caching;
- provider-scoped generated style collection;
- production client-bundle inventory in CI.

NE removes repeated framework plumbing; it cannot make arbitrary expensive application code, huge scenes, or oversized media free.

Read [`docs/runtime-performance.md`](./docs/runtime-performance.md).

---

## Validation and diagnostics

```ts
import {
	analyzeSchema,
	validateSchema
} from "@kastrick/nextjs-engine"

const validation = validateSchema(schema.root)
const analysis = analyzeSchema(schema)
```

The analyzer handles deeper diagnostics including unknown node types, duplicate navigation targets, schema-object reuse, accessibility hints, large/deep trees, mobile-patch ambiguity, and EngineScroll metadata mistakes.

Read [`docs/schema-diagnostics.md`](./docs/schema-diagnostics.md).

---

## Development and CI

Workspace development:

```bash
npm install
npm run type-check
npm run dev
```

Production validation:

```bash
npm run build
```

Current CI coverage includes APIStatic, EngineShader, EngineBrowser SSR safety, EngineTransitions+, EngineScroll, EngineOverlay, primitive/style compiler regressions, TypeScript, a full optimized Next.js integration build, and production bundle reporting.

Hydration-specific SSR → client regression coverage is part of the v2.6.1 stability work.

---

## Documentation

Start at [`docs/index.md`](./docs/index.md), then choose the generation that matches your application:

- **Generation 2 — stable 2.x:** [documentation index](https://github.com/Kate-alt-69/nextjs-engine/blob/main-2/docs/2/index.md) — [simple styling](https://github.com/Kate-alt-69/nextjs-engine/blob/main-2/docs/2/styling.md) and [detailed styling](https://github.com/Kate-alt-69/nextjs-engine/blob/main-2/docs/2/styling-detailed.md).
- **Generation 3 — alpha:** [documentation index](https://github.com/Kate-alt-69/nextjs-engine/blob/main-3/docs/3/index.md) — [simple styling](https://github.com/Kate-alt-69/nextjs-engine/blob/main-3/docs/3/styling.md) and [detailed styling](https://github.com/Kate-alt-69/nextjs-engine/blob/main-3/docs/3/styling-detailed.md).

Gen 2 and Gen 3 guides are maintained separately. Gen 3 is an alpha architecture and should not be treated as the stable 2.x API contract.

| Goal | Read |
|---|---|
| Release history | [`docs/release/index.md`](./docs/release/index.md) |
| v2.6.2 prepared bug-fix patch | [`docs/release/NE-v2-6-2.md`](./docs/release/NE-v2-6-2.md) |
| v2.6.1 stability changes | [`docs/release/NE-v2-6-1.md`](./docs/release/NE-v2-6-1.md) |
| v2.6.0 feature release | [`docs/release/NE-v2-6-0.md`](./docs/release/NE-v2-6-0.md) |
| Layouts and primitives | [`docs/3/engine-components/primitives.md`](./docs/3/engine-components/primitives.md) |
| Transitions+ | [`docs/3/engine-components/enginetransitions.md`](./docs/3/engine-components/enginetransitions.md) |
| EngineShader | [`docs/3/engine-components/engineshader.md`](./docs/3/engine-components/engineshader.md) |
| EngineOverlay | [`docs/3/engine-components/engineoverlay.md`](./docs/3/engine-components/engineoverlay.md) |
| EngineScroll | [`docs/3/engine-components/enginescroll.md`](./docs/3/engine-components/enginescroll.md) |
| Canvas / EC graphics | [`docs/3/engine-components/enginecanvas.md`](./docs/3/engine-components/enginecanvas.md) |
| EngineTheme, `.etr`, templates and font pipeline | [`docs/3/engine-components/enginetheme.md`](./docs/3/engine-components/enginetheme.md) |
| Gen 3 styling — simple | [`docs/3/styling.md`](./docs/3/styling.md) |
| Gen 3 styling — detailed | [`docs/3/styling-detailed.md`](./docs/3/styling-detailed.md) |
| Gen 3 compiler internals | [`docs/3/compiler-deep-dive.md`](./docs/3/compiler-deep-dive.md) |
| Runtime/performance | [`docs/runtime-performance.md`](./docs/runtime-performance.md) |
| EngineSEO and crawler metadata | [`docs/3/engine-components/engineseo.md`](./docs/3/engine-components/engineseo.md) |
| APIStatic | [`docs/3/engine-components/apistatic.md`](./docs/3/engine-components/apistatic.md) |
| External APIs | [`docs/3/engine-components/engineapi.md`](./docs/3/engine-components/engineapi.md) |
| Diagnostics | [`docs/schema-diagnostics.md`](./docs/schema-diagnostics.md) |

The unversioned [`docs/styling.md`](./docs/styling.md) path is retained for old links; use the explicitly versioned Gen 3 guide above.

`DOCUMENT.md` is the large technical/history reference. For recently changed behavior, prefer the current TypeScript types and focused docs when an old historical section disagrees.

---
> **Disclaimer:** Nextjs Engine (`nextjs-engine`) is an independent open-source framework created by Kastrick and Developer Kate-alt-69. It is not affiliated with, endorsed by, or sponsored by Vercel Inc. or Meta Platforms, Inc.<br>

<br>Built by **Kate-alt-69** for the Kastrick platform (C) 2026, See [license](./license)
