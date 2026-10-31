# Generation 2 Modules

A module page documents a cohesive developer-facing Engine system. Related implementation files are grouped under their owning feature instead of receiving one page per source file.

## Foundations and composition

| Module | Scope |
|---|---|
| [Primitives](./primitives.md) | Box, Stack, Grid, Section, Text, Heading, Button, Card, Spacer and composition nodes |
| [Styling](./styling.md) | Responsive props, CSS variables and CPROP |
| [Custom components](./engine-custom-components.md) | Application React component registration |
| [Lazy mounting](./lazy-mount.md) | LazyMount and LazySection |
| [EngineProvider](./engine-provider.md) | Context, breakpoint hooks and collected styles |

## UI and content

| Module | Scope |
|---|---|
| [EngineHero](./enginehero.md) | Hero composition and parallax |
| [EngineMarkdown](./enginemarkdown.md) | Markdown rendering |
| [EngineImage](./engineimage.md) | Responsive image rendering |
| [EngineVideo](./enginevideo.md) | Video rendering and viewport lifecycle |
| [EngineForms](./engineforms.md) | Form, Input, Textarea, Checkbox and Label |
| [CustomSelect](./customselect.md) | Styled searchable selection |
| [EngineSuspense](./enginesuspense.md) | Deferred/loading surfaces |

## Navigation and interaction

| Module | Scope |
|---|---|
| [EngineNav](./enginenav.md) | Navigation items |
| [EngineLink](./enginelink.md) | Internal links |
| [EngineTransitions+](./enginetransitions.md) | Transition presets and navigation |
| [EngineOverlay](./engineoverlay.md) | Dialog, Drawer, Popover and shared runtime |

Overlay features: [Dialog](./engineoverlay/dialog.md) · [Drawer](./engineoverlay/drawer.md) · [Popover](./engineoverlay/popover.md) · [Shared runtime](./engineoverlay/shared-runtime.md).

## Graphics, animation and scroll

| Module | Scope |
|---|---|
| [EngineCanvas](./enginecanvas.md) | Scene model, frame lifecycle and graphics engines |
| [Engine3D](./engine3d.md) | Three.js-backed rendering |
| [EngineSVG](./enginesvg.md) | SVG rendering |
| [EngineShader](./engineshader.md) | Shader surfaces and .shed programs |
| [EngineManim](./enginemanim.md) | 2D and 3D animation |
| [EngineScroll](./enginescroll.md) | Points, navigation, ranges, timelines and tracking |

Grouped references: [Canvas renderers](./enginecanvas/index.md) · [Manim](./enginemanim/index.md) · [Scroll](./enginescroll/index.md).

## Browser and networking

| Module | Scope |
|---|---|
| [EngineBrowser](./enginebrowser.md) | Browser capabilities, clipboard, media, speech and network |
| [EngineDevice and EngineMobile](./enginemobile.md) | Device detection and adaptive schema patches |
| [EngineAPIResolver](./engineapi.md) | External requests, provider configuration and authentication |
| [APIStatic](./apistatic.md) | Compiled browser-side endpoint programs |

Generation 2 uses a global component registry and the standard client/provider renderer. It has no scoped EngineComponentRegistry, server-first compiler, EngineTheme createTheme factory, NENC, EngineCookies, EngineCORS, EngineSEO or EngineDebug. See [Generation 3](../3/index.md) for that separate line.
