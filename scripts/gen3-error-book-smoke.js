"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const root = path.resolve(__dirname, "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "docs/3/error-codes/catalog.json"), "utf8"));
const ts = require("typescript");
const previousTsLoader = require.extensions[".ts"];
require.extensions[".ts"] = (module, filename) => {
  const input = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(input, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};
const reporter = require("../src/engine/errors/engineErrorReporter");
const logger = require("../src/engine/plugins/nencTerminalLogger");
const schemaAnalyzerPath = path.resolve(root, "src/engine/core/schemaAnalyzer.ts");
const schemaRegistryMockPath = path.resolve(root, "scripts/.error-book-schema-registry-mock.js");
const schemaRegistryMock = new Module(schemaRegistryMockPath);
schemaRegistryMock.filename = schemaRegistryMockPath;
schemaRegistryMock.loaded = true;
schemaRegistryMock.exports = {
  registeredTypes: () => ["box", "section", "text", "image", "button", "input", "checkbox", "link", "scroll"],
};
require.cache[schemaRegistryMockPath] = schemaRegistryMock;
const previousResolveFilename = Module._resolveFilename;
Module._resolveFilename = function errorBookResolveFilename(request, parent, isMain, options) {
  if (request === "./registry" && parent && path.resolve(parent.filename) === schemaAnalyzerPath) {
    return schemaRegistryMockPath;
  }
  return previousResolveFilename.call(this, request, parent, isMain, options);
};
let schemaAnalyzer;
try {
  schemaAnalyzer = require(schemaAnalyzerPath);
} finally {
  Module._resolveFilename = previousResolveFilename;
  delete require.cache[schemaRegistryMockPath];
}
const { analyzeSchema } = schemaAnalyzer;

const { EngineBuildBudgetError, assertEngineBuildBudgets, evaluateEngineBuildBudgets } = require("../src/engine/compiler/EngineBuildBudgets.ts");
const { compileEngineThemeArtifacts } = require("../src/engine/compiler/theme/3/compiler.ts");
assert.equal(catalog.schemaVersion, 1);
assert.equal(catalog.codeFormat, "PREFIX1234");
assert.equal(catalog.publicBaseUrl, reporter.ERROR_BOOK_URL);
const source = (file) => fs.readFileSync(path.join(root, file), "utf8");
const reporterSource = source("src/engine/errors/engineErrorReporter.js");
const integrationSource = source("src/engine/plugins/engineErrorHandling.js");
const loggerSource = source("src/engine/plugins/nencTerminalLogger.js");
const remoteThemeSource = source("src/engine/component/engineTheme/remoteTheme.ts");
const errorFrom = (operation) => {
  try { operation(); } catch (error) { return error; }
  assert.fail("Expected operation to throw.");
};
const analyze = (schema) => analyzeSchema(schema).formatted;
const schemaOutputs = [
  analyze({ root: { type: "non-existent-engine-node" } }),
  analyze({ root: { type: "image", props: { alt: "preview" } } }),
  analyze({ root: 42 }),
  analyze({}),
  analyze({ root: { type: "button", props: {}, children: [] } }),
  analyze({ root: { type: "image", props: { src: "/x", alt: "" }, children: [{ type: "text" }] } }),
  analyze({ root: { type: "box", children: Array.from({ length: 101 }, () => ({ type: "text" })) } }),
  analyze({ root: { type: "box", children: [
    { type: "section", props: { id: "same-target" } },
    { type: "section", props: { point: "same-target" } },
  ] } }),
  analyze((() => { const shared = { type: "text" }; return { root: { type: "box", children: [shared, shared] } }; })()),
  analyze({ root: { type: "box", children: [{ type: "text", name: "dup" }, { type: "text", name: "dup" }] } }),
  analyze({ root: { type: "section", props: { pointGroup: "chapters" } } }),
  analyze({ root: { type: "image", props: { src: "/missing-alt" } } }),
];
const schemaOutput = schemaOutputs.join("\n");
const themeTempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "nextjs-engine-error-book-theme-"));
const compileThemeFailure = (sourceTexts) => {
  const entries = sourceTexts.map((sourceText, index) => {
    const filePath = path.join(themeTempRoot, "app", "error-book-theme-" + index + ".tsx");
    return {
      filePath,
      sourceFile: ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
    };
  });
  return errorFrom(() => compileEngineThemeArtifacts(themeTempRoot, entries, {
    nextjsVersion: "16.4.2",
    engineVersion: "3.0.0-alpha.1",
  }));
};
let neth1001;
let neth1002;
let neth2001;
let neth2002;
try {
  neth1001 = compileThemeFailure([
    'import { createTheme } from "nextjs-engine"; const makeTheme = () => ({ id: "dynamic-theme" }); createTheme(makeTheme());',
  ]);
  neth1002 = compileThemeFailure([
    'import { createTheme } from "nextjs-engine"; createTheme({ id: "../outside", scope: "global" });',
  ]);
  neth2001 = compileThemeFailure([
    'import { createTheme } from "nextjs-engine"; createTheme({ id: "same-theme", scope: "global", palette: { accent: "#fff" } });',
    'import { createTheme } from "nextjs-engine"; createTheme({ id: "same-theme", scope: "global", palette: { accent: "#000" } });',
  ]);
  neth2002 = compileThemeFailure([
    'import { createTheme } from "nextjs-engine"; createTheme({ id: "invalid-token", tokens: { bad: undefined } });',
  ]);
} finally {
  fs.rmSync(themeTempRoot, { recursive: true, force: true });
}
assert.equal(neth1001.code, "NETH1001");
assert.equal(neth1002.code, "NETH1002");
assert.equal(neth2001.code, "NETH2001");
assert.equal(neth2002.code, "NETH2002");
for (const themeError of [neth1001, neth1002, neth2001, neth2002]) {
  assert.ok(themeError.reason && themeError.action, "EngineTheme errors carry repair guidance");
}

