# Schema and component contracts

**Prefix:** `NECMP`  
**Scope:** Schema validation, custom component registration, props and node identity

## Code index

| Code | Diagnostic | Status |
|---|---|---|
| [NECMP1001](#necmp1001) | Unknown component/schema node type | Assigned |
| [NECMP1002](#necmp1002) | Required component property missing | Assigned |
| [NECMP1003](#necmp1003) | Component property has an invalid value | Assigned |
| [NECMP2001](#necmp2001) | Duplicate schema identity | Assigned |
| [NECMP2002](#necmp2002) | Circular schema reference | Assigned |

## Details

### NECMP1001

**Unknown component/schema node type**

**Status:** Assigned

**What it means**

A node names a component absent from the active registry.

**Why it happens**

The type may be misspelled, legacy-only or custom but unregistered.

**Recommended action**

Use the Gen 3 component reference and register custom components before compile.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/components#necmp1001`

---

### NECMP1002

**Required component property missing**

**Status:** Assigned

**What it means**

A node omitted a prop required by its component contract.

**Why it happens**

An untyped input may pass TS but not provide required render data.

**Recommended action**

Check the component props table and supply the required value.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/components#necmp1002`

---

### NECMP1003

**Component property has an invalid value**

**Status:** Assigned

**What it means**

A prop does not match its documented type or accepted range.

**Why it happens**

Callback/string handler or scalar/responsive prop forms may have been confused.

**Recommended action**

Use the installed generation's public types and validate dynamic values rather than silencing errors with any.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/components#necmp1003`

---

### NECMP2001

**Duplicate schema identity**

**Status:** Assigned

**What it means**

Two nodes reuse an ID that must be unique in scope.

**Why it happens**

Compiler metadata, reconciliation or debugger selection may become ambiguous.

**Recommended action**

Use stable unique IDs and ensure server/client IDs match.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/components#necmp2001`

---

### NECMP2002

**Circular schema reference**

**Status:** Assigned

**What it means**

A schema object recursively references itself where a tree is expected.

**Why it happens**

Traversal/serialization may not terminate or may emit inconsistent output.

**Recommended action**

Break the cycle and construct an immutable schema tree.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/components#necmp2002`

---

