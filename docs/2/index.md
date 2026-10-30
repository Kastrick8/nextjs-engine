# Generation 2 Documentation

> **Generation:** 2.x stable API line  
> **Source branch:** `main-2`  
> **Maintenance line:** v2.6.x  
> **Release status:** v2.5.0 is the latest published stable release; v2.6.2 is a prepared patch, not a published release.  
> **Audience:** Existing Gen 2 applications and maintainers.

Use these pages for the code maintained on `main-2`. Generation 3 is a separate compiler-first architecture; its implementation details are not the Gen 2 contract.

## Start here

| Goal | Guide |
|---|---|
| Use the newly introduced v2.7.0 command-line interface | [NE CLI](./ne-cli.md) |


| Goal | Guide |
|---|---|
| Learn the schema and page APIs | [Getting Started](./readme.md) |
| Use styling props | [Styling — simple guide](./styling.md) |
| Understand styling internals | [Styling — detailed reference](./styling-detailed.md) |
| Understand runtime and performance behavior | [Runtime & Performance](./runtime-performance.md) |
| Validate schemas | [Schema diagnostics](./schema-diagnostics.md) |

## Engine components

| Component | Documentation |
|---|---|
| Primitives and layouts | [Primitives](./engine-components/primitives.md) |
| Canvas and graphics | [EngineCanvas](./engine-components/enginecanvas.md) |
| Retained 3D rendering | [Engine3D](./engine-components/engine3d.md) |
| SVG scene rendering | [EngineSVG](./engine-components/enginesvg.md) |
| GPU effects and `.shed` programs | [EngineShader](./engine-components/engineshader.md) |
| Page/layout transitions | [EngineTransitions+](./engine-components/enginetransitions.md) |
| Scroll points and timelines | [EngineScroll](./engine-components/enginescroll.md) |
| Scroll ranges and boundaries | [EngineScroll Range](./engine-components/enginescroll-range.md) |
| Scroll-driven timelines | [EngineScroll Timeline](./engine-components/enginescroll-timeline.md) |
| Coordinate multiple timelines | [EngineScroll Director](./engine-components/enginescroll-director.md) |
| Track named point positions | [EngineScroll Point Tracker](./engine-components/enginescroll-tracker.md) |
| Focus and visibility behavior | [EngineScroll Focus](./engine-components/enginescroll-focus.md) |
| Named point groups | [EngineScroll Groups](./engine-components/enginescroll-groups.md) |
| Browser helpers | [EngineBrowser](./engine-components/enginebrowser.md) |
| 2D/3D animation | [EngineManim](./engine-components/enginemanim.md) |
| Images and video | [EngineImage and EngineVideo](./engine-components/engineimage.md) |
| Video viewport lifecycle | [EngineVideo](./engine-components/enginevideo.md) |
| Markdown rendering | [EngineMarkdown](./engine-components/enginemarkdown.md) |
| Navigation | [EngineNav](./engine-components/enginenav.md) |
| Individual transition-aware links | [EngineLink](./engine-components/enginelink.md) |
| Adaptive layout and device info | [EngineMobile and EngineDevice](./engine-components/enginemobile.md) |
| Heroes | [EngineHero](./engine-components/enginehero.md) |
| Forms | [EngineForms](./engine-components/engineforms.md) |
| Searchable styled select | [CustomSelect](./engine-components/customselect.md) |
| Dialog, drawer, popover | [EngineOverlay](./engine-components/engineoverlay.md) |
| Suspense/loading surfaces | [EngineSuspense](./engine-components/enginesuspense.md) |
| External API configuration and requests | [EngineAPIResolver](./engine-components/engineapi.md) |
| Browser-executed endpoint programs | [APIStatic](./engine-components/apistatic.md) |

These component documents are copied from the `main-2` documentation tree and marked for Gen 2. Features that exist only on `main-3` (including the server-first compiler/EngineDebug implementation and Gen 3-only EngineSEO pages) are intentionally not presented as Gen 2 features.

## Release history and other references

- [Main documentation index](https://github.com/Kate-alt-69/nextjs-engine/blob/main-2/docs/index.md)
- [Release notes](https://github.com/Kate-alt-69/nextjs-engine/tree/main-2/docs/release)
- [Technical reference](https://github.com/Kate-alt-69/nextjs-engine/blob/main-2/DOCUMENT.md)

Prefer current `main-2` implementation and tests when a historical example conflicts with the current v2 types or component docs.
