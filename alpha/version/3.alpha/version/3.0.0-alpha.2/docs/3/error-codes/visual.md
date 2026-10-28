# Visual runtime: Canvas, Shader, Manim, Scroll and transitions

**Prefix:** `NEVIS`  
**Scope:** Visual rendering, shaders, animation, scroll state and transition lifecycle

## Code index

| Code | Diagnostic | Status |
|---|---|---|
| [NEVIS1001](#nevis1001) | Visual node configuration invalid | Assigned |
| [NEVIS2001](#nevis2001) | Shader uniform/input invalid | Assigned |
| [NEVIS3001](#nevis3001) | Visual artifact compilation failed | Assigned |
| [NEVIS4001](#nevis4001) | Animation/transition callback failed | Assigned |
| [NEVIS4002](#nevis4002) | Scroll target/point unresolved | Assigned |
| [NEVIS8001](#nevis8001) | Browser graphics capability unavailable | Assigned |

## Details

### NEVIS1001

**Visual node configuration invalid**

**Status:** Assigned

**What it means**

A canvas/shader/animation/transition node has an unsupported option.

**Why it happens**

Value may be malformed or incompatible with the selected render mode.

**Recommended action**

Follow component-specific Gen 3 guide and public types.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/visual#nevis1001`

---

### NEVIS2001

**Shader uniform/input invalid**

**Status:** Assigned

**What it means**

Shader input cannot map into expected uniform representation.

**Why it happens**

Names/types may not match shader declarations.

**Recommended action**

Verify declared uniform names/types and compile a minimal shader.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/visual#nevis2001`

---

### NEVIS3001

**Visual artifact compilation failed**

**Status:** Assigned

**What it means**

A visual source could not produce the compiled representation.

**Why it happens**

Parse/lowering or dependent asset may have failed.

**Recommended action**

Fix earliest source diagnostic and verify compiler output independently.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/visual#nevis3001`

---

### NEVIS4001

**Animation/transition callback failed**

**Status:** Assigned

**What it means**

A visual callback threw during frame/transition work.

**Why it happens**

Application callback or cleanup may be faulty.

**Recommended action**

Inspect first source frame and cancel/dispose on navigation/unmount.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/visual#nevis4001`

---

### NEVIS4002

**Scroll target/point unresolved**

**Status:** Assigned

**What it means**

A timeline/scroll rule references unavailable target identity.

**Why it happens**

ID may be wrong or registration stale/unmounted.

**Recommended action**

Verify IDs and timing; cancel subscriptions when targets are removed.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/visual#nevis4002`

---

### NEVIS8001

**Browser graphics capability unavailable**

**Status:** Assigned

**What it means**

A visual path requires unsupported/disabled browser capability.

**Why it happens**

Graphics API/observer may be missing.

**Recommended action**

Use documented fallback plan and keep nonessential graphics optional.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/visual#nevis8001`

---

