// @ts-nocheck
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { Worker } = require("node:worker_threads");
const ts = require("typescript");
const { analyzeProjectModules, SCHEMA_ENGINE_SYMBOLS } = require("./module.compiler.js");
const { createSchemaOutputCache } = require("./schema-cache.compiler.js");
const { compileEngineThemeArtifacts } = require("./theme/3/compiler.ts");
const { compileEngineThemeFonts } = require("./font/3/compiler.ts");
const nencLogger = require("../plugins/nencTerminalLogger");

const BUILTIN_NODE_TYPES = new Set([
	"box", "stack", "grid", "text", "heading", "markdown", "image", "video",
	"section", "hero", "card", "button", "link", "nav", "manim", "manim3d",
	"spacer", "divider", "slot", "canvas", "scroll", "custom-select", "suspense",
	"option", "optgroup", "dialog", "drawer", "popover", "form", "input",
	"textarea", "checkbox", "label", "EngineLink", "EngineNav", "EngineManim",
	"EngineManim3D", "EngineDialog", "EngineDrawer", "EnginePopover",
]);
const SCAN_ROOTS = ["app", "pages", "src/app", "src/pages", "components", "src/components", "src/example", "theme", "themes", "src/theme", "src/themes"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"]);

function displayPath(root, target) {
	return path.relative(root, target).split(path.sep).join("/") || ".";
}
function isWithin(root, target) {
	const rel = path.relative(root, target);
	return rel === "" || (rel !== ".." && !rel.startsWith(".." + path.sep) && !path.isAbsolute(rel));
}
function listSourceFiles(projectRoot) {
	const files = [];
	const visited = new Set();
	function visit(directory) {
		const resolved = path.resolve(directory);
		if (visited.has(resolved) || !isWithin(projectRoot, resolved) || !fs.existsSync(resolved)) return;
		visited.add(resolved);
		const stat = fs.statSync(resolved);
		if (stat.isFile()) {
			if (SOURCE_EXTENSIONS.has(path.extname(resolved))) files.push(resolved);
			return;
		}
		if (!stat.isDirectory()) return;
		for (const entry of fs.readdirSync(resolved, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
			if (["node_modules", ".next", "dist", ".git", ".nextjs-engine"].includes(entry.name) || entry.name.startsWith(".")) continue;
			if (entry.isDirectory()) visit(path.join(resolved, entry.name));
			else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(path.join(resolved, entry.name));
		}
	}
	for (const relative of SCAN_ROOTS) visit(path.join(projectRoot, relative));
	return [...new Set(files)].sort();
}
function propertyName(property) {
	const name = property && property.name;
	return name && (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) ? name.text : undefined;
}
function callName(node) {
	if (!node || !ts.isCallExpression(node)) return undefined;
	if (ts.isIdentifier(node.expression)) return node.expression.text;
	if (ts.isPropertyAccessExpression(node.expression)) return node.expression.name.text;
	return undefined;
}
function unwrap(node) {
	let current = node;
	while (current && (ts.isParenthesizedExpression(current) || ts.isAsExpression(current)
		|| ts.isTypeAssertionExpression(current) || ts.isSatisfiesExpression(current)
		|| ts.isNonNullExpression(current))) current = current.expression;
	return current;
}
function collectVariables(sourceFile) {
	const vars = new Map();
	function visit(node) {
		if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
			vars.set(node.name.text, node.initializer);
		}
		ts.forEachChild(node, visit);
	}
	visit(sourceFile);
	return vars;
}
function staticValue(expression, vars, seen = new Set()) {
	const node = unwrap(expression);
	if (!node) return { ok: false, reason: "missing expression" };
	if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return { ok: true, value: node.text };
	if (ts.isNumericLiteral(node)) return { ok: true, value: Number(node.text) };
	if (node.kind === ts.SyntaxKind.TrueKeyword) return { ok: true, value: true };
	if (node.kind === ts.SyntaxKind.FalseKeyword) return { ok: true, value: false };
	if (node.kind === ts.SyntaxKind.NullKeyword) return { ok: true, value: null };
	if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) {
		return { ok: true, value: -Number(node.operand.text) };
	}
	if (ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) {
		return { ok: true, value: function engineBuildFunctionPlaceholder() {} };
	}
	if (ts.isArrayLiteralExpression(node)) {
		const output = [];
		for (const item of node.elements) {
			if (ts.isSpreadElement(item)) return { ok: false, reason: "array spreads are dynamic" };
			const result = staticValue(item, vars, seen);
			if (!result.ok) return result;
			output.push(result.value);
		}
		return { ok: true, value: output };
	}
	if (ts.isObjectLiteralExpression(node)) {
		const output = {};
		for (const property of node.properties) {
			if (ts.isSpreadAssignment(property)) return { ok: false, reason: "object spreads are dynamic" };
			if (ts.isMethodDeclaration(property) || ts.isGetAccessorDeclaration(property) || ts.isSetAccessorDeclaration(property)) {
				return { ok: false, reason: "object methods/accessors are dynamic" };
			}
			const name = propertyName(property);
			if (name === undefined) return { ok: false, reason: "computed property names are dynamic" };
			let initializer;
			if (ts.isPropertyAssignment(property)) initializer = property.initializer;
			else if (ts.isShorthandPropertyAssignment(property)) initializer = property.name;
			else return { ok: false, reason: "unsupported property " + name };
			const result = staticValue(initializer, vars, seen);
			if (!result.ok) return { ok: false, reason: "property " + name + ": " + result.reason };
			output[name] = result.value;
		}
		return { ok: true, value: output };
	}
	if (ts.isIdentifier(node)) {
		if (node.text === "undefined") return { ok: true, value: undefined };
		if (node.text === "NaN") return { ok: true, value: Number.NaN };
		if (seen.has(node.text)) return { ok: false, reason: "cyclic value " + node.text };
		const initializer = vars.get(node.text);
		if (!initializer) return { ok: false, reason: "identifier " + node.text + " is not a local static value" };
		const next = new Set(seen);
		next.add(node.text);
		return staticValue(initializer, vars, next);
	}
	if (ts.isCallExpression(node)) {
		const name = callName(node);
		if (["defineSchema", "freezeSchema", "createSchema", "createTheme"].includes(name)
			|| (ts.isPropertyAccessExpression(node.expression) && node.expression.expression.getText() === "Object" && name === "freeze")) {
			return node.arguments.length ? staticValue(node.arguments[0], vars, seen) : { ok: false, reason: name + " has no argument" };
		}
		return { ok: false, reason: "call to " + (name || "expression") + " is dynamic" };
	}
	if (ts.isPropertyAccessExpression(node)) return { ok: false, reason: "property access " + node.getText() + " is dynamic" };
	return { ok: false, reason: "unsupported expression " + (ts.SyntaxKind[node.kind] || "unknown") };
}
function objectProperty(objectExpression, name) {
	const object = unwrap(objectExpression);
	if (!object || !ts.isObjectLiteralExpression(object)) return undefined;
	for (const property of object.properties) {
		if (propertyName(property) !== name) continue;
		if (ts.isPropertyAssignment(property)) return property.initializer;
		if (ts.isShorthandPropertyAssignment(property)) return property.name;
	}
	return undefined;
}
function routePathForFile(root, file) {
	const rel = displayPath(root, file);
	const parts = rel.split("/");
	const rootIndex = parts.findIndex((part, index) =>
		(part === "app" || part === "pages") && (index === 0 || parts[index - 1] === "src"));
	if (rootIndex < 0) return "/" + rel.replace(/\.(tsx?|jsx?|mts|cts)$/, "");
	const kind = parts[rootIndex];
	let route = parts.slice(rootIndex + 1);
	if (kind === "pages") {
		const last = route[route.length - 1] || "";
		if (/^index\./.test(last)) route = route.slice(0, -1);
		else route[route.length - 1] = last.replace(/\.(tsx?|jsx?|mts|cts)$/, "");
		if (route[route.length - 1] === "index") route = route.slice(0, -1);
	} else route = route.slice(0, -1);
	route = route.filter((part) => part && !/^\(.+\)$/.test(part) && !part.startsWith("@"));
	return ("/" + route.join("/")).replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}
