# Generation 3 build compiler and progress output

Generation 3 uses the Next.js build adapter lifecycle to run the Engine's static schema compiler alongside Next.js and to write Engine-owned build metadata after Next.js completes successfully.

## Build

Use the normal project build command:

```sh
npm run build
```

When the combined `withEngine()` plugin is configured, it wires `adapterPath` to the Engine adapter. This is part of the normal Next.js build lifecycle; a separate build coordinator is not required. The adapter starts the schema scan in a separate Node worker while Next.js owns bundling, route compilation, rendering, and output generation.

The adapter:
1. starts the Generation 3 compiler from Next.js's production-build configuration phase;
2. logs source paths and custom schema components while the compiler pass runs alongside Next.js;
3. awaits the compiler manifest after Next.js reports a completed build;
4. writes `<distDir>/nextjs-engine/compiler-manifest.json` using the exact output directory passed by Next.js;
5. chains any adapter that was already configured by the application.

The Engine does not replace Next.js's Turbopack/Webpack compiler. It uses the existing Generation 3 `compilePage()` compiler for statically resolvable schemas, and emits separate Engine metadata into its own subdirectory after the Next.js build finishes.

## Progress logs

The compiler worker prints the updated block-style wordmark. Both the project credit and the combined `NOT AFFILIATED WITH NEXT.JS NOR VERCEL` disclaimer use a matching three-row Pegga-style pixel font. The former `x next.js` subtitle is removed.

Typical output from the Engine pass looks like:

```text
nextjs-engine | Compiling app/(marketing)/about/page.tsx
nextjs-engine | Compiling Custom Component notice (app/(marketing)/about/page.tsx:root.0)
nextjs-engine | Compiled app/(marketing)/about/page.tsx — 4 nodes, 1 client islands, 2 assets
nextjs-engine | Emitted dist/nextjs-engine/compiler-manifest.json after Next.js build succeeded
```

The worker reports original source paths, schema-node paths, custom component names, cache reuse, and page summaries. The prefix keeps Engine output distinct from Next.js output even when both write to the terminal concurrently.

The compiler progress callback is opt-in in the compiler API. Normal application rendering stays quiet unless the caller supplies `onProgress`; the build worker opts into detailed progress events.

## What is compiled

The pass statically resolves local `createPage({ schema: ... })` schemas and `defineSchema({...})` wrappers that can be represented as literals and local constants. It invokes the existing Generation 3 compiler, so runtime classification, custom-node classification, assets, feature manifests, fallback plans, and diagnostics are produced by the same compiler implementation.

Dynamic schemas that require imported/runtime-generated values, object spreads, computed keys, or arbitrary function execution are reported as skipped for static compilation. The build worker does not evaluate arbitrary application code; Next.js continues to own their normal bundling and runtime rendering. The pass is intentionally conservative.

## Emitted manifest

The manifest contains source/route paths, compiler summaries, an analyzed node graph (type/runtime/work class/capabilities/child IDs), custom component names, asset metadata without original asset URLs, used capabilities, fallback-strategy summaries, and diagnostics. It excludes complete schemas, arbitrary component props, request data, and prop contents.

It is metadata for Engine build/runtime tooling, not a replacement for Next.js chunks, route manifests, server bundles, or the Next.js build compiler. The emitter creates an Engine-owned subdirectory after Next.js succeeds and refuses output paths outside the configured build directory.

## Existing adapters and CI

If an application already configured a Next.js adapter, `withEngine()` chains its `modifyConfig` and `onBuildComplete` callbacks through the Engine adapter.

The Generation 3 CI lane runs `scripts/gen3-build-compiler-smoke.js` and uses `npm run build` for the integration build. The smoke test verifies source-path logging, custom-component logging, route-group normalization, output placement, path safety, and that arbitrary schema prop content is not copied into the emitted manifest.
