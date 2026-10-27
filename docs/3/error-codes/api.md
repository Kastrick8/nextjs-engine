# EngineAPI and APIStatic

**Prefix:** `NEAPI`  
**Scope:** Provider config, route declarations, request validation and handler execution

## Code index

| Code | Diagnostic | Status |
|---|---|---|
| [NEAPI1001](#neapi1001) | API declaration malformed | Assigned |
| [NEAPI1002](#neapi1002) | API method/path invalid | Assigned |
| [NEAPI2001](#neapi2001) | API provider could not be resolved | Assigned |
| [NEAPI2002](#neapi2002) | Request input failed validation | Assigned |
| [NEAPI4001](#neapi4001) | API handler execution failed | Assigned |

## Details

### NEAPI1001

**API declaration malformed**

**Status:** Assigned

**What it means**

A provider/route declaration could not be normalized.

**Why it happens**

It may use invalid fields, duplicate identities or legacy syntax.

**Recommended action**

Use generation-specific docs and preserve source as authoritative input.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/api#neapi1001`

---

### NEAPI1002

**API method/path invalid**

**Status:** Assigned

**What it means**

Route has unsupported method or malformed identity.

**Why it happens**

Ambiguous methods or paths prevent predictable registration.

**Recommended action**

Use supported methods and normalized paths; check dynamic path collisions.

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

**Status:** Assigned

**What it means**

Input does not meet the endpoint contract.

**Why it happens**

Required fields may be missing or incorrectly typed.

**Recommended action**

Use field-path diagnostics to fix caller/schema without logging secrets.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/api#neapi2002`

---

### NEAPI4001

**API handler execution failed**

**Status:** Assigned

**What it means**

Provider/APIStatic handler threw or returned unexpected failure.

**Why it happens**

Cause may be app logic or upstream dependency.

**Recommended action**

Inspect the first handler frame and sanitized request route; distinguish validation from unexpected server fault.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/api#neapi4001`

---

