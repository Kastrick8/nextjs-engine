# NENC compiler and worker pipeline

**Prefix:** `NENC`  
**Scope:** Gen 3 source discovery, static analysis, compilation, client islands, artifacts and worker output

## Code index

| Code | Diagnostic | Status |
|---|---|---|
| [NENC1000](#nenc1000) | Compiler source discovery failed | Assigned |
| [NENC1001](#nenc1001) | Compiler input could not be parsed | Assigned |
| [NENC1002](#nenc1002) | Schema expression is not statically analyzable | Assigned |
| [NENC2001](#nenc2001) | Unknown schema node type | Assigned |
| [NENC2002](#nenc2002) | Unsupported schema property value | Assigned |
| [NENC3001](#nenc3001) | Client-island boundary could not be planned | Assigned |
| [NENC3002](#nenc3002) | Compiled artifact graph is incomplete | Assigned |
| [NENC4000](#nenc4000) | Unclassified NENC terminal failure | Emitted |
| [NENC4001](#nenc4001) | Route compilation failed | Assigned |
| [NENC5001](#nenc5001) | Compiler worker exited unexpectedly | Assigned |
| [NENC5002](#nenc5002) | Compiler worker response was invalid | Assigned |
| [NENC8001](#nenc8001) | TypeScript compiler dependency unavailable | Assigned |

## Details

### NENC1000

**Compiler source discovery failed**

**Status:** Assigned

**What it means**

NENC could not enumerate source files required by a compile pass.

**Why it happens**

A scan root may be missing, unreadable, outside the project or blocked by permissions.

**Recommended action**

Check app/pages/components/theme paths and ensure the build user can read source; do not scan generated output.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/nenc#nenc1000`

---

### NENC1001

**Compiler input could not be parsed**

**Status:** Assigned

**What it means**

A source file could not be parsed into the syntax structure required by a pass.

**Why it happens**

The file may contain invalid TS/JS or unsupported syntax.

**Recommended action**

Start at the first parser error and file:line:column; run type-check before treating follow-on errors as independent.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/nenc#nenc1001`

---

### NENC1002

**Schema expression is not statically analyzable**

**Status:** Assigned

**What it means**

A schema expression could not be resolved deterministically during static compilation.

**Why it happens**

Dynamic calls, spreads, computed props or cycles can hide required compile data.

**Recommended action**

Make the schema value static or use a documented runtime/provider path.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/nenc#nenc1002`

---

### NENC2001

**Unknown schema node type**

**Status:** Assigned

**What it means**

NENC encountered a type absent from the active node registry.

**Why it happens**

The type may be misspelled, legacy-only or a custom node never registered.

**Recommended action**

Use the Gen 3 reference and register custom components before schema compilation.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/nenc#nenc2001`

---

### NENC2002

**Unsupported schema property value**

**Status:** Assigned

**What it means**

A schema prop has a shape the compile pass cannot normalize.

**Why it happens**

The value may be dynamic or outside the supported prop type.

**Recommended action**

Follow the component prop contract; put runtime-dependent behavior in a supported client/component boundary.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/nenc#nenc2002`

---

### NENC3001

**Client-island boundary could not be planned**

**Status:** Assigned

**What it means**

NENC could not produce consistent server/client ownership for a node.

**Why it happens**

A browser-only requirement may cross a boundary without an allowed transition.

**Recommended action**

Inspect runtime classification and used-feature manifest; keep browser hooks in client components.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/nenc#nenc3001`

---

### NENC3002

**Compiled artifact graph is incomplete**

**Status:** Assigned

**What it means**

A node references a module, asset or artifact that was not emitted/resolved.

**Why it happens**

An earlier pass may have failed or a reference may be stale.

**Recommended action**

Find the first diagnostic for that route, then rebuild the affected artifact; preserve cache evidence.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/nenc#nenc3002`

---

### NENC4000

**Unclassified NENC terminal failure**

**Status:** Emitted

**What it means**

The NENC logger received FAILED/ERROR without a narrower stable diagnostic.

**Why it happens**

A worker, route, asset or adapter failed without specific classification.

**Recommended action**

Read the earliest preceding NENC failure and identify the failing route, worker or compile pass.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/nenc#nenc4000`

---

### NENC4001

**Route compilation failed**

**Status:** Assigned

**What it means**

A particular route did not complete its NENC pass.

**Why it happens**

Schema, AST transform, runtime classification or output emission failed.

**Recommended action**

Use the route path and first compile diagnostic; fix the first cause instead of suppressing the route.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/nenc#nenc4001`

---

### NENC5001

**Compiler worker exited unexpectedly**

**Status:** Assigned

**What it means**

A worker exited before returning a complete result.

**Why it happens**

It may have crashed, received a signal or exhausted available memory.

**Recommended action**

Keep exit code/signal and preceding output; repeated failures should be treated as a compiler issue.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/nenc#nenc5001`

---

### NENC5002

**Compiler worker response was invalid**

**Status:** Assigned

**What it means**

A response does not match the expected worker protocol.

**Why it happens**

Parent/worker versions may differ or the response may be partial after cancellation.

**Recommended action**

Use the same package revision for parent and worker; inspect request ID and message type.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/nenc#nenc5002`

---

### NENC8001

**TypeScript compiler dependency unavailable**

**Status:** Assigned

**What it means**

NENC could not load TypeScript for a compile pass.

**Why it happens**

Dependencies may be incomplete or module resolution may select the wrong package root.

**Recommended action**

Install dependencies from project root and verify the resolved TypeScript package.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/nenc#nenc8001`

---

