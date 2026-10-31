# EngineTheme and remote themes

**Prefix:** `NETH`  
**Scope:** Theme IDs/scopes, tokens, .etr artifacts, fonts and remote loading

## Code index

| Code | Diagnostic | Status |
|---|---|---|
| [NETH1001](#neth1001) | Theme definition malformed | Emitted |
| [NETH1002](#neth1002) | Theme ID/scope invalid | Emitted |
| [NETH2001](#neth2001) | Theme ID collides in scope | Emitted |
| [NETH2002](#neth2002) | Theme token value invalid | Emitted |
| [NETH3001](#neth3001) | Theme artifact compilation failed | Emitted |
| [NETH8001](#neth8001) | Remote theme could not be fetched/decoded | Emitted |
| [NETH8002](#neth8002) | Theme font provider failed | Emitted |

## Details

### NETH1001

**Theme definition malformed**

**Status:** Emitted

**What it means**

createTheme() could not normalize a theme definition.

**Why it happens**

A required section or callback return may not match the supported model.

**Recommended action**

Check the first field path against the Gen 3 EngineTheme guide; remote `.etr` must be data only.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/theme#neth1001`

---

### NETH1002

**Theme ID/scope invalid**

**Status:** Emitted

**What it means**

Theme identity/scope does not match the supported contract.

**Why it happens**

IDs select/update themes; scope controls local/global/remote visibility.

**Recommended action**

Use a stable ID and documented scope, not URL or object identity.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/theme#neth1002`

---

### NETH2001

**Theme ID collides in scope**

**Status:** Emitted

**What it means**

Two definitions claim the same ID without an explicit override relationship.

**Why it happens**

The resolved token source may become ambiguous.

**Recommended action**

Choose unique IDs or an explicit supported override.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/theme#neth2001`

---

### NETH2002

**Theme token value invalid**

**Status:** Emitted

**What it means**

A color, unit, palette or template token has an unsupported shape.

**Why it happens**

Color/unit parsing may fail or a template may expect structured data.

**Recommended action**

Use documented token forms and typed values; keep arbitrary markup out of tokens.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/theme#neth2002`

---

### NETH3001

**Theme artifact compilation failed**

**Status:** Emitted

**What it means**

The compiler could not emit a normalized static theme artifact.

**Why it happens**

Token normalization, template data or a dependent compile pass failed.

**Recommended action**

Fix the first theme diagnostic and regenerate `.etr`; do not hand-edit generated output.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/theme#neth3001`

---

### NETH8001

**Remote theme could not be fetched/decoded**

**Status:** Emitted

**What it means**

A remote `.etr` could not be read as expected data.

**Why it happens**

URL may be down or return malformed/non-JSON content.

**Recommended action**

Check URL/status/content and preserve a known-good local fallback.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/theme#neth8001`

### NETH8002

**Theme font provider failed**

**Status:** Emitted

**What it means**

A theme font stylesheet or font file could not be downloaded, validated, cached, or emitted while EngineTheme font compilation was running in strict failure mode.

**Why it happens**

The provider may return an error status or unexpected content type; a font URL may be outside the exact HTTPS allowlist; the request may time out or exceed size limits; or local cache/output state may be unreadable or conflicting.

**Recommended action**

Check the provider HTTP status/content type, exact HTTPS origins, font URLs, and cache/output permissions. Use the default `failurePolicy: "fallback"` for optional fonts; use strict mode when font delivery is required and the underlying provider problem has been corrected. The original failure is preserved as `cause`.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/theme#neth8002`

---

---

