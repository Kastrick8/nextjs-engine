# Security and diagnostic redaction

**Prefix:** `NESEC`  
**Scope:** Origin checks, identity/device proof, unsafe values and secret-safe reporting

## Code index

| Code | Diagnostic | Status |
|---|---|---|
| [NESEC2001](#nesec2001) | Request origin not allowed | Emitted |
| [NESEC2002](#nesec2002) | Identity/device proof rejected | Assigned |
| [NESEC4001](#nesec4001) | Untrusted value rejected | Emitted |
| [NESEC8001](#nesec8001) | Required crypto primitive unavailable | Emitted |

## Details

### NESEC2001

**Request origin not allowed**

**Status:** Emitted

**What it means**

A remote theme URL, host, redirect, or font stylesheet failed the public HTTPS and exact-origin allowlist policy.

**Why it happens**

Browser may be on another origin or caller may probe a private endpoint.

**Recommended action**

Use HTTPS on an explicitly allowed public origin. Do not allow redirects, private/local hosts, credentials, or wildcard origins.

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

**Status:** Emitted

**What it means**

Untrusted remote theme data contains a prohibited CSS/network primitive or violates the bounded declarative-data contract.

**Why it happens**

Value may be malformed or try to bypass a trust boundary.

**Recommended action**

Remove arbitrary global CSS and unsafe CSS values. Use bounded declarative tokens/templates and retain validation.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/security#nesec4001`

---

### NESEC8001

**Required crypto primitive unavailable**

**Status:** Emitted

**What it means**

Remote theme integrity verification cannot run without Web Crypto SHA-256.

**Why it happens**

Runtime may lack supported Web Crypto/Node API.

**Recommended action**

Use a supported secure runtime with Web Crypto. Do not skip digest verification.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/security#nesec8001`

---

