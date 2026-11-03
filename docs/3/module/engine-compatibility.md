# EngineCompatibility

EngineCompatibility evaluates browser capabilities required by a compiled Generation 3 page and resolves supported fallback strategies.

## Main capabilities

| API | Purpose |
|---|---|
| `detectEngineBrowserFeature()` | Detect an individual supported browser feature |
| `evaluateEngineBrowserCompatibility()` | Resolve a plan against a feature-support resolver |
| `resolveEngineBrowserCompatibility()` | Public compatibility resolver |
| `createEngineBrowserSupportResolver()` | Create a support resolver |
| `supportsEngineBrowserFeature()` | Query an individual feature |
| `EngineCompatibilityDialog` | Present a compatibility/update surface |

Capability families include Canvas/WebGL, animation APIs, viewport and observer APIs, CSS features, media, clipboard, speech and fetch.

## Required and optional features

A missing optional feature is not treated the same as a required feature without a viable fallback. The report includes issues that remain unavailable after the configured fallback strategies are considered.

See [NE compatibility and fallbacks](../ne/compatibility.md) for the planning flow and [EngineBrowser](./enginebrowser.md) for browser utility APIs.
