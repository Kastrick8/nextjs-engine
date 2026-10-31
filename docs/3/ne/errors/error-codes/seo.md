# EngineSEO and metadata

**Prefix:** `NESEO`  
**Scope:** Metadata normalization, canonical URLs, JSON-LD and sitemaps

## Code index

| Code | Diagnostic | Status |
|---|---|---|
| [NESEO1001](#neseo1001) | SEO schema invalid | Emitted |
| [NESEO2001](#neseo2001) | Canonical URL invalid | Emitted |
| [NESEO3001](#neseo3001) | JSON-LD serialization failed | Emitted |
| [NESEO4001](#neseo4001) | Sitemap route discovery failed | Emitted |

## Details

### NESEO1001

**SEO schema invalid**

**Status:** Emitted

**What it means**

The EngineSEO schema could not be serialized to the JSON-safe form required by generated metadata and sitemap files.

**Why it happens**

The schema may contain circular references, functions, symbols, unsupported values, or an undefined top-level value.

**Recommended action**

Use plain JSON-compatible data with finite numbers; remove circular references, functions and symbols. Do not place environment secrets in public SEO metadata.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/seo#neseo1001`

---

### NESEO2001

**Canonical URL invalid**

**Status:** Emitted

**What it means**

The canonical value is malformed or resolves to a protocol other than HTTP or HTTPS.

**Why it happens**

A malformed URL/base origin or a javascript:, data:, mailto: or other unsupported scheme may be present.

**Recommended action**

Use a valid HTTP(S) site URL and an HTTP(S) canonical target. Relative page paths are accepted when a valid site URL can resolve them.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/seo#neseo2001`

---

### NESEO3001

**JSON-LD serialization failed**

**Status:** Emitted

**What it means**

JSON-LD could not be serialized to a JSON string.

**Why it happens**

A cycle, BigInt or unsupported value may make JSON.stringify throw; a value that does not produce a string is rejected explicitly.

**Recommended action**

Use JSON-compatible structured-data values and keep the serializer's escaping of <, > and & enabled. Do not hand-concatenate untrusted JSON-LD into a script element.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/seo#neseo3001`

---

### NESEO4001

**Sitemap route discovery failed**

**Status:** Emitted

**What it means**

EngineSEO threw while scanning App Router or Pages Router directories for sitemap routes.

**Why it happens**

The route directory may be unreadable, or filesystem access failed while traversing the application tree.

**Recommended action**

Inspect the route-directory path and original cause. Check filesystem permissions and retry after fixing the underlying read error; do not invent replacement routes or timestamps.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/seo#neseo4001`

---

