# Generation 3 build compiler

> **GENERATION 3 · ALPHA** · Source branch: `main-3`.

The Generation 3 build adapter runs a small Engine-owned analysis pass alongside Next.js. It does not replace, patch, or reconstruct the Next.js/Turbopack compiler. Next.js remains responsible for TypeScript/TSX transformation, React Server Component boundaries, bundling, chunk splitting, route rendering, and final JavaScript/CSS output.

## Performance-first route and module pass

The pre-build pass discovers App Router and Pages Router entry files (including route handlers and supported metadata routes), then follows their reachable local imports. Type-only imports, dependency directories, hidden build output, and unrelated Engine modules are not treated as runtime compile jobs. AST reads and module resolution are cached within the pass, and each reached Engine module is indexed once even if many routes import it.

NENC's Engine schema compiler uses **three actual Node.js worker threads**. Statically resolvable schema jobs are queued across those three workers, and each worker reports completed schema-node visits against that job's node count. The three percentages therefore belong to three different active jobs; they are not guessed time estimates and do not purport to show Turbopack's private internal progress. Each worker has one status slot that can report compilation percentage or byte throughput for an I/O task. 

NENC also keeps persistent schema-plan outputs under `.nextjs-engine/.cache/gen3/schema-output/`. Each schema job has its own cache file keyed by source path and route/schema ID; the entry fingerprint includes the canonical static schema, only the registered custom component types used by that schema, the TypeScript version, and the compiler source fingerprint. An unchanged job reads its compiled page record from disk without starting a worker. Editing one schema rewrites only that job's cache file; unchanged route entries remain byte-for-byte untouched. A compiler/runtime source change changes the compiler fingerprint and safely forces stale entries to rebuild. Cache writes use a temporary file and replacement step, and a missing/corrupt/unwritable cache entry falls back to compilation rather than failing the build.

A schema/component error is isolated to its own CW task. NENC writes a red `[NENC] ERRORED COMPONENT <source> -> <route>` line with the failure message, marks that task as an error in the compiler manifest, and continues scheduling queued work on the available CWs. Other active tasks can finish normally. A failed page is excluded from the generated schema-plan list; successful pages and their cache entries are preserved, and the failed task never writes or replaces a cache artifact. This allows the NENC metadata pass to finish without corrupting unrelated output. Next.js still performs its own build, so independent syntax/type/build errors reported by Next.js can still fail that build.

The cache intentionally stores schema compiler outputs, not the entire Next.js/Turbopack output. NENC still scans the project and analyzes route/import relationships to rebuild the dependency manifest, while Next.js remains responsible for transforming and bundling application code.

In an interactive terminal, a four-row `[NENC]` dashboard is pinned to the bottom of the viewport: one header plus `CW1`, `CW2`, and `CW3`. Normal output scrolls above it, and completed tasks remain in scrollback as `[NENC] DONE ...` lines. ANSI colors are enabled when the terminal supports them and can be disabled with `NO_COLOR`. When active tasks share an operation, their targets and per-worker metrics are compacted into one line. For example, the three schema workers can display `Compiling /guide, emd, ec · (43% - 57% - 80%)`. Different kinds of work keep their own metrics, such as `Compiling /guide (33.3%) · Downloading: ICON:google.com (8 KB/s)`.

The Next.js development-output bridge remains separate from the three NENC schema workers. If Next.js prints `Compiling /a, /b, /c`, NENC tracks those observed development route targets, then finishes them only from a real `Compiled /route` event or request log with an actual compile duration. That route percentage is not a claim about Turbopack's internal work. When Next.js emits a real count (for example, static pages 3/8), that exact count drives the displayed percentage. During `next build`, NENC instead reports recognized build phases and the durations/counters that Next.js actually supplies; it does not fabricate route-by-route production-build progress.

The same three-slot logger labels every active download task as `Downloading:`, whether it is an EngineTheme font transfer or an EngineMarkdown favicon. A task takes whichever CW slot is next available; downloads are not pinned to CW3. Font stylesheet/file downloads report measured throughput from the response stream. The EMD favicon endpoint measures bytes read and elapsed time from the response body and shows the measured byte rate for the assigned slot. On completion it logs the measured transfer size, duration, and average rate, for example `[NENC] DONE downloaded icon:github.com (76 KB · 84ms · 905 KB/s)`. These figures are an illustrative format; emitted values come from the transfer. Icon responses remain capped at 256 KiB. The download status uses the normalized hostname only, not the source link's path or query.

