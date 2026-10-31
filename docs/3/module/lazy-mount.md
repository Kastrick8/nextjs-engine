# LazyMount and LazySection

`LazyMount` and `LazySection` provide explicit lazy activation for supported React/Engine content.

Use them when a large or non-critical subtree should not mount until it approaches or enters the viewport. They complement component-level lazy registry entries; they do not automatically defer arbitrary content without being applied.

## Typical intent

```tsx
import { LazyMount } from "nextjs-engine";

export function DeferredPanel() {
  return (
    <LazyMount>
      <ExpensiveInteractivePanel />
    </LazyMount>
  );
}
```

Check the exported prop type for the installed branch before relying on optional root margins, placeholders or activation callbacks. Pair lazy mounting with the relevant component module's own lifecycle documentation.

Related: [EngineImage](./engineimage.md), [EngineVideo](./enginevideo.md), [Runtime](../ne/runtime.md).
