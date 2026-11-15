# EngineAPI and APIStatic

**Prefix:** `NEAPI`  
**Scope:** Provider config, route declarations, request validation and handler execution

## Code index

| Code | Diagnostic | Status |
|---|---|---|
| [NEAPI1001](#neapi1001) | API declaration malformed | Emitted |
| [NEAPI1002](#neapi1002) | APIStatic route ID invalid | Emitted |
| [NEAPI2001](#neapi2001) | API provider could not be resolved | Assigned |
| [NEAPI2002](#neapi2002) | Request input failed validation | Emitted |
| [NEAPI4001](#neapi4001) | API handler execution failed | Emitted |
| [NEAPI8001](#neapi8001) | APIStatic TypeScript compiler unavailable | Emitted |

## Details

### NEAPI1001

**API declaration malformed**

**Status:** Emitted

**What it means**

An APIStatic .route declaration could not be parsed or compiled into a deterministic browser endpoint.

**Why it happens**

The source may have malformed createEndpoint([{ ... }]) syntax, duplicate fields/operations, an unsupported run.<source> form, or invalid TypeScript.

**Recommended action**

Start with the reported .route file and line/column. Fix the nearest syntax/field error and rerun the compiler; do not hand-edit generated JavaScript.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/api#neapi1001`

---

### NEAPI1002

**API method/path invalid**

**Status:** Emitted

**What it means**

An APIStatic route ID contains an empty, dot, traversal, or unsupported path segment.

**Why it happens**

Route IDs map to emitted filenames and public URLs, so ambiguous paths are rejected before any artifact is replaced.

**Recommended action**

Use relative route segments with letters, numbers, dots, underscores or hyphens. Remove . and .. segments, empty segments, and unsupported characters.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/api#neapi1002`

---

### NEAPI2001

**API provider could not be resolved**

**Status:** Assigned

**What it means**

A declaration references no active provider.

**Why it happens**

Provider ID may be wrong or registration too late.

**Recommended action**

Verify ID and registration order before changing unrelated config.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/api#neapi2001`

---

### NEAPI2002

**Request input failed validation**

**Status:** Emitted

**What it means**

Request input does not satisfy the APIStatic endpoint's declared schema.

**Why it happens**

A required field may be missing, or a supplied field may not match its declared string, number, boolean, object, or array type.

**Recommended action**

Use the field name and expected type to fix the caller or schema. Do not log raw request values; responses include the stable NEAPI2002 code.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/api#neapi2002`

---

### NEAPI4001

**API handler execution failed**

**Status:** Emitted

**What it means**

A compiled APIStatic operation threw an unexpected runtime exception.

**Why it happens**

The error may come from the operation body, a provider dependency, or an unsupported failure-handling path.

**Recommended action**

Inspect the route/operation and original cause on the server. Use the generated error(status, message, details) helper for intentional HTTP errors; production responses expose the stable code without serializing internal exception details.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/api#neapi4001`

---


### NEAPI8001

**APIStatic TypeScript compiler unavailable**

**Status:** Emitted

**What it means**

APIStatic could not load the TypeScript compiler needed to transform .route source.

**Why it happens**

The project's dependencies may not be installed, package installation may have omitted TypeScript, or the compiler may not be resolvable from the project running the Next.js build.

**Recommended action**

Install package dependencies and verify that require("typescript") works from the same project directory. Keep TypeScript available at build time; APIStatic does not evaluate route code to bypass compilation.

**Help URL**

https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/api#neapi8001

---

