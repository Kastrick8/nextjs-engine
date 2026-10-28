# Next.js Engine (`nextjs-engine`) — Master Architecture & Agent Execution Plan

> The previous EngineTheme-specific implementation and audit plan is preserved in [docs/enginetheme-implementation-plan.md](./docs/enginetheme-implementation-plan.md).

## 1. What `nextjs-engine` Is (Core Identity & Pillars)

`nextjs-engine` is a standalone, All-In-One (AIO), schema-driven, **server-first rendering, compilation, graphics, and zero-trust networking engine** built on top of React and the Next.js App Router.

Every feature in this repository is governed by four non-negotiable pillars:

1. **Everything Is Optimized by Default:** Developers should never have to pass manual performance flags or wire up complex boilerplate to get optimal behavior. The build compilers (`EngineCompiler.ts`, `EngineAdaptiveCompiler.ts`, `EngineStyleCompiler.ts`, `nencCompiler.js`) and runtime engines (`EngineScheduler.ts`, `NENCClient.ts`, `NENCDispatcher.ts`) automatically optimize code in production.

2. **AIO Progressive Disclosure (Beginner-Simple to Senior-Complete):**

   * **For Beginners:** A complete, responsive, themed, animated website can be built using a simple declarative Schema in `createPage()` without manually writing CSS, state hooks, or security middleware.

   * **For Senior Engineers:** Full support for raw HTML tags (`div`, `section`, `form`), standard Next.js App Router conventions, custom React `.tsx` components, WebGL shaders, 2D/3D/SVG/Skia canvas pipelines, Manim mathematical animations, and cryptographic NENC commands.

3. **Deterministic Server-First Rendering:** The compiler classifies every schema node upfront into `static`, `server`, or `client` ownership (`EngineArtifactGraph.ts`), renders static and server subtrees via `EngineServerRenderer.tsx`, and isolates interactive browser state inside minimal `EngineClientIsland.tsx` boundaries.

4. **Standalone Product Boundary:** `nextjs-engine` is a completely independent product. Never hardcode dependencies on external backend repositories or couple internal engine modules to outside products.

## 2. Mandatory Anti-Hallucination & Naming Rules for AI Agents

> **READ THIS BEFORE WRITING OR MODIFYING ANY CODE OR DOCUMENTATION:**
>
> 1. **STRICT BAN ON "PHASE / MILESTONE / STEP" NAMING:**
>
>    * **NEVER** name any file, function, variable, class, interface, route, smoke test, or documentation heading after project-management terms such as `phase`, `phase4`, `phaseE4`, `phaseAB`, `phaseC`, `step1`, `milestone2`, or `newUpdate`.
>
>    * **NEVER** write comments or documentation like `"Implemented in Phase E4"` or `"This function handles Phase 3 logic"`.
>
>    * **ALWAYS** name every identifier, file, and documentation section after its **exact technical subsystem and responsibility** (e.g., `compileFamiliarEventRecipe`, `NENCCryptoWorker`, `EngineMiddleware`, `scripts/nenc-event-coalescing-smoke.js`).
>
> 2. **STRICT TAB INDENTATION (`\t`):**
>
>    * Every `.ts`, `.tsx`, `.js`, `.json`, `.css`, and `.md` code block MUST use literal TAB characters (`\t`) for indentation. Never use spaces for indentation.
>
> 3. **CLEAR ONBOARDING COMMENTS:**
>
>    * Every module, exported function, complex algorithm, and security boundary must include clear, concise comments explaining *what* the code does and *why* it exists so a new engineer can understand it immediately.
>
> 4. **DO NOT HALLUCINATE UNREQUESTED ABSTRACTIONS:**
>
>    * Do not invent third-party telemetry SDKs, external database ORMs, or unrequested UI wrappers. Use the existing engine primitives (`APIStatic.ts`, `EngineAPIResolver.ts`, `EngineScheduler.ts`, `EngineModel.ts`, `EngineViewport.ts`) and follow the exact file paths and TypeScript interfaces specified in this document.
>
> 5. **KEEP DOCUMENTATION SYNCHRONIZED:**
>
>    * Whenever engine behavior or public APIs change, update `DOCUMENT.md` and the canonical documentation under `docs/3/` using semantic subsystem headings.

## 3. Established Architecture Baseline (Current Repository State)

### 3.1 Public Entry Points (`src/engine/`)

* `src/engine/index.ts`: Main public barrel export for schemas, components, hooks, and utilities.

* `src/engine/createPage.tsx`: Declarative page entry factory with schema validation and compilation.

* `src/engine/server.ts`: Server-only entry point (`EngineServer.ts`, `EngineDeviceServer.ts`, SSR utilities).

* `src/engine/network.ts`: Networking entry point (`APIStatic`, NENC commands, CORS, and cookie vault).

* `src/engine/seo.ts`: SEO entry point (`EngineSEO`, JSON-LD, OpenGraph images, provider sitemaps).

* `src/engine/debug.ts`: Development inspector, inline callouts, and self-healing code actions.

* `src/engine/not-found.tsx`: Engine-managed 404 boundary wired to `app/not-found.tsx`.

### 3.2 Compiler & Build Pipeline (`src/engine/compiler/` & `src/engine/plugins/`)

* **Ownership & Artifact Graph:** `EngineCompiler.ts`, `EngineAdaptiveCompiler.ts`, `EngineFallbackCompiler.ts`, `EngineArtifactGraph.ts`, `EngineServerRenderer.tsx`, `EngineClientIsland.tsx`.

* **Bundler & Worker Bridges:** `build.compiler.ts`, `src/engine/compiler/gen3-build-compiler.js` (self-contained NENC CLI entrypoint), `module.compiler.js`, `nextjs.compiler.ts`, `delegate-adapter.loader.js`, `loadTypeScriptCompiler.js`, `runtimeRegistry.ts`, `schema-cache.compiler.js`, `schema-worker.compiler.js`.

* **Style, Theme & Font Compilers:** `EngineStyleCompiler.ts`, `EngineThemeCompiler.js`, `src/engine/compiler/theme/3/compiler.ts`, `src/engine/compiler/font/3/compiler.ts`.

* **Budgets, Security & Manifests:** `EngineBuildBudgets.ts`, `EngineSecurityCompiler.ts`, `EngineCompatibilityManifest.ts`, `EngineDebugMetadata.ts`.

* **Next.js Config Plugins (`src/engine/plugins/`):** `enginePlugin.js`, `engineBuildAdapter.js`, `artifactCache.js`, `apiStaticCompiler.js`, `engineApiPlugin.js`, `engineDebugPlugin.js`, `engineSEOCapture.js`, `engineSEOPlugin.js`, `engineShaderCompiler.js`, `engineShaderCompilerBase.js`, `engineShaderPlugin.js`, `nencCompiler.js`, `nencPlugin.js`, `nencTerminalLogger.js`, `gen3BuildCompiler.js`, `gen3ModuleCompiler.js`, `gen3SchemaCache.js`, `gen3SchemaWorker.js`, `gen3ThemeCompiler.js`.

