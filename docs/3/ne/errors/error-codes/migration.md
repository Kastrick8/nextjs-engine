# Generation 2 to Generation 3 migration

**Prefix:** `NEMIG`  
**Scope:** Legacy configuration, renderer compatibility and source migration

## Code index

| Code | Diagnostic | Status |
|---|---|---|
| [NEMIG1001](#nemig1001) | Legacy EngineAPI config detected | Assigned |
| [NEMIG1002](#nemig1002) | Legacy API source could not migrate | Assigned |
| [NEMIG2001](#nemig2001) | Gen 2 renderer compatibility enabled | Assigned |
| [NEMIG2002](#nemig2002) | Legacy authoring pattern remains | Assigned |

## Details

### NEMIG1001

**Legacy EngineAPI config detected**

**Status:** Assigned

**What it means**

A scan found a Gen 2 config directory/retired artifact.

**Why it happens**

Legacy source can remain after migration; it doesn't mean input must be moved automatically.

**Recommended action**

Keep `.EngineAPIConfig/*.api` as source and `.nextjs-engine/config/.apiconfig.json` as generated output.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/migration#nemig1001`

---

### NEMIG1002

**Legacy API source could not migrate**

**Status:** Assigned

**What it means**

An old declaration could not convert to the supported Gen 3 model.

**Why it happens**

It may use unsupported old syntax/fields.

**Recommended action**

Fix original source and regenerate; don't edit generated JSON as authoritative source.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/migration#nemig1002`

---

### NEMIG2001

**Gen 2 renderer compatibility enabled**

**Status:** Assigned

**What it means**

A page explicitly selects the legacy renderer path.

**Why it happens**

Legacy handler/provider contract may still require it or an old override remains.

**Recommended action**

Keep only while needed, then migrate to supported Gen 3 boundaries after verifying behavior.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/migration#nemig2001`

---

### NEMIG2002

**Legacy authoring pattern remains**

**Status:** Assigned

**What it means**

A scan found an older pattern with changed Gen 3 semantics.

**Why it happens**

Source may rely on raw nodes/legacy handlers.

**Recommended action**

Follow targeted migration diagnostics and Gen 3 docs; avoid bulk-editing unrelated files.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/migration#nemig2002`

---

