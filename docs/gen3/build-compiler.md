# Generation 3 build compiler and progress output

Generation 3 now has a build coordinator for the repository's production build. It runs the NE compiler's static schema pass concurrently with Next.js, then writes NE-owned build metadata only if both passes complete successfully.

## Build

Use the repository build command:

\`\`\`sh
npm run build
\`\`\`

The coordinator:
1. prepares production-only generated routes;
2. runs the TypeScript check;
3. starts \`next build\` and the Generation 3 schema compiler in parallel;
4. cancels the peer process if either pass fails;
5. emits \`<distDir>/nextjs-engine/compiler-manifest.json\` only after both passes succeed.

The configured Next.js \`distDir\` is respected. The current repository uses \`dist/\`, so the Engine manifest is written to \`dist/nextjs-engine/compiler-manifest.json\`.

## Progress logs

Typical output from the Engine pass looks like:

\`\`\`text
nextjs-engine | Compiling app/(marketing)/about/page.tsx
nextjs-engine | Compiling Custom Component notice (app/(marketing)/about/page.tsx:root.0)
nextjs-engine | Compiled app/(marketing)/about/page.tsx — 4 nodes, 1 client islands, 2 assets
nextjs-engine | Emitted dist/nextjs-engine/compiler-manifest.json after Next.js build succeeded
\`\`\`

The worker reports the original source path, the schema-node path, custom component names, and page summaries. The separate prefix keeps Engine output distinguishable from Next.js output, even when the two processes are logging concurrently.

The compiler progress callback is opt-in in the compiler API. Normal application rendering stays quiet unless a caller supplies \`onProgress\`; the build worker opts into detailed progress events.

## What is compiled

The pass statically resolves local \`createPage({ schema: ... })\` schemas and \`defineSchema({...})\` wrappers that can be represented as literals and local constants. It invokes the existing Generation 3 \`compilePage()\` compiler, so runtime classification, custom-node classification, assets, feature manifests, fallback plans, and diagnostics come from the same compiler implementation.

Dynamic schemas that require imported/runtime-generated values, object spreads, computed keys, or arbitrary function execution are reported as skipped for static compilation. They are not evaluated or executed by the build worker; Next.js continues to own their normal bundling and runtime rendering. This is intentionally conservative rather than executing application code during a second compilation pass.

## Emitted manifest

The manifest contains route/source paths, compiler summaries, custom component names, asset metadata (without original asset URLs), used capabilities, fallback strategy summaries, and diagnostics. It deliberately excludes the full schema, arbitrary component props, request data, and prop contents.

It is metadata for NE's own build/runtime tools, not a replacement for Next.js's chunks, route manifests, or server bundles. The emitter creates the Engine-owned subdirectory after Next.js succeeds and refuses output paths outside the project build directory.

## CI

The Generation 3 CI lane runs \`scripts/gen3-build-compiler-smoke.js\` and uses \`npm run build\` for the integration build. The smoke test verifies source-path logging, custom-component logging, route-group normalization, output placement, and that arbitrary schema prop content is not copied into the emitted manifest.
