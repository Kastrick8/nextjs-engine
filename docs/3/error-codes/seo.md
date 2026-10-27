# EngineSEO and metadata

**Prefix:** `NESEO`  
**Scope:** Metadata normalization, canonical URLs, JSON-LD and sitemaps

## Code index

| Code | Diagnostic | Status |
|---|---|---|
| [NESEO1001](#neseo1001) | SEO schema invalid | Assigned |
| [NESEO2001](#neseo2001) | Canonical URL invalid | Assigned |
| [NESEO3001](#neseo3001) | JSON-LD serialization failed | Assigned |
| [NESEO4001](#neseo4001) | Sitemap route discovery failed | Assigned |

## Details

### NESEO1001

**SEO schema invalid**

**Status:** Assigned

**What it means**

An SEO builder could not normalize metadata/structured data.

**Why it happens**

Field may have unsupported type or conflicting declaration.

**Recommended action**

Use the reported field and versioned EngineSEO reference.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/seo#neseo1001`

---

### NESEO2001

**Canonical URL invalid**

**Status:** Assigned

**What it means**

Canonical is not an acceptable absolute HTTP(S) URL.

**Why it happens**

Relative path, malformed origin or untrusted request host may be used.

**Recommended action**

Use a trusted public origin and handle query/hash deliberately.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/seo#neseo2001`

---

### NESEO3001

**JSON-LD serialization failed**

**Status:** Assigned

**What it means**

Structured data could not be safely serialized.

**Why it happens**

Object may contain cycles, unsupported values or non-finite numbers.

**Recommended action**

Use JSON-compatible values and safe serializer; don't concatenate raw JSON-LD into script markup.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/seo#neseo3001`

---

### NESEO4001

**Sitemap route discovery failed**

**Status:** Assigned

**What it means**

EngineSEO could not produce the expected public route set.

**Why it happens**

Selected route roots may be unreadable/unsupported.

**Recommended action**

Inspect discovery output; omit unknown dates instead of inventing timestamps.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/seo#neseo4001`

---

