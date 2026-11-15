# Engine3D retained rendering

> **GENERATION 3 · ALPHA** · Source branch: `main-3`.

`Engine3D` is the built-in Three.js renderer selected by EngineCanvas with `graphics.engine: "3d"`. It consumes the same retained EC scene model as the 2D and SVG renderers; it does not introduce a separate Three.js scene-building API.

The root `nextjs-engine` entrypoint exports `Engine3D`, the EC model factories, the EC model types, and the renderer contract (as `ECRenderingEngine`). Most applications should let `EngineCanvas` create, resize, render, and dispose the renderer rather than instantiate `Engine3D` directly.

## Quick start

Build the EC scene outside the component render path so its generated node ids remain stable. The example uses the XY plane, which is visible to the default perspective camera.

```tsx
"use client";

import {
  EngineCanvas,
  ecCircle,
  ecGroup,
  ecRect,
  ecScene,
  ecTransform,
  ecVec3,
} from "nextjs-engine";

const scene = ecScene(
  [
    ecGroup(
      [
        ecRect(2.4, 1.4, {
          material: { fill: "#2563eb", opacity: 0.95 },
          transform: ecTransform({ position: ecVec3(-0.65, 0, 0) }),
        }),
        ecCircle(0.42, {
          material: {
            fill: "#f59e0b",
            shading: "rim",
            rimColor: "#fff7ed",
            rimIntensity: 0.7,
          },
          transform: ecTransform({ position: ecVec3(0.8, 0, 0.2) }),
        }),
      ],
      ecTransform({ rotation: ecVec3(0, 0, 8) }),
    ),
  ],
  {
    camera: {
      position: ecVec3(0, 0, 5),
      lookAt: ecVec3(0, 0, 0),
      fov: 55,
    },
    environment: "custom",
    background: "#101827",
  },
);

export function ScenePreview() {
  return (
    <EngineCanvas
      width={720}
      height={420}
      graphics={{ engine: "3d", scene }}
    />
  );
}
```

For responsive sizing, lifecycle controls, context selection and the full `EngineCanvas` prop contract, see [EngineCanvas](./enginecanvas.md).

## Public EC scene model

The graphics model is generation-shared. These types and factories are exported from `nextjs-engine` in both Gen 2 and Gen 3.

| Type | Contract |
|---|---|
| `ECVector2` / `ECVector3` | Numeric `x/y` and `x/y/z` coordinates |
| `ECBounds` | Local-space `min` and `max` vectors |
| `ECTransform` | `position`, `rotation`, and `scale`; rotation values are degrees |
| `ECMaterial` | Optional `fill`, `stroke`, `strokeWidth`, `opacity`, `shading`, `rimColor`, and `rimIntensity` |
| `ECCamera` | Required `position`; optional `lookAt`, `fov`, `near`, and `far` |
| `ECMesh` | `Float32Array` vertex positions, optional `Uint16Array`/`Uint32Array` indices, material, transform and topology; includes vertex/face/bounds/center helpers |
| `ECGroup` | A stable id, child `ECNode[]`, and group transform |
| `ECNode` | Union of `ECMesh` and `ECGroup` |
| `ECScene` | Root children plus optional camera, environment and background |
| `ECEnvironment` | `"void"` or `"custom"` |

### Factory functions

| Factory | Signature and behavior |
|---|---|
| `ecVec2` | `ecVec2(x: number, y: number): ECVector2` |
| `ecVec3` | `ecVec3(x: number, y: number, z = 0): ECVector3` |
| `ecTransform` | `ecTransform(overrides: Partial<ECTransform> = {}): ECTransform`; defaults to zero position/rotation and unit scale |
| `ecMaterial` | `ecMaterial(overrides: Partial<ECMaterial> = {}): ECMaterial`; defaults to opacity 1, stroke width 1, flat shading and rim intensity 0.5 |
| `ecCircle` | `ecCircle(radius, { segments?, material?, transform? } = {})`; segments defaults to 48 and is clamped to at least 3 |
| `ecRect` | `ecRect(width, height, { material?, transform? } = {})` |
| `ecPath` | `ecPath(source: string | ECVector2[], { material?, transform? } = {})`; creates a line-strip mesh |
| `ecLine` | `ecLine(points: ECVector2[], { material?, transform? } = {})`; creates a line-strip mesh |
| `ecPolygon` | `ecPolygon(points: ECVector2[], { material?, transform? } = {})`; creates a triangle-fan mesh |
| `ecGroup` | `ecGroup(children: ECNode[], transform: Partial<ECTransform> = {}): ECGroup` |
| `ecScene` | `ecScene(children: ECNode[], { camera?, environment?, background? } = {}): ECScene` |
| `ecVoidEnvironment` | The exported `"void"` environment constant |

The shape factories return `ECMesh` objects with generated ids. A circle is a triangle fan; a rectangle and polygon are also triangle fans; paths and lines are strips. `ecPath` accepts the common SVG path commands `M`, `L`, `H`, `V`, `C`, `Q`, and `Z` in absolute or relative form. Cubic and quadratic curves are flattened into line segments. Unsupported commands (including SVG arc commands) are skipped rather than rendered as native curves.

