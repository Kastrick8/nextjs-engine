# Next.js Engine — Documentation Index

These unversioned index links are retained for compatibility. The maintained Generation 2 guides live under [`docs/2`](./2/index.md); Generation 3 is a separate alpha documented on [`main-3`](https://github.com/Kate-alt-69/nextjs-engine/blob/main-3/docs/3/index.md).

`DOCUMENT.md` is the large historical/technical reference. When an older example in `DOCUMENT.md` conflicts with a maintained versioned component page or the current TypeScript types on that generation's branch, prefer the versioned page and source types.

---

## Generation-specific documentation

- [Generation 2 (stable 2.x)](./2/index.md) — simple and detailed guides.
- [Generation 3 (alpha)](https://github.com/Kate-alt-69/nextjs-engine/blob/main-3/docs/3/index.md) — compiler-era guides for evaluation/migration.

## Start here

| I want to… | Read |
|---|---|
| Understand what NE is | [`readme.md`](./2/readme.md) |
| Learn schemas / `createPage()` | [`readme.md`](./2/readme.md) |
| Learn stable Gen 2 styling | [`2/styling.md`](./2/styling.md) |
| Learn Gen 2 styling internals | [`2/styling-detailed.md`](./2/styling-detailed.md) |
| Learn about the Gen 3 compiler internals | [Compiler deep dive](https://github.com/Kate-alt-69/nextjs-engine/blob/main-3/docs/3/compiler-deep-dive.md) |
| Read version/release history | [`release/index.md`](./release/index.md) |
| Add page/layout transitions | [`2/engine-components/enginetransitions.md`](./2/engine-components/enginetransitions.md) |
| Use individual transition-aware links | [`2/engine-components/enginelink.md`](./2/engine-components/enginelink.md) |
| Write `.shed` GPU effects | [`2/engine-components/engineshader.md`](./2/engine-components/engineshader.md) |
| Draw with Canvas / ECScene / shader mode | [`2/engine-components/enginecanvas.md`](./2/engine-components/enginecanvas.md) |
| Use retained 3D rendering | [`2/engine-components/engine3d.md`](./2/engine-components/engine3d.md) |
| Render/import/export SVG from ECScene | [`2/engine-components/enginesvg.md`](./2/engine-components/enginesvg.md) |
| Add scroll points / programmatic scrolling | [`2/engine-components/enginescroll.md`](./2/engine-components/enginescroll.md) |
| Configure scroll range targets and boundaries | [`2/engine-components/enginescroll-range.md`](./2/engine-components/enginescroll-range.md) |
| Validate/analyze schemas | [`2/schema-diagnostics.md`](./2/schema-diagnostics.md) |
| Build layouts and controls | [`2/engine-components/primitives.md`](./2/engine-components/primitives.md) |
| Use the searchable select control | [`2/engine-components/customselect.md`](./2/engine-components/customselect.md) |
| Configure lazy video lifecycle | [`2/engine-components/enginevideo.md`](./2/engine-components/enginevideo.md) |
| Use dialogs, drawers, and popovers | [`2/engine-components/engineoverlay.md`](./2/engine-components/engineoverlay.md) |
| Build in-house static APIs | [`2/engine-components/apistatic.md`](./2/engine-components/apistatic.md) |
| Configure/call external APIs | [`2/engine-components/engineapi.md`](./2/engine-components/engineapi.md) |
| Understand current runtime/performance behavior | [`2/runtime-performance.md`](./2/runtime-performance.md) |

---

## Release notes

The maintained release archive lives under [`docs/release`](./release/index.md).

| Version | Release notes |
|---|---|
| v2.6.2 (prepared patch) | [`NE-v2-6-2.md`](./release/NE-v2-6-2.md) |
| v2.6.1 | [`NE-v2-6-1.md`](./release/NE-v2-6-1.md) |
| v2.6.0 | [`NE-v2-6-0.md`](./release/NE-v2-6-0.md) |
| v2.5.0 | [`NE-v2-5-0.md`](./release/NE-v2-5-0.md) |
| v2.0.0 | [`NE-v2-0-0.md`](./release/NE-v2-0-0.md) |
| v1.0.0 | [`NE-v1-0-0.md`](./release/NE-v1-0-0.md) |

Release notes describe the Engine as it existed at that release. The current component pages remain the source of truth for present-day APIs.

---

## Visual systems — which one do I use?

NE now has several visual/motion systems. They solve different jobs.

```text
EngineTransitions+
	→ how UI/page state A changes into state B

EngineScroll
	→ movement/navigation driven by scroll position or named points

EngineCanvas
	→ canvas lifecycle + EC graphics surface

EngineSVG
	→ SVG renderer/import/export for ECScene

EngineShader
	→ compiled GPU-owned visual surfaces and `.shed` effects
```

### If you want a page change animation

Use **EngineTransitions+**.

```ts
cprop: {
	link: {
		transition: "portal",
	},
}
```

It currently ships 20 named presets and shared-element morph support.

Read: [`enginetransitions.md`](./2/engine-components/enginetransitions.md).

### If you want a GPU effect/background

Use **EngineShader** and write a `.shed` file.

```shed
shader <= aurora => [
	before.aurora => [
		time <= system.time
		speed => .6
	]
]
```

Then:

```ts
{
	type: "section",
	props: {
		shader: "aurora",
	},
}
```

Read: [`engineshader.md`](./2/engine-components/engineshader.md).

### If you want your own drawing/scene

Use **EngineCanvas**.

```ts
{
	type: "canvas",
	props: {
		graphics: {
			engine: "2d",
			scene,
		},
	},
}
```

Read: [`enginecanvas.md`](./2/engine-components/enginecanvas.md).

### If you want SVG output from an ECScene

Use the **EngineSVG** graphics engine.

```ts
graphics: {
	engine: "svg",
	scene,
}
```

Read: [`enginesvg.md`](./2/engine-components/enginesvg.md).

---

## Current shader/transition boundary

EngineTransitions+ and EngineShader are designed so they can integrate more deeply later, but their current responsibilities are intentionally separate:

```text
EngineTransitions+
	→ native View Transition snapshots + preset animation

EngineShader
	→ GPU surfaces owned by ESH / EngineCanvas shader mode
```

Transition names such as `pixel`, `liquid`, and `dissolve` are currently native snapshot animations, **not** `.shed` framebuffer passes.

Likewise, the planned whole-page Minecraft-shader-like global compositor / `styles.shed` direction is not a current surface ESH API yet. Current `.shed` programs attach to supported Engine surfaces or EngineCanvas shader mode.

The docs call out future/reserved APIs clearly so examples do not pretend an unimplemented compositor already exists.

---

## Engine components and systems

| Component / system | Documentation | Summary |
|---|---|---|
| Primitives | [`primitives.md`](./2/engine-components/primitives.md) | Box, Stack, Grid, Text, Heading, Button, Card, Section, Slot |
| EngineCanvas | [`enginecanvas.md`](./2/engine-components/enginecanvas.md) | callback mode, EC graphics engines, adaptive DPR, EngineShader mode |
| EngineSVG | [`enginesvg.md`](./2/engine-components/enginesvg.md) | retained SVG renderer, EC topology, SVG import/export |
| EngineShader | [`engineshader.md`](./2/engine-components/engineshader.md) | `.shed` language, compiler, GPU surfaces, stages, render graph, scheduling |
| EngineTransitions+ | [`enginetransitions.md`](./2/engine-components/enginetransitions.md) | 20 page/layout presets, shared morphs, programmatic transitions |
| EngineScroll | [`enginescroll.md`](./2/engine-components/enginescroll.md) | point navigation, URL protocol, one-RAF scheduler |
| EngineBrowser | [`enginebrowser.md`](./2/engine-components/enginebrowser.md) | browser capabilities and interaction APIs |
| EngineManim | [`enginemanim.md`](./2/engine-components/enginemanim.md) | 2D animation and demand-driven Three.js 3D model animation |
| EngineImage / Video | [`engineimage.md`](./2/engine-components/engineimage.md) | viewport-aware media and responsive image quality |
| EngineMarkdown | [`enginemarkdown.md`](./2/engine-components/enginemarkdown.md) | Markdown rendering and heading anchors |
| EngineNav | [`enginenav.md`](./2/engine-components/enginenav.md) | navigation bar, normal/animated routing pipeline, menus |
| EngineHero | [`enginehero.md`](./2/engine-components/enginehero.md) | centered/split/full-bleed heroes, backgrounds, parallax |
| EngineSuspense | [`enginesuspense.md`](./2/engine-components/enginesuspense.md) | loading fallbacks and suspense helpers |
| EngineForms | [`engineforms.md`](./2/engine-components/engineforms.md) | native form primitives and named handlers |
| EngineAPI | [`engineapi.md`](./2/engine-components/engineapi.md) | HTTP request resolver, auth, `.api` provider configuration |
| APIStatic | [`apistatic.md`](./2/engine-components/apistatic.md) | `data/endpoint/**/*.route`, endpoint DSL, discovery manifest, static resolver facade |
| EngineMobile / Device | [`enginemobile.md`](./2/engine-components/enginemobile.md) | server schema patching and device detection |

---

## Cross-cutting references

| Topic | Documentation |
|---|---|
| Release/version history | [`release/index.md`](./release/index.md) |
| Styling, responsive values, at-rules, pseudo states | [`styling.md`](./2/styling.md) |
| Page/layout transitions and shared morphs | [`2/engine-components/enginetransitions.md`](./2/engine-components/enginetransitions.md) |
| GPU `.shed` language and surface pipeline | [`2/engine-components/engineshader.md`](./2/engine-components/engineshader.md) |
| Canvas modes and rendering engines | [`2/engine-components/enginecanvas.md`](./2/engine-components/enginecanvas.md) |
| SVG geometry/import/export | [`2/engine-components/enginesvg.md`](./2/engine-components/enginesvg.md) |
| Schema validation/analyzer codes and scope | [`2/schema-diagnostics.md`](./2/schema-diagnostics.md) |
| Runtime, lazy behavior, bundle/runtime performance | [`2/runtime-performance.md`](./2/runtime-performance.md) |
| External API providers and resolver auth | [`2/engine-components/engineapi.md`](./2/engine-components/engineapi.md) |
| Static in-house endpoint programs | [`2/engine-components/apistatic.md`](./2/engine-components/apistatic.md) |

---

## Abbreviations

| Abbreviation | Module |
|---|---|
| EC | EngineCanvas |
| ESVG | EngineSVG |
| ESH | EngineShader |
| ET | EngineTransitions+ |
| ES | EngineScroll |
| EB | EngineBrowser |
| EM | EngineManim |
| EI | EngineImage |
| EMD | EngineMarkdown |
| EN | EngineNav |
| EH | EngineHero |
| ESU | EngineSuspense |
| EF | EngineForms |
| EA | EngineAPI |
| EAS | APIStatic |
| EMO | EngineMobile |
| ED | EngineDevice |