### 3.3 Core Runtime, Client Trio & Subsystems (`src/engine/core/` & `src/engine/components/`)

* **The Client Runtime Trio:**

  1. `src/engine/core/enginescheduler/EngineScheduler.ts` (`useEngineScheduler.ts`): Frame-pressure monitor and priority `requestAnimationFrame` task scheduler.

  2. `src/engine/core/EngineViewport.ts` (`useEngineViewport.ts`): Centralized viewport size, breakpoint, and orientation tracker.

  3. `src/engine/core/EngineModel.ts` (`useEngineModel.ts`): Reactive state and pub/sub store for low-overhead state synchronization.

* **Zero-Trust NENC & Cookie Vault:**

  * `src/engine/core/nenc/`: `EngineCommand.ts`, `NENCClient.ts`, `NENCCommandAPI.ts`, `NENCCommandSecurity.ts`, `NENCDeviceProof.ts`, `NENCDispatcher.ts`, `NENCDispatcherTypes.ts`, `NENCManifest.ts`, `NENCOrigin.ts`, `NENCReplay.ts`, `NENCSessionAuth.ts`, `types.ts`.

  * `src/engine/core/enginecookies/`: `EngineCookieVault.ts`, `EngineCookies.ts`, `EngineDeviceKey.ts`, `EngineTrustList.ts`, `types.ts`.

  * Static/REST APIs: `src/engine/core/APIStatic.ts`, `EngineAPIConfigParser.ts`, `EngineAPIResolver.ts`, `EngineCORS.ts`.

* **Visual & Interactive Subsystems:**

  * `EngineCanvas`: `src/engine/core/enginecanvas/` (`RenderingEngine.ts`, `ECFrameClock.ts`, `ECGraphicsModel.ts`, `ECEngineRegistry.ts`, `Engine2D.ts`, `Engine3D.ts`, `EngineSVG.ts`, `EngineSkia.ts`) & `src/engine/components/EngineCanvas.tsx`.

  * `EngineManim`: `src/engine/components/EngineManim/` (`EngineManim.tsx`, `EngineManim3D.tsx`, `manimDSLParser.ts`, `manimCompiler.ts`, `manimAnimationRouter.ts`, `manimTypes.ts`).

  * `EngineShader`: `src/engine/core/engineshader/` (`EngineShaderRuntime.ts`, `EngineShaderTypes.ts`) & `src/engine/components/EngineShader.tsx`, `EngineShaderSurface.tsx`.

  * `EngineScroll`: `src/engine/core/enginescroll/` (25 modules covering director, timelines, tracks, bindings, physics, snap, points, URL/hash sync, and viewport math) & `src/engine/components/EngineScroll.tsx`.

  * `EngineTransitions`: `src/engine/core/enginetransitions/` (`EngineTransitions.ts`, `ViewTransitionCoordinator.ts`, `TransitionCompatibility.ts`, `TransitionPresets.ts`) & `src/engine/components/EngineTransitionLink.tsx`.

  * `EngineOverlay`: `src/engine/core/engineoverlay/EngineOverlayRuntime.ts` & `src/engine/components/EngineOverlay/` (`EngineDialog.tsx`, `EngineDrawer.tsx`, `EnginePopover.tsx`, `OverlayParts.tsx`, `OverlayShared.tsx`).

  * `EngineMarkdown`: `src/engine/core/markdownParser.ts`, `src/engine/components/EngineMarkdown.tsx`, `EngineMarkdownRenderer.tsx`, `EngineUrlIcon.tsx`, `app/%5Fstatic/emd/favicon/route.ts`.

  * `EngineTheme`: `src/engine/component/engineTheme/` (`createTheme.ts`, `resolveTheme.ts`, `remoteTheme.ts`, `tokens.ts`, `templates.tsx`, `dataApi.ts`, `fontUrls.ts`, `highlighting.ts`, `shikiProvider.ts`).

  * `EngineSEO`: `src/engine/core/engineseo/` (`EngineSEO.ts`, `EngineSEOImage.tsx`, `EngineSEOJsonLd.tsx`, `EngineSEOProviderSitemap.ts`, `EngineSEOTypes.ts`).

  * `EngineDebug`: `src/engine/debug/` (`EngineDebugPage.tsx`, `EngineDebugIsolation.tsx`, `EngineDebugDiagnostics.ts`, `EngineDebugCodeActions.ts`, `EngineDebugFixEditor.tsx`, `EngineDebugInlineCallout.ts`, `EngineDebugRuntimeMonitor.tsx`, `EngineInspectors.ts`, `EngineDebugDynamicRoutePicker.tsx`).

## 4. Active Engineering Specifications (Detailed Subsystem Blueprints)

The following specifications define the next set of core engine capabilities. Agents implementing these features must follow the exact file targets, data structures, and behavioral boundaries below without inventing extraneous abstractions.

### 4.1 Event-Bound NENC Command Synthesis ("Familiar Requests"), 16-Char Wire Hashing & Page-Scoped Local-CORS

#### Problem & Goal

A developer may write 4, 20, or 70+ separate NENC command calls inside a page-load lifecycle (`onLoad` / `useEffect` mount) or inside an interaction handler (e.g., `auth_check`, `load_user_profile`, `fetch_permissions`, etc.).

* **In Development (`NODE_ENV === "development"`):** Developers need to see all 70 requests individually with their readable function names in the browser Network tab and `EngineDebugPage.tsx` so debugging is 1:1 with their source code.

* **In Production (`NODE_ENV === "production"`):** Firing 70 separate HTTP requests from the browser destroys latency. Furthermore, exposing readable function names (`auth_check`) and parameter keys (`email`, `password`) in browser network payloads leaks application internals.

#### Exact How-It-Works Specification

1. **Build-Time AST Analysis (`src/engine/plugins/nencCompiler.js`):**

   * During a production build, `nencCompiler.js` scans client/page modules for NENC command invocations that occur within the same event or lifecycle scope (e.g., page mount or a single event handler function).

   * It generates a deterministic **16-character alphanumeric hash** for:

     * Every individual command name (e.g., `auth_check` -> `"hasdbfglyr29h40f"`).

     * Every parameter key inside that command's payload (e.g., `password` -> `"hs93djkg92jjkk12"`, `email` -> `"hsooglljdn330jd0"`).

     * Every multi-command event batch, producing a single **Familiar Event Recipe Hash** (e.g., `"rcp98x71kLm42pQ0"`).