function schemaCandidates(sourceFile, vars) {
	const candidates = [];
	function visit(node) {
		if (ts.isCallExpression(node) && callName(node) === "createPage" && node.arguments.length) {
			const options = unwrap(node.arguments[0]);
			if (ts.isObjectLiteralExpression(options)) {
				const expr = objectProperty(options, "schema");
				if (expr) candidates.push({ result: staticValue(expr, vars) });
			}
		}
		ts.forEachChild(node, visit);
	}
	visit(sourceFile);
	return candidates.filter(({ result }) => result.ok && result.value && typeof result.value === "object"
		&& result.value.root && typeof result.value.root.type === "string");
}
function registeredCustomTypes(sourceFiles, sourceByPath = new Map()) {
	const types = new Set();
	for (const file of sourceFiles) {
		const source = sourceByPath.get(path.resolve(file))
			|| ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
		function visit(node) {
			if (ts.isCallExpression(node) && callName(node) === "registerComponent" && node.arguments.length) {
				const first = unwrap(node.arguments[0]);
				if ((ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first)) && !BUILTIN_NODE_TYPES.has(first.text)) types.add(first.text);
			}
			ts.forEachChild(node, visit);
		}
		visit(source);
	}
	return [...types].sort();
}
function walkNodes(node, visit) {
	if (!node || typeof node !== "object") return;
	if (typeof node.type === "string") visit(node);
	if (Array.isArray(node.children)) for (const child of node.children) walkNodes(child, visit);
}

function collectSchemaNodeTypes(node, output = new Set()) {
	if (!node || typeof node !== "object") return output;
	if (typeof node.type === "string") output.add(String(node.type));
	if (Array.isArray(node.children)) {
		for (const child of node.children) collectSchemaNodeTypes(child, output);
	}
	if (node.type === "slot" && node.props && node.props.fallback && typeof node.props.fallback === "object") {
		collectSchemaNodeTypes(node.props.fallback, output);
	}
	return output;
}
function dispatchTerminalLog(message) {
	nencLogger.dispatchCompilerLine(message);
}
function logEvent(event, logger = dispatchTerminalLog) {
	if (event.phase === "node" && event.customComponent) {
		logger("COMPILING CUSTOM COMPONENT : " + event.nodeType + " (" + (event.sourcePath || event.pageId)
			+ ":" + (event.nodePath || "root") + ")");
	} else if (event.phase === "page-cache-hit") {
		logger("DONE REUSING CACHED ENGINE SCHEMA : " + (event.sourcePath || event.pageId));
	} else if (event.phase === "page-complete" && event.summary) {
		const summary = event.summary;
		const details = [];
		if (summary.totalNodes > 0) details.push(formatCount(summary.totalNodes, "node"));
		const clientIslands = formatCount(summary.clientIslands, "client island");
		const assets = formatCount(summary.assetCount, "asset");
		if (clientIslands) details.push(clientIslands);
		if (assets) details.push(assets);
		logger("DONE COMPILED " + (event.pageId || event.sourcePath)
			+ (details.length ? " — " + details.join(" · ") : ""));
	}
}
function readBannerAsset(fileName) {
	const assetPath = path.join(__dirname, "../plugins/banner", fileName);
	let sourceText;
	try {
		sourceText = fs.readFileSync(assetPath, "utf8");
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new Error("Could not load Generation 3 banner asset "
			+ path.relative(path.join(__dirname, "../plugins"), assetPath).split(path.sep).join("/") + ": " + reason);
	}
	sourceText = sourceText.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
	if (sourceText.endsWith("\n")) sourceText = sourceText.slice(0, -1);
	return sourceText ? sourceText.split("\n") : [];
}

// Keep the established exports while treating the text files as the source of truth.
const ASCII_WORDMARK = Object.freeze(readBannerAsset("wordmark.txt"));
const BOTTOM_TEXT = Object.freeze(readBannerAsset("bottom-text.txt"));

function bannerMarkerPath(projectRoot) {
	const resolvedRoot = path.resolve(projectRoot);
	const key = require("node:crypto").createHash("sha256").update(resolvedRoot).digest("hex").slice(0, 24);
	return path.join(require("node:os").tmpdir(), "nextjs-engine-gen3-banner-" + key + ".lock");
}

