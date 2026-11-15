# Configuration and plugin integration

**Prefix:** `NECFG`  
**Scope:** Config parsing, generated error files, plugin lifecycle and file ownership

## Code index

| Code | Diagnostic | Status |
|---|---|---|
| [NECFG1001](#necfg1001) | Engine configuration is malformed | Assigned |
| [NECFG1002](#necfg1002) | Compiled EngineAPI config is invalid | Assigned |
| [NECFG2001](#necfg2001) | User-owned route boundary preserved | Emitted |
| [NECFG2002](#necfg2002) | User-owned global boundary preserved | Emitted |
| [NECFG2003](#necfg2003) | User-owned instrumentation preserved | Emitted |
| [NECFG5001](#necfg5001) | Generated integration file could not be written | Emitted |
| [NECFG8001](#necfg8001) | Reporter module could not be resolved | Assigned |
| [NECFG9001](#necfg9001) | Plugin ownership invariant violated | Reserved |

## Details

### NECFG1001

**Engine configuration is malformed**

**Status:** Assigned

**What it means**

A configuration file could not be read or normalized into supported options.

**Why it happens**

The file may be invalid or resolve from an unexpected working directory.

**Recommended action**

Check the exact path and compare options with Gen 3 docs; keep secret-bearing values out of logs.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/config#necfg1001`

---

### NECFG1002

**Compiled EngineAPI config is invalid**

**Status:** Assigned

**What it means**

EngineAPI input could not be validated into Gen 3 provider configuration.

**Why it happens**

The source or generated representation may be malformed, stale or legacy-shaped.

**Recommended action**

Keep `.EngineAPIConfig/*.api` as source where applicable and treat `.nextjs-engine/config/.apiconfig.json` as output.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/config#necfg1002`

---

### NECFG2001

**User-owned route boundary preserved**

**Status:** Emitted

**What it means**

The Engine found custom app/error.tsx and did not overwrite it.

**Why it happens**

The file lacks the Engine-generated ownership marker and may contain application recovery behavior.

**Recommended action**

Keep the custom boundary; call reportEngineError() from it to opt into structured diagnostics.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/config#necfg2001`

---

### NECFG2002

**User-owned global boundary preserved**

**Status:** Emitted

**What it means**

The Engine left custom app/global-error.tsx unchanged.

**Why it happens**

Overwriting it could destroy recovery UI or required HTML structure.

**Recommended action**

Keep the custom boundary and integrate the reporter deliberately rather than creating a competing file.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/config#necfg2002`

---

### NECFG2003

**User-owned instrumentation preserved**

**Status:** Emitted

**What it means**

The Engine preserved an existing instrumentation entry point.

**Why it happens**

Overwriting could break unrelated Next.js hooks or telemetry.

**Recommended action**

Merge Engine monitor/request reporting into the existing entry point.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/config#necfg2003`

---

### NECFG5001

**Generated integration file could not be written**

**Status:** Emitted

**What it means**

The plugin failed while writing an Engine-owned error integration file.

**Why it happens**

Permissions, disk space, path conflicts or another process may block output.

**Recommended action**

Check the reported path and file/directory conflicts. Resolve permissions and rerun; do not force-overwrite user files.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/config#necfg5001`

---

### NECFG8001

**Reporter module could not be resolved**

**Status:** Assigned

**What it means**

A generated boundary cannot resolve the reporter from the installed package layout.

**Why it happens**

Package files may be partial or generated relative imports may be stale.

**Recommended action**

Verify the reporter ships with the installed version and imports resolve from the app directory.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/config#necfg8001`

---

### NECFG9001

**Plugin ownership invariant violated**

**Status:** Reserved

**What it means**

Plugin file-ownership state contradicts preservation rules.

**Why it happens**

Concurrent write, corrupted marker or a plugin defect may have changed ownership assumptions.

**Recommended action**

Preserve before/after contents and package version. Do not force overwrite.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/config#necfg9001`

---

