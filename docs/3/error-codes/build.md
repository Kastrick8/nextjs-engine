# Build, cache and artifacts

**Prefix:** `NEBLD`  
**Scope:** Build integration, deterministic artifacts, cache validation, budgets and output writes

## Code index

| Code | Diagnostic | Status |
|---|---|---|
| [NEBLD1001](#nebld1001) | Build source file could not be read | Assigned |
| [NEBLD1002](#nebld1002) | Engine cache metadata is invalid | Assigned |
| [NEBLD2001](#nebld2001) | Build budget configuration is invalid | Assigned |
| [NEBLD3001](#nebld3001) | Artifact graph is incomplete | Assigned |
| [NEBLD3002](#nebld3002) | Bundle/runtime budget exceeded | Assigned |
| [NEBLD5001](#nebld5001) | Next.js/Engine build integration failed | Assigned |
| [NEBLD8001](#nebld8001) | Build artifact could not be written | Assigned |

## Details

### NEBLD1001

**Build source file could not be read**

**Status:** Assigned

**What it means**

A source selected for an Engine pass could not be opened/decoded.

**Why it happens**

The file may be inaccessible, changing during build or unsupported by the scan.

**Recommended action**

Verify the file exists and is readable; avoid concurrent source generation if unsupported.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/build#nebld1001`

---

### NEBLD1002

**Engine cache metadata is invalid**

**Status:** Assigned

**What it means**

A cache record failed validation and cannot restore compiled output safely.

**Why it happens**

The record may be stale, incomplete or from another compiler revision.

**Recommended action**

Preserve cache metadata, invalidate only the affected Engine cache, then rebuild to test reproducibility.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/build#nebld1002`

---

### NEBLD2001

**Build budget configuration is invalid**

**Status:** Assigned

**What it means**

A configured budget contains an unsupported limit.

**Why it happens**

A value may be negative, non-finite or in an unsupported unit.

**Recommended action**

Use documented units and finite non-negative values before tuning thresholds.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/build#nebld2001`

---

### NEBLD3001

**Artifact graph is incomplete**

**Status:** Assigned

**What it means**

A required module/asset is missing from emitted artifact relationships.

**Why it happens**

A dependency may have been skipped or a compile pass ended early.

**Recommended action**

Inspect the missing dependency and earlier route diagnostics; do not copy generated artifacts by hand.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/build#nebld3001`

---

### NEBLD3002

**Bundle/runtime budget exceeded**

**Status:** Assigned

**What it means**

Output exceeded a configured size/count limit.

**Why it happens**

A new dependency, client island, duplicate runtime or asset increased shipped work.

**Recommended action**

Use attribution to find the largest contributor; optimize before raising the limit.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/build#nebld3002`

---

### NEBLD5001

**Next.js/Engine build integration failed**

**Status:** Assigned

**What it means**

The combined build did not complete its expected pipeline.

**Why it happens**

Cause may be Next.js, type-checking, NENC, artifact preparation or a plugin hook.

**Recommended action**

Find the first error before the summary and classify framework vs Engine failure.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/build#nebld5001`

---

### NEBLD8001

**Build artifact could not be written**

**Status:** Assigned

**What it means**

An Engine output file could not be created/replaced.

**Why it happens**

Permissions, disk space or concurrent cleanup may block the path.

**Recommended action**

Check target directory and disk space; don't remove `.next`/`dist` while a build is active.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/build#nebld8001`

---