2. **Client Runtime Behavior (`src/engine/core/nenc/NENCClient.ts` & `.nextjs-engine/nenc/client.ts`):**

   * The developer's source code never changes: they still write `const a = await auth_check(...); const b = await load_profile(...);` (or `Promise.all([...70 calls])`).

   * In **Development**, `NENCClient.ts` dispatches each call individually with readable debug metadata.

   * In **Production**, `NENCClient.ts` intercepts all calls scheduled within the same event tick / recipe scope, collapses all 70 calls into **1 single HTTP request** to `/_static/command` carrying the 16-char `eventRecipeHash` and only the dynamic runtime arguments (mapped to their 16-char field hashes).

   * When the single response returns from `/_static/command`, `NENCClient.ts` demultiplexes the response array by `slotIndex` and resolves all 70 Promises in the developer's code.

3. **Server-Side "Familiar Request" Execution (`src/engine/core/nenc/NENCDispatcher.ts` & `NENCManifest.ts`):**

   * When `app/%5Fstatic/command/route.ts` receives a request containing an `eventRecipeHash`, `NENCDispatcher.ts` looks up the `NENCFamiliarEventRecipe` in `NENCManifest.ts`.

   * Because the server already knows the exact 70-step recipe ("this is a familiar request!"), it reverse-maps the 16-char parameter hashes back to their real server parameter names, merges any build-time static arguments, and executes all 70 handlers **server-side** (using the server-side Keep-Alive pool).

   * All heavy data aggregation happens on the server, returning 1 compact payload to the client.

4. **Page-Scoped Local-CORS (`src/engine/core/nenc/NENCOrigin.ts` & `src/engine/core/EngineCORS.ts`):**

   * Every 16-character `commandHash` and `eventRecipeHash` in `NENCManifest.ts` is bound to an explicit `allowedPageRoutes` list (e.g., `["/engine-private-search"]`).

   * `NENCOrigin.ts` verifies that the request's same-origin header, `Referer` pathname, and page-route proof match `allowedPageRoutes`. If `/login` or an external script tries to call a hash belonging to `/dashboard`, `NENCOrigin.ts` rejects it with `403 Forbidden` before any command logic runs.

#### Exact TypeScript Contract (`src/engine/core/nenc/NENCManifest.ts`)

```
/**
 * @file src/engine/core/nenc/NENCManifest.ts
 * @description Compiler-emitted manifest mapping 16-character wire hashes
 * to server command handlers and "Familiar Request" event recipes.
 */

export interface NENCCompiledCommandDescriptor {
	/** 16-character alphanumeric wire hash generated by nencCompiler.js (e.g. "hasdbfglyr29h40f") */
	commandHash: string;
	/** Original function identifier kept strictly on the server for diagnostics */
	debugFunctionName: string;
	/** Exact page route pathnames permitted to invoke this command via Local-CORS */
	allowedPageRoutes: string[];
	/** Maps 16-char wire parameter key hash -> original server parameter name */
	parameterHashToKeyMap: Record<string, string>;
	/** Maps original client parameter name -> 16-char wire parameter key hash */
	parameterKeyToHashMap: Record<string, string>;
	/** Cache policy enforced by NENCCryptoWorker */
	sealCachePolicy: "none" | "encrypted-ephemeral" | "public-idempotent";
}

export interface NENCFamiliarRecipeStep {
	/** 0-based index corresponding to the client Promise slot in the event batch */
	slotIndex: number;
	/** 16-character command hash to execute on the server */
	commandHash: string;
	/** Static arguments extracted at build time so the client never transmits them */
	staticArgs?: Record<string, unknown>;
}

export interface NENCFamiliarEventRecipe {
	/** 16-character hash identifying the entire multi-command event batch */
	eventRecipeHash: string;
	/** Exact page route pathname allowed to trigger this familiar request */
	allowedPageRoute: string;
	/** Ordered list of 2 to 100+ sub-commands executed server-side in parallel */
	steps: NENCFamiliarRecipeStep[];
}


```

#### Anti-Hallucination Guardrails for Agents

* **DO NOT** obfuscate or collapse requests when `process.env.NODE_ENV !== "production"`. Development builds must remain 100% readable.

* **DO NOT** ship `debugFunctionName` or `parameterHashToKeyMap` into `.nextjs-engine/nenc/client.ts`. The client bundle must only contain the outgoing 16-character hashes.

* **Verification Script:** Create and run `node scripts/nenc-event-coalescing-smoke.js` and `node scripts/gen3-nenc-command-security-smoke.js`.

### 4.2 Isolated Crypto Worker Process, Sealed `AES-256-GCM` Cache & Silent Rolling Reset

#### Problem & Goal

1. Running WebCrypto ECDSA P-256 signature verification (`NENCDeviceProof.ts`) and session HMAC checks (`NENCSessionAuth.ts`) on the main Node.js thread blocks the event loop under high concurrency.

2. If the engine caches known command responses in memory to speed up repeat requests, storing plaintext URLs, parameter values, or raw responses in RAM is a critical security risk. If an attacker compromises the Docker container or server memory, they must NEVER be able to grep memory for:

* `route : /_static/command/&hs93djkg92jjkk=mycoolpassword&hsooglljdn330jd05jj=mysecrateemail@secratemail.com`

* `res : <PRIVATE SESSION KEY>`

3. In long-running Docker containers, unbounded `Map` caches in `NENCReplay.ts` and `NENCCommandSecurity.ts` slowly leak memory over weeks of uptime.

#### Exact How-It-Works Specification

1. **Dedicated Engine Crypto Worker (`src/engine/core/nenc/NENCCryptoWorker.ts`):**

* Spawn a dedicated `node:worker_threads` worker managed by `NENCDispatcher.ts` that owns all cryptographic verification, `CryptoKey` LRU caching, and response sealing/unsealing.

* Cache imported WebCrypto `CryptoKey` objects in a bounded LRU map inside the worker so repeat requests from the same device skip `crypto.subtle.importKey()` overhead.

2. **Blinded Lookup Digests & `AES-256-GCM` Sealed Memory Cache:**

* **Zero Plaintext Keys:** The cache never stores URL strings, parameter keys, emails, or passwords. To check if a request is cached, the worker computes a one-way blinded lookup digest:
  `HMAC-SHA256(ephemeralWorkerSalt, pageRoute + commandOrRecipeHash + canonicalInputBytes)`

* **Encrypted-at-Rest Cache Values:** Before storing any cacheable response in memory, the worker encrypts the response bytes using `AES-256-GCM` with an ephemeral 256-bit key held exclusively in worker registers/closure scope, a random 12-byte IV, and a 16-byte GCM authentication tag.

* **Sensitive Command Exclusion:** Commands that mint raw session keys or mutate credentials default to `sealCachePolicy: "none"`, or seal the output specifically with a client-derived ephemeral key so plaintext session keys never sit in the shared cache.

3. **Bounded Ring Buffers & Silent Rolling Reset (`NENCReplay.ts` & `NENCCryptoWorker.ts`):**

