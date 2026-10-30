# Preparing a Generation 2 project for Generation 3

> **Scope:** A practical bridge from the stable `main-2` / 2.x line to the separate `main-3` Generation 3 alpha line. This page records only migration cases that the current Generation 3 development diagnostics explicitly detect.

Generation 3 is a new compiler-first architecture. A successful v2.7.0 upgrade does not automatically convert a project to Generation 3, and a feature not listed here is not automatically deprecated. Review the current Gen 3 guides and tests before migrating.

## Verified migration diagnostics

The following diagnostics are emitted by the current Gen 3 migration scanner during development (`npm run dev` / `ne dev`). They use the Gen 3 migration IDs below, not the Gen 2 CLI `NE####` codes.

| Code | Severity | Detected condition | What to do |
|---|---|---|---|
| `W3M001` | Warning | Legacy EngineAPI source/output layout is present | Keep `.EngineAPIConfig/*.api` as source; use the Gen 3 compiled output path shown below. |
| `E3M001` | Error | `RawComponentRenderer` is referenced | Replace it with a registered React component or render JSX inside an application-owned React component. |
| `E3M002` | Error | A schema node uses `type: "raw"` | Replace the raw node with a registered component node; do not place executable component code in schema data. |
| `W3M002` | Warning | `compiler.serverFirst: false` is selected in `createPage()` | Keep it only as a deliberate compatibility escape hatch; remove it when the page is ready for the Gen 3 server-first renderer. |
| `W3M003` | Warning | Named `handlers` are supplied to `createPage()` | This remains a compatibility path, not a removed API. Keep it while needed; use component/slot boundaries for fully server-first behavior. |

## EngineAPI generated-output path

Generation 3 keeps the API source files where they are:

```text
.EngineAPIConfig/*.api
```

The compiled provider configuration is written to:

```text
.nextjs-engine/config/.apiconfig.json
```

The old root-level `.engine-api-compiled.json` output is retired by the combined Gen 3 plugin. Do not rename or move the `.api` source folder simply because the generated output path changed. Continue editing the source `.api` files.

## Unsupported raw schema rendering

Generation 3 does not expose `RawComponentRenderer` or schema nodes with `type: "raw"` as public APIs. Replace these patterns with:

- `createComponent()` / `registerComponent()` for registered React components; or
- ordinary JSX inside an application-owned React component.

Do not move executable React component values into remote or serializable schema data.

## Legacy renderer compatibility

Setting `compiler.serverFirst: false` selects the Generation 2 client-renderer compatibility path. The scanner warns because this is not the default Generation 3 execution model. It is still an explicit migration escape hatch; it is not evidence that the setting has already been removed.

Named `handlers` in `createPage()` use the provider compatibility path because that contract assumes a shared client-owned handler registry. The API remains available, but it does not represent the normal server-first path. Prefer component-local callbacks/slots or other supported interaction boundaries when moving a page to full server-first rendering.

## Safe migration workflow

1. Upgrade or test against a pinned Generation 3 alpha in a separate branch; keep the stable Gen 2 application branch intact.
2. Run the application in development and fix the emitted migration errors first.
3. Review each warning individually. In particular, do not remove `.EngineAPIConfig/*.api` source files or compatibility settings blindly.
4. Run the Gen 3 migration, theme, browser and build checks for the exact source commit.
5. Recheck the current [Generation 3 migration guide](https://github.com/Kastrick8/nextjs-engine/blob/main-3/docs/3/migration-from-2x.md) and [Generation 3 Error Code Book](https://github.com/Kastrick8/nextjs-engine/tree/main-3/docs/3/error-codes) because the alpha contract can evolve.

## Diagnostic references

- [Full Generation 3 migration guide](https://github.com/Kastrick8/nextjs-engine/blob/main-3/docs/3/migration-from-2x.md)
- [Generation 3 Error Code Book](https://github.com/Kastrick8/nextjs-engine/tree/main-3/docs/3/error-codes/README.md)
- [Generation 2 NE CLI Error Book](./ne-cli-error-book.md)

The diagnostic list above is scoped to the rules currently implemented in `src/engine/plugins/gen3MigrationDiagnostics.js`; it is not a complete inventory of every behavioral difference between Gen 2 and Gen 3.
