# Next.js Engine

[![Generation 2 — Stable](https://img.shields.io/badge/Generation-2%20Stable-2563EB?style=for-the-badge)](https://github.com/Kastrick8/nextjs-engine/tree/main-2) [![React 19](https://img.shields.io/badge/React-19-149ECA?logo=react)](https://react.dev/) [![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)](https://nextjs.org/)

**Next.js Engine (NE)** is a schema-driven rendering and runtime layer for React 19 and Next.js 16, with UI primitives, responsive styling, navigation, graphics, animation, media, API, and browser utilities.

Generation 2 builds on foundations established by earlier Engine generations while maintaining its own stable API and runtime contract. **This README documents Generation 2 only.**

> [!IMPORTANT]
> ## NE 2.7.0 is on the way
>
> The **2.7.0 release candidate is prepared** and its versioned package snapshot has been created and validated. npm publication and the official GitHub Release are still pending.
>
> Track the [v2.7.0 release notes](./docs/release/NE-v2-7-0.md).

| Release information | Status |
|---|---|
| Source branch | `main-2` |
| Source version | `2.7.0` |
| Latest published release | [v2.6.2](https://github.com/Kastrick8/nextjs-engine/releases/tag/Release-v2.6.2) |
| Upcoming release | **v2.7.0 — coming soon** |
| Prepared package | [2.7.0 snapshot](https://github.com/Kastrick8/nextjs-engine/tree/package/main/version/2.7/version/2.7) |

---

## Engine systems

| System | Purpose |
|---|---|
| Schema renderer and registry | Turns PageSchema / SchemaNode definitions into React UI |
| Responsive styling and primitives | Responsive CSS, Box, Stack, Grid, Text, Heading, Button, Card, and layouts |
| EngineTransitions+ | Page/layout transitions and shared-element morphs |
| EngineShader / EngineCanvas | Compiled .shed effects, Canvas 2D, 3D, SVG, and graphics |
| EngineScroll | Points, groups, timelines, ranges, snapping, and tracking |
| EngineOverlay | Dialogs, drawers, popovers, focus, portals, and scroll locking |
| EngineManim | 2D and 3D animation |
| EngineImage / EngineVideo | Viewport-aware media |
| EngineBrowser / EngineDevice | Browser capabilities and device detection |
| EngineForms / CustomSelect | Schema-native forms and accessible select controls |
| EngineMarkdown | Markdown rendering and safe links |
| EngineNav / EngineLink | Next.js-aware navigation |
| EngineAPIResolver / APIStatic | External API orchestration and compiled browser endpoints |
| Diagnostics | Schema validation and analyzer messages |

## Rendering model

A typed page schema flows through the NE schema renderer into the appropriate Engine components. Shared styling and runtime services provide consistent behavior across those components, while React 19 renders the result inside the Next.js App Router.

Your application owns routes, data, server actions, and business logic.

---

## What's coming in 2.7.0?

The next Generation 2 release introduces the NE CLI and focused usability, compatibility, and diagnostics improvements.

- **NE CLI:** Dashboard, dev/build/start, checks, cleanup, updater, channel/version selection, rollback, and help.
- **Release discovery:** npm versions, GitHub Releases, and package tags with source/installability details.
- **Diagnostics:** Stable command/option codes, close-match suggestions, source-aware syntax errors, and Error Book links.
- **Terminal UI:** Adaptive sizing, wrapped messages, severity colors, Unicode/ASCII fallback, and no-color support.
- **CustomSelect:** Controlled values, direct callbacks, and configurable labels/empty states.
- **Style precedence:** Explicit Engine props and style overrides take priority over defaults while required runtime state remains authoritative.
- **Packaging:** New Generation 2 snapshots include the ne executable.

See [the full 2.7.0 notes](./docs/release/NE-v2-7-0.md).

### NE CLI

> [!WARNING]
> The NE CLI is newly introduced in 2.7.0. Its command contract is experimental and may change or be removed in a future release. Prefer headless commands for scripts and CI.

~~~sh
ne --help
ne
ne dev
ne build
ne start
ne check
ne clean
ne updater
ne update --channel stable
ne rollback
~~~

After publication, install with `npm install --global @kastrick/nextjs-engine@2.7.0`. For one-time use, run `npx --yes --package=@kastrick/nextjs-engine@2.7.0 ne updater`.

Read the [Generation 2 CLI guide](./docs/2/ne-cli.md) and [CLI Error Book](./docs/2/ne-cli-error-book.md).

## Quick start

~~~tsx
import { createPage, defineSchema } from "@kastrick/nextjs-engine";

const home = defineSchema({
  meta: { title: "My Site" },
  root: {
    type: "section",
    props: { px: { xs: "1rem", md: "2rem" }, py: "3rem" },
    children: [{ type: "heading", props: { level: 1, content: "Hello from NE" } }],
  },
});

export default createPage({ schema: home });
~~~

## Responsive styling

~~~ts
props: {
  px: { xs: "1rem", md: "2rem" },
  columns: { xs: 1, md: 2, lg: 3 },
}
~~~

Read [simple styling](./docs/2/styling.md) and the [detailed styling reference](./docs/2/styling-detailed.md).

## Development

~~~sh
npm install
npm run type-check
npm run dev
npm run build
~~~

## Documentation

Start with the [Generation 2 documentation index](./docs/2/index.md).

| Topic | Guide |
|---|---|
| Getting started | [Schema and page guide](./docs/2/readme.md) |
| Primitives | [Engine primitives](./docs/2/engine-components/primitives.md) |
| Graphics | [EngineCanvas](./docs/2/engine-components/enginecanvas.md) |
| Shader effects | [EngineShader](./docs/2/engine-components/engineshader.md) |
| Transitions | [EngineTransitions+](./docs/2/engine-components/enginetransitions.md) |
| Scroll | [EngineScroll](./docs/2/engine-components/enginescroll.md) |
| Overlays | [EngineOverlay](./docs/2/engine-components/engineoverlay.md) |
| Forms | [CustomSelect](./docs/2/engine-components/customselect.md) |
| API | [EngineAPIResolver](./docs/2/engine-components/engineapi.md) |
| Browser endpoints | [APIStatic](./docs/2/engine-components/apistatic.md) |
| Release | [2.7.0 notes](./docs/release/NE-v2-7-0.md) |

---

## Support

Enjoying Next.js Engine? Supporting the work helps me spend more time improving the Engine and its open-source tooling.

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Support%20Kastrick-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/Kastrick)

**Scan the QR code to support me!**

[<img src="./assets/qr-code.png" alt="Kastrick support QR code" width="225" height="225" />](https://www.buymeacoffee.com/Kastrick)

[buymeacoffee.com/Kastrick](https://www.buymeacoffee.com/Kastrick)
---
> [!WARNING]
> **Disclaimer:** Nextjs Engine is an independent open-source framework created by Kastrick and Developer Kate-alt-69. It is not affiliated with, endorsed by, or sponsored by Vercel Inc. or Meta Platforms, Inc.

Built by **Kate-alt-69** for the [Kastrick](kastrick.vercel.app) platform. See [LICENSE](./LICENSE).