* Replace unbounded `Map` storage in `NENCReplay.ts`, `NENCCommandSecurity.ts`, and `NENCCryptoWorker.ts` with pre-allocated, fixed-capacity circular ring buffers (`O(1)` memory footprint).

* Implement a **Silent Rolling Reset** timer (default: every 7 days, or immediately if process RSS memory crosses `memoryWatermarkMb`).

* During a Silent Rolling Reset, the worker generates a new `ephemeralWorkerSalt` and `AES-256-GCM` key, allows in-flight requests to finish against the previous generation buffer for a 5-second grace window, and zeroes out (`Buffer.fill(0)`) the old memory buffer with zero dropped requests.

#### Exact TypeScript Contract (`src/engine/core/nenc/NENCCryptoWorker.ts`)

```
/**
 * @file src/engine/core/nenc/NENCCryptoWorker.ts
 * @description Isolated worker thread for WebCrypto verification,
 * AES-256-GCM sealed response caching, and zero-downtime silent memory resets.
 */

export interface NENCCryptoWorkerOptions {
	/** Maximum number of sealed responses in the fixed ring buffer (default: 4096) */
	maxSealedCacheEntries?: number;
	/** Maximum cached WebCrypto PublicKeys for NENCDeviceProof (default: 4096) */
	maxCachedDeviceKeys?: number;
	/** Fixed ring-buffer capacity for NENCReplay nonce tracking (default: 16384) */
	replayNonceRingCapacity?: number;
	/** Interval in ms for automatic key rotation & buffer zeroing (default: 604800000 / 7 days) */
	silentResetIntervalMs?: number;
	/** Container RSS memory threshold in MB that triggers an immediate silent reset (default: 512) */
	memoryWatermarkMb?: number;
}

export interface NENCSealedCacheEntry {
	/** One-way HMAC-SHA256 digest of (salt + hash + canonical input); contains NO plaintext */
	blindedLookupDigest: string;
	/** 12-byte random Initialization Vector for AES-256-GCM */
	iv: Uint8Array;
	/** 16-byte GCM authentication tag */
	authTag: Uint8Array;
	/** AES-256-GCM encrypted response bytes */
	ciphertext: Uint8Array;
	/** Expiration timestamp in epoch ms */
	expiresAtMs: number;
}


```

#### Anti-Hallucination Guardrails for Agents

* **DO NOT** log or store raw request query strings, passwords, emails, or session tokens in any cache key, diagnostic object, or terminal log (`nencTerminalLogger.js`).

* **DO NOT** use external native C++ addons or Redis dependencies for `NENCCryptoWorker.ts`; use Node's built-in `node:crypto` and `node:worker_threads` so it runs cleanly in any minimal Docker container.

* **Verification Script:** Create and run `node scripts/nenc-crypto-worker-cache-smoke.js` and `node scripts/gen3-nenc-session-auth-smoke.js`.

### 4.3 Server-Side Private Upstream Keep-Alive Pool & Sub-50ms Static Export Browser Accelerator

#### Problem & Goal

`nextjs-engine` supports two distinct deployment topologies that must never be confused:

1. **Docker Container / Linux Server Deployment (Server Mode):** Next.js runs on a server and proxies `/_static/command`, `APIStatic`, and SEO requests to a private backend (e.g., `http://127.0.0.1:8000`, `http://10.0.0.0:8000`, or an internal SEO service). Paying a TLS handshake or TCP cold-start on every local proxy hop wastes massive server CPU.

2. **Static Export Deployment (Browser-Only / No Next.js Server):** The site is published as static files (`output: "export"`). There is NO Next.js Node server—all `/_static/command` or `APIStatic` proxy calls happen directly from the user's **Browser (Client)** to the backend. We must optimize the browser transport layer so requests against a fast backend complete in **<50ms**.

#### Exact How-It-Works Specification

##### A. Server-Side Private Upstream Keep-Alive Pool (`src/engine/network.ts` & `NENCDispatcher.ts`)

* **Server-Only Execution:** Runs strictly inside Node.js (`typeof window === "undefined"`).

* Allows configuring private upstream endpoints (`http://127.0.0.1:8000`, `http://10.0.0.0:8000`, or internal Docker service hostnames) for NENC commands, `APIStatic.ts`, `EngineAPIResolver.ts`, and `EngineSEOProviderSitemap.ts`.

* Maintains a persistent `http.Agent` / `undici` Keep-Alive socket pool (and optional Unix domain socket `/var/run/...`) with pre-warmed connections so private server-to-backend hops never repeat TLS handshakes or TCP 3-way handshakes.

* **Zero-Copy Stream Pass-Through:** Once `NENCOrigin.ts` and `NENCCryptoWorker.ts` validate the request headers, `NENCDispatcher.ts` streams the request/response `ReadableStream` directly to/from the upstream socket without double `JSON.parse()` + `JSON.stringify()` allocations whenever payload transformation is not required.

##### B. Sub-50ms Browser Client Accelerator for Static Exports (`NENCClient.ts`, `APIStatic.ts` & `EngineBrowser.ts`)

* **Client-Only Execution:** When running in the browser (especially on static exports where no Next.js server exists), `NENCClient.ts` and `APIStatic.ts` activate four browser-native accelerators to keep request turnaround **<50ms**:

1. **Automatic Socket & TLS Pre-Warming:** On initial page bootstrap and on `EngineTransitionLink.tsx` pointer-hover/focus, inject `<link rel="preconnect" crossorigin>` and send a lightweight `HEAD` / keep-alive ping to the configured proxy/backend origin. Because the browser cannot skip TLS on `https://`, pre-warming completes the DNS + TCP + TLS handshake *before* the user triggers the command, reducing active request handshake time to **0ms**.

2. **Browser WebWorker Crypto & Binary Serialization:** Offload client-side `NENCDeviceProof.ts` ECDSA signing and JSON/binary encoding into a persistent inline Browser `Worker` using zero-copy `Transferable` `ArrayBuffer`s so the browser main thread never stalls during 60fps `EngineScroll` or `EngineCanvas` animations.

3. **Client Frame Multiplexing:** If a static page triggers multiple commands in the same `EngineScheduler.ts` animation frame, `NENCClient.ts` packs them into a single multiplexed HTTP request frame so the browser's 6-connections-per-origin limit is never bottlenecked.

4. **Bounded Client Ring Cache:** Cache idempotent `APIStatic` and NENC read responses in a bounded client-side memory ring buffer (e.g., 128 entries) for `<1ms` instant reads with background stale-while-revalidate.

#### Exact TypeScript Contract (`src/engine/network.ts`)

