# Next.js Engine

[![Generation 3 — Alpha](https://img.shields.io/badge/Generation-3%20Alpha-7C3AED?style=for-the-badge)](https://github.com/Kastrick8/nextjs-engine/tree/main-3) [![Engine CI](https://img.shields.io/github/actions/workflow/status/Kastrick8/nextjs-engine/engine-ci.yml?branch=main-3&label=Engine%20CI)](https://github.com/Kastrick8/nextjs-engine/actions/workflows/engine-ci.yml) [![React 19](https://img.shields.io/badge/React-19-149ECA?logo=react)](https://react.dev/) [![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)](https://nextjs.org/)

**Next.js Engine (NE)** is a schema-driven compiler and runtime for React 19 and Next.js 16. Typed page schemas become explicit execution plans, server-owned content remains server-first, and browser work is isolated into targeted interactive islands.

Generation 3 builds on foundations established by earlier Engine generations while defining its own compiler-first execution model, runtime boundaries, and API contract. **This README documents Generation 3 only.**

> [!WARNING]
> Generation 3 is alpha software. APIs, compiler behavior, and package snapshots may change. Pin the exact version or source commit and validate your application before production use.

**Source version:** `3.0.0-alpha.1` in `main-3/package.json`  
**Rolling Alpha:** [channel-alpha-latest](https://github.com/Kastrick8/nextjs-engine/releases/tag/channel-alpha-latest) — currently labelled `3.0.0-alpha.1`.  
**Numbered archive:** [3.0.0-alpha.2 package snapshot](https://github.com/Kastrick8/nextjs-engine/tree/package/main/alpha/version/3.alpha/version/3.0.0-alpha.2) — includes the `ne` CLI executable.  
**Alpha.1 notes:** [Generation 3 alpha.1](./docs/release/NE-v3-0-0-alpha-1.md)

The source manifest and rolling channel still identify alpha.1. The alpha.2 snapshot is a separate immutable package archive.

---

## Generation 3 systems

| System | Purpose |
|---|---|
| Schema compiler | Deterministic execution plans, feature manifest, fallbacks, assets, and diagnostics |
| Server-first renderer | Server-owned output and targeted client islands |
| Shared scheduler | Coordinates viewport, model, media, canvas, scroll, and deferred work |
| EngineTheme | Validated themes, variants, safe templates, Data-API, .etr artifacts, and font compilation |
| Custom components | Trusted local React components with declared props, slots, and theme references |
| EngineOverlay | Dialog, drawer, popover, focus, portals, stacking, and scroll lock |
| EngineCanvas / EngineSVG | Retained graphics, Canvas 2D, 3D, SVG, and shader rendering |
| EngineShader / EngineScroll | Compiled GPU effects, points, timelines, ranges, and tracking |
| EngineManim | Timeline-based 2D/3D animation |
| EngineImage / EngineVideo | Viewport-aware media |
| EngineBrowser | SSR-safe browser capability helpers |
| EngineSEO | Metadata, sitemap, robots, JSON-LD, and social previews |
| EngineAPIResolver / APIStatic | API orchestration and compiled browser endpoint programs |
| NENC / EngineCookies | Server-owned commands, device/session proof, and authorization |
| NE CLI | Build/check commands and release-channel tooling |
| EngineDebug / Error Book | Development inspection, global errors, and diagnostics |

## Compiler and rendering

Generation 3 compiles a typed page schema before rendering. The compiler prepares an execution plan that records server-owned output, targeted client islands, required features, compatible fallbacks, assets, and diagnostics. This gives the renderer a clear plan for what stays on the server and what needs browser interaction.

- `compilePage()` creates the compiled plan, feature manifest, fallback plan, assets, and diagnostics.
- `createPage()` uses the Generation 3 compilation and server-rendering path.
- Browser-only behavior is isolated into client islands.
- Compatibility planning considers the features a page actually uses.

Read the [compiler deep dive](./docs/3/compiler-deep-dive.md).

## EngineTheme and custom components

EngineTheme provides validated theme definitions, qualified IDs, local/global/preloaded remote resolution, .etr artifacts, declarative templates, typed Data-API, highlighting, and font compilation.

Trusted custom React components declare props and slots, register under a stable schema-node ID, and can reference EngineTheme. Theme data controls appearance; trusted component code owns behavior.

~~~tsx
import { createComponent, registerComponent } from "nextjs-engine";

const SiteLink = createComponent({
  mode: "custom",
  id: "site-link",
  theme: "site.link",
  component: SiteLinkImplementation,
  props: { href: { type: "string", required: true, maxLength: 2048 } },
  slots: ["children"],
  strictProps: true,
});

registerComponent("site-link", SiteLink);
~~~

Remote .etr files remain declarative data; they do not execute JavaScript, JSX, or arbitrary imports. Read [EngineTheme](./docs/3/engine-components/enginetheme.md).

## Networking, SEO, and diagnostics

- **NENC** connects named commands to server-owned handlers. Authentication, authorization, validation, replay policy, and secrets remain server responsibilities.
- **EngineSEO** generates metadata and crawler/social outputs from declared site and page data.
- **EngineDebug** provides development route, preview, runtime, scheduler, and device/viewport inspection.
- **Global error handling** supplies subsystem-coded diagnostics, terminal reporting, and an Error Code Book.

See the [NENC security model](./docs/3/networking-credentials-security.md), [EngineSEO](./docs/3/engine-components/engineseo.md), and [global error handling](./docs/3/global-error-handling.md).

## Package entrypoints

~~~ts
import { createPage, defineSchema, EngineCanvas, EngineScroll, EngineDialog,
  EngineDrawer, EnginePopover, EngineBrowser, EngineSEO, APIStatic } from "@kastrick/nextjs-engine";
~~~

~~~ts
import { getServerDevice } from "@kastrick/nextjs-engine/server";
~~~

~~~js
const withEngine = require("@kastrick/nextjs-engine/plugin");
module.exports = withEngine({});
~~~

## NE CLI

The archived alpha.2 package snapshot includes the CLI executable:

~~~sh
ne --version
ne
ne dev
ne build
ne start
ne check
ne clean
ne updater
ne update --channel alpha
ne rollback
ne help
~~~

The rolling Alpha channel still points to alpha.1 release metadata. Verify the numbered snapshot and publication status before installing; the archive and moving channel are distinct.

## Development and validation

~~~sh
npm install
npm run type-check
npm run dev
npm run build
npm run test:cli
npm run test:theme
npm run test:browser
~~~

## Documentation

Start with the [Generation 3 documentation index](./docs/3/index.md).

| Topic | Guide |
|---|---|
| Compiler and rendering | [Compiler deep dive](./docs/3/compiler-deep-dive.md) |
| Styling | [Simple guide](./docs/3/styling.md) · [Detailed guide](./docs/3/styling-detailed.md) |
| Theme system | [EngineTheme](./docs/3/engine-components/enginetheme.md) |
| Overlays | [EngineOverlay](./docs/3/engine-components/engineoverlay.md) |
| Graphics | [EngineCanvas](./docs/3/engine-components/enginecanvas.md) |
| Scroll | [EngineScroll](./docs/3/engine-components/enginescroll.md) |
| GPU effects | [EngineShader](./docs/3/engine-components/engineshader.md) |
| SEO | [EngineSEO](./docs/3/engine-components/engineseo.md) |
| Errors | [Global error handling](./docs/3/global-error-handling.md) |
| Performance | [Runtime performance](./docs/runtime-performance.md) |

---

> **Disclaimer:** Nextjs Engine is an independent open-source framework created by Kastrick and Developer Kate-alt-69. It is not affiliated with, endorsed by, or sponsored by Vercel Inc. or Meta Platforms, Inc.

Built by **Kate-alt-69** for the Kastrick platform. See [LICENSE](./LICENSE).

---

## ☕ Support me!

Enjoying Next.js Engine? Supporting the work helps me spend more time improving the Engine and its open-source tooling.

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Support%20Kastrick-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/Kastrick)

**Scan the QR code to support me!**

[<img src="./assets/qr-code.png" alt="Kastrick support QR code" width="225" height="225" />](https://www.buymeacoffee.com/Kastrick)

[buymeacoffee.com/Kastrick](https://www.buymeacoffee.com/Kastrick)
