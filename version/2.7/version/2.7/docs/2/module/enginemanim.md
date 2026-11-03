# EngineManim — 2D & 3D Animation

> **GENERATION 2 · STABLE 2.x** · Source branch: `main-2`. This reference describes the 2.x line.



EngineManim provides a Manim-style 2D canvas runtime and a separate Three.js
GLTF/GLB/OBJ renderer with clip/DSL bone animation.

## EngineManim 2D

Schema types: `"manim"` and `"EngineManim"`.

```ts
{
  type: "manim",
  props: {
    cprop: {
      manim: {
        mobjects: [
          { id: "ring", type: "Circle", radius: 50, strokeColor: "#60a5fa", strokeWidth: 3 },
          { id: "square", type: "Square", sideLength: 80, strokeColor: "#60a5fa", strokeWidth: 3 },
        ],
        timeline: [
          { action: "Create", target: "ring", durationMs: 600 },
          { action: "Transform", origin: "ring", target: "square", durationMs: 800 },
          { action: "FadeOut", target: "square", durationMs: 400 },
        ],
        settings: { loop: true, fpsLimit: 60 },
      },
    },
  },
}
```

Supported mobjects include `Circle`, `Square`, `Rectangle`, `Line`, and `Path`.
Supported actions include `Create`, `FadeIn`, `FadeOut`, `Transform`, and `Wait`.

### 2D runtime and frame behavior

Shape geometry is compiled once per `ManimConfig` object. Transform steps also
pre-normalize origin/target point counts before RAF begins, so the transform hot
path interpolates into a retained `Float32Array` rather than allocating new
geometry buffers every frame.

`settings.fpsLimit` is enforced by the Manim callback. It caps expensive Manim
painting/timeline sampling while the browser RAF may continue at the display
refresh rate. Values above the display refresh rate naturally cannot create more
browser frames than RAF supplies.

A `Wait` action is a true hold: it leaves the previously rendered frame intact
until the wait duration completes. It does not clear the canvas to the
background.

When `settings.loop` is false, the final timeline frame returns EngineCanvas's
callback-completion signal and the Canvas RAF stops. A responsive backing-store
resize requests one redraw so the retained final frame survives resizing, then
the callback stops again. An empty timeline likewise owns no permanent RAF.

When Manim setup restarts for a changed configuration, timeline index, loop
counter, timing accumulator, and delay state reset to the beginning rather than
continuing from the previous configuration's step index.

## EngineManim 3D

Schema types: `"manim3d"` and `"EngineManim3D"`.

| Tier | Feature |
|---|---|
| 1 | Static GLTF / GLB / OBJ mesh → WebGL |
| 2 | GLTF built-in animation clip playback |
| 2.5 | File clip plus per-bone overrides, or source-driven tracks |
| 3 | DSL `frame()` blocks driving bone transforms |
| 4 | Camera look constraint targeting a bone |

```ts
{
  type: "manim3d",
  props: {
    cprop: {
      manim3d: {
        src: "/models/character.glb",
        camera: {
          position: [0, 2, 5],
          fov: 60,
          look: { content: "head" },
        },
        lights: [
          { type: "ambient", intensity: 0.4 },
          { type: "directional", intensity: 0.8, direction: [1, -1, 0.5] },
        ],
        animation: {
          source: "file",
          clip: "walk_cycle",
          overrides: [
            {
              bone: "left.hand",
              mode: "replace",
              frames: [
                {
                  frameStart: 0,
                  frameEnd: 30,
                  transforms: [
                    { bone: "left.hand", rotate: [0, 45, 0] },
                  ],
                },
              ],
            },
          ],
        },
        settings: { fps: 60, shadows: true },
      },
    },
  },
}
```

### Loader and bundle behavior

Three.js is dynamically imported only by the 3D runtime. The model loader is
also format-specific:

- OBJ loads `OBJLoader` only.
- GLTF/GLB loads `GLTFLoader` only.

A page using ordinary engine primitives does not need either model loader merely
because Manim3D is registered.

### Static scenes are demand-rendered

A Manim3D scene without a clip or bone tracks renders once after loading and
again when its size changes. It does **not** keep a 60fps RAF alive just to draw
the same frame repeatedly.

Animated scenes use RAF only while both conditions are true:

- the canvas is within a 200px viewport margin;
- the document/tab is visible.

Leaving the viewport or hiding the tab cancels the active RAF. Resuming restarts
the Three clock so a long hidden period does not become one huge animation
`delta`.

### Size behavior

Measured canvas dimensions are clamped to at least one pixel. When no explicit
height exists, the component keeps a 150px CSS minimum rather than relying on a
`height: 100%` parent that may resolve to zero.

### Bone-track behavior

`replace` tracks set sampled position/rotation/scale values directly.

`additive` tracks layer sampled values over the current mixer pose when a file
clip is active, or over the bone's captured base pose when no mixer is active.
Movement applies all X/Y/Z axes; rotation is converted from DSL degrees to Three
radians; additive scale is multiplicative against the base/current scale.

Source-driven tracks can therefore animate even when there is no playing GLTF
clip. Their fallback timeline is based on 240 frames at the configured Manim3D
FPS when no clip duration is available.

### Cleanup and async safety

