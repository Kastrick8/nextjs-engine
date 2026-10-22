"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
let failures = 0;

function read(relativePath) {
	return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function check(condition, message) {
	if (condition) {
		console.log(`PASS ${message}`);
		return;
	}
	failures += 1;
	console.error(`FAIL ${message}`);
}

const requiredFiles = [
	"src/engine/compiler/types.ts",
	"src/engine/compiler/runtimeRegistry.ts",
	"src/engine/compiler/EngineCompiler.ts",
	"src/engine/compiler/EngineServerRenderer.tsx",
	"src/engine/compiler/EngineClientIsland.tsx",
	"src/engine/compiler/EngineStyleCompiler.ts",
	"src/engine/compiler/EngineAdaptiveCompiler.ts",
	"src/engine/core/EngineServer.ts",
	"src/engine/core/EngineModel.ts",
	"src/engine/core/EngineViewport.ts",
	"src/engine/core/enginescheduler/EngineScheduler.ts",
	"src/engine/hooks/useEngineScheduler.ts",
	"src/engine/hooks/useEngineModel.ts",
	"src/engine/hooks/useEngineViewport.ts",
];

for (const file of requiredFiles) {
	check(fs.existsSync(path.join(root, file)), `Generation 3 file exists: ${file}`);
}

const compiler = read("src/engine/compiler/EngineCompiler.ts");
check(compiler.includes("runtimeResolution"), "compiler records runtime classification");
check(compiler.includes("clientIslands"), "compiler records client-island count");
check(compiler.includes("capabilities"), "compiler records used browser capabilities");
check(compiler.includes("assets"), "compiler records asset dependencies");

const serverRenderer = read("src/engine/compiler/EngineServerRenderer.tsx");
check(serverRenderer.includes("EngineClientIsland"), "server renderer isolates browser-only nodes");
check(serverRenderer.includes("NextLink"), "server renderer keeps ordinary internal links server-rendered");
check(serverRenderer.includes("children: undefined"), "client island roots do not duplicate their static child schema");

const island = read("src/engine/compiler/EngineClientIsland.tsx");
check(island.includes("SERVER_CHILDREN_SLOT"), "client islands can receive server-rendered children");

const adaptive = read("src/engine/compiler/EngineAdaptiveCompiler.ts");
check(adaptive.includes("compileAdaptiveSchema"), "automatic tablet/phone compiler exists");
check(adaptive.includes('adaptive === "keep"'), "automatic device adaptation has an explicit keep override");
check(adaptive.includes("inferAdaptiveRole"), "adaptive compiler understands semantic header/footer/content roles");
check(adaptive.includes("contentinfo"), "semantic footer roles are recognized without special node types");
check(adaptive.includes("ROLE_SPACING"), "phone and tablet spacing policies are distinct");
check(adaptive.includes("compact !== false"), "semantic compaction can be explicitly disabled");
check(adaptive.includes("isResponsiveValue"), "developer-authored responsive spacing remains authoritative");
check(adaptive.includes("container-driven auto-fit"), "grid adaptation is container-driven instead of a fixed phone column count");
check(!/\b(?:quality|dpr|maxDpr)\s*:/.test(adaptive), "adaptive layout compiler never rewrites image/Canvas resolution controls");

const scheduler = read("src/engine/core/enginescheduler/EngineScheduler.ts");
for (const workClass of ["critical", "visible", "near", "deferred", "sleeping"]) {
	check(scheduler.includes(`"${workClass}"`), `scheduler understands ${workClass} work`);
}
check(scheduler.includes("reportFrame"), "scheduler accepts frame-pressure observations");
check(scheduler.includes("runWhenIdle"), "scheduler can defer noncritical idle work");
check(scheduler.includes("acquireFrameMonitor"), "scheduler shares a refresh-aware frame-pressure monitor");
check(scheduler.includes("p75Load"), "frame pressure is based on missed budget rather than treating normal frame cadence as overload");
check(scheduler.includes("viewportPools.delete"), "unused scheduler observer pools are released");

const lazyMount = read("src/engine/components/LazyMount.tsx");
check(lazyMount.includes("useEngineSchedule"), "LazyMount uses the shared scheduler");
check(lazyMount.includes("!schedule.underFramePressure"), "LazyMount delays speculative near-viewport activation during frame pressure");
check(!lazyMount.includes("data-engine-work"), "scheduler state is not fingerprinted into production DOM");

const image = read("src/engine/components/EngineImage.tsx");
check(image.includes("useEngineSchedule"), "EngineImage uses the shared scheduler");
check(image.includes("shouldLoad"), "non-priority images wait for viewport scheduling");
check(image.includes("!schedule.underFramePressure"), "near images defer network/decode work while visible frames are pressured");

const video = read("src/engine/components/EngineVideo.tsx");
check(video.includes("useEngineSchedule"), "EngineVideo uses the shared scheduler");
check(video.includes("video.pause()"), "offscreen autoplay video pauses");
check(video.includes("!schedule.underFramePressure"), "near video initialization waits while visible frames are pressured");

const canvasFacade = read("src/engine/components/EngineCanvas.tsx");
check(canvasFacade.includes("adaptiveProp ?? false"), "Gen 3 Canvas keeps the compatibility adaptive default explicit");
check(canvasFacade.includes("handlers.adaptive ?? false"), "Gen 3 low-level Canvas hook keeps the compatibility default explicit");
check(canvasFacade.includes("useCoreEngineCanvas"), "Gen 3 low-level hook wraps the compatible v2 core instead of changing patch behavior");
const canvasCore = read("src/engine/core/enginecanvas/EngineCanvas.tsx");
const shaderRuntime = read("src/engine/components/EngineShader.tsx");
check(!canvasFacade.includes("useEffect(() => EngineScheduler.acquireFrameMonitor(), [])"),
	"the Canvas facade does not keep a frame-pressure RAF alive for static or offscreen components");
check(canvasCore.includes("releaseFrameMonitor ??= EngineScheduler.acquireFrameMonitor()")
	&& canvasCore.includes("releaseFrameMonitor?.();"),
	"Canvas frame-pressure monitoring follows the active draw-loop lifecycle");
check(shaderRuntime.includes("animationMonitorCleanup = EngineScheduler.acquireFrameMonitor()")
	&& shaderRuntime.includes("animationMonitorCleanup?.();"),
	"Shader frame-pressure monitoring follows the active animated-shader lifecycle");
check(!canvasCore.includes("isUnderFramePressure()") && !canvasCore.includes("underFramePressure"),
	"Canvas does not reduce backing resolution from the shared pressure signal");
check(!shaderRuntime.includes("isUnderFramePressure()") && !shaderRuntime.includes("underFramePressure"),
	"Shader does not reduce backing resolution from the shared pressure signal");
check(shaderRuntime.includes("window.addEventListener(\"resize\", handleWindowResize")
	&& shaderRuntime.includes("currentDpr = nextDpr"),
	"Shader refreshes its backing-store density after DPR/display changes");
check(canvasCore.includes("window.addEventListener(\"resize\", handleWindowResize")
	&& canvasCore.includes("const nextPixelRatio = getTargetDpr(dprProp, maxDpr)"),
	"Canvas refreshes its backing-store density after DPR/display changes");
check(canvasCore.includes("Number.isFinite(deviceDpr)")
	&& canvasCore.includes("Number.isFinite(maxDpr)"),
	"Canvas normalizes invalid DPR inputs before sizing the backing store");
check(canvasCore.includes("const onSetupRef = useRef(resolvedOnSetup)")
	&& !canvasCore.includes("\n\t\tresolvedOnSetup,\n\t]);"),
	"Canvas does not rebuild the renderer only because an inline onSetup callback identity changed");
check(shaderRuntime.includes("Number.isFinite(configuredMaxDpr)")
	&& shaderRuntime.includes("Number.isFinite(deviceDpr)"),
	"Shader normalizes invalid DPR inputs before sizing the backing store");
check(shaderRuntime.includes("if (eventFrame !== 0 || disposed || contextLost || offscreen")
	&& shaderRuntime.includes("animationMonitorCleanup?.();"),
	"Shader avoids scheduling paused/context-lost event draws and releases active monitoring");
const drawStart = shaderRuntime.indexOf("const draw = (timestamp: number) => {");
const drawEnd = shaderRuntime.indexOf("const requestEventDraw", drawStart);
const shaderDrawBody = shaderRuntime.slice(drawStart, drawEnd);
check(drawStart >= 0 && drawEnd > drawStart
	&& !shaderDrawBody.includes("gl.useProgram(program)")
	&& !shaderDrawBody.includes("gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)")
	&& !shaderDrawBody.includes("gl.vertexAttribPointer(position"),
	"Shader avoids repeating invariant GL program/buffer setup on every frame");

const manim3D = read("src/engine/components/EngineManim/EngineManim3D.tsx");
check(manim3D.includes('typeof ResizeObserver !== "undefined"')
	&& manim3D.includes('typeof IntersectionObserver !== "undefined"'),
	"Manim3D tolerates older WebViews without ResizeObserver or IntersectionObserver");
check(manim3D.includes("fallbackViewportCheck = checkViewportFallback")
	&& manim3D.includes("window.removeEventListener(\"scroll\", fallbackViewportCheck)"),
	"Manim3D has a coalesced visibility fallback and tears down its listeners");
check(manim3D.includes("releaseFrameMonitor ??= EngineScheduler.acquireFrameMonitor()")
	&& manim3D.includes("releaseFrameMonitor?.();"),
	"Manim3D frame-pressure monitoring follows its active animation loop");
check(manim3D.includes("const lookWorldPosition = lookTarget ? new THREE.Vector3() : null")
	&& !manim3D.includes("const worldPosition = new THREE.Vector3()"),
	"Manim3D reuses its camera target vector instead of allocating one each frame");
check(!manim3D.includes("sampled.rotate.map(toRad)")
	&& !manim3D.includes("const origin = mixer ? [target.position.x"),
	"Manim3D bone tracks avoid short-lived arrays in the animation hot path");
check(manim3D.includes("Number.isFinite(configuredFps)"),
	"Manim3D normalizes invalid FPS input before animation timing arithmetic");

const scrollPoints = read("src/engine/core/enginescroll/EngineScrollPointManager.ts");
check(scrollPoints.includes("private static releaseObserverIfUnused()")
	&& scrollPoints.includes("this.resizeObserver.disconnect()")
	&& scrollPoints.includes("this.resizeObserver = null"),
	"EngineScroll releases its shared ResizeObserver after the last registered point");

const model = read("src/engine/core/EngineModel.ts");
for (const api of ["get<", "set<", "update<", "computed<", "action<", "watch<", "subscribe("]) {
	check(model.includes(api), `EngineModel exposes ${api.replace("<", "")}`);
}

const page = read("src/engine/createPage.tsx");
check(page.includes("compilePage"), "createPage produces a Generation 3 compiler plan");
check(page.includes("EngineServerRenderer"), "createPage can render compiler-safe pages server-first");
check(page.includes("compileAdaptiveSchema"), "createPage compiles request-aware phone/tablet layouts");
check(page.includes("serverFirst !== false"), "server-first rendering has an explicit migration escape hatch");

const publicApi = read("src/engine/index.ts");
check(publicApi.includes("compileAdaptiveSchema"), "Phase A/B compiler and adaptive APIs are public");
check(publicApi.includes("EngineScheduler"), "EngineScheduler is public");
check(publicApi.includes("EngineModel"), "EngineModel is public");
check(publicApi.includes("EngineViewport"), "EngineViewport is public");

const server = read("src/engine/core/EngineServer.ts");
check(server.includes("EngineServerSession"), "EngineServer exposes request-scoped server state");
check(server.includes("fetchJSON"), "EngineServer provides readable JSON fetch helper");

if (failures > 0) {
	console.error(`\nGeneration 3 Phase A/B smoke failed with ${failures} issue(s).`);
	process.exit(1);
}

console.log("\nGeneration 3 Phase A/B architecture smoke passed.");
