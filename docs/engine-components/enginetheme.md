# EngineTheme

**Status:** Initial implementation foundation. Theme rendering, Pretty-please, the Data-API, UI templates, remote fetching, and production font handling are separate pending phases.

EngineTheme is the data-driven theming layer for Next.js Engine. The initial implementation exposes createTheme() and compiles statically declared theme groups to .etr artifacts.

## Define a theme group

~~~ts
import { createTheme } from "nextjs-engine";

export const darkFantasy = createTheme({
  id: "dark-fantasy",
  scope: "global",
  name: "Dark Fantasy",
  tokens: {
    colors: {
      surface: "#18181B",
      text: "#F4F4F5"
    }
  },
  markdown: {
    prettyPlease: {
      mode: "auto"
    },
    table: {
      header: {
        placement: "left"
      }
    }
  }
});
~~~

The root ID names a theme group and must currently be a single safe segment: letters, digits, underscores, and hyphens. A theme can declare component data directly under keys such as markdown; shared data can be placed under tokens.

Scope values are local, global, and remote. The scope is metadata at this foundation stage; the final runtime behavior and remote-resolution configuration remain under development.

createTheme() validates a JSON-only definition, clones it once, and freezes the returned data. It does not perform network requests, publish a theme, fetch fonts, or evaluate code. Function values, cycles, accessors, unsafe object keys, non-finite numbers, excessive nesting, and oversized definitions are rejected.

## Theme IDs

parseEngineThemeId() parses a group or qualified component/theme ID:

- dark-fantasy — group
- dark-fantasy.markdown — component theme
- dark-fantasy.markdown.dark — variant
- dark-fantasy.markdown.1.2.560 — three nested subtheme segments

A qualified ID allows one component segment and up to three subtheme segments after the group name. Runtime lookup and variant inheritance are not yet wired; the parser establishes the public grammar for those later steps.

## Generated .etr artifacts

NENC extracts statically resolvable createTheme({...}) calls during its Gen 3 source pass. Generated files are written to:

~~~text
.nextjs-engine/gen3/theme/<theme-id>.etr
~~~

The .etr file is UTF-8 JSON. Its initial envelope contains a format identifier/version, generatedBy, group ID, the Next.js/Engine versions used to create it, a content object with the theme definition, and a SHA-256 checksum over canonical JSON of the payload excluding the checksum field.

The compiler resolves literal values and local static constants. It deliberately rejects computed expressions, function calls, spreads, accessors, and functions in a theme definition rather than running them to discover the resulting data. Theme group IDs are validated before being used as filenames. Existing files that are not recognized as NENC-generated artifacts are never overwritten. A small ignored manifest tracks compiler-owned artifacts so stale generated files can be safely removed. Identical outputs are left untouched to preserve timestamps and avoid unnecessary disk writes.

Remote .etr files are intended to remain data-only. Generation does not imply that a file has been published or that remote fetching is enabled.

## Current implementation boundaries

Implemented in the current foundation:

- Public TypeScript exports for createTheme and parseEngineThemeId.
- Data-only definition validation with bounded nesting, node count, and serialized size.
- Static NENC extraction, deterministic canonical serialization, SHA-256 generation, incremental no-rewrite behavior, and guarded stale-artifact cleanup.
- Focused smoke tests via npm run test:theme.

Not implemented yet:

- Resolving theme IDs inside rendered PageSchema/EngineMarkdown output.
- Pretty-please syntax highlighting or a highlighter/provider registry.
- The event-driven Data-API and named UI templates.
- Remote URL mapping/fetching and runtime compatibility enforcement.
- Production font download, cache, and URL rewriting.

Those remain explicit follow-up phases; this document does not claim the full EngineTheme feature set is complete.
