"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
	GENERATED_MARKER,
	discoverEngineDebugPages,
	prepareEngineDebugRoute,
} = require("../src/engine/plugins/engineDebugPlugin.js");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "nextjs-engine-debug-"));
const previousNodeEnv = process.env.NODE_ENV;
const modulePath = path.resolve(__dirname, "../src/engine/debug/EngineDebugPage.tsx");
const isolationModulePath = path.resolve(__dirname, "../src/engine/debug/EngineDebugIsolation.tsx");
const sourceModulePath = path.resolve(__dirname, "../src/engine/debug/EngineDebugSourceRoute.ts");
const routesModulePath = path.resolve(__dirname, "../src/engine/debug/EngineDebugRoutesRoute.ts");
const routeFile = path.join(root, "app", "%5Fengine", "debug", "page.tsx");
const sourceRouteFile = path.join(root, "app", "%5Fengine", "debug", "source", "route.ts");
const routesRouteFile = path.join(root, "app", "%5Fengine", "debug", "routes", "route.ts");

function touch(relative) {
	const filename = path.join(root, relative);
	fs.mkdirSync(path.dirname(filename), { recursive: true });
	fs.writeFileSync(filename, "export default function Page() { return null; }\n", "utf8");
}

try {
	touch("app/page.tsx");
	touch("app/products/page.tsx");
	touch("app/(docs)/docs/page.tsx");
	touch("app/_private/page.tsx");
	touch("app/_private/admin/page.tsx");
	touch("pages/account.tsx");
	touch("pages/api/ignored.ts");

	assert.deepEqual(discoverEngineDebugPages(root), ["/", "/account", "/docs", "/products"]);
	process.env.NODE_ENV = "development";
	const development = prepareEngineDebugRoute({ rootDir: root, modulePath, isolationModulePath, sourceModulePath, routesModulePath });
	assert.equal(development.development, true);
	assert.deepEqual(development.pages, ["/", "/account", "/docs", "/products"]);
	const generated = fs.readFileSync(routeFile, "utf8");
	assert.ok(generated.startsWith(GENERATED_MARKER));
	assert.match(generated, /EngineDebugIsolation/);
	assert.match(generated, /<EngineDebugIsolation>/);
	assert.match(generated, /EngineDebugPage/);
	assert.doesNotMatch(generated, /_private/);
	const generatedSourceRoute = fs.readFileSync(sourceRouteFile, "utf8");
	assert.ok(generatedSourceRoute.startsWith(GENERATED_MARKER));
	assert.match(generatedSourceRoute, /export \{ GET, POST \} from/);
	const generatedRoutesRoute = fs.readFileSync(routesRouteFile, "utf8");
	assert.ok(generatedRoutesRoute.startsWith(GENERATED_MARKER));
	assert.match(generatedRoutesRoute, /export \{ GET \} from/);
	const routeCatalogHelper = require("../src/engine/debug/engineDebugRouteCatalog.js");
	const dynamicFixture = path.join(root, "app", "blog", "[slug]");
	fs.mkdirSync(dynamicFixture, { recursive: true });
	fs.writeFileSync(path.join(dynamicFixture, "page.tsx"), "export default function Page() { return null; }", "utf8");
	const prerenderManifest = path.join(root, ".next", "prerender-manifest.json");
	fs.mkdirSync(path.dirname(prerenderManifest), { recursive: true });
	fs.writeFileSync(prerenderManifest, JSON.stringify({ routes: { "/blog/hello-world": {}, "/blog/another-post": {}, "/_engine/debug": {} } }), "utf8");
	const discoveredCatalog = routeCatalogHelper.discoverEngineDebugRouteCatalog(root);
	assert.ok(discoveredCatalog.dynamicPatterns.includes("/blog/[slug]"), "route catalog detects dynamic patterns");
	assert.ok(discoveredCatalog.staticPaths.includes("/blog/hello-world"), "catalog includes concrete routes from Next prerender manifests");
	assert.ok(discoveredCatalog.staticPaths.includes("/blog/another-post"), "catalog includes every known prerendered route");
	assert.ok(!discoveredCatalog.staticPaths.includes("/_engine/debug"), "catalog excludes the dashboard itself");
	assert.equal(
		prepareEngineDebugRoute({ rootDir: root, modulePath, isolationModulePath, sourceModulePath, routesModulePath }).routeFile,
		routeFile,
		"generation must be idempotent",
	);

	const isolationSource = fs.readFileSync(isolationModulePath, "utf8");
	for (const requirement of [
		"attachShadow",
		"createPortal",
		"MutationObserver",
		"data-next-engine-debug-active",
		"data-next-engine-debug-host",
		"inert",
		"aria-hidden",
		"2147483647",
	]) assert.match(isolationSource, new RegExp(requirement));

	const staleDevelopmentTypes = path.join(root, ".next", "dev", "types");
	fs.mkdirSync(staleDevelopmentTypes, { recursive: true });
	fs.writeFileSync(path.join(staleDevelopmentTypes, "validator.ts"), "import './_engine/debug';\n", "utf8");
	process.env.NODE_ENV = "production";
	const production = prepareEngineDebugRoute({ rootDir: root, modulePath, isolationModulePath, sourceModulePath, routesModulePath });
	assert.equal(production.development, false);
	assert.equal(fs.existsSync(routeFile), false, "production preparation must remove the generated route before route discovery");
	assert.equal(fs.existsSync(sourceRouteFile), false, "production preparation must remove the development-only source endpoint");
	assert.equal(fs.existsSync(routesRouteFile), false, "production cleanup must remove the development-only route catalog endpoint");
	assert.equal(fs.existsSync(staleDevelopmentTypes), false, "production preparation must remove stale development route types");

	fs.mkdirSync(path.dirname(routeFile), { recursive: true });
	fs.writeFileSync(routeFile, "export default function UserRoute() { return null; }\n", "utf8");
	assert.throws(
		() => prepareEngineDebugRoute({ rootDir: root, modulePath, isolationModulePath }),
		/Refusing to remove non-generated route/,
		"production cleanup must never delete an application-owned route",
	);

	const debugPage = fs.readFileSync(modulePath, "utf8");
	for (const requirement of [
		"Page explorer",
		"Pick node",
		"Runtime boundaries",
		"State transitions",
		"Desktop",
		"Tablet",
		"Phone",
		"Custom",
		"Viewport width",
		"Search routes",
		"EngineDebugDynamicRoutePicker",
		"inferEngineDebugOverlayRoute",
		"knownConcretePaths",
		"Source editor",
		"ResizeObserver",
		"DPR",
		"Refresh Hz",
		"Touch input",
		"Hover input",
		"VisualViewport",
	]) assert.match(debugPage, new RegExp(requirement));
	const metadataSource = fs.readFileSync(path.resolve(__dirname, "../src/engine/compiler/EngineDebugMetadata.ts"), "utf8");
	assert.match(metadataSource, /process\.env\.NODE_ENV === "production"/);
	assert.match(metadataSource, /STATIC.*SERVER.*CLIENT.*DEFERRED/);
	const schedulerSource = fs.readFileSync(path.resolve(__dirname, "../src/engine/core/enginescheduler/EngineScheduler.ts"), "utf8");
	assert.match(schedulerSource, /engine:debug:scheduler/);
	assert.match(schedulerSource, /debugTransitions/);

	console.log("Generation 3 EngineDebug D.5-D.10 smoke: ok");
} finally {
	if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
	else process.env.NODE_ENV = previousNodeEnv;
	fs.rmSync(root, { recursive: true, force: true });
}
