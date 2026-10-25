# Nextjs Engine Documentation

Choose docs for the generation your project actually uses. The names and styling syntax overlap, but the rendering/compiler implementation differs.

## Choose your generation

| | Generation 2 | Generation 3 |
| --- | --- | --- |
| Version line | Stable v2.6.2 / `main-2` | Alpha v3.0.0-alpha.1 / `main-3` |
| Main model | Schema renderer + component registry | Compiler-produced execution plan + server-first renderer |
| Use it for | Existing v2 applications and maintenance | Evaluating or building against the Gen 3 alpha runtime |
| Start here | [Gen 2 overview](./2/index.md) | [Gen 3 overview](./3/index.md) |
| First page | [Gen 2 getting started](./2/getting-started.md) | [Gen 3 getting started](./3/getting-started.md) |
| Styling basics | [Gen 2 styling](./2/styling.md) | [Gen 3 styling](./3/styling.md) |
| Styling implementation | [Gen 2 detailed style contract](./2/detailed/styling-contract.md) | [Gen 3 detailed style contract](./3/detailed/styling-contract.md) |
| Components | [Gen 2 component reference](./2/components/index.md) | [Gen 3 component reference](./3/components/index.md) |
| Advanced internals | [Gen 2 architecture](./2/detailed/architecture.md) | [Gen 3 compiler internals](./3/detailed/compiler-internals.md) |

## How the levels work

- **Simple guides** focus on the task and the small set of APIs most readers need first.
- **Detailed references** explain the implementation, generated output, supported cases, edge cases, limits, and relevant source files.
- **Component references** describe component-specific props and behavior in more depth.
- **Release notes** are historical and describe a particular release; they do not override the current source-backed guide.

## Fact-check and version rule

The Generation 2 docs are sourced from `main-2` (package version `2.6.2`). The Generation 3 docs are sourced from `main-3` (package version `3.0.0-alpha.1`). Component pages and detailed references include explicit generation labels. When an implementation claim matters, check the source branch named at the top of that page. The archived combined reference is preserved under [docs/archive](./archive/combined-reference-before-split.md), but it mixes eras and is **not** the current API contract.

Avoid copying an example from one generation into the other without checking the target generation's index and migration notes.
