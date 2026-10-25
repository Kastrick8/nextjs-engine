# EngineLink

> **GENERATION 2 · STABLE 2.x** · Source branch: `main-2`.

EngineLink is the reusable anchor component used by schema links and direct React components. It centralizes internal routing, optional page transitions, click handlers, and styling.

## Choose the navigation behavior

- **External URL, `_blank`, or non-HTTP URI scheme:** renders a native anchor. External links default to a new tab and use `rel="noopener noreferrer"`.
- **Internal URL with a transition:** loads the EngineTransitions+ link component lazily and uses a normal Next.js link as the Suspense fallback.
- **Ordinary internal URL:** uses `next/link`, preserving the Next.js client router and prefetch behavior without loading the transition runtime.

## Schema example

```ts
{
  type: "link",
  props: {
    href: "/products",
    content: "Products",
    cprop: {
      link: { transition: "slide" },
    },
  },
}
```

The `cprop.link.href` value overrides the ordinary `href`; use `cprop.link.transition` to opt into an EngineTransitions+ preset.

## React example

```tsx
import { EngineLink } from "nextjs-engine";

export function ProductLink() {
  return (
    <EngineLink
      href="/products"
      cprop={{ link: { transition: "slide" } }}
    >
      Browse products
    </EngineLink>
  );
}
```

## Click handlers and styles

`onClick` accepts either a React mouse handler (direct React use) or a string handler name resolved from the nearest `EngineProvider` handlers map. Schema links normally use a name registered in `createPage({ handlers })`.

Style values are merged from `cprop.styles`, `cprop.link.styles`, and the component's explicit `style` object in that order, with `style` taking precedence. Standard Engine styling props and pseudo-state styles are supported.

## When to use EngineNav

Use `EngineLink` for an individual link. Use [EngineNav](./enginenav.md) when you need the navigation shell, responsive menu, logo, dropdown items, or active-route behavior. See [EngineTransitions+](./enginetransitions.md) for the supported transition presets.
