"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { runGen3MigrationDiagnostics } = require("../src/engine/plugins/gen3MigrationDiagnostics");

function withCapturedConsole(callback) {
	const warnings = [];
	const errors = [];
	const originalWarn = console.warn;
	const originalError = console.error;
	console.warn = (...args) => warnings.push(args.join(" "));
	console.error = (...args) => errors.push(args.join(" "));
	try {
		return { result: callback(), warnings, errors };
	} finally {
		console.warn = originalWarn;
		console.error = originalError;
	}
}

function makeRoot() {
	return fs.mkdtempSync(path.join(os.tmpdir(), "nextjs-engine-gen3-migration-"));
}

const root = makeRoot();
try {
	fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
		name: "fixture",
		version: "3.0.0-alpha.1",
	}));
	fs.mkdirSync(path.join(root, "app"), { recursive: true });
	fs.mkdirSync(path.join(root, ".EngineAPIConfig"), { recursive: true });
	fs.writeFileSync(path.join(root, ".EngineAPIConfig", "provider.api"), "[provider.main]\nendpoint=https://example.test\n");
	fs.writeFileSync(path.join(root, ".engine-api-compiled.json"), "{}");
	fs.writeFileSync(path.join(root, "app", "page.tsx"), [
		'import { RawComponentRenderer } from "legacy-engine";',
		'const invalidNode = { type: "raw", props: {} };',
		"export default function Page() { return null; }",
	].join("\n"));

	const captured = withCapturedConsole(() => runGen3MigrationDiagnostics({
		rootDir: root,
		development: true,
	}));
	assert.equal(captured.result.length, 3, "expected one EngineAPI warning and two unsupported API errors");
	assert.equal(captured.warnings.length, 1, "expected a single EngineAPI migration warning");
	assert.equal(captured.errors.length, 2, "expected both unsupported raw APIs to be errors");
	assert.match(captured.warnings[0], /3\.0\.0-alpha\.1/);
	assert.match(captured.warnings[0], /\.nextjs-engine\/config\/\.apiconfig\.json/);
	assert.match(captured.warnings[0], /\.engine-api-compiled\.json/);
	assert.match(captured.errors.join("\n"), /E3M001/);
	assert.match(captured.errors.join("\n"), /E3M002/);

	const repeat = withCapturedConsole(() => runGen3MigrationDiagnostics({
		rootDir: root,
		development: true,
	}));
	assert.equal(repeat.warnings.length + repeat.errors.length, 0, "diagnostics should not repeat on config reload");
} finally {
	fs.rmSync(root, { recursive: true, force: true });
}

const cleanRoot = makeRoot();
try {
	fs.writeFileSync(path.join(cleanRoot, "package.json"), JSON.stringify({ version: "3.0.0-alpha.1" }));
	const captured = withCapturedConsole(() => runGen3MigrationDiagnostics({
		rootDir: cleanRoot,
		development: true,
	}));
	assert.equal(captured.result.length, 0, "clean Gen 3 project should not receive migration diagnostics");
	assert.equal(captured.warnings.length + captured.errors.length, 0);
} finally {
	fs.rmSync(cleanRoot, { recursive: true, force: true });
}

console.log("Gen 3 migration diagnostics smoke test passed.");
