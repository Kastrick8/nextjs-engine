"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "docs/3/error-codes/catalog.json"), "utf8"));
const reporter = require("../src/engine/errors/engineErrorReporter");
const logger = require("../src/engine/plugins/nencTerminalLogger");
assert.equal(catalog.schemaVersion, 1);
assert.equal(catalog.codeFormat, "PREFIX1234");
assert.equal(catalog.publicBaseUrl, reporter.ERROR_BOOK_URL);
const source = (file) => fs.readFileSync(path.join(root, file), "utf8");
const reporterSource = source("src/engine/errors/engineErrorReporter.js");
const integrationSource = source("src/engine/plugins/engineErrorHandling.js");
const loggerSource = source("src/engine/plugins/nencTerminalLogger.js");
const emittedChecks = {
  NECORE4000: reporterSource.includes('context.code || "NECORE4000"') && reporterSource.includes('codeCandidate : "NECORE4000"'),
  NECORE4001: integrationSource.includes('code: "NECORE4001"'),
  NECORE4002: integrationSource.includes('code: "NECORE4002"'),
  NECORE4003: integrationSource.includes('code: "NECORE4003"'),
  NECORE5001: reporterSource.includes('code: "NECORE5001"'),
  NECFG2001: integrationSource.includes('warningCode: "NECFG2001"'),
  NECFG2002: integrationSource.includes('warningCode: "NECFG2002"'),
  NECFG2003: integrationSource.includes('warningCode: "NECFG2003"'),
  NECFG5001: integrationSource.includes('"NECFG5001"'),
  NENC4000: loggerSource.includes('[NENC] FAILED [NENC4000]'),
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
const rendered = reporter.formatEngineErrorReport(report, { color: false });
assert.match(rendered, /NECORE4001/); assert.match(rendered, /Reason:/); assert.match(rendered, /Action:/);
assert.ok(rendered.includes(catalog.publicBaseUrl + "/core#necore4001"));
assert.ok(rendered.includes("Kastrick · Website")); assert.doesNotMatch(rendered, /private/);
assert.equal(reporter.resolveEngineErrorHelpUrl("CUSTOM-APP-CODE"), catalog.publicBaseUrl);
const failure = logger.formatFailedLine("compile failed");
assert.match(failure, /\[NENC\] FAILED \[NENC4000\]/);
assert.ok(failure.includes(catalog.publicBaseUrl + "/nenc#nenc4000"));
assert.ok(failure.includes("https://kastrick.vercel.app/project/nextjs-engine"), "NENC failures link to the project website"); assert.match(failure, /\n  Help:/);
const book = source("docs/3/error-codes/README.md");
assert.ok(book.includes("catalog.json") && book.includes("Emitted") && book.includes("Assigned") && book.includes("Reserved"));
assert.ok(source("docs/3/index.md").includes("./error-codes/README.md"));
console.log("Generation 3 Error Code Book smoke test passed (" + catalog.entries.length + " codes).");