function renderBannerLines(wordmark = ASCII_WORDMARK, bottomText = BOTTOM_TEXT) {
	const sourceLines = [
		...wordmark,
		...(wordmark.length > 0 && bottomText.length > 0 ? [""] : []),
		...bottomText,
	];
	const contentWidth = sourceLines.reduce((width, line) => Math.max(width, line.length), 0);
	const center = (line) => {
		const left = Math.floor((contentWidth - line.length) / 2);
		return " ".repeat(left) + line + " ".repeat(contentWidth - left - line.length);
	};
	const innerWidth = contentWidth + 4;
	return [
		"╭" + "─".repeat(innerWidth) + "╮",
		...sourceLines.map((line) => "│  " + center(line) + "  │"),
		"╰" + "─".repeat(innerWidth) + "╯",
	];
}

function printBanner(logger = console.log) {
	for (const line of renderBannerLines()) logger(line);
}

function printBannerOnce(projectRoot, logger = console.log) {
	const marker = bannerMarkerPath(projectRoot);
	for (let attempt = 0; attempt < 2; attempt++) {
		let descriptor;
		try {
			descriptor = fs.openSync(marker, "wx");
		} catch (error) {
			if (error.code !== "EEXIST") throw error;
			let stale = false;
			try { stale = Date.now() - fs.statSync(marker).mtimeMs > 60 * 60 * 1000; }
			catch (statError) { if (statError.code === "ENOENT") continue; throw statError; }
			if (!stale) return false;
			try { fs.unlinkSync(marker); }
			catch (unlinkError) { if (unlinkError.code === "ENOENT") continue; return false; }
			continue;
		}
		try { fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, startedAt: Date.now() }), "utf8"); }
		catch (error) {
			try { fs.closeSync(descriptor); } catch { /* Preserve the original error. */ }
			try { fs.rmSync(marker, { force: true }); } catch { /* Preserve the original error. */ }
			throw error;
		}
		fs.closeSync(descriptor);
		try { printBanner(logger); }
		catch (error) { releaseBanner(projectRoot); throw error; }
		return true;
	}
	return false;
}

function releaseBanner(projectRoot) {
	try { fs.rmSync(bannerMarkerPath(projectRoot), { force: true }); }
	catch { /* Cleanup must not hide the build outcome. */ }
}

function installTypeScriptRequireHook() {
	if (require.extensions[".ts"] && require.extensions[".ts"].__engineBuildHook) return;
	const handler = function engineTypeScriptBuildHook(module, filename) {
		const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
			compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
			fileName: filename,
		}).outputText;
		module._compile(output, filename);
	};
	handler.__engineBuildHook = true;
	require.extensions[".ts"] = handler;
}
function readVersion(root) {
	try { return JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version || "unknown"; }
	catch { return "unknown"; }
}
const WORKER_FUNCTION_PLACEHOLDER = "$nencWorkerFunctionPlaceholder";

function serializeWorkerValue(value) {
	if (typeof value === "function") return { [WORKER_FUNCTION_PLACEHOLDER]: true };
	if (Array.isArray(value)) return value.map(serializeWorkerValue);
	if (value && typeof value === "object") {
		const output = {};
		for (const [key, entry] of Object.entries(value)) output[key] = serializeWorkerValue(entry);
		return output;
	}
	return value;
}

function formatCount(value, singular, plural = singular + "s") {
	const count = Number(value);
	if (!Number.isFinite(count) || count <= 0) return "";
	return String(count) + " " + (count === 1 ? singular : plural);
}

function formatSchemaSourcePath(sourcePath) {
	const value = String(sourcePath || "").replace(/\\/g, "/");
	const segments = value.split("/");
	// Next.js route groups affect layout/route resolution but are not URL segments.
	return segments.filter((segment) => !(segment.length > 1 && segment.startsWith("(") && segment.endsWith(")"))).join("/");
}

function formatCompiledSchemaLine(job, page, metadata = {}, moduleCount) {
	const pieces = [];
	const modules = Number(moduleCount);
	if (Number.isFinite(modules) && modules > 0) pieces.push(formatCount(modules, "Engine module"));
	if (Number.isFinite(metadata.durationMs) && metadata.durationMs >= 0) pieces.push(metadata.durationMs + "ms");
	const summary = page && page.summary && typeof page.summary === "object" ? page.summary : {};
	const islands = formatCount(summary.clientIslands, "client island");
	const assets = formatCount(summary.assetCount, "asset");
	if (islands) pieces.push(islands);
	if (assets) pieces.push(assets);
	const sourcePath = typeof job.sourcePath === "string" && job.sourcePath ? formatSchemaSourcePath(job.sourcePath) : job.pageId;
	return "compiled " + sourcePath + " -> " + job.pageId + (pieces.length ? " · " + pieces.join(" · ") : "");
}

function planThemeFontWork(artifacts) {
	const families = new Set();
	const themes = [];
	for (const artifact of Array.isArray(artifacts) ? artifacts : []) {
		if (!artifact || typeof artifact.content !== "string") continue;
		let document;
		try { document = JSON.parse(artifact.content); } catch { continue; }
		const content = document && document.content;
		if (!content || content.scope === "remote" || !Array.isArray(content.fonts)) continue;
		const urls = content.fonts.filter((value) => typeof value === "string" && value.length > 0);
		if (!urls.length) continue;
		themes.push(artifact.id);
		for (const value of urls) {
			try {
				const url = new URL(value);
				for (const family of url.searchParams.getAll("family")) {
					const name = family.split(":")[0].replace(/\+/g, " ").trim();
					if (name) families.add(name);
				}
			} catch { /* The font compiler validates the URL before requesting it. */ }
		}
	}
	const names = [...families];
	return {
		themes,
		families: names,
		target: names.length ? names.join(", ") : themes.join(", "),
		label: names.length ? "fonts: " + names.join(", ") : "theme fonts: " + themes.join(", "),
	};
}

function formatFontBytes(value) {
	const bytes = Number.isFinite(value) ? Math.max(0, value) : 0;
	if (bytes >= 1024 * 1024) return (Math.round((bytes / (1024 * 1024)) * 10) / 10) + " MB";
	if (bytes >= 1024) return Math.round(bytes / 1024) + " KB";
	return Math.round(bytes) + " B";
}

