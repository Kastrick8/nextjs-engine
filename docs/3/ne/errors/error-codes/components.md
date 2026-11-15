# Schema and component contracts

**Prefix:** `NECMP`  
**Scope:** Schema validation, custom component registration, props and node identity

## Code index

| Code | Diagnostic | Status |
|---|---|---|
| [NECMP1001](#necmp1001) | Unknown component/schema node type | Emitted |
| [NECMP1002](#necmp1002) | Required component property missing | Emitted |
| [NECMP1003](#necmp1003) | Component property has an invalid value | Assigned |
| [NECMP1004](#necmp1004) | Malformed schema node | Emitted |
| [NECMP1005](#necmp1005) | Page schema is missing its root node | Emitted |
| [NECMP1006](#necmp1006) | Accessibility label or association is missing | Emitted |
| [NECMP1007](#necmp1007) | Component does not accept schema child nodes | Emitted |
| [NECMP1008](#necmp1008) | Schema tree exceeds complexity guidance | Emitted |
| [NECMP2001](#necmp2001) | Duplicate schema identity | Emitted |
| [NECMP2002](#necmp2002) | Circular schema reference | Emitted |
| [NECMP2003](#necmp2003) | Duplicate schema component name | Emitted |

## Details

### NECMP1001

**Unknown component/schema node type**

**Status:** Emitted

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

**Status:** Emitted

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

**Status:** Emitted

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

**Shared or circular schema object**

**Status:** Emitted

**What it means**

The same schema-node object appears in more than one tree position, including circular ancestor references.

**Why it happens**

Shared mutable node objects can make traversal/identity ambiguous; cycles can also cause non-terminating walks.

**Recommended action**

Create a distinct node object for each tree position and break ancestor cycles.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/components#necmp2002`

---


### NECMP1004

**Malformed schema node**

**Status:** Emitted

**What it means**

The analyzer received a child value that is not a schema-node object, or a node whose type is not a non-empty string.

**Why it happens**

Runtime data can come from parsed/generated input or untyped callers even when TypeScript authoring types would reject the shape.

**Recommended action**

Replace the malformed value with a plain SchemaNode object and give it a registered non-empty string type. The diagnostic path identifies the exact tree position.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/components#necmp1004`

---


### NECMP1005

**Page schema is missing its root node**

**Status:** Emitted

**What it means**

analyzeSchema() received a PageSchema without a usable root node.

**Why it happens**

The page factory/schema builder may have omitted root content or produced partial data.

**Recommended action**

Provide the intended root SchemaNode before compilation. For dynamic pages, validate the final assembled schema rather than an intermediate object.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/components#necmp1005`

---


### NECMP1006

**Accessibility label or association is missing**

**Status:** Emitted

**What it means**

The analyzer found an interactive node without accessible text/content or a control without an explicit id/point for label association.

**Why it happens**

The renderer cannot reliably expose meaningful interaction labels or associate a label with a control.

**Recommended action**

Add label/content/children to buttons and links, and add id/point plus the matching label association for inputs and checkboxes.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/components#necmp1006`

---


### NECMP1007

**Component does not accept schema child nodes**

**Status:** Emitted

**What it means**

A leaf-style runtime node has schema child nodes that the component does not render as nested schema content.

**Why it happens**

The node's contract handles content through its own props or asset renderer; nested schema children may be ignored.

**Recommended action**

Remove schema children or move them into a documented content prop/custom component that supports them.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/components#necmp1007`

---


### NECMP1008

**Schema tree exceeds complexity guidance**

**Status:** Emitted

**What it means**

A node has more than 100 direct children or the schema tree is deeper than 15 levels.

**Why it happens**

Large flat lists and deep trees can increase analysis, rendering and reconciliation work, especially on low-end devices.

**Recommended action**

Consider pagination/virtualization for large collections and flatten unnecessary nesting. These are advisories, not automatic compilation failures.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/components#necmp1008`

---


### NECMP2003

**Duplicate schema component name**

**Status:** Emitted

**What it means**

Two schema nodes share the same non-empty SchemaNode.name.

**Why it happens**

EngineMobilePatcher selectors match every node with the same name, so a patch may affect more nodes than intended.

**Recommended action**

Use unique names whenever a mobile patch should target exactly one component. Duplicates remain advisory because matching every node can be intentional.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/components#necmp2003`

---

