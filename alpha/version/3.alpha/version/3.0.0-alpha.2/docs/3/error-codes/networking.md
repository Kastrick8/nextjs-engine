# NENC networking and private sessions

**Prefix:** `NENET`  
**Scope:** Command transport, session/CSRF checks, replay controls, backend requests and Web Crypto

## Code index

| Code | Diagnostic | Status |
|---|---|---|
| [NENET1001](#nenet1001) | NENC command payload malformed | Assigned |
| [NENET2001](#nenet2001) | Session/origin validation failed | Assigned |
| [NENET2002](#nenet2002) | Command rejected by replay/rate policy | Assigned |
| [NENET4001](#nenet4001) | Private command execution failed | Assigned |
| [NENET8001](#nenet8001) | Private backend request failed | Assigned |
| [NENET8002](#nenet8002) | Web Crypto unavailable | Assigned |

## Details

### NENET1001

**NENC command payload malformed**

**Status:** Assigned

**What it means**

Command endpoint received data outside the typed protocol envelope.

**Why it happens**

Caller may be stale or field type invalid.

**Recommended action**

Use matched client/server versions and documented payload schema.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/networking#nenet1001`

---

### NENET2001

**Session/origin validation failed**

**Status:** Assigned

**What it means**

Request failed origin/session requirements for private operation.

**Why it happens**

Session may be stale or same-origin credentials missing.

**Recommended action**

Restart supported flow and verify origin/credentials; don't disable CSRF validation.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/networking#nenet2001`

---

### NENET2002

**Command rejected by replay/rate policy**

**Status:** Assigned

**What it means**

Nonce/timestamp/replay/rate validation rejected the command.

**Why it happens**

Request may be duplicate, expired or above policy rate.

**Recommended action**

Generate fresh proof and respect retry windows; never bypass policy.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/networking#nenet2002`

---

### NENET4001

**Private command execution failed**

**Status:** Assigned

**What it means**

A command reached the handler but did not complete.

**Why it happens**

Business logic or downstream work may fail.

**Recommended action**

Use command ID and sanitized reason; never log proofs or tokens.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/networking#nenet4001`

---

### NENET8001

**Private backend request failed**

**Status:** Assigned

**What it means**

Engine-owned server request did not complete.

**Why it happens**

Endpoint may be unavailable, slow or return invalid shape.

**Recommended action**

Check health/timeouts and never expose private endpoint/auth details to clients.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/networking#nenet8001`

---

### NENET8002

**Web Crypto unavailable**

**Status:** Assigned

**What it means**

A required cryptographic API is missing.

**Why it happens**

Runtime or browser context may be unsupported.

**Recommended action**

Use supported secure context and fail closed rather than homemade crypto.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/networking#nenet8002`

---

