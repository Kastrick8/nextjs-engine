# Generation 3 Modules

A module page documents a cohesive, developer-facing Engine capability. A page is **not** created for every source file, helper, type or internal class. Closely related primitives and utilities are grouped under the system that owns them.

## Foundations and composition

| Module | What it covers |
|---|---|
| [Primitives](./primitives.md) | Box, Stack, Grid, Text, Heading, Section, Button, Card, Spacer, Divider, Slot, Option and OptGroup |
| [Styling](./styling.md) | Responsive props, CSS variables, CPROP, style collection and precedence |
| [Custom components](./engine-custom-components.md) | Trusted local React components, prop contracts, slots and registration |
| [Lazy mounting](./lazy-mount.md) | LazyMount, LazySection and viewport-aware activation |
| [EngineProvider](./engine-provider.md) | Context, provider setup and provider-backed hooks |

## UI and content

| Module | What it covers |
|---|---|
| [EngineHero](./enginehero.md) | Hero composition and parallax |
| [EngineMarkdown](./enginemarkdown.md) | Markdown, heading anchors, safe links and URL icons |
| [EngineImage](./engineimage.md) | Responsive image loading and activation |
| [EngineVideo](./enginevideo.md) | Video loading, playback and viewport lifecycle |
| [EngineForms](./engineforms.md) | Form, Input, Textarea, Checkbox and Label |
| [CustomSelect](./customselect.md) | Searchable styled selection |
| [EngineSuspense](./enginesuspense.md) | Loading and deferred surfaces |

## Navigation and interaction

| Module | What it covers |
|---|---|
| [EngineNav](./enginenav.md) | Navigation items and anchors |
| [EngineLink](./enginelink.md) | Internal links and transition-aware navigation |
| [EngineTransitions+](./enginetransitions.md) | Page/layout transitions, presets and programmatic navigation |
| [EngineOverlay](./engineoverlay.md) | Dialog, Drawer, Popover and their shared runtime |

### EngineOverlay feature pages

EngineOverlay has multiple independently configurable UI primitives, so it receives a grouped directory:

- [Dialog](./engineoverlay/dialog.md)
- [Drawer](./engineoverlay/drawer.md)
- [Popover](./engineoverlay/popover.md)
- [Shared runtime and accessibility](./engineoverlay/shared-runtime.md)

## Graphics, animation and scroll

| Module | What it covers |
|---|---|
| [EngineCanvas](./enginecanvas.md) | Scene model, render engines and callbacks |
| [Engine3D](./engine3d.md) | Retained Three.js rendering |
| [EngineSVG](./enginesvg.md) | SVG rendering and ECScene import/export |
| [EngineShader](./engineshader.md) | Shader surfaces, .shed programs and scheduling |
| [EngineManim](./enginemanim.md) | 2D and 3D animation |
| [EngineScroll](./enginescroll.md) | Points, navigation, timelines, ranges and tracking |

EngineCanvas, EngineManim and EngineScroll have their own grouping indexes for the substantial feature families. Smaller helpers remain in the parent reference.

## Browser, network and application systems

| Module | What it covers |
|---|---|
| [EngineBrowser](./enginebrowser.md) | Browser capabilities, clipboard, media, speech and network helpers |
| [EngineDevice and EngineMobile](./enginemobile.md) | Shared device detection and adaptive schema behavior |
| [EngineAPIResolver](./engineapi.md) | External request orchestration and authentication |
| [APIStatic](./apistatic.md) | Compiled browser-side endpoint programs |
| [EngineSEO](./engineseo.md) | Metadata, robots, sitemap, JSON-LD and social previews |
| [EngineCompatibility](./engine-compatibility.md) | Browser capability checks and fallback resolution |
| [EngineScheduler](./engine-scheduler.md) | Work scheduling policies and snapshots |
| [EngineModel](./engine-model.md) | Shared Engine state and subscriptions |
| [EngineViewport](./engine-viewport.md) | Viewport snapshots and visibility state |
| [EngineServer](./engine-server.md) | Request-scoped Next.js server helpers |
| [EngineCORS](./engine-cors.md) | Server-side CORS policy and preflight handling |
| [EngineCookies](./engine-cookies.md) | Sealed server-owned data and trust metadata |
| [NENC](./nenc.md) | Server-owned command transport and authorization |

## How to read this catalog

- Use the module reference for component behavior, props, examples and integration.
- Use the [API reference](../api/index.md) for canonical signatures and exports.
- Use [NE internals](../ne/index.md) for implementation architecture.
- Use [Configuration](../configuration/index.md) for project setup and environment values.

A module page may link to a related public API or internal NE page instead of repeating the same contract.
