# Generation 3 Compiler — Detailed Reference

> **GENERATION 3 · ALPHA** · Source of truth: `main-3`.
>
> This guide documents implemented compiler/runtime code. EngineTheme/`createTheme()` is intentionally not covered here while its separate `plan.md` remains planning-only.

## What the compiler does

The Generation 3 compiler converts a `PageSchema` into a structured plan before rendering. It is an Engine compiler pass alongside Next.js, not a replacement for the Next.js compiler or build system.

At a high level:

```text
PageSchema
  -> compilePage()
  -> compiled nodes + runtime ownership + work priority
  -> used-feature manifest + fallback plan + asset list
  -> security diagnostics
  -> EngineServerRenderer / narrow client islands
```

The output is an `EngineCompiledPage` with a schema, compiled root tree, summary counters, used-feature manifest, fallback plan, capability compatibility alias, assets, and diagnostics.

## Compile a schema

```ts
import { compilePage } from "nextjs-engine";
import type { PageSchema } from "nextjs-engine";

declare const schema: PageSchema;

const plan = compilePage(schema, {
  pageId: "home",
  strict: true,
  security: "enforce",
});

console.log(plan.summary);
console.log(plan.featureManifest.uses);
console.log(plan.fallbackPlan.features);
console.log(plan.diagnostics);
```

The public package exports `compilePage`, plan inspection helpers, build-budget helpers, artifact graph helpers, runtime-profile helpers, and their associated types. Use the current exports and type definitions for the exact call signatures.

## 1. Runtime ownership

Each compiled node is classified as `static`, `server`, or `client`. The compiler has built-in runtime profiles and supports registering custom profiles for custom node types. A profile may describe a runtime kind, a human-readable reason, browser capabilities, default work class, and whether the node is heavy.

The compiler may upgrade an otherwise-static node when its props require browser behavior, such as interactive handlers, transitions, model bindings, or Shader behavior. Custom components default to automatic classification unless the application registers a profile.

## 2. Work classes

The compiler assigns work classes to help the runtime schedule useful work:

| Class | Meaning |
|---|---|
| `critical` | Work required for the initial presentation or explicitly prioritized |
| `visible` | Work relevant to the initial visible page |
| `near` | Work that can be prepared near the viewport |
| `deferred` | Work that can wait until it is useful |
| `idle` | Work suitable for idle capacity |
| `sleeping` | Work that should remain paused until resumed |

Explicit priority/eager props and root/hero rules affect classification; runtime profiles can supply component defaults, and deeper nodes may be deferred. The scheduler can postpone or pause work, but it is not meant to silently lower image quality, Canvas DPR, Shader resolution, or geometry detail as a shortcut to a target frame rate.

## 3. Used-feature manifest

The feature manifest lists the browser capabilities actually used by the compiled page and records which node paths require each feature. It is deterministically sorted and versioned. This is more precise than assuming every browser feature is required by every Engine page.

Use it as input to compatibility planning, debugging, and build analysis:

```ts
const plan = compilePage(schema);
for (const feature of plan.featureManifest.uses) {
  console.log(feature.feature, feature.requiredBy.map((source) => source.path));
}
```

## 4. Fallback plan

The fallback compiler turns the used-feature manifest into a list of per-feature options. The built-in policies include alternatives for features such as View Transitions, IntersectionObserver, container queries, VisualViewport, and CSS Grid. Strategies identify whether the fallback is native, runtime-based, or rendering-based, and describe the expected fidelity (`full`, `close`, or `structural`).

At resolution time, a feature-support resolver chooses the first strategy whose requirements are supported. A feature can be `native`, `fallback`, or `unavailable`. A node may mark its compatibility as optional; this affects whether missing support needs to block that content.

The legacy plan describes which basic content (HTML, CSS, text, images, links, and basic form structure) can be preserved when full enhancements are not available. It does **not** promise that all interactive behavior works in an older browser.

## 5. Assets and compiler diagnostics

Compiled nodes carry their own assets, while the page exposes the combined asset list. Asset records identify kind, source, owner node, work class, and priority. Diagnostics are structured with level, code, message, and optional node/path information so tooling can present a useful explanation without parsing console text.

Runtime/compiler progress is opt-in via the compiler's progress observer. The available phases include page start, per-node updates, page-cache hits, and page completion; normal runtime rendering stays silent unless the caller opts in.

## 6. Dependency-aware artifact cache

The Gen 3 artifact graph can memoize compiler artifacts by kind and ID. The current implementation supports schema, style, asset, command, model, device, and capability artifact kinds.

