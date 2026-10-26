"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {runGen3MigrationDiagnostics}=require("../src/engine/plugins/gen3MigrationDiagnostics");
function capture(callback) {
 const warnings=[],errors=[],warn=console.warn,error=console.error;
 console.warn=(...args)=>warnings.push(args.join(" "));
 console.error=(...args)=>errors.push(args.join(" "));
 try { return {result:callback(),warnings,errors}; }
 finally { console.warn=warn; console.error=error; }
}
function root() { return fs.mkdtempSync(path.join(os.tmpdir(),"nextjs-engine-gen3-migration-")); }
const project=root();
try {
 fs.writeFileSync(path.join(project,"package.json"),JSON.stringify({name:"fixture",version:"3.0.0-alpha.1"}));
 fs.mkdirSync(path.join(project,"app"),{recursive:true});
 fs.mkdirSync(path.join(project,".EngineAPIConfig"),{recursive:true});
 fs.writeFileSync(path.join(project,".EngineAPIConfig","provider.api"),"[provider.main]\nendpoint=https://example.test\n");
 fs.writeFileSync(path.join(project,".engine-api-compiled.json"),"{}");
 fs.writeFileSync(path.join(project,"app","page.tsx"),[
  'import { RawComponentRenderer } from "legacy-engine";',
  'const invalidNode = { type: "raw", props: {} };',
  "export default createPage({",
  " compiler: { serverFirst: false },",
  " handlers: { onClick() {} },",
  " schema: { root: { type: 'section' } },",
  "});"
 ].join("\n"));
 const result=capture(()=>runGen3MigrationDiagnostics({rootDir:project,development:true}));
 assert.equal(result.result.length,5,"expected one EngineAPI warning, two raw errors and two migration warnings");
 assert.equal(result.warnings.length,3,"expected EngineAPI, serverFirst and named-handler warnings");
 assert.equal(result.errors.length,2,"expected both unsupported raw APIs to be errors");
 assert.match(result.warnings.join("\n"),/3\.0\.0-alpha\.1/);
 assert.match(result.warnings.join("\n"),/\.nextjs-engine\/config\/\.apiconfig\.json/);
 assert.match(result.warnings.join("\n"),/W3M002/);
 assert.match(result.warnings.join("\n"),/W3M003/);
 assert.match(result.errors.join("\n"),/E3M001/);
 assert.match(result.errors.join("\n"),/E3M002/);
 const repeated=capture(()=>runGen3MigrationDiagnostics({rootDir:project,development:true}));
 assert.equal(repeated.warnings.length+repeated.errors.length,0,"diagnostics should be deduplicated across config reloads");
} finally { fs.rmSync(project,{recursive:true,force:true}); }
const clean=root();
try {
 fs.writeFileSync(path.join(clean,"package.json"),JSON.stringify({version:"3.0.0-alpha.1"}));
 const result=capture(()=>runGen3MigrationDiagnostics({rootDir:clean,development:true}));
 assert.equal(result.result.length,0,"a clean project should not receive migration diagnostics");
 assert.equal(result.warnings.length+result.errors.length,0);
} finally { fs.rmSync(clean,{recursive:true,force:true}); }
console.log("Gen 3 migration diagnostics smoke test passed.");
