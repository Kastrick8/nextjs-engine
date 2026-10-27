# Security and diagnostic redaction

**Prefix:** `NESEC`  
**Scope:** Origin checks, identity/device proof, unsafe values and secret-safe reporting

## Code index

| Code | Diagnostic | Status |
|---|---|---|
| [NESEC2001](#nesec2001) | Request origin not allowed | Assigned |
| [NESEC2002](#nesec2002) | Identity/device proof rejected | Assigned |
| [NESEC4001](#nesec4001) | Untrusted value rejected | Assigned |
| [NESEC8001](#nesec8001) | Required crypto primitive unavailable | Assigned |

## Details

### NESEC2001

**Request origin not allowed**

**Status:** Assigned

**What it means**

Request origin failed same-origin/allowlist policy.

**Why it happens**

Browser may be on another origin or caller may probe a private endpoint.

**Recommended action**

Verify origin and configure only explicit trusted origins.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/security#nesec2001`

---

### NESEC2002

**Identity/device proof rejected**

**Status:** Assigned

**What it means**

A private operation could not verify required proof.

**Why it happens**

Proof may be expired, malformed, replayed or bound to another session.

**Recommended action**

Restart supported flow; inspect non-secret metadata only.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/security#nesec2002`

---

### NESEC4001

**Untrusted value rejected**

**Status:** Assigned

**What it means**

Input/output failed URL/path/schema/safe-output validation.

**Why it happens**

Value may be malformed or try to bypass a trust boundary.

**Recommended action**

Correct input while retaining validation/escaping; don't disable security checks.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/security#nesec4001`

---

### NESEC8001

**Required crypto primitive unavailable**

**Status:** Assigned

**What it means**

Private work cannot run without required crypto.

**Why it happens**

Runtime may lack supported Web Crypto/Node API.

**Recommended action**

Use a supported runtime and fail closed.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/security#nesec8001`

---

