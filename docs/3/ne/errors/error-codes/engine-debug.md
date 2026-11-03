# EngineDebug workbench and preview

**Prefix:** `NEDEBUG`  
**Scope:** Dev route discovery, preview navigation, source mapping and production isolation

## Code index

| Code | Diagnostic | Status |
|---|---|---|
| [NEDEBUG1001](#nedebug1001) | EngineDebug route absent | Assigned |
| [NEDEBUG2001](#nedebug2001) | Diagnostic payload invalid | Assigned |
| [NEDEBUG4001](#nedebug4001) | Preview navigation failed | Assigned |
| [NEDEBUG4002](#nedebug4002) | Source location could not be mapped | Assigned |
| [NEDEBUG5001](#nedebug5001) | Development debugger present in production output | Assigned |

## Details

### NEDEBUG1001

**EngineDebug route absent**

**Status:** Assigned

**What it means**

Development workbench route was requested where not installed.

**Why it happens**

Production prep intentionally strips the dev-only route.

**Recommended action**

Use `next dev`; don't re-add the workbench to production.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/engine-debug#nedebug1001`

---

### NEDEBUG2001

**Diagnostic payload invalid**

**Status:** Assigned

**What it means**

Inspector received an unexpected event/diagnostic shape.

**Why it happens**

Stale HMR or mismatched build metadata may produce partial data.

**Recommended action**

Reload and reproduce; never invent a missing source location.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/engine-debug#nedebug2001`

---

### NEDEBUG4001

**Preview navigation failed**

**Status:** Assigned

**What it means**

Preview could not navigate to or render selected route.

**Why it happens**

Route itself may fail or session/origin limits may block preview.

**Recommended action**

Open route directly in another tab to separate app failure from preview failure.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/engine-debug#nedebug4001`

---

### NEDEBUG4002

**Source location could not be mapped**

**Status:** Assigned

**What it means**

A stack frame could not be associated with editable source.

**Why it happens**

Source maps may be absent or frame may refer to bundled code.

**Recommended action**

Inspect full stack/build metadata; do not guess the path.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/engine-debug#nedebug4002`

---

### NEDEBUG5001

**Development debugger present in production output**

**Status:** Assigned

**What it means**

A module expected to be stripped appears in production output.

**Why it happens**

This violates the production-absence contract.

**Recommended action**

Treat as release blocker; inspect production preparation and bundle proof.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/engine-debug#nedebug5001`

---