Next.js 16 does not reliably expose `dev` in `process.argv` while evaluating `next.config.js`; the development bridge also checks `NODE_ENV` and the development phase. Without an interactive TTY, terminal-cursor pinning is unavailable; CI/redirected output keeps completion and failure lines rather than pretending to maintain a viewport row.

```text
[NENC] DONE compiled app/work/page.tsx -> /work · 58 Engine modules · 19ms · 1 client island · 2 assets
[NENC] DONE Downloaded font: Inter.woff2 184 KB · 768ms · 239 KB/s
[NENC] DONE downloaded icon:github.com (76 KB · 84ms · 905 KB/s)

════ NENC ═════════════════════════════════════════════════════════════════════
CW1  Compiling /privacy-policy ················· 34.2%
CW2  Compiling / ····························· 21.7%
CW3  Downloading: fonts: Inter, JetBrains Mono  239 KB/s
```

The sample numbers above illustrate the output format; the logger prints real node progress, byte counts, elapsed times, and transfer rates from the active work. Failed tasks use a red `[NENC] ERRORED ...` line and do not suppress other CW completion records.

A resolved Engine import logs its source path. An Engine symbol coming from an installed package or an unresolved source alias uses a stable import name such as `@engine/EngineCanvas`. Module completion means Engine's dependency/usage metadata is ready; it does **not** mean Engine emits a replacement JS chunk. The imported code continues through Next.js as usual. Schema-compilation jobs run on Node worker threads; download/fetch jobs share the same three CW scheduling slots and report live transfer metrics while using async I/O. Next.js remains the owner of JS/TSX transformation, React Server Component boundaries, bundling, and final JavaScript/CSS output.

## Mirroring Next.js build activity

During `next build`, the Engine adapter also watches Next.js's terminal output for recognizable phase messages. Messages such as optimized-build compilation, type checking, page-data collection, static-page generation, and build-trace collection update the dashboard header while its three CW slots remain available for task-specific work. Recognized one-line progress/completion messages are normalized to the NENC display; successful milestones become `[NENC] DONE ...` lines. Unrecognized output—including detailed diagnostics—is passed through without rewriting.

The adapter currently has only configuration and build-completion lifecycle hooks; it does not expose a supported per-file Turbopack compile callback. This bridge therefore parses known CLI messages as a best-effort display feature, not as a stable Next.js internal API. New or changed Next.js wording can simply remain ordinary output until the parser is updated.

The Generation 3 worker sends structured status/completion messages to the parent adapter over IPC. The parent adapter owns the terminal cursor and reapplies the pinned dashboard after Next.js writes to the terminal, preventing two processes from fighting over the same rows. Redirected logs and CI cannot pin a cursor, so only completion/failure events are printed there.

## Helping Next.js compile faster

The combined Engine plugin opts into Next.js's supported Turbopack filesystem cache for development and production builds. This warm-cache optimization lets Next.js restore prior work on subsequent sessions/builds; it does not promise that the first cold build is faster, and Next.js still owns JS/TSX transformation and bundling. Apps can explicitly override either setting with `experimental.turbopackFileSystemCacheForDev: false` or `experimental.turbopackFileSystemCacheForBuild: false`; other `experimental` values are preserved.

## Schema plans remain conservative

For statically resolvable `createPage({ schema })` schemas and `defineSchema({...})` wrappers, the pass also invokes the existing Generation 3 page compiler. It produces the normal runtime classification, custom-node classification, assets, feature manifests, fallback plans, and diagnostics.

If a page's schema depends on runtime values, imports, object spreads, computed properties, or arbitrary function execution, Engine skips only static **schema planning** for that page. It still analyzes that route's import graph, and Next.js continues to compile and render the route normally. This is why route-entry count and static-schema-plan count are separate numbers.


## EngineTheme compiler integration

The implementation is split by responsibility rather than placed in the plugin directory:

- `src/engine/compiler/theme/3/compiler.ts` owns static AST extraction, validation, `.etr` serialization, hashing, guarded artifact writes, and stale-artifact cleanup.
- `src/engine/component/engineTheme/` owns the runtime `createTheme()` API, ID resolution, remote `.etr` loader, templates, highlighting, Data-API, and theme tokens; production font compilation is implemented in `src/engine/compiler/font/3/compiler.ts`.
- `src/engine/plugins/gen3ThemeCompiler.js` is a thin Next.js integration link to `../compiler/theme/3/compiler.ts`; it contains no compiler logic.
- `src/engine/compiler/build.compiler.ts` remains the NENC/Next.js build coordinator. The Next.js adapter is exposed through `src/engine/compiler/nextjs.compiler.ts`; `src/engine/plugins/engineBuildAdapter.js` is the Next.js-facing link. The build coordinator invokes `theme/3/compiler.ts` and `font/3/compiler.ts` directly; plugin files stay focused on framework integration.

