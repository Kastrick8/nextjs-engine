"use strict";
const fs = require("node:fs");
const path = require("node:path");
const STATE_KEY = Symbol.for("nextjs-engine.gen3-migration-diagnostics");
const SOURCE_ROOTS = ["app", "src/app", "pages", "src/pages", "components", "src/components", "lib", "src/lib"];
const SKIP = new Set([".git", ".next", "dist", "node_modules", ".nextjs-engine", "coverage"]);
const RULES = [
 { code:"E3M001", severity:"error", pattern:/\bRawComponentRenderer\b/, message:"RawComponentRenderer is not a supported Generation 3 public API.", recommendation:"Replace it with a registered React component via createComponent()/registerComponent(), or render normal JSX inside your own React component." },
 { code:"E3M002", severity:"error", pattern:/(?:\btype\b|"type"|'type')\s*:\s*(["'])raw\1/, message:'Schema nodes with type: "raw" are not supported by Generation 3.', recommendation:"Replace the raw schema node with a registered component node. Do not pass executable component code through schema data." },
];
function isDevelopmentProcess() {
 return process.env.NEXT_PHASE === "phase-development-server"
  || (process.env.NODE_ENV === "development" && process.env.NEXT_PHASE !== "phase-production-build")
  || process.argv.slice(2).some((arg) => arg === "dev");
}
function packageVersion(root, provided) {
 if (provided) return String(provided);
 try {
  const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
  return pkg.version || "3.x-alpha";
 } catch { return "3.x-alpha"; }
}
function maskComments(source) {
 return source.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\x60(?:\\[\s\S]|[^\x60\\])*\x60)|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g,
  (match,literal)=>literal!==undefined?literal:match.replace(/[^\r\n]/g," "));
}
function maskStrings(source) {
 return source.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\x60(?:\\[\s\S]|[^\x60\\])*\x60)/g,match=>match.replace(/[^\r\n]/g," "));
}
function walkSourceFiles(root) {
 const result=[];
 for(const sub of SOURCE_ROOTS) {
  const dir=path.resolve(root,sub), rel=path.relative(root,dir);
  if(!rel||rel.startsWith("..")||path.isAbsolute(rel)) continue;
  try { if(!fs.statSync(dir).isDirectory()) continue; } catch { continue; }
  const todo=[dir];
  while(todo.length&&result.length<500) {
   const current=todo.pop(); let entries;
   try { entries=fs.readdirSync(current,{withFileTypes:true}); } catch { continue; }
   for(const entry of entries) {
    const file=path.join(current,entry.name);
    if(entry.isDirectory()) { if(!SKIP.has(entry.name)) todo.push(file); continue; }
    if(!entry.isFile()||!/\.(?:cjs|mjs|js|jsx|ts|tsx)$/i.test(entry.name)) continue;
    try { if(fs.statSync(file).size<=1024*1024) result.push(file); } catch {}
    if(result.length>=500) break;
   }
  }
 }
 return [...new Set(result)];
}
function findLegacyEngineAPI(root) {
 const dir=path.join(root,".EngineAPIConfig"), oldFile=path.join(root,".engine-api-compiled.json");
 let inputs=[];
 try { inputs=fs.readdirSync(dir,{withFileTypes:true}).filter(x=>x.isFile()&&x.name.endsWith(".api")).map(x=>path.posix.join(".EngineAPIConfig",x.name)).sort(); } catch {}
 let oldOutput=false;
 try { oldOutput=fs.statSync(oldFile).isFile(); } catch {}
 return inputs.length||oldOutput ? {apiSourceFiles:inputs,hasLegacyOutput:oldOutput} : null;
}
function findCreatePageCalls(source) {
 const calls=[], marker=/\bcreatePage\s*\(/g; let match;
 while((match=marker.exec(source))!==null) {
  const open=source.indexOf("(",match.index); let depth=1,quote="",escaped=false;
  for(let i=open+1;i<source.length;i++) {
   const ch=source[i];
   if(quote) { if(escaped) escaped=false; else if(ch==="\\") escaped=true; else if(ch===quote) quote=""; continue; }
   if(ch==="'"||ch==='"'||ch==="\x60") { quote=ch; continue; }
   if(ch==="(") depth++;
   else if(ch===")"&&--depth===0) { calls.push({start:match.index,body:source.slice(open+1,i)}); marker.lastIndex=i+1; break; }
  }
 }
 return calls;
}
function emitOnce(root, diagnostic, output) {
 const state=globalThis[STATE_KEY]||(globalThis[STATE_KEY]={reported:new Set()});
 const key=[path.resolve(root),diagnostic.code,diagnostic.file||"",diagnostic.line||""].join("|");
 if(state.reported.has(key)) return;
 state.reported.add(key); output(diagnostic);
}
function reportDiagnostic(d) {
 const loc=d.file ? " "+d.file+(d.line?":"+d.line:"") : "";
 const level=d.severity==="error"?"ERROR":"WARNING";
 const output=d.severity==="error"?console.error:console.warn;
 output("[nextjs-engine][migration]["+d.code+"] "+level+loc+"\n  "+d.message+"\n  Suggested action: "+d.recommendation);
}
function runGen3MigrationDiagnostics(options={}) {
 const root=path.resolve(options.rootDir||process.cwd());
 const development=options.development===undefined?isDevelopmentProcess():options.development;
 if(!development) return [];
 const version=packageVersion(root,options.version), diagnostics=[];
 const add=d=>{diagnostics.push(d);emitOnce(root,d,reportDiagnostic);};
 if(options.reportEngineApiMigration!==false) {
  const legacy=findLegacyEngineAPI(root);
  if(legacy) {
   const inputs=legacy.apiSourceFiles.length?"Legacy inputs: "+legacy.apiSourceFiles.join(", ")+" (preserved in place).":"A legacy compiled EngineAPI artifact was found.";
   const old=legacy.hasLegacyOutput?" The old root-level .engine-api-compiled.json output is retired by the combined Gen 3 plugin.":"";
   add({code:"W3M001",severity:"warn",
    message:"Legacy EngineAPI structure detected for nextjs-engine@"+version+". Generation 3 compiles provider config to .nextjs-engine/config/.apiconfig.json. "+inputs+" The .api source files are not physically moved."+old,
    recommendation:"Keep editing .EngineAPIConfig/*.api as the source of truth and use .nextjs-engine/config/.apiconfig.json for the Generation 3 compiled config."});
  }
 }
 for(const file of walkSourceFiles(root)) {
  let raw; try { raw=fs.readFileSync(file,"utf8"); } catch { continue; }
  const source=maskComments(raw), code=maskStrings(source);
  const rel=path.relative(root,file).split(path.sep).join("/");
  for(const rule of RULES) {
   const scan=rule.code==="E3M001"?code:source, match=rule.pattern.exec(scan);
   if(match) add({code:rule.code,severity:rule.severity,file:rel,line:scan.slice(0,match.index).split(/\r?\n/).length,message:rule.message,recommendation:rule.recommendation});
  }
  for(const call of findCreatePageCalls(source)) {
   const callCode=maskStrings(call.body), line=source.slice(0,call.start).split(/\r?\n/).length;
   if(/\bcompiler\s*:\s*\{[^}]*\bserverFirst\s*:\s*false\b/.test(callCode)) add({
    code:"W3M002",severity:"warn",file:rel,line,
    message:"createPage() explicitly enables the Generation 2 client-renderer compatibility path with compiler.serverFirst: false.",
    recommendation:"Remove this override when the page no longer depends on the legacy renderer. Keep it only as a deliberate migration escape hatch."
   });
   if(/\bhandlers\s*:/.test(callCode)) add({
    code:"W3M003",severity:"warn",file:rel,line,
    message:"Named handlers in createPage() select the Generation 3 provider compatibility path instead of the normal server-first execution path.",
    recommendation:"Keep named handlers while needed; for a fully server-first page, prefer direct React components/slots or another supported interaction boundary and follow the Gen 3 migration guide."
   });
  }
 }
 return diagnostics;
}
module.exports={runGen3MigrationDiagnostics,findLegacyEngineAPI,findCreatePageCalls,maskComments,maskStrings,walkSourceFiles,RULES};
