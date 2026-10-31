# Evidence Ledger — Generation 2

| Claim | Source | Status | Consequence |
|---|---|---|---|
| Public contract is the named exports from the root barrel. | `src/engine/index.ts` | Verified | Complete names listed in API exports page. |
| Server entrypoint only exposes device helpers/types. | `src/engine/server.ts` | Verified | Do not document Gen 3 EngineServer/CORS/NENC here. |
| `ensureAPIConfig()` loads `.EngineAPIConfig/*.api` when no injected config exists. | `src/engine/core/EngineAPIConfigParser.ts` | Verified | JSON plugin output is a separate build artifact. |
| Gen 2 normal HTTP request bodies use `formData`. | `src/engine/core/EngineAPIResolver.ts` | Verified | Use formData in ordinary HTTP examples. |
| For a static descriptor, APIResolver forwards `input` to APIStatic and falls back to formData. | `src/engine/core/EngineAPIResolver.ts` | Verified | Explain the special input case separately. |
| APIStatic loads hashed browser modules through a manifest. | `src/engine/core/APIStatic.ts` | Verified | Route files are public browser code. |
| Gen 2 Engine plugin composes API and shader plugins. | `src/engine/plugins/enginePlugin.js` | Verified | Exclude Gen 3 plugin options. |
| Gen 2 page rendering is provider/schema renderer based. | `src/engine/createPage.tsx`, `src/engine/core/SchemaRenderer.tsx` | Verified | Do not claim server-first compiler behavior. |

No secrets, environment values or private user data are stored.
