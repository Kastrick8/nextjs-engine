# Generation 3 — Compiler Basics

> **Generation:** 3 · **Version:** v3.0.0-alpha.1 · **Level:** Simple explanation

The Generation 3 compiler reads the page schema and creates a structured plan before rendering. The plan gives the Engine information about the work the page needs, rather than treating every node as work that must run in the browser immediately.

## What the compiler records

- **Runtime ownership:** whether a node can be static, server-rendered, or needs browser behavior.
- **Work class:** whether client work is critical, visible, near, deferred, idle, or sleeping.
- **Feature manifest:** which browser/rendering capabilities the compiled page uses.
- **Assets:** known asset requirements and their relationships.
- **Fallback plan:** how the runtime should respond when a needed browser feature is unavailable.
- **Diagnostics:** validation and source information used by developer tooling.

## What it does not do

The Engine compiler does not replace Next.js. Next.js still handles the application build and bundle generation. The Engine compiler handles the Engine's schema model and execution plan inside that application.

A compiler plan also does not guarantee that every page becomes faster. Actual results depend on the page schema, browser features, assets, network and runtime work.

## Read next

- [Detailed compiler internals](./detailed/compiler-internals.md) describes the source files and plan.
- [Compiler and scheduler](./detailed/compiler-and-scheduler.md) explains phases A and B.
- [Compatibility and hardening](./detailed/compatibility-and-hardening.md) explains the used-feature manifest and fallbacks.
