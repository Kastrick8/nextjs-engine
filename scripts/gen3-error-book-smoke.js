"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),catalog=JSON.parse(fs.readFileSync(path.join(root,"docs/3/error-codes/catalog.json"),"utf8"));
const reporter=require("../src/engine/errors/engineErrorReporter"),logger=require("../src/engine/plugins/nencTerminalLogger");
assert.equal(catalog.schemaVersion,1);assert.equal(catalog.codeFormat,"PREFIX1234");assert.equal(catalog.publicBaseUrl,reporter.ERROR_BOOK_URL);
const seen=new Set(),sources=["src/engine/errors/engineErrorReporter.js","src/engine/plugins/engineErrorHandling.js","src/engine/plugins/nencTerminalLogger.js"].map(p=>fs.readFileSync(path.join(root,p),"utf8")).join("\n");
for(const entry of catalog.entries){
 assert.match(entry.code,/^[A-Z]+\d{4}$/);assert.ok(!seen.has(entry.code),"duplicate "+entry.code);seen.add(entry.code);
 assert.ok(["emitted","assigned","reserved"].includes(entry.status));assert.match(entry.doc,/^[a-z-]+\.md#[a-z]+\d{4}$/);
 const [file,anchor]=entry.doc.split("#"),full=path.join(root,"docs/3/error-codes",file);assert.ok(fs.existsSync(full),"missing "+file);
 const text=fs.readFileSync(full,"utf8");assert.ok(text.includes("### "+entry.code+"\n"),"missing heading "+entry.code);assert.ok(text.toLowerCase().includes(anchor));
 assert.equal(reporter.resolveEngineErrorHelpUrl(entry.code),catalog.publicBaseUrl+"/"+file.replace(/\.md$/,"")+"#"+entry.code.toLowerCase());
 if(entry.status==="emitted")assert.ok(sources.includes(entry.code),"no emitter for "+entry.code);
}
for(const prefix of Object.keys(catalog.prefixes))assert.ok(catalog.entries.some(e=>e.code.startsWith(prefix)));
const report=reporter.createEngineErrorReport(new Error("sample"),{code:"NECORE4001",source:"next-route-error",route:"/example?token=private",includeStack:false});
assert.ok(report.reason&&report.action);const formatted=reporter.formatEngineErrorReport(report,{color:false});
assert.match(formatted,/NECORE4001/);assert.match(formatted,/Reason:/);assert.match(formatted,/Action:/);assert.ok(formatted.includes(catalog.publicBaseUrl+"/core#necore4001"));assert.ok(formatted.includes("Kastrick · Website"));assert.doesNotMatch(formatted,/private/);
assert.equal(reporter.resolveEngineErrorHelpUrl("CUSTOM-APP-CODE"),catalog.publicBaseUrl);
const failed=logger.formatFailedLine("compile failed");assert.match(failed,/\[NENC\] FAILED \[NENC4000\]/);assert.ok(failed.includes(catalog.publicBaseUrl+"/nenc#nenc4000"));assert.match(failed,/\n  Help:/);
const book=fs.readFileSync(path.join(root,"docs/3/error-codes/README.md"),"utf8");assert.ok(book.includes("catalog.json")&&book.includes("Emitted")&&book.includes("Assigned")&&book.includes("Reserved"));
assert.ok(fs.readFileSync(path.join(root,"docs/3/index.md"),"utf8").includes("./error-codes/README.md"));
console.log("Generation 3 Error Code Book smoke test passed ("+catalog.entries.length+" codes).");