```
/**
 * @file src/engine/network.ts
 * @description Unified configuration for Server-Side Private Upstream Keep-Alive Pools
 * and Client-Side Static Export Browser Acceleration (<50ms target).
 */

export interface EngineServerUpstreamPoolConfig {
	/** Private backend origin (e.g. "[http://127.0.0.1:8000](http://127.0.0.1:8000)" or "[http://10.0.0.0:8000](http://10.0.0.0:8000)") */
	upstreamOrigin: string;
	/** Subsystem binding for this upstream pool */
	role: "nenc-proxy" | "api-static" | "seo-endpoint" | "telemetry";
	/** Keep persistent sockets open across requests to avoid TCP/TLS cold starts (default: true) */
	keepAlive?: boolean;
	/** Maximum persistent sockets per container instance (default: 64) */
	maxSockets?: number;
	/** Idle socket timeout in ms (default: 60000) */
	keepAliveTimeoutMs?: number;
	/** Stream bodies directly without re-serializing JSON when possible (default: true) */
	zeroCopyStreamPassthrough?: boolean;
}

export interface EngineBrowserStaticAcceleratorConfig {
	/** Pre-warms DNS/TCP/TLS connections on page load and link hover (default: true) */
	prewarmConnections?: boolean;
	/** Offloads ECDSA device signing and payload encoding to a Browser WebWorker (default: true) */
	offloadCryptoToWebWorker?: boolean;
	/** Multiplexes concurrent calls in the same EngineScheduler frame into 1 request (default: true) */
	multiplexFrameRequests?: boolean;
	/** Bounded client ring-buffer capacity for idempotent reads (default: 128) */
	clientRingCacheCapacity?: number;
	/** Target round-trip budget in ms; logs a dev diagnostic if exceeded (default: 50) */
	targetLatencyBudgetMs?: number;
}


```

#### Anti-Hallucination Guardrails for Agents

* **DO NOT** import `node:http`, `node:net`, or `node:worker_threads` inside `NENCClient.ts`, `APIStatic.ts`, or `EngineBrowser.ts`. Client files must remain 100% browser-compatible for static exports.

* **DO NOT** attempt to disable browser TLS in client code; use connection pre-warming (`preconnect` + warm keep-alive fetch) to eliminate TLS handshake latency on the client.

* **Verification Script:** Run `node scripts/api-static-smoke.js`, `node scripts/gen3-nenc-wire-smoke.js`, and create `node scripts/browser-static-accelerator-smoke.js`.

### 4.4 User-Owned Runtime Telemetry & Matrix Binding via `APIStatic` & `EngineAPIResolver`

#### Problem & Goal

`nextjs-engine` already tracks frame pacing in `EngineScheduler.ts`, build budgets in `EngineBuildBudgets.ts`, and live metrics in `EngineDebugRuntimeMonitor.tsx`. However, in production builds, `EngineDebugIsolation.tsx` strips the visual debug HUD. Developers need a built-in way to route those runtime performance metrics (and Preview-vs-Production comparisons) into their **own** `APIStatic` or `EngineAPIResolver` endpoints without external third-party bloat.

#### Exact How-It-Works Specification

1. **Headless Metric Collector (`src/engine/core/APIStatic.ts` & `EngineScheduler.ts`):**

* Expose a lightweight telemetry hook in `EngineProvider.tsx` that collects TTFB, LCP, CLS, `EngineScheduler.ts` average frame duration, dropped frame counts, and NENC command round-trip latency.

* Allow the user to bind this collector directly to any declared `APIStatic` endpoint name or custom callback.

* Flush batched samples on page hide (`navigator.sendBeacon`) or at a configurable interval via `APIStatic.ts`.

2. **Preview-to-Production Matrix Verification (`scripts/gen3-production-proof.js`):**

* Extend `scripts/gen3-production-proof.js` so CI/local builds can record a baseline JSON snapshot in Preview/Dev and assert that Production builds do not regress on LCP, CLS, bundle budget, or `/_static/command` dispatch latency.

#### Verification

* Run `node scripts/api-static-smoke.js` and `node scripts/gen3-production-proof.js`.

### 4.5 Edge Middleware Orchestrator (`createEngineMiddleware`) & AIO Hybrid Schema System

#### Problem & Goal

1. Senior developers need a first-class `createEngineMiddleware()` for Next.js `middleware.ts` that runs Local-CORS origin checks, device classification (`x-engine-device`), and optional environment-detected middleware packages at the Edge.

2. Beginners need pre-built, zero-CSS semantic blocks (`HeroBlock`, `NavbarBlock`, `FeatureGridBlock`, `FooterBlock`) while senior developers need full TypeScript autocomplete across Engine components, raw HTML tags (`div`, `section`, `form`), and custom React `.tsx` components.

#### Exact How-It-Works Specification

1. **Edge Middleware Factory (`src/engine/core/EngineMiddleware.ts` & `src/engine/middleware.ts`):**

* Export `createEngineMiddleware(config)` compatible with the Next.js Edge Runtime.

* Automatically enforce `NENCOrigin` Local-CORS rules on `/_static/command` requests at the Edge before waking up Node.js SSR.

* Set `x-engine-device` (`mobile` | `tablet` | `desktop`) headers consumed by `EngineDeviceServer.ts`.

* Support an `adapters` array where external integrations (rate limiters, auth guards, proxy headers) automatically activate if their required environment variables exist in `process.env`.

2. **Beginner Semantic Block Catalog (`src/engine/components/blocks/`):**

* Create `HeroBlock.tsx`, `NavbarBlock.tsx`, `FeatureGridBlock.tsx`, and `FooterBlock.tsx` built on top of `primitives.tsx`, `EngineNav.tsx`, and `EngineHero.tsx`, and register them in `src/engine/core/registry.ts`.

3. **Hybrid Schema Discriminated Union (`src/engine/schema/types.ts`):**

* Update `src/engine/schema/types.ts` so `EngineNodeSchema` provides strict TypeScript autocomplete for:

* Registered Engine Components (`EngineHero`, `EngineScroll`, `EngineCanvas`, `EngineShader`, `EngineManim`, `EngineMarkdown`, etc.)

* Beginner Semantic Blocks (`HeroBlock`, `NavbarBlock`, `FeatureGridBlock`, `FooterBlock`)

* Standard HTML Elements (`keyof JSX.IntrinsicElements` such as `"div"`, `"section"`, `"main"`, `"button"`)

* Custom React Components (`component: React.ComponentType<P>`) with automatic `EngineClientIsland.tsx` wrapping when interactive.

4. **Declarative Form Command Binding (`src/engine/components/EngineForms.tsx`):**

* Allow `<EngineForms command={myNencCommand} />` to automatically serialize form fields using the compiled 16-character parameter hashes, attach the `NENCDeviceProof.ts` signature, manage submitting/error states, and update `EngineModel.ts`.

#### Verification

* Run `node scripts/gen3-server-first-parity-smoke.js`, `node scripts/primitive-style-precedence-smoke.js`, and `npx playwright test`.

## 5. Repository Hygiene & Canonical File Layout Tasks

