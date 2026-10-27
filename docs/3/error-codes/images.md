# EngineImage and media

**Prefix:** `NEIMG`  
**Scope:** Image source, sizing/optimization, fallback loading and remote host rules

## Code index

| Code | Diagnostic | Status |
|---|---|---|
| [NEIMG1001](#neimg1001) | Image source missing/invalid | Assigned |
| [NEIMG1002](#neimg1002) | Meaningful image has no alt text | Assigned |
| [NEIMG2001](#neimg2001) | Remote image host not allowed | Assigned |
| [NEIMG3001](#neimg3001) | Image sizing/optimization plan failed | Assigned |
| [NEIMG4001](#neimg4001) | Image failed to load/decode | Assigned |

## Details

### NEIMG1001

**Image source missing/invalid**

**Status:** Assigned

**What it means**

An image node has no usable source or a malformed path/URL.

**Why it happens**

Source may be empty or dynamic where static input is required.

**Recommended action**

Use a documented path/absolute URL and validate dynamic input before render.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/images#neimg1001`

---

### NEIMG1002

**Meaningful image has no alt text**

**Status:** Assigned

**What it means**

A non-decorative image lacks alternative text.

**Why it happens**

Assistive technology cannot infer meaning from pixels.

**Recommended action**

Provide concise purpose text; empty alt is for decorative images only.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/images#neimg1002`

---

### NEIMG2001

**Remote image host not allowed**

**Status:** Assigned

**What it means**

Source host is outside configured image policy.

**Why it happens**

Host may be missing from Next.js image configuration.

**Recommended action**

Allow only the intended trusted host/pattern; avoid broad wildcards.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/images#neimg2001`

---

### NEIMG3001

**Image sizing/optimization plan failed**

**Status:** Assigned

**What it means**

Renderer couldn't produce a consistent loading/sizing plan.

**Why it happens**

Dimensions, responsive sizes or optimization flags may conflict.

**Recommended action**

Check dimensions and responsive sizes together and use documented fallback behavior.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/images#neimg3001`

---

### NEIMG4001

**Image failed to load/decode**

**Status:** Assigned

**What it means**

Browser could not fetch/decode the source.

**Why it happens**

URL may return error, be blocked, be offline or contain unsupported data.

**Recommended action**

Inspect response and use a bounded onError fallback; avoid retry loops.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/images#neimg4001`

---