For each artifact the graph fingerprints its input and records dependency keys. A cache hit requires both an unchanged input fingerprint and unchanged dependency list. If an artifact is rebuilt or invalidated, dependent artifacts are invalidated too. The graph tracks cache hits and rebuilds and evicts least-recently-used entries when its bounded capacity is exceeded (the implementation caps the graph at 512 entries).

The exported helpers are:

- `compileEngineArtifact(descriptor, compile)` — reuse an unchanged artifact or call the supplied compiler callback.
- `fingerprintEngineArtifact(value)` — produce a stable fingerprint for the input value.
- `invalidateEngineArtifacts({ kind, id })` — invalidate matching artifacts and their dependents; called with no selector, it clears the graph.
- `inspectEngineArtifactGraph()` — inspect fingerprints, dependencies, hit counts, and rebuild counts. This inspector throws in production and is development-only.

The graph's HMR-safe state is keyed through `Symbol.for`. This is an in-memory incremental cache, not a persistent disk cache, and is not a claim that every Next.js build operation is skipped.

## 7. Optional build budgets

Gen 3 exports helpers for measuring configured build limits. Supported metrics are initial JavaScript bytes, route JavaScript bytes, critical CSS bytes, request count, and hydrated-island count.

```ts
import {
  evaluateEngineBuildBudgets,
  assertEngineBuildBudgets,
} from "nextjs-engine";

const report = evaluateEngineBuildBudgets(
  {
    initialJS: 180_000,
    routeJS: 90_000,
    criticalCSS: 18_000,
    requestCount: 12,
    hydratedIslands: 4,
  },
  {
    initialJS: 180_000,
    routeJS: 90_000,
    criticalCSS: 18_000,
    requestCount: 12,
    hydratedIslands: 4,
  },
);

assertEngineBuildBudgets(report);
```

In this example the first object is the measurements and the second is the limits; real integrations should provide actual measurements from build output, not copy the same numbers into both objects. Unconfigured metrics are skipped. Each configured metric requires a finite, non-negative measurement and limit. The report includes PASS/FAIL results and optional contributor attribution; `assertEngineBuildBudgets()` throws if any configured limit fails.

The repository's production-proof script reads Next.js build and route manifests and supports application/CI configuration through `ENGINE_BUILD_BUDGETS`; hydrated-island measurements can be supplied through `ENGINE_HYDRATED_ISLANDS`. See [Phase D — Compatibility & Hardening](../gen3/phase-d-hardening.md) for the full integration notes.

## 8. Static security diagnostics

The compiler's security pass checks schema values for several high-risk mistakes, including literal client-visible secrets, `javascript:` URLs in URL-like properties, client references to private database/server modules, credentialed wildcard CORS, `SameSite=None` cookies without `Secure`, and protected commands that explicitly disable device proof. Upload forms without a byte limit or allowed MIME/type list receive warnings.

Serious security diagnostics are enforced by default. `security: "report"` gathers diagnostics without throwing during migration, while `security: "off"` disables that compiler pass and should only be used when a separate validation pipeline is deliberately responsible. Diagnostic messages avoid echoing secret values.

## 9. Adaptive phone/tablet compilation

The adaptive compiler can apply request-appropriate phone and tablet layout changes before rendering. It can compact semantic spacing, adapt grid structure to available container width, wrap or stack crowded content where appropriate, and improve touch targets only when the author has not already set them. Explicit developer patches run after automatic adaptation; a node can opt out with `adaptive: "keep"`.

Adaptive layout is not a license to lower media fidelity. The current contract preserves image quality and Canvas DPR settings.

## Implementation boundaries

- Gen 3 remains an alpha line. The v2.6.x contract is maintained separately on `main-2`.
- The Engine compiler produces the Engine execution plan; Next.js still owns its own build and route compilation.
- The artifact graph is bounded and dependency-aware, but it is not a persistent cache of the whole Next.js build.
- Security diagnostics are not a replacement for real authentication, authorization, runtime input validation, or server-side secrets management.
- EngineTheme and `createTheme()` are outside the scope of this guide until their separately tracked plan is implemented.

## Related references

- [Generation 3 overview](./overview.md)
- [Phase A + B — compiler, server rendering, scheduler](./phase-a-b.md)
- [Phase C — network and credentials](./phase-c-network.md)
- [Phase D — compatibility and hardening](./phase-d-hardening.md)
- [Styling — detailed reference](../3/styling-detailed.md)
- [Gen 2 documentation](https://github.com/Kate-alt-69/nextjs-engine/blob/main-2/docs/2/index.md)