* \[ \] **Remove Committed Zip Snapshot:** Delete the nested `nextjs-engine.zip` file from the repository root and add `*.zip` to `.gitignore`.

* \[ \] **Finish `docs/3/` Consolidation:** Ensure all component and compiler documentation in `docs/3/` is the single canonical source and remove outdated duplicate files in `docs/engine-components/` and `docs/gen3/` once links in `DOCUMENT.md` and `README.md` are updated.

* \[ \] **Normalize Theme Component Directory:** Alias or move `src/engine/component/engineTheme/` into `src/engine/components/engineTheme/` while keeping backwards-compatible re-exports in `src/engine/index.ts`.

* \[ \] **Consolidate Private Search Example:** Unify duplicated example files between `examples/gen3-private-search/` and `src/example/private-search/` so `app/engine-private-search/` imports from a single canonical source.

## 6. Mandatory Smoke & Browser Verification Matrix

Before any agent or contributor marks a task complete, the corresponding verification scripts MUST be executed and pass with zero errors:


| **Subsystem Touched** | **Required Verification Commands** | 
| --- | --- |
| **Gen 3 Compiler & Artifact Graph** | `node scripts/gen3-build-compiler-smoke.js && node scripts/gen3-compiler-runtime-smoke.js && node scripts/gen3-adaptive-runtime-smoke.js` | 
| **Server-First Parity & Tree Shaking** | `node scripts/gen3-server-first-parity-smoke.js && node scripts/gen3-tree-shaking-smoke.js` | 
| **Style, Theme & Font Compilers** | `node scripts/style-compiler-smoke.js && node scripts/primitive-style-precedence-smoke.js && node scripts/gen3-theme-compiler-smoke.js && node scripts/gen3-font-provider-live-smoke.js` | 
| **NENC Commands, Wire & Security** | `node scripts/gen3-nenc-plugin-smoke.js && node scripts/gen3-nenc-dispatcher-smoke.js && node scripts/gen3-nenc-command-security-smoke.js && node scripts/gen3-nenc-session-auth-smoke.js && node scripts/gen3-nenc-wire-smoke.js && node scripts/gen3-nenc-backend-proving-smoke.js` | 
| **APIStatic & Cookie Vault** | `node scripts/api-static-smoke.js && node scripts/api-static-artifact-smoke.js && node scripts/gen3-api-config-path-smoke.js && node scripts/gen3-enginecookie-vault-smoke.js` | 
| **EngineScroll & Mobile Stability** | `node scripts/engine-scroll-smoke.js && node scripts/engine-scroll-262-smoke.js && node scripts/engine-scroll-progress-smoke.js && node scripts/engine-mobile-scroll-smoke.js` | 
| **EngineCanvas, Shader & Transitions** | `node scripts/engine-canvas-262-smoke.js && node scripts/engine-shader-smoke.js && node scripts/engine-shader-runtime-smoke.js && node scripts/engine-transitions-smoke.js && node scripts/engine-view-transition-coordinator-smoke.js` | 
| **EngineDebug & Production Isolation** | `node scripts/gen3-engine-debug-smoke.js && node scripts/gen3-engine-debug-diagnostics-smoke.js && node scripts/gen3-debug-inspectors-smoke.js && node scripts/gen3-engine-debug-production-smoke.js` | 
| **EngineSEO & Markdown GFM** | `node scripts/gen3-engine-seo-smoke.js && node scripts/gen3-engine-seo-provider-sitemap-smoke.js && node scripts/engine-markdown-gfm-smoke.js` | 
| **Full Production Proof & Browser E2E** | `node scripts/gen3-production-proof.js && npx playwright test` | 

## 7. Next.js Engine CLI (`ne`), Channel Manager & Interactive Terminal UI Subsystem

### 7.1 Overview, Release Boundary & Experimental Guardrail

#### Problem & Goal

1. Publishing rapid development commits or experimental Generation 3 builds directly to the npm registry creates version bloat, hits immutable SemVer lockouts, and suffers from npm CDN dist-tag caching delays.

2. Developers should not need to manually copy raw GitHub repository URLs or run platform-specific PowerShell scripts (`pwsh`) to update channels, clean build caches, or run compatibility checks.

3. Both Generation 2 (`2.7.0` on `main-2`) and Generation 3 (`3.0.0-alpha.2` on `main-3`) require a unified, cross-platform CLI and Terminal User Interface (`ne`) backed by the `package/main` archive branch.

#### Release Matrix

| **Release Track** | **Source Branch** | **Archive Path (package/main)** | **Key Capabilities Introduced** | 
| --- | --- | --- | --- |
| **Gen 2 — `2.7.0`** | `main-2` | `version/2.7/version/2.7` | `ne` CLI binary, Play Store Channel Updater, API compatibility scanner (`ne check`), cross-platform `ne clean`, and backported Gen 3 fixes. | 
| **Gen 3 — `3.0.0-alpha.2`** | `main-3` | `alpha/version/3.alpha/version/3.0.0-alpha.2` | Native `ne` control plane, GitHub-hosted dynamic Alpha/Latest-Green channel updates, and full Error Code Book diagnostics. | 

#### Prerelease CI, Provenance & Channel Gate

- Alpha/Beta source and archived release flows must verify that both `Engine runtime CI` and `Engine cross-browser compatibility` completed successfully for the exact source SHA and source branch before publishing to npm or creating a versioned GitHub Release. Missing or non-green checks block prerelease promotion; a green result from a different SHA is not accepted.
- Workflow-generated version tags explicitly dispatch the `package-snapshot-published` event. This is required because a tag push authenticated with `GITHUB_TOKEN` does not itself start another `push`-triggered workflow. The release builder resolves the requested tag from `package/main` and checks the archived manifest/provenance before creating assets.
- Versioned Alpha/Beta releases use immutable tag names and a `ne-release.json` manifest with `floating: false`. The moving `channel-alpha-latest` release is created only for a fully green current `main-3` commit; its tarball filename includes that full 40-character source SHA, and the rolling channel never publishes to npm. Named versioned Alpha/Beta snapshots may be published to npm by the source/archive release workflows after the exact-commit CI gate passes; existing npm versions stay immutable.
- `Latest Green` may select stable or validated Beta releases; it never selects Alpha. The updater streams downloads under a 100 MiB ceiling, verifies SHA-256 before installing local bytes, then persists the immutable asset URL and artifact integrity in the package manager's text lockfile.

#### Universal Experimental Notice Banner

Every interactive invocation of `ne` on both `2.7.0` and `3.0.0-alpha.2` renders the experimental warning banner before mounting the main view (suppressed automatically when `-q`, `--quiet`, `CI=true`, or `NE_NO_WARN=1` is present):

```
  ╭──────────────────────────────────────────────────────────────────────────╮
  │ !! WARNING : NE is currently Experimental and could be removed in future │
  │              versions be cautious! !!                                    │
  ╰──────────────────────────────────────────────────────────────────────────╯

```