Because `ecPolygon` emits a triangle fan from the first vertex, use it for convex filled polygons. It is not a general concave-polygon triangulator.

### Mesh data and topology

An `ECMesh.vertices` array is a flat sequence of XYZ triplets: `[x, y, z, x, y, z, ...]`. Optional indices select vertices for triangle surfaces. The topology values are:

| Topology | Renderer meaning |
|---|---|
| `"fan"` | Triangle fan rooted at vertex 0 |
| `"triangles"` | Independent triangle-list surface |
| `"strip"` | Connected line strip, rendered without a filled surface |

`vertexCount()`, `faceCount()`, `bounds()`, and `center()` describe the mesh's source vertex data. Face counts are topology-aware: strips report zero; indexed surfaces use `floor(indices.length / 3)`; a non-indexed fan uses `max(0, vertexCount - 2)`; and a non-indexed triangle list uses `floor(vertexCount / 3)`.

`bounds()` and `center()` use the mesh's local vertex coordinates; they do not apply the mesh or parent-group transforms.

## Camera and environment

The renderer creates a perspective camera with these defaults when no scene camera is supplied:

| Camera setting | Default |
|---|---:|
| Position | `(0, 0, 5)` |
| Field of view | `60°` |
| Near plane | `0.1` |
| Far plane | `1000` |

When `ECScene.camera` is provided, `position` is required. `lookAt`, `fov`, `near`, and `far` are optional; omitted projection values retain the renderer defaults.

The current environment implementation is deliberately small:

- `environment: "void"` clears the scene background and fog.
- `environment: "custom"` with a non-empty `background` sets a solid Three.js color.
- There is no environment-map/HDRI, sky, floor, fog preset, shadow system, or public light-node API in this EC renderer.

## Material behavior and visual limits

Engine3D currently uses Three.js `MeshBasicMaterial` for surfaces and `LineBasicMaterial` for strips. These are unlit materials; the presence of Three.js in the package does not mean that EC scenes have a configurable lighting pipeline.

| Material field | Engine3D behavior |
|---|---|
| `fill` | Surface color; defaults to `#60a5fa` when omitted |
| `stroke` | Strip color (preferred over `fill`); ignored for filled surface meshes |
| `strokeWidth` | Not applied by the current 3D renderer |
| `opacity` | Applied to surface and line materials; values below 1 enable transparency |
| `shading: "none"` / `"flat"` | Both render as unlit basic materials |
| `shading: "rim"` | Adds a slightly expanded back-face shell when `rimColor` is supplied |
| `rimColor` | Color of the optional rim shell |
| `rimIntensity` | Rim-shell opacity; defaults to 0.5 |

Rim shading is an illustration effect, not physically based lighting. For shaded materials, real lights, shadows, textures, imported 3D assets, or post-processing, use a renderer/workflow that explicitly provides those capabilities; they are not configurable through the current ECScene/ECMaterial contract.

## Retained identity and geometry updates

Engine3D retains Three.js objects by EC node `id`.

- Keep the same node id when updating an existing mesh or group so the renderer can reuse its object.
- Position, rotation, scale and material values are synchronized in place.
- Geometry is rebuilt when the `vertices` reference, `indices` reference, or topology changes. Editing a typed array in place does not trigger that rebuild; replace the array reference when the geometry changes.
- A change between `"strip"` and a surface topology replaces the Three.js line/mesh object. A change between `"fan"` and `"triangles"` can retain the surface object while rebuilding geometry.
- Replacing a node's type (`"mesh"` ↔ `"group"`) detaches and disposes the previous retained object. Nodes removed from the scene are also detached and disposed.

The built-in factories generate ids when called. Do not call them afresh on every component render when you expect retained-object reuse; create the scene outside the render path or memoize it. If geometry is regenerated, prefer creating a fresh mesh from a factory rather than replacing the typed-array field on a factory-created mesh: the factory's metric helpers close over the arrays supplied at creation.

## Renderer lifecycle and customization

`Engine3D` implements the public `ECRenderingEngine` contract:

| Method | Contract |
|---|---|
| `init(context)` | Asynchronously loads Three.js and initializes the WebGL renderer, camera and scene |
| `render(scene, delta, frame)` | Synchronizes EC nodes and renders the scene |
| `resize(width, height, dpr?)` | Updates camera aspect ratio, renderer size and pixel ratio |
| `dispose()` | Detaches retained objects and releases geometry, materials and renderer resources |

The `delta` and `frame` values are part of the shared renderer contract; Engine3D currently does not use them for internal animation. EngineCanvas owns the animation-frame loop and supplies the context/lifecycle calls.

For custom renderer registration and the full `ECRenderingEngine` context type, see [EngineCanvas — custom rendering engines](./enginecanvas.md#custom-rendering-engines). For SVG import/export behavior, see [EngineSVG](./enginesvg.md).