function formatFontBuildSummary(stats) {
	const pieces = [];
	const themes = formatCount(stats.themeCount, "theme");
	if (themes) pieces.push(themes);
	const downloaded = formatCount(stats.downloadedFonts, "font") + " downloaded";
	if (stats.downloadedFonts > 0) pieces.push(downloaded);
	const reused = formatCount(stats.fontAssetsReused, "font asset") + " reused";
	if (stats.fontAssetsReused > 0) pieces.push(reused);
	const fallbacks = formatCount(stats.fallbackThemes, "stylesheet fallback");
	if (fallbacks) pieces.push(fallbacks);
	const bytes = Number(stats.downloadedBytes) || 0;
	if (bytes > 0) pieces.push(formatFontBytes(bytes) + " transferred");
	return pieces.join(", ");
}

function createWorkerTaskPlan(schemaJobs, externalJobs = []) {
	// Build the complete queue before a worker starts. External tasks (such as
	// downloads) use the same available-slot scheduler as schema compilation;
	// no task type is reserved for CW1, CW2, or CW3.
	return [
		...(Array.isArray(externalJobs) ? externalJobs : []).map((job, index) => ({
			...job,
			taskType: "external",
			taskId: job.taskId || "external-" + index,
		})),
		...(Array.isArray(schemaJobs) ? schemaJobs : []).map((job) => ({ ...job, taskType: "schema" })),
	];
}

function schemaNodeAtPath(schema, nodePath) {
	let node = schema && schema.root;
	const segments = String(nodePath || "").split(".").slice(1);
	for (const segment of segments) {
		if (segment === "fallback") node = node && node.props && node.props.fallback;
		else if (/^\\d+$/.test(segment)) node = node && Array.isArray(node.children) ? node.children[Number(segment)] : undefined;
		else return undefined;
		if (!node || typeof node !== "object") return undefined;
	}
	return node;
}

function failureNodeContext(job, slot, errorMessage) {
	// Security diagnostics include a schema node path such as root.0.props.href.
	// Prefer that exact source over the last progress event, which may belong to
	// a later sibling because security checks run after the complete tree walk.
	const match = String(errorMessage || "").match(/\\bat (root(?:\\.(?:\\d+|fallback))*)\\.props(?:\\.|:|;|$)/);
	if (match) {
		const nodePath = match[1];
		const node = schemaNodeAtPath(job.schema, nodePath);
		return {
			nodePath,
			componentType: node && typeof node.type === "string" ? node.type : (slot && slot.lastNodeType) || undefined,
		};
	}
	return {
		nodePath: slot && slot.lastNodePath ? slot.lastNodePath : undefined,
		componentType: slot && slot.lastNodeType ? slot.lastNodeType : undefined,
	};
}