const invalidLimit = errorFrom(() => evaluateEngineBuildBudgets({}, { initialJS: -1 }));
const invalidMeasurement = errorFrom(() => evaluateEngineBuildBudgets({}, { initialJS: 100 }));
const budgetReport = evaluateEngineBuildBudgets({ initialJS: 120_000 }, { initialJS: 100_000 });
const exceededBudget = errorFrom(() => assertEngineBuildBudgets(budgetReport));
assert.ok(invalidLimit instanceof EngineBuildBudgetError);
assert.ok(invalidMeasurement instanceof EngineBuildBudgetError);
assert.ok(exceededBudget instanceof EngineBuildBudgetError);
assert.equal(invalidLimit.code, "NEBLD2001");
assert.equal(invalidMeasurement.code, "NEBLD2002");
assert.equal(exceededBudget.code, "NEBLD3002");
const codedBudgetReport = reporter.createEngineErrorReport(exceededBudget);
assert.equal(codedBudgetReport.code, "NEBLD3002");
assert.ok(codedBudgetReport.reason && codedBudgetReport.action);
assert.ok(reporter.formatEngineErrorReport(codedBudgetReport, { color: false }).includes(catalog.publicBaseUrl + "/build#nebld3002"));
const emittedChecks = {
  NECORE4000: reporterSource.includes('context.code || attachedCode || "NECORE4000"') && reporterSource.includes('codeCandidate : "NECORE4000"'),
  NECORE4001: integrationSource.includes('code: "NECORE4001"'),
  NECORE4002: integrationSource.includes('code: "NECORE4002"'),
  NECORE4003: integrationSource.includes('code: "NECORE4003"'),
  NECORE5001: reporterSource.includes('code: "NECORE5001"'),
  NENC4000: loggerSource.includes('"NENC4000"'),
  NECFG2001: integrationSource.includes('warningCode: "NECFG2001"'),
  NECFG2002: integrationSource.includes('warningCode: "NECFG2002"'),
  NECFG2003: integrationSource.includes('warningCode: "NECFG2003"'),
  NECFG5001: integrationSource.includes('"NECFG5001"'),
  NECMP1001: schemaOutput.includes("NECMP1001"),
  NECMP1002: schemaOutput.includes("NECMP1002"),
  NECMP1004: schemaOutput.includes("NECMP1004"),
  NECMP1005: schemaOutput.includes("NECMP1005"),
  NECMP1006: schemaOutput.includes("NECMP1006"),
  NECMP1007: schemaOutput.includes("NECMP1007"),
  NECMP1008: schemaOutput.includes("NECMP1008"),
  NECMP2001: schemaOutput.includes("NECMP2001"),
  NECMP2002: schemaOutput.includes("NECMP2002"),
  NECMP2003: schemaOutput.includes("NECMP2003"),
  NEIMG1002: schemaOutput.includes("NEIMG1002"),
  NESCHED1002: schemaOutput.includes("NESCHED1002"),
  NEBLD2001: invalidLimit.code === "NEBLD2001",
  NEBLD2002: invalidMeasurement.code === "NEBLD2002",
  NEBLD3002: exceededBudget.code === "NEBLD3002",
  NETH1001: neth1001.code === "NETH1001",
  NETH1002: neth1002.code === "NETH1002",
  NETH2001: neth2001.code === "NETH2001",
  NETH2002: neth2002.code === "NETH2002",
  NETH3001: source("src/engine/compiler/theme/3/compiler.ts").includes('createThemeCompilerError("NETH3001"'),
  NETH8001: remoteThemeSource.includes('createRemoteThemeError("NETH8001"'),
  NESEC2001: remoteThemeSource.includes('createRemoteThemeError("NESEC2001"'),
  NESEC4001: remoteThemeSource.includes('createRemoteThemeError("NESEC4001"'),
  NESEC8001: remoteThemeSource.includes('createRemoteThemeError("NESEC8001"'),
};
const seen = new Set();
for (const entry of catalog.entries) {
  assert.match(entry.code, /^[A-Z]+\d{4}$/, "invalid code: " + entry.code);
  assert.ok(!seen.has(entry.code), "duplicate code: " + entry.code); seen.add(entry.code);
  assert.ok(["emitted", "assigned", "reserved"].includes(entry.status));
  assert.match(entry.doc, /^[a-z-]+\.md#[a-z]+\d{4}$/);
  const [page, anchor] = entry.doc.split("#");
  const pagePath = path.join(root, "docs/3/error-codes", page);
  assert.ok(fs.existsSync(pagePath), "missing page: " + page);
  const pageText = source("docs/3/error-codes/" + page);
  assert.ok(pageText.includes("### " + entry.code + "\n"), "missing heading: " + entry.code);
  assert.ok(pageText.toLowerCase().includes(anchor));
  assert.equal(reporter.resolveEngineErrorHelpUrl(entry.code), catalog.publicBaseUrl + "/" + page.replace(/\.md$/, "") + "#" + entry.code.toLowerCase());
  if (entry.status === "emitted") assert.equal(emittedChecks[entry.code], true, "Emitted code lacks a concrete emitter: " + entry.code);
}
for (const prefix of Object.keys(catalog.prefixes)) assert.ok(catalog.entries.some((entry) => entry.code.startsWith(prefix)));
assert.ok(catalog.entries.some((entry) => entry.status === "assigned"));
assert.ok(catalog.entries.some((entry) => entry.status === "reserved"));
const report = reporter.createEngineErrorReport(new Error("sample"), { code: "NECORE4001", source: "next-route-error", route: "/example?token=private", includeStack: false });
assert.ok(report.reason && report.action);
assert.equal(reporter.createEngineErrorReport(new Error("default-code")).code, "NECORE4000");
const rendered = reporter.formatEngineErrorReport(report, { color: false });
assert.match(rendered, /NECORE4001/); assert.match(rendered, /Reason:/); assert.match(rendered, /Action:/);
assert.ok(rendered.includes(catalog.publicBaseUrl + "/core#necore4001"));
assert.ok(rendered.includes("Kastrick · Website")); assert.doesNotMatch(rendered, /private/);
assert.equal(reporter.resolveEngineErrorHelpUrl("CUSTOM-APP-CODE"), catalog.publicBaseUrl);
const themeReport = reporter.createEngineErrorReport(neth1002);
assert.equal(themeReport.code, "NETH1002");
assert.ok(themeReport.reason && themeReport.action);
assert.ok(reporter.formatEngineErrorReport(themeReport, { color: false }).includes(catalog.publicBaseUrl + "/theme#neth1002"));
const failure = logger.formatFailedLine("compile failed");
assert.match(failure, /\[NENC\] FAILED \[NENC4000\]/);
assert.ok(failure.includes(catalog.publicBaseUrl + "/nenc#nenc4000"));
assert.ok(failure.includes("https://kastrick.vercel.app/project/nextjs-engine"), "NENC failures link to the project website"); assert.match(failure, /\n  Help:/);
const book = source("docs/3/error-codes/README.md");
assert.ok(book.includes("catalog.json") && book.includes("Emitted") && book.includes("Assigned") && book.includes("Reserved"));
assert.ok(source("docs/3/index.md").includes("./error-codes/README.md"));
console.log("Generation 3 Error Code Book smoke test passed (" + catalog.entries.length + " codes).");
if (previousTsLoader) require.extensions[".ts"] = previousTsLoader;
else delete require.extensions[".ts"];