Place runtime EngineTheme logic under `src/engine/component/engineTheme/` and compiler implementation under `src/engine/compiler/`. Reserve `src/engine/plugins/` for Next.js integration hooks, adapters, and linking.

## EngineTheme .etr version and integrity contract

NENC emits deterministic UTF-8 JSON under `.nextjs-engine/gen3/theme/<theme-id>.etr`. The envelope separates `formatVersion` (the .etr container shape) from `schemaVersion` (the EngineTheme definition contract); both currently equal `1`. It also records `generatedBy: "NENC"`, the group ID, `createdWith.nextjs`, `createdWith.nextjsEngine`, and the JSON theme definition. `sha256` is calculated over canonical JSON for the complete envelope excluding the `sha256` property itself. The remote loader requires an exact allowlisted HTTPS origin, checks the expected framework/Engine versions, verifies the digest, rejects unsupported envelope or schema versions, and only then registers the data. SHA-256 detects corruption; it is not a publisher signature or proof of origin. Remote themes remain owner-hosted data and never execute theme-supplied code.

## EngineTheme font assets

The Gen 3 source pass compiles statically visible `createTheme()` definitions into `.etr` files. When `NODE_ENV=production`, the same pass runs a production-only font compiler after writing those artifacts.

- Theme CSS and font responses use sequential bounded reads, redirects disabled, credentials omitted, timeouts, byte limits, content-type checks, and exact-origin allowlists.
- Default origins are `fonts.googleapis.com` for stylesheet CSS and `fonts.gstatic.com` for font binaries. Extra origins must be explicitly listed in `ENGINE_THEME_FONT_CSS_ORIGINS` and `ENGINE_THEME_FONT_FILE_ORIGINS`.
- Supported outputs are WOFF2, WOFF, TTF, and OTF. Binary filenames are content-addressed; generated local CSS references only emitted local font files.
- Cache metadata and source font assets live under `.nextjs-engine/.cache/gen3/fonts/`; emitted files live under `public/nextjs-engine/fonts/`. Existing unrelated files are not overwritten, symlink paths are rejected, and writes use temporary files plus replacement.
- Valid cache entries are reused for seven days by default. `ENGINE_THEME_FONT_CACHE_TTL_MS` sets a 0–30-day freshness window, and `ENGINE_THEME_FONT_REFRESH=1` explicitly refreshes stylesheet metadata. Development mode skips the entire pass and keeps stylesheet links unchanged.
- If compilation fails, the default fallback policy logs a warning and may emit an `@import` only for an exact allowlisted stylesheet origin. Unapproved origins never enter generated CSS. Set `ENGINE_THEME_FONT_FAILURE_POLICY=error` to fail when no valid previous local output can be reused.
- `ENGINE_THEME_FONT_CACHE_TTL_MS` controls cache freshness (default seven days, maximum 30 days). `ENGINE_THEME_FONT_REFRESH=1` forces a refresh. `ENGINE_THEME_FONT_OFFLINE=1` disables requests and requires a valid local cache; a cache miss fails closed.

The font compiler consumes static `.etr` values only; it never evaluates theme code. Remote-scope `.etr` definitions are excluded from local font compilation because the consuming site's remote-origin policy controls their fonts.
## Manifest

After Next.js succeeds, the adapter emits `nextjs-engine/compiler-manifest.json` under the configured build output directory. The manifest includes:

- discovered route entry metadata and the Engine modules reachable from each route;
- deduplicated module records, source paths or package fallback import names, usage paths, and module dependency IDs;
- static Engine page-schema plans, summary counts, diagnostics, and compile timings;
- actual Next.js adapter output counts and pathnames when Next.js supplies them in `onBuildComplete`.

The manifest excludes full source files, complete source schemas, arbitrary component props, request data, and prop contents. Output paths are validated to remain inside the project build directory.

## Existing adapters and CI

If an application already configured a Next.js adapter, `withEngine()` chains its `modifyConfig` and `onBuildComplete` callbacks through the Engine adapter.

The Generation 3 CI lane runs the compiler/runtime contracts, build-compiler and module-compiler smoke tests, type-checking, and the Next.js production build.
