# EngineMarkdown

**Prefix:** `NEMD`  
**Scope:** Markdown parsing, GFM, server rendering, highlighting and link decoration

## Code index

| Code | Diagnostic | Status |
|---|---|---|
| [NEMD1001](#nemd1001) | Markdown input/options invalid | Assigned |
| [NEMD1002](#nemd1002) | Custom Markdown block malformed | Assigned |
| [NEMD2001](#nemd2001) | Markdown option unsupported in this path | Assigned |
| [NEMD3001](#nemd3001) | Server Markdown rendering failed | Assigned |
| [NEMD8001](#nemd8001) | Syntax highlighter unavailable | Assigned |
| [NEMD8002](#nemd8002) | Markdown link icon unavailable | Assigned |

## Details

### NEMD1001

**Markdown input/options invalid**

**Status:** Assigned

**What it means**

Renderer received an unsupported source or option shape.

**Why it happens**

Input may be non-string or option may not match current render path.

**Recommended action**

Validate input/props and use extensions supported by the Gen 3 guide.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/markdown#nemd1001`

---

### NEMD1002

**Custom Markdown block malformed**

**Status:** Assigned

**What it means**

A table/info/code template has invalid fields.

**Why it happens**

Required fields may be missing or the template schema mismatched.

**Recommended action**

Reduce to the smallest failing block and compare with the documented template contract.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/markdown#nemd1002`

---

### NEMD2001

**Markdown option unsupported in this path**

**Status:** Assigned

**What it means**

A parser/highlighter option is unavailable in the current runtime path.

**Why it happens**

It may be a Gen 2 option or require browser-only work during server render.

**Recommended action**

Use the versioned guide or move browser-only work into a supported client component.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/markdown#nemd2001`

---

### NEMD3001

**Server Markdown rendering failed**

**Status:** Assigned

**What it means**

EngineServerRenderer threw while rendering a Markdown node or collecting styles.

**Why it happens**

Parser plugin, template or nested component may have thrown.

**Recommended action**

Inspect the node path and first cause; add extensions one at a time to isolate.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/markdown#nemd3001`

---

### NEMD8001

**Syntax highlighter unavailable**

**Status:** Assigned

**What it means**

Requested grammar/theme could not be loaded.

**Why it happens**

A dependency/language theme may be missing or unsupported.

**Recommended action**

Fall back to plain code rendering and verify package/language support.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/markdown#nemd8001`

---

### NEMD8002

**Markdown link icon unavailable**

**Status:** Assigned

**What it means**

A domain favicon/decorative asset could not be resolved.

**Why it happens**

Remote site may refuse icons or network may be unavailable.

**Recommended action**

Keep text link usable; an icon must not block page rendering.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/markdown#nemd8002`

---