### 7.2 Package Manifest Binary Exposure & Configuration State (`.nextjs-engine/config/ne.config.json`)

#### Binary Registration (`package.json`)

Both Generation 2 and Generation 3 manifests expose the `ne` executable via the standard `bin` field:

```
{
	"name": "@kastrick/nextjs-engine",
	"version": "3.0.0-alpha.2",
	"bin": {
		"ne": "./bin/ne.js"
	}
}

```

* **Local Project Execution:** `ne` resolves through `./node_modules/.bin/ne` when the package is installed. `npm exec -- ne updater` is the explicit local npm form.

* **Zero-Install Execution:** `npx --yes --package=@kastrick/nextjs-engine ne updater` explicitly resolves the `ne` binary from the scoped package and opens the updater UI.

#### Persistent Configuration & Lock State (`.nextjs-engine/config/ne.config.json`)

Rather than creating a separate top-level dotfile or exposing a redundant `ne config` CLI subcommand, `ne` stores user control preferences, channel state, rollback history, and terminal viewport defaults directly inside the existing `.nextjs-engine/config/` directory:

```
{
	"controlScheme": "hybrid",
	"activeChannel": "alpha",
	"installedVersion": "3.0.0-alpha.2",
	"installedCommit": "f8e9d7c6b5a43210fedcba9876543210abcdef12",
	"sha256": "9e4f2b1c8a0d7831f24d9c728362b14421b8c199e4f2b1c8a0d7831f4a112233",
	"cacheDir": ".nextjs-engine/cache",
	"defaultAndTerminalHeight": 5,
	"previous": {
		"activeChannel": "alpha",
		"installedVersion": "3.0.0-alpha.1",
		"installedCommit": "9192f42ee45acd248db132fbba28d2bb631dd610"
	}
}

```

### 7.3 Interactive Terminal UI (TUI) & Storefront Release Catalog

#### TUI Design & Navigation Architecture

1. **Smooth Rounded Geometry:** Uses rounded Unicode box drawing (`╭`, `─`, `╮`, `│`, `╰`, `╯`) with muted ANSI gray borders (`\x1b[90m`) and semantic status glyphs (`●`, `◆`, `▲`, `❯`). No emojis are used as pseudo-buttons or structural chrome.

2. **Interactive Breadcrumb Bar:** The top border includes a navigable breadcrumb path (`╭─ [◀ Back] ne › updater › v3.0.0-alpha.2 ─╮`). Navigating up to the header with `↑` / `W` or clicking any segment with the mouse jumps directly to that parent view.

3. **First-Run Control Scheme Picker:** On initial launch (when `.nextjs-engine/config/ne.config.json` does not yet specify `controlScheme`), `ne` prompts the developer to choose their preferred navigation controls:

| **Action** | **Classic Scheme (Default)** | **Gamer Scheme** | **Hybrid Scheme** | 
| --- | --- | --- | --- |
| **Move Up / Down** | `↑` / `↓` | `W` / `S` | `W` / `S` or `↑` / `↓` | 
| **Move Left / Right** | `←` / `→` | `A` / `D` | `A` / `D` or `←` / `→` | 
| **Open / Interact** | `Enter` | `E` | `Enter` or `E` | 
| **Select / Toggle** | `Space` | `Space` | `Space` | 
| **Back / Exit** | `Esc` / `Backspace` | `Q` / `Esc` | `Esc`, `Backspace`, or `Q` | 

#### Screen 1: Main TUI Dashboard (`ne`)

```
 ╭─ NEXTJS-ENGINE (ne) ──────────────────────────── v3.0.0-alpha.2 [Gen 3] ─╮
 │                                                                          │
 │  Project   kate-alt-69/nextjs-engine   •  Branch: main-3                 │
 │  Channel   ▲ alpha (GitHub Release)    •  Cache:  142 MB (.next + .ne)   │
 │                                                                          │
 │  WORKFLOW & COMPILER                   VERSION & MAINTENANCE             │
 │  ───────────────────────────────────   ────────────────────────────────  │
 │  ❯ [1] Dev Server      (ne dev)        [5] Channel Updater  (Play Store) │
 │    [2] Check & Compile (ne check)      [6] Clean Caches     (ne clean)   │
 │    [3] Prod Build      (ne build)      [7] Rollback Build   (ne rollback)│
 │    [4] Start Server    (ne start)      [8] Help & Docs      (ne help)    │
 │                                                                          │
 ╰──────────────────────────────────────────────────────────────────────────╯
   [W/S or ↑/↓] Navigate   [E/Enter] Run   [Mouse] Click   [Q/Esc] Quit

```

#### Screen 2: Play Store Release Catalog (`ne updater`)

Displays verified releases across channels in a top-to-bottom storefront feed with version, channel badge, availability source (GitHub Release or npm Registry), and release summary:

```
 ╭─ [◀ Back] ne › updater ─────────────────────────── [● GitHub Feed Live] ─╮
 │                                                                          │
 │  AVAILABLE VERSIONS (Select to view details)                             │
 │                                                                          │
 │  ❯ v3.0.0-alpha.2  [ALPHA]        ● GitHub Release   • Installed Active  │
 │    Bleeding-edge Gen 3 preview. Dynamic build bypassing npm registry.    │
 │                                                                          │
 │    v3.0.0-beta.1   [LATEST GREEN] ● GitHub Release   • Passing CI Suite  │
 │    Passing develop branch build. Excludes unstable alpha experiments.    │
 │                                                                          │
 │    v2.7.0          [STABLE]       ● npm Registry     • Gen 2 Minor LTS   │
 │    Official Gen 2 release. Introduces ne CLI & compatibility warnings.   │
 │                                                                          │
 │    v2.6.2          [STABLE]       ● npm Registry     • Previous Stable   │
 │    Runtime stability patch, high-refresh Canvas fixes & React 19 safety. │
 │                                                                          │
 ╰──────────────────────────────────────────────────────────────────────────╯
   [W/↑] Up   [S/↓] Down   [E/Enter] View Details   [Q/Esc] Back

```

#### Screen 3: Play Store Release Detail View (`/updater/v3.0.0-alpha.2`)

Selecting a release opens its full detail card with changelog highlights, peer compatibility verification, and three primary actions at the bottom:

```
 ╭─ [◀ Back] ne › updater › v3.0.0-alpha.2 ─────────────────────────────────╮
 │                                                                          │
 │  Next.js Engine v3.0.0-alpha.2                                           │
 │  Track: [ALPHA]  •  Source: GitHub Release  •  Target Branch: main-3     │
 │                                                                          │
 │  WHAT'S NEW IN THIS BUILD                                                │
 │  ──────────────────────────────────────────────────────────────────────  │
 │  • Added ne CLI and Play Store Channel Updater                           │
 │  • Direct GitHub release tarball delivery (no npm publish latency)       │
 │  • Integrated Error Code Book migration diagnostics in ne check          │
 │  • Cross-platform cache sanitizer via ne clean                           │
 │                                                                          │
 │  COMPATIBILITY CHECK                                                     │
 │  ──────────────────────────────────────────────────────────────────────  │
 │  Node.js:  v20.11.0 [OK] (Req: ≥20.0)    Next.js: v16.3.3 [OK] (Req: ≥15)│
 │  SHA-256:  9e4f2b1c8a0d…4a11 [VERIFIED]  Status:  Ready to Install       │
 │                                                                          │
 ├──────────────────────────────────────────────────────────────────────────┤
 │                                                                          │
 │   ╭─────────────╮     ╭────────────────────╮     ╭───────────────────╮   │
 │   │ Install Now │     │ Full Release Notes │     │ Back to Feed (Esc)│   │
 │   ╰─────────────╯     ╰────────────────────╯     ╰───────────────────╯   │
 │                                                                          │
 ╰──────────────────────────────────────────────────────────────────────────╯
   [A/D or ←/→] Select Action   [E / Enter / Space] Run   [Q / Esc] Back

```

### 7.4 Command Line Interface, `-and` / `--and` Chaining & Viewport Sizing (`-and-terminal=<height>`)

#### Core CLI Command Reference

| **Command** | **Behavior** | 
| --- | --- |
| `ne` | Launches the interactive TUI Dashboard. | 
| `ne dev` | Starts the Next.js Engine development compiler, NENC watcher, and `next dev`. | 
| `ne build` | Runs `prepare:production`, `ne check`, and compiles the production Next.js build. | 
| `ne start` | Starts the compiled production server (`next start`). | 
| `ne check` | Runs Error Code Book diagnostics, deprecation scans, `tsc --noEmit`, and preview compilation. | 
| `ne clean` | Safely cleans configured Next.js output, `dist`, TypeScript build metadata, and temporary channel downloads on Windows, macOS, and Linux. Preserves channel rollback backups. | 
| `ne updater` | Opens the interactive Play Store-style release catalog directly. | 
| `ne update` | Runs the command-line updater; lists channels or installs via `--version=<ver>` / `--channel=<stable|latest-green|alpha>`. | 
| `ne rollback` | Reverts `@kastrick/nextjs-engine` to the `previous` snapshot recorded in `.nextjs-engine/config/ne.config.json`. | 
| `ne help` | Renders the CLI command reference (also accepts `-h`, `-help`, `--help`). | 

#### Sequential Command Chaining (`--and` / `-and`) & Bounded Terminal Windows (`--and-terminal` / `-and-terminal`)

To allow developers to chain shell or Engine commands after any `ne` operation without OS shells (Bash, Zsh, PowerShell) intercepting raw `&` operators:

1. **Flag Syntax:** Supports both single-dash (`-and=...`) and double-dash (`--and=...`) flags, accepting either double quotes (`"..."`) or single quotes (`'...'`). Multiple `-and` / `--and` flags execute sequentially in the exact order provided.

2. **Terminal Viewport Height (`-and-terminal=<height>` / `--and-terminal=<height>`):** Controls the visible line height of each chained command's output sub-window inside the TUI frame:

   * **Default Height:** `5` lines (configured via `defaultAndTerminalHeight` in `.nextjs-engine/config/ne.config.json`).

   * **Custom Height:** Passing `-and-terminal=10` (or `--and-terminal=10`) expands the output viewport of chained commands to `10` lines.

#### Example: `ne update --version=2.6.2 --and="git status" -and="git pull" -and-terminal=10`

```
 ╭─ ne chain [1/3] : update --version=2.6.2 ────────────────────────────────╮
 │                                                                          │
 │  ● Fetching manifest from kate-alt-69/nextjs-engine (package/main)...    │
 │  ● Resolved: v2.6.2 [STABLE] (Commit: 9e766b5f)                          │
 │  ● Verifying SHA-256: 4b689a77...3b12 [VERIFIED]                         │
 │  ● Updating package.json & .nextjs-engine/config/ne.config.json          │
 │  ✓ Installed @kastrick/nextjs-engine@2.6.2                               │
 ├──────────────────────────────────────────────────────────────────────────┤
 │  ne chain [2/3] : git status                         [viewport: 10 rows] │
 │  ──────────────────────────────────────────────────────────────────────  │
 │  On branch main-3                                                        │
 │  Your branch is up to date with 'origin/main-3'.                         │
 │                                                                          │
 │  Changes not staged for commit:                                          │
 │    (use "git add <file>..." to update what will be committed)            │
 │          modified:   package.json                                        │
 │          modified:   .nextjs-engine/config/ne.config.json                │
 │                                                                          │
 │  no changes added to commit (use "git add" and/or "git commit -a")       │
 │                                                                          │
 ├──────────────────────────────────────────────────────────────────────────┤
 │  ne chain [3/3] : git pull                           [viewport: 10 rows] │
 │  ──────────────────────────────────────────────────────────────────────  │
 │   remote: Enumerating objects: 12, done.                                  │
 │  remote: Counting objects: 100% (12/12), done.                           │
 │  remote: Compressing objects: 100% (8/8), done.                          │
 │  Unpacking objects: 100% (12/12), 4.18 KiB | 2.09 MiB/s, done.           │
 │  From https://github.com/kate-alt-69/nextjs-engine                       │
 │     9192f42..f8e9d7c  main-3     -> origin/main-3                        │
 │  Updating 9192f42..f8e9d7c                                               │
 │  Fast-forward                                                            │
 │   src/engine/index.ts | 14 ++++++++++----                                │
 │   1 file changed, 10 insertions(+), 4 deletions(-)                       │
 ╰─ Completed 3 chained tasks in 3.8s (0 Errors) ───────────────────────────╯

```

### 7.5 Compatibility Diagnostics & Error Code Book Scanner (`ne check`)

#### Structured Deprecation Schema

In addition to invoking the existing Generation 3 Error Code Book (`docs/3/error-codes/catalog.json`) and `runGen3MigrationDiagnostics()`, `ne check` evaluates project files against structured API compatibility rules containing `code`, `deprecatedSince`, `replacement`, `removeIn`, and `docsUrl`:

```
[NE-WARN API-0007]
EngineTheme.createLegacyTheme() is deprecated.

Deprecated since: 3.0.0
Recommended replacement: createTheme()
Documentation: https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/theme#createTheme

```

* **Static AST Scan (`ne check`):** Scans `app/`, `pages/`, and `src/` for deprecated imports and method calls, outputting file and line coordinates alongside preview compilation results.

* **Deduplicated Runtime Warning:** Emits deprecation notices at most once per callsite per development process lifetime to prevent terminal flooding during hot-module reloading.
