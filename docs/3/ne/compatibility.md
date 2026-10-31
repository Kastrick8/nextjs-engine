# Browser Compatibility and Fallbacks

Generation 3 records browser capabilities used by a compiled page and resolves a fallback plan before reporting a required unsupported feature.

## Flow

```text
compiled used-feature manifest
        ↓
capability detection
        ↓
fallback strategy resolution
        ↓
compatibility report
        ↓
optional compatibility dialog / update recommendation
```

The capability detector covers features such as DOM, Canvas/WebGL, requestAnimationFrame, IntersectionObserver, VisualViewport, View Transitions, Web Animations, CSS container queries, media queries, clipboard, media, speech and fetch/network support.

## Required versus optional

A missing optional feature does not have the same consequence as a required feature without a viable fallback. The compatibility report identifies required features that remain unavailable after fallback resolution.

## Related

- [EngineCompatibility module](../module/engine-compatibility.md)
- [Compiler](./compiler/index.md)
- [Existing compatibility, debugging and hardening reference](../compatibility-debugging-hardening.md)