function compileSchemaJobs(jobs, options = {}) {
	const externalJobs = Array.isArray(options.externalJobs) ? options.externalJobs : [];
	const queue = createWorkerTaskPlan(jobs, externalJobs);
	const totalTasks = queue.length;
	if (!totalTasks) return Promise.resolve({ pages: [], errors: [] });
	const workerCount = Math.min(3, totalTasks);
	const log = typeof options.log === "function" ? options.log : dispatchTerminalLog;
	const showWorkerStatus = options.showWorkerStatus !== false;

	return new Promise((resolve, reject) => {
		// Dispatch the fixed plan to whichever worker slot becomes available next.
		const results = new Array(jobs.length);
		const taskErrors = [];
		const workers = Array.from({ length: workerCount }, () => new Worker(path.join(__dirname, "schema-worker.compiler.js")));
		const slots = workers.map((worker, index) => ({
			worker,
			index,
			job: null,
			online: false,
			failed: false,
			lastNodeType: "",
			lastNodePath: "root",
		}));
		let completed = 0;
		let settled = false;

		function stopWorkers() {
			return Promise.all(workers.map((worker) => worker.terminate().catch(() => undefined)));
		}

		function completeTask(slot) {
			slot.job = null;
			slot.lastNodeType = "";
			slot.lastNodePath = "root";
			completed += 1;
			if (completed === totalTasks) settleSuccess();
			else if (slot.failed) drainUnserviceableQueue();
			else dispatch(slot);
		}

		function settleSuccess() {
			if (settled || completed !== totalTasks) return;
			settled = true;
			if (showWorkerStatus) nencLogger.clearStatus("workers");
			stopWorkers().then(() => resolve({ pages: results, errors: taskErrors }));
		}

		function recordTaskError(job, error, slot, kind = "task") {
			const taskType = job.taskType === "external" ? "external" : "schema";
			const sourcePath = job.sourcePath ? formatSchemaSourcePath(job.sourcePath) : undefined;
			const message = error instanceof Error ? error.message : String(error);
			const nodeContext = taskType === "schema" ? failureNodeContext(job, slot, message) : {};
			const nodeType = nodeContext.componentType;
			const nodePath = nodeContext.nodePath;
			const failure = {
				taskId: job.taskId,
				taskType,
				...(job.pageId ? { pageId: job.pageId } : {}),
				...(sourcePath ? { sourcePath } : {}),
				...(job.target ? { target: job.target } : {}),
				name: error instanceof Error ? error.name : "Error",
				message,
				...(nodeType ? { componentType: nodeType } : {}),
				...(nodePath ? { nodePath } : {}),
			};
			taskErrors.push(failure);
			let detail;
			if (taskType === "schema") {
				const component = nodeType ? " · " + nodeType + " at " + (nodePath || "root") : "";
				const prefix = kind === "worker" ? "WORKER " : "COMPONENT ";
				detail = prefix + (sourcePath || job.pageId) + " -> " + job.pageId + component + " — " + message;
			} else {
				detail = (kind === "worker" ? "WORKER " : "TASK ")
					+ (job.operation || "work") + " " + (job.target || job.pageId || job.taskId) + " — " + message;
			}
			if (showWorkerStatus && slot && slot.job) nencLogger.failWorkerTask(slot.index, detail);
			else if (showWorkerStatus) nencLogger.errored(detail);
			else log("ERRORED " + detail);
			return failure;
		}

		function drainUnserviceableQueue() {
			if (!slots.every((slot) => slot.failed)) return;
			while (queue.length > 0) {
				const job = queue.shift();
				const error = new Error("No NENC compile workers remain; task was not started.");
				recordTaskError(job, error, null, "worker");
				completed += 1;
			}
			if (completed === totalTasks) settleSuccess();
		}

		function workerFailed(error, slot) {
			if (settled || slot.failed) return;
			slot.failed = true;
			slot.online = false;
			const activeJob = slot.job;
			if (activeJob && activeJob.taskType === "schema") {
				recordTaskError(activeJob, error, slot, "worker");
				completeTask(slot);
			} else {
				const message = error instanceof Error ? error.message : String(error);
				const context = activeJob
					? " while " + (activeJob.operation || "working on") + " " + (activeJob.target || activeJob.pageId || activeJob.taskId)
					: " while idle";
				const detail = "WORKER CW" + (slot.index + 1) + context + " — " + message;
				if (showWorkerStatus) nencLogger.errored(detail);
				else log("ERRORED " + detail);
			}
			// Do not terminate the other CWs. They keep their current tasks and
			// continue pulling the shared queue; successful results remain valid.
			if (slot.worker) slot.worker.terminate().catch(() => undefined);
			drainUnserviceableQueue();
		}

		function dispatch(slot) {
			if (settled || slot.failed || !slot.online || slot.job) return;
			const job = queue.shift();
			if (!job) {
				settleSuccess();
				return;
			}
			slot.job = job;
			slot.lastNodeType = "";
			slot.lastNodePath = "root";
			if (job.taskType === "external") {
				if (showWorkerStatus) {
					nencLogger.startWorkerTask(slot.index, {
						operation: job.operation || "Working",
						target: job.target || job.pageId || job.taskId,
						mode: job.mode === "rate" ? "rate" : "percent",
						progress: Number.isFinite(job.progress) ? job.progress : 0,
						bytesPerSecond: Number.isFinite(job.bytesPerSecond) ? job.bytesPerSecond : 0,
					});
				}
				Promise.resolve().then(() => job.run({
					workerIndex: slot.index,
					update: (update) => showWorkerStatus && nencLogger.updateWorkerTask(slot.index, update),
					log,
				})).then((result) => {
					if (settled) return;
					const doneMessage = typeof job.formatDone === "function"
						? job.formatDone(result) : (result && result.doneMessage) || job.doneMessage;
					if (doneMessage) {
						if (showWorkerStatus) nencLogger.finishWorkerTask(slot.index, doneMessage);
						if (typeof options.log === "function") log("DONE " + doneMessage);
					} else if (showWorkerStatus) {
						nencLogger.clearWorkerTask(slot.index);
					}
					if (typeof job.onComplete === "function") job.onComplete(result);
					completeTask(slot);
				}, (error) => {
					if (settled) return;
					recordTaskError(job, error, slot, "task");
					completeTask(slot);
				});
				return;
			}

			if (showWorkerStatus) {
				nencLogger.startWorkerTask(slot.index, {
					operation: "Compiling",
					target: job.pageId,
					mode: "percent",
					progress: 0,
				});
			}
			try {
				slot.worker.postMessage({
					type: "compile",
					taskId: job.taskId,
					pageId: job.pageId,
					sourcePath: job.sourcePath,
					schema: serializeWorkerValue(job.schema),
					customComponentTypes: job.customComponentTypes,
				});
			} catch (error) {
				recordTaskError(job, error, slot, "task");
				completeTask(slot);
			}
		}

		for (const slot of slots) {
			slot.worker.on("online", () => {
				slot.online = true;
				dispatch(slot);
			});
			slot.worker.on("message", (message) => {
				if (settled || slot.failed || !slot.job || slot.job.taskType !== "schema"
					|| !message || message.taskId !== slot.job.taskId) return;
				const job = slot.job;
				if (message.type === "progress") {
					slot.lastNodeType = typeof message.nodeType === "string" ? message.nodeType : slot.lastNodeType;
					slot.lastNodePath = typeof message.nodePath === "string" ? message.nodePath : slot.lastNodePath;
					if (showWorkerStatus) nencLogger.updateWorkerTask(slot.index, { progress: message.progress });
					if (message.customComponent) {
						const status = "COMPILING CUSTOM COMPONENT : " + message.nodeType
							+ " (" + job.sourcePath + ":" + (message.nodePath || "root") + ")";
						if (typeof options.log === "function") log(status);
						else nencLogger.done(status.replace(/^COMPILING /, "INDEXED "));
					}
					return;
				}
				if (message.type === "error") {
					const error = new Error(message.error && message.error.message || "NENC schema worker failed");
					error.name = message.error && message.error.name || "Error";
					if (message.error && message.error.stack) error.stack = message.error.stack;
					// A component error belongs to this task only: other CWs keep working.
					recordTaskError(job, error, slot, "task");
					completeTask(slot);
					return;
				}
				if (message.type !== "result") return;

				results[job.order] = message.page;
				if (typeof options.onResult === "function") {
					try {
						options.onResult(job, message.page, {
							durationMs: message.durationMs,
							nodeCount: message.nodeCount,
						});
					} catch {
						// A cache callback is an optimization and must not fail the compilation.
					}
				}
				const moduleCount = options.moduleCountByRoute instanceof Map
					? options.moduleCountByRoute.get(job.pageId) : undefined;
				const doneMessage = formatCompiledSchemaLine(job, message.page, { durationMs: message.durationMs }, moduleCount);
				if (showWorkerStatus) nencLogger.finishWorkerTask(slot.index, doneMessage);
				if (typeof options.log === "function") log("DONE " + doneMessage);
				completeTask(slot);
			});
			slot.worker.on("error", (error) => workerFailed(error, slot));
			slot.worker.on("exit", (code) => {
				if (settled || slot.failed) return;
				if (code !== 0) workerFailed(new Error("NENC schema worker exited with code " + code), slot);
				else if (slot.job && slot.job.taskType === "schema") {
					workerFailed(new Error("NENC schema worker exited before completing " + slot.job.pageId), slot);
				} else {
					workerFailed(new Error("NENC schema worker exited unexpectedly with code 0"), slot);
				}
			});
		}
	});
}

