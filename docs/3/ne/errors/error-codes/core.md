# Global reporting and Next.js boundaries

**Prefix:** `NECORE`  
**Scope:** Structured reports, route/global boundaries, request instrumentation and Node fatal exceptions

## Code index

| Code | Diagnostic | Status |
|---|---|---|
| [NECORE4000](#necore4000) | Unclassified Engine error | Emitted |
| [NECORE4001](#necore4001) | Route boundary caught an error | Emitted |
| [NECORE4002](#necore4002) | Root global boundary caught an error | Emitted |
| [NECORE4003](#necore4003) | Next.js server request failed | Emitted |
| [NECORE5001](#necore5001) | Node will terminate after uncaught exception | Emitted |
| [NECORE9001](#necore9001) | Reporter invariant violated | Reserved |

## Details

### NECORE4000

**Unclassified Engine error**

**Status:** Emitted

**What it means**

The public reporter was called without a narrower subsystem code.

**Why it happens**

The caller omitted context.code or supplied an undocumented value.

**Recommended action**

Inspect the first application-owned frame and assign a stable subsystem code. Custom application codes link to the book index until documented.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/core#necore4000`

---

### NECORE4001

**Route boundary caught an error**

**Status:** Emitted

**What it means**

The generated App Router error.tsx boundary caught a route-scoped exception.

**Why it happens**

A route component or route-owned render operation failed.

**Recommended action**

Fix the earliest application-owned frame, then retry. If it repeats, inspect the route providers and data dependencies.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/core#necore4001`

---

### NECORE4002

**Root global boundary caught an error**

**Status:** Emitted

**What it means**

The generated global-error.tsx boundary caught an unrecovered root-level failure.

**Why it happens**

The exception escaped narrower route handling or occurred in root layout/application work.

**Recommended action**

Inspect root layout and global providers; preserve the digest and verify normal routes after fixing the cause.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/core#necore4002`

---

### NECORE4003

**Next.js server request failed**

**Status:** Emitted

**What it means**

Next.js called onRequestError for a server request/render/action failure.

**Why it happens**

A server request operation threw while routing or rendering.

**Recommended action**

Use sanitized method/path and the first server frame. Inspect logs without adding headers, cookies or secret query values.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/core#necore4003`

---

### NECORE5001

**Node will terminate after uncaught exception**

**Status:** Emitted

**What it means**

The supplemental uncaughtExceptionMonitor saw a fatal exception before Node's default handler.

**Why it happens**

The exception escaped recovery; Node's normal fatal exit remains in control.

**Recommended action**

Fix the original exception. Do not suppress the crash just to keep an unhealthy process alive.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/core#necore5001`

---

### NECORE9001

**Reporter invariant violated**

**Status:** Reserved

**What it means**

The reporter reached a state contradicting its report contract.

**Why it happens**

An internal reporting path may have passed inconsistent data.

**Recommended action**

Keep the code, source, stack and runtime versions; report it as a likely Engine defect.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/core#necore9001`

---