Unmount cleanup cancels RAF, disconnects resize/intersection observers, removes
the Page Visibility listener, stops/uncaches the AnimationMixer, disposes model
geometries/materials/textures, and disposes the WebGLRenderer.

If the component unmounts while Three.js or a model loader is still resolving,
the initialization path notices the disposed state and releases anything it has
already created instead of installing a late observer/renderer after unmount.
Initialization failures are reported with an `EngineManim3D` console error
instead of becoming an unhandled promise rejection.

### Wireframe materials

Wireframe mode handles both a single Three material and a material array on a
mesh.

### CSS custom-property colors

`THREE.Color` cannot resolve DOM CSS variables by itself. If a Manim3D light or
background color is supplied as `var(...)`, the renderer currently falls back
to white instead of throwing. Resolve the CSS variable to a concrete color in
application code when exact WebGL color parity is required.

## DSL shape

```text
frame (
  frame-start = 120
  frame-end   = 240
) {
  left.hand.rotate = [0, 45, 0]
  right.leg.rotate = [30, 0, 0]
}

camera.look.content = head
camera.position = [0, 2, 5]
```

Bone `.move`, `.rotate`, and `.scale` transforms belong inside `frame()` blocks.
Camera/light declarations belong at the top level. Bone names may contain dots;
the transform operation is the final dotted segment.

## Public 2D and 3D type contracts

### 2D configuration

`ManimConfig` is the value assigned to `cprop.manim`:

```ts
interface ManimConfig {
  mobjects: ManimMobject[];
  timeline: ManimTimelineStep[];
  settings?: {
    loop?: boolean;
    fpsLimit?: 30 | 60 | 120;
    background?: string;
  };
}
```

Supported mobject shapes:

| Shape | Required fields | Optional fields |
|---|---|---|
| `Circle` | `id`, `type: "Circle"`, `radius` | `x`, `y`, `strokeColor`, `fillColor`, `strokeWidth` |
| `Square` | `id`, `type: "Square"`, `sideLength` | `x`, `y`, `strokeColor`, `fillColor`, `strokeWidth` |
| `Rectangle` | `id`, `type: "Rectangle"`, `width`, `height` | `x`, `y`, `strokeColor`, `fillColor`, `strokeWidth` |
| `Line` | `id`, `type: "Line"`, `x1`, `y1`, `x2`, `y2` | `strokeColor`, `strokeWidth` |
| `Path` | `id`, `type: "Path"`, SVG path data in `d` | `strokeColor`, `fillColor`, `strokeWidth` |

A `ManimTimelineStep` has `action` (`Create`, `FadeIn`, `FadeOut`,
`Transform`, or `Wait`), required `durationMs`, optional `target` and
`delay`, optional `origin` for `Transform`, and optional `easing`
(`linear`, `ease-in`, `ease-out`, `ease-in-out`, `bounce`, or
`elastic`).

### 3D configuration

`Manim3DConfig` is assigned to `cprop.manim3d`:

| Field | Type | Notes |
|---|---|---|
| `src` | `string` | Required GLTF/GLB/OBJ model path. |
| `format` | `"gltf" \| "glb" \| "obj"` | Optional explicit model format. |
| `camera` | `Manim3DCamera` | Camera position, FOV, near/far planes, look target and focus settings. |
| `lights` | `Manim3DLight[]` | Ambient, directional, point or spot lights. |
| `animation` | `ManimAnimationRoute` | Built-in file clip, source DSL animation, and optional per-bone overrides. |
| `settings` | object | Optional `loop`, `fps`, `shadows`, `wireframe`, and `background` settings. |

`Manim3DCamera` supports `position`, `fov`, `near`, `far`,
`look.content` (a bone name or a world-space `[x, y, z]` target), and
`focus.distance` / `focus.aperture`. A light supports `type`, `color`,
`intensity`, `position`, `direction`, and `castShadow`.

An animation route uses `source: "file"` with a `clip` name, or
`source: "source"` with a `dsl` string. Optional `speed` is a playback
multiplier. `overrides` contains per-bone frame groups and a mode:
`"replace"` replaces a GLTF track; `"additive"` layers the DSL transforms
over the file clip/base pose. Each frame group specifies `frameStart`,
`frameEnd`, and a list of bone transforms; a transform can supply
`move`, `rotate` (Euler degrees), `scale`, and `easing`.


### Direct React component props

The exported React components take their configuration through the same
`cprop` shape as schema nodes:

```tsx
"use client";

import { EngineManim, EngineManim3D } from "nextjs-engine";

export function AnimationExamples() {
  return (
    <>
      <EngineManim cprop={{ manim: twoDConfig }} width={640} height={360} />
      <EngineManim3D cprop={{ manim3d: threeDConfig }} width={640} height={360} />
    </>
  );
}
```

| Component | Required prop | Optional props |
|---|---|---|
| `EngineManim` | `cprop: { manim: ManimConfig }` | `width`, `height`, `className`, `style` |
| `EngineManim3D` | `cprop: { manim3d: Manim3DConfig }` | `width`, `height`, `className`, `style` |


### Generation 2 boundary

Generation 2 does not expose `Manim3DConfig.materialSrc` or the special `"$root"` bone target. Use a named bone present in the loaded model for Gen 2 bone tracks.