async function compileProject(projectRoot, options = {}) {
	const passStartedAt = Date.now();
	const log = typeof options.log === "function" ? options.log : dispatchTerminalLog;
	const resolvedRoot = path.resolve(projectRoot);
	log("SCANNING PROJECT SOURCES : " + displayPath(resolvedRoot, resolvedRoot));
	const files = listSourceFiles(resolvedRoot);
	const sourceByPath = new Map();
	const candidatesByFile = new Map();
	const schemaSymbolsByFile = new Map();
	const schemaCandidateCountsByFile = new Map();

	function collectSchemaModules(node, symbols) {
		if (!node || typeof node !== "object") return;
		if (typeof node.type === "string" && SCHEMA_ENGINE_SYMBOLS[node.type]) {
			symbols.add(SCHEMA_ENGINE_SYMBOLS[node.type]);
		}
		if (Array.isArray(node.children)) for (const child of node.children) collectSchemaModules(child, symbols);
		if (node.type === "slot" && node.props && node.props.fallback && typeof node.props.fallback === "object") {
			collectSchemaModules(node.props.fallback, symbols);
		}
	}

	for (const file of files) {
		const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true,
			(file.endsWith(".tsx") || file.endsWith(".jsx")) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
		sourceByPath.set(file, source);
		const candidates = schemaCandidates(source, collectVariables(source));
		candidatesByFile.set(file, candidates);
		if (candidates.length > 0) {
			const symbols = new Set();
			for (const candidate of candidates) collectSchemaModules(candidate.result.value.root, symbols);
			schemaSymbolsByFile.set(file, symbols);
			schemaCandidateCountsByFile.set(file, candidates.length);
		}
	}

	const themeBuild = compileEngineThemeArtifacts(resolvedRoot, files.map((file) => ({
		filePath: file,
		sourceFile: sourceByPath.get(file),
	})));
	if (themeBuild.artifacts.length > 0 || themeBuild.removedCount > 0) {
		const details = [];
		const themeGroups = formatCount(themeBuild.artifacts.length, "theme group");
		if (themeGroups) details.push(themeGroups);
		if (themeBuild.createdCount > 0) details.push(themeBuild.createdCount + " created");
		if (themeBuild.updatedCount > 0) details.push(themeBuild.updatedCount + " updated");
		if (themeBuild.unchangedCount > 0) details.push(themeBuild.unchangedCount + " unchanged");
		if (themeBuild.removedCount > 0) details.push(themeBuild.removedCount + " stale removed");
		if (details.length) log("DONE ENGINE THEME ARTIFACTS — " + details.join(", "));
	}

	const moduleAnalysis = analyzeProjectModules(resolvedRoot, {
		files,
		sourceByPath,
		log,
		schemaSymbolsByFile,
		schemaCandidateCountsByFile,
	});
	const registered = registeredCustomTypes(files, sourceByPath);
	const schemaOutputCache = createSchemaOutputCache(resolvedRoot);
	const schemaJobs = [];
	const skipped = [];

	for (const file of files) {
		const relative = displayPath(resolvedRoot, file);
		const source = sourceByPath.get(file);
		const candidates = candidatesByFile.get(file) || [];
		if (candidates.length === 0) {
			if (/(^|\/)(page|index)\.(tsx?|jsx?)$/.test(relative) && source.text.includes("createPage")) {
				skipped.push({
					sourcePath: relative,
					pageId: routePathForFile(resolvedRoot, file),
					reason: "No statically resolvable Engine schema was found. Next.js retains normal runtime rendering for this route.",
				});
				log("SKIPPING STATIC SCHEMA PLAN : " + relative
					+ " — Next.js still compiles and renders the route normally");
			}
			continue;
		}

		const routeId = routePathForFile(resolvedRoot, file);
		for (let index = 0; index < candidates.length; index++) {
			const pageId = candidates.length === 1 ? routeId : routeId + "#schema-" + (index + 1);
			const schema = candidates[index].result.value;
			const schemaTypes = collectSchemaNodeTypes(schema.root);
			// A registered component only affects a job whose schema actually uses that type.
			// This keeps registering an unrelated component from invalidating every route.
			const customComponentTypes = registered.filter((type) => schemaTypes.has(type));
			schemaJobs.push({
				order: schemaJobs.length,
				taskId: "schema-" + schemaJobs.length,
				pageId,
				sourcePath: relative,
				schema,
				customComponentTypes,
			});
		}
	}

	const pages = new Array(schemaJobs.length);
	const workerJobs = [];
	let schemaCacheHitCount = 0;
	let schemaCacheWriteCount = 0;

	for (const job of schemaJobs) {
		const fingerprint = schemaOutputCache.fingerprint(job);
		const cached = schemaOutputCache.read(job, fingerprint);
		if (cached) {
			pages[job.order] = cached.page;
			schemaCacheHitCount += 1;
			log("DONE REUSED CACHED COMPILED " + job.pageId + " — persistent schema cache hit");
			continue;
		}
		workerJobs.push({
			...job,
			outputOrder: job.order,
			order: workerJobs.length,
			fingerprint,
		});
	}

	const moduleCountByRoute = new Map(moduleAnalysis.routes.map((route) => [route.routePath, route.engineModuleCount]));
	const externalJobs = [];
	let themeFontBuild;
	const fontPlan = planThemeFontWork(themeBuild.artifacts);
	if (process.env.NODE_ENV === "production" && fontPlan.themes.length > 0) {
		externalJobs.push({
			taskId: "engine-theme-fonts",
			pageId: fontPlan.label,
			operation: "Preparing fonts",
			target: fontPlan.target,
			mode: "percent",
			progress: 0,
			run: async ({ update }) => {
				themeFontBuild = await compileEngineThemeFonts(resolvedRoot, themeBuild.artifacts, {
					onTaskProgress(event) {
						update({
							operation: event.operation || "Preparing fonts",
							target: event.target || fontPlan.target,
							mode: "percent",
							progress: event.progress,
						});
					},
					onDownloadProgress(event) {
						update({
							operation: "Downloading",
							target: event.target || fontPlan.label,
							mode: "rate",
							bytesPerSecond: event.bytesPerSecond,
						});
					},
					onDownloadDone(event) {
						const parts = [formatFontBytes(event.bytes), event.elapsedMs + "ms"];
						if (event.bytesPerSecond > 0) parts.push(nencLogger.formatBytesPerSecond(event.bytesPerSecond));
						const fileLabel = event.family + (event.extension ? "." + event.extension : "");
						const message = "Downloaded font: " + fileLabel + " " + parts.join(" · ");
						if (typeof options.log === "function") log("DONE " + message);
						else nencLogger.done(message);
					},
				});
				if (!themeFontBuild.skipped && themeFontBuild.themeCount > 0) {
					for (const warning of themeFontBuild.warnings) {
						log("WARN ENGINE THEME FONT " + warning.themeId + " — " + warning.warning);
					}
					return { doneMessage: "EngineTheme fonts — " + formatFontBuildSummary(themeFontBuild) };
				}
				return { doneMessage: "" };
			},
		});
	}
	const workerResult = await compileSchemaJobs(workerJobs, {
		log,
		showWorkerStatus: typeof options.log !== "function",
		externalJobs,
		moduleCountByRoute,
		onResult(job, page, metadata) {
			if (schemaOutputCache.write(job, job.fingerprint, page, metadata)) {
				schemaCacheWriteCount += 1;
			} else {
				log("CACHE WRITE FAILED FOR " + job.pageId + " — continuing without persistent cache");
			}
		},
	});
	for (let index = 0; index < workerJobs.length; index++) {
		pages[workerJobs[index].outputOrder] = workerResult.pages[index];
	}
	const taskErrors = workerResult.errors;
	const schemaErrors = taskErrors.filter((error) => error.taskType === "schema");
	// Only successful compiler records enter the manifest. A failed job never
	// overwrites its cache entry; existing valid cache artifacts stay untouched.
	const compiledPages = pages.filter((page) => page && typeof page === "object");

	const candidateCount = schemaJobs.length;
	const schemaCacheMissCount = workerJobs.length;
	const summary = {
		scannedSourceFileCount: files.length,
		routeEntryCount: moduleAnalysis.summary.routeEntryCount,
		analyzedRouteCount: moduleAnalysis.summary.analyzedRouteCount,
		engineModuleCount: moduleAnalysis.summary.engineModuleCount,
		localEngineModuleCount: moduleAnalysis.summary.localEngineModuleCount,
		externalEngineModuleCount: moduleAnalysis.summary.externalEngineModuleCount,
		schemaSourceEntryCount: moduleAnalysis.summary.schemaSourceEntryCount,
		modulePassTimeMs: moduleAnalysis.summary.modulePassTimeMs,
		schemaCandidateCount: candidateCount,
		schemaCacheHitCount,
		schemaCacheMissCount,
		schemaCacheWriteCount,
		schemaCompilerWorkerCount: Math.min(3, workerJobs.length),
		schemaCompilerWorkerLimit: 3,
		themeArtifactCount: themeBuild.artifacts.length,
		themeArtifactCreatedCount: themeBuild.createdCount,
		themeArtifactUpdatedCount: themeBuild.updatedCount,
		themeArtifactUnchangedCount: themeBuild.unchangedCount,
		compiledPageCount: compiledPages.length,
		compiledSchemaPageCount: compiledPages.length,
		failedSchemaCount: schemaErrors.length,
		failedTaskCount: taskErrors.length,
		skippedPageCount: skipped.length,
		customComponentTypeCount: new Set(registered.concat(...compiledPages.map((page) => page.customComponents))).size,
		compilerPassTimeMs: Date.now() - passStartedAt,
	};
	const cacheDetails = [];
	if (schemaCacheHitCount > 0) cacheDetails.push(formatCount(schemaCacheHitCount, "cache hit"));
	if (schemaCacheMissCount > 0) cacheDetails.push(formatCount(schemaCacheMissCount, "compile miss", "compile misses"));
	if (schemaCacheWriteCount > 0) {
		cacheDetails.push(formatCount(schemaCacheWriteCount, "output", "outputs") + " persisted at "
			+ path.relative(resolvedRoot, schemaOutputCache.cacheDirectory).split(path.sep).join("/"));
	}
	if (cacheDetails.length) log("DONE SCHEMA CACHE — " + cacheDetails.join(", "));
	const passDetails = [];
	const sourceFilesScanned = summary.scannedSourceFileCount > 0
		? formatCount(summary.scannedSourceFileCount, "source file", "source files") + " scanned" : "";
	const routeEntries = summary.analyzedRouteCount > 0
		? formatCount(summary.analyzedRouteCount, "route entry", "route entries") + " analyzed" : "";
	const schemaPlans = formatCount(summary.compiledSchemaPageCount, "Engine schema plan");
	const engineModules = formatCount(summary.engineModuleCount, "Engine module");
	if (sourceFilesScanned) passDetails.push(sourceFilesScanned);
	if (routeEntries) passDetails.push(routeEntries);
	if (schemaPlans) passDetails.push(schemaPlans);
	if (engineModules) passDetails.push(engineModules);
	const failedTasks = formatCount(taskErrors.length, "task error");
	if (failedTasks) passDetails.push(failedTasks);
	if (passDetails.length) {
		log("DONE COMPILER PASS — " + passDetails.join(", ") + " in " + summary.compilerPassTimeMs + "ms");
	}

	return {
		schemaVersion: 2,
		generation: 3,
		compiler: "nextjs-engine",
		compilerVersion: readVersion(resolvedRoot),
		scannedSourceFiles: files.map((file) => displayPath(resolvedRoot, file)),
		routes: moduleAnalysis.routes,
		schemaSources: moduleAnalysis.schemaSources,
		themes: themeBuild.artifacts,
		modules: moduleAnalysis.modules,
		registeredCustomComponents: registered,
		pages: compiledPages,
		skipped,
		errors: taskErrors,
		summary,
	};
}
function atomicWriteJson(target, value) {
	fs.mkdirSync(path.dirname(target), { recursive: true });
	const temp = path.join(path.dirname(target), ".compiler-manifest-" + process.pid + "-" + Date.now() + ".tmp");
	try {
		fs.writeFileSync(temp, JSON.stringify(value, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
		fs.renameSync(temp, target);
	} catch (error) {
		try { fs.rmSync(temp, { force: true }); } catch { /* Keep original error. */ }
		throw error;
	}
}
function resolveDistDir(projectRoot) {
	if (process.env.NEXTJS_ENGINE_BUILD_DIR) return process.env.NEXTJS_ENGINE_BUILD_DIR;
	const file = path.join(projectRoot, "next.config.js");
	if (fs.existsSync(file)) {
		const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
		let value;
		function visit(node) {
			if (ts.isPropertyAssignment(node) && propertyName(node) === "distDir"
				&& (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))) value = node.initializer.text;
			ts.forEachChild(node, visit);
		}
		visit(source);
		if (value) return value;
	}
	return ".next";
}
function summarizeNextOutputs(context = {}) {
	const outputs = context && context.outputs && typeof context.outputs === "object" ? context.outputs : null;
	if (!outputs) return undefined;
	const outputKinds = [
		"appPages",
		"appRoutes",
		"pages",
		"pagesApi",
		"prerenders",
		"staticFiles",
	];
	const counts = {};
	const paths = {};
	const routePathnames = new Set();
	for (const kind of outputKinds) {
		const entries = outputs[kind];
		if (!Array.isArray(entries)) continue;
		counts[kind] = entries.length;
		if (kind === "staticFiles") continue;
		const pathnames = entries
			.map((entry) => entry && typeof entry.pathname === "string" ? entry.pathname : undefined)
			.filter(Boolean)
			.sort();
		paths[kind] = pathnames;
		if (["appPages", "appRoutes", "pages", "pagesApi"].includes(kind)) {
			for (const pathname of pathnames) routePathnames.add(pathname.replace(/\.rsc$/, ""));
		}
	}
	const normalizedRoutePaths = [...routePathnames].sort();
	return {
		nextVersion: typeof context.nextVersion === "string" ? context.nextVersion : null,
		buildId: typeof context.buildId === "string" ? context.buildId : null,
		counts,
		paths,
		routeOutputCount: normalizedRoutePaths.length,
		routePaths: normalizedRoutePaths,
	};
}
function emitArtifacts(projectRoot, inputPath, distDir, buildContext = {}) {
	const root = path.resolve(projectRoot);
	const manifest = JSON.parse(fs.readFileSync(inputPath, "utf8"));
	const nextBuild = summarizeNextOutputs(buildContext);
	if (nextBuild) {
		manifest.nextBuild = nextBuild;
		manifest.summary = manifest.summary || {};
		manifest.summary.nextOutputCounts = nextBuild.counts;
	}
	const outputRoot = path.resolve(root, distDir || resolveDistDir(root));
	if (!isWithin(root, outputRoot) || outputRoot === root) throw new Error("Refusing to emit compiler artifacts outside the project build directory.");
	const outputDir = path.join(outputRoot, "nextjs-engine");
	if (!isWithin(outputRoot, outputDir)) throw new Error("Unsafe Next.js Engine output directory.");
	const outputFile = path.join(outputDir, "compiler-manifest.json");
	atomicWriteJson(outputFile, manifest);
	nencLogger.done("EMITTED " + displayPath(root, outputFile) + " after Next.js build succeeded");
	if (nextBuild) {
		const labels = [
			["appPages", "App pages"],
			["appRoutes", "App route handlers / metadata"],
			["pages", "Pages Router pages"],
			["pagesApi", "Pages API routes"],
			["prerenders", "prerenders"],
			["staticFiles", "static files"],
		];
		const parts = labels
			.filter(([key]) => Number.isInteger(nextBuild.counts[key]) && nextBuild.counts[key] > 0)
			.map(([key, label]) => nextBuild.counts[key] + " " + label);
		if (nextBuild.routeOutputCount > 0 || parts.length) {
			const summaryParts = [];
			if (nextBuild.routeOutputCount > 0) summaryParts.push(nextBuild.routeOutputCount + " unique route paths");
			summaryParts.push(...parts);
			nencLogger.done("INDEXED NEXT.JS BUILD OUTPUTS — " + summaryParts.join("; "));
		}
	}
	return outputFile;
}
function parseArgs(argv) {
	const args = { mode: "scan", adapterWorker: false };
	for (let i = 0; i < argv.length; i++) {
		const item = argv[i];
		if (item === "--scan") args.mode = "scan";
		else if (item === "--emit") args.mode = "emit";
		else if (item === "--adapter-worker") args.adapterWorker = true;
		else if (item === "--output") args.output = argv[++i];
		else if (item === "--input") args.input = argv[++i];
		else if (item === "--project-root") args.projectRoot = argv[++i];
		else if (item === "--dist-dir") args.distDir = argv[++i];
		else throw new Error("Unknown argument: " + item);
	}
	return args;
}
async function runCLI(argv = process.argv.slice(2)) {
	let bannerOwner = false;
	let bannerRoot;
	try {
		const args = parseArgs(argv);
		const root = path.resolve(args.projectRoot || process.cwd());
		bannerRoot = root;
		if (args.mode === "scan") {
			if (!args.output) throw new Error("--scan requires --output <temporary-json-path>");
			if (!args.adapterWorker) {
				bannerOwner = printBannerOnce(root);
				if (bannerOwner) nencLogger.setStatus("STARTING GENERATION 3 COMPILER PASS ALONGSIDE NEXT.JS");
			}
			const manifest = await compileProject(root);
			nencLogger.setStatus("WRITING COMPILER MANIFEST");
			atomicWriteJson(path.resolve(args.output), manifest);
			const manifestDetails = [];
			const compiledPages = formatCount(manifest.summary.compiledPageCount, "page");
			const customTypes = formatCount(manifest.summary.customComponentTypeCount, "custom component type");
			if (compiledPages) manifestDetails.push(compiledPages);
			if (customTypes) manifestDetails.push(customTypes);
			nencLogger.done("COMPILER MANIFEST WRITTEN" + (manifestDetails.length ? " — " + manifestDetails.join(", ") : ""));
		} else {
			if (!args.input) throw new Error("--emit requires --input <compiler-manifest>");
			emitArtifacts(root, path.resolve(args.input), args.distDir);
		}
		return 0;
	} catch (error) {
		nencLogger.failed(error instanceof Error ? error.message : String(error));
		return 1;
	} finally {
		nencLogger.clearStatus();
		if (bannerOwner && bannerRoot) releaseBanner(bannerRoot);
	}
}
if (require.main === module) {
	runCLI().then((code) => { process.exitCode = code; }, (error) => {
		nencLogger.failed(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
module.exports = {
	BUILTIN_NODE_TYPES,
	compileProject,
	createWorkerTaskPlan,
	formatSchemaSourcePath,
	formatCompiledSchemaLine,
	formatFontBuildSummary,
	formatFontBytes,
	planThemeFontWork,
	emitArtifacts,
	logEvent,
	ASCII_WORDMARK,
	BOTTOM_TEXT,
	summarizeNextOutputs,
	bannerMarkerPath,
	printBanner,
	printBannerOnce,
	releaseBanner,
	renderBannerLines,
	resolveDistDir,
	routePathForFile,
	runCLI,
};
