# EngineLink

> **GENERATION 3 · ALPHA** · Source branch: `main-3`.

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


## Props

| Prop | Type | Notes |
|---|---|---|
| `href` | `string` | Destination URL. `cprop.link.href`, when supplied, takes precedence. |
| `target` | `string` | Optional native anchor target. External destinations default to a new tab when no target is supplied. |
| `content` | `string` | Schema label content. In direct JSX, prefer normal `children`. |
| `children` | `ReactNode` | Direct React link contents. |
| `onClick` | handler name or `React.MouseEventHandler<HTMLAnchorElement>` | A string resolves through EngineProvider; a function is called as a React click handler. |
| `cprop` | Engine CPROP/link config | Supports link-level `href`, `transition`, and `styles`, plus general state styling. |
| `id` / `point` / `className` / `style` | inherited Engine node props | Identity and styling props from `BaseNodeProps`. |

## Click handlers and styles

`onClick` accepts either a React mouse handler (direct React use) or a string handler name resolved from the nearest `EngineProvider` handlers map. Schema links normally use a name registered in `createPage({ handlers })`.

Style values are merged from `cprop.styles`, `cprop.link.styles`, and the component's explicit `style` object in that order, with `style` taking precedence. Standard Engine styling props and pseudo-state styles are supported.

## External-link favicons

Generation 3 adds opt-in favicon props to EngineLink. Set `emd_show-url-icon` to `true` and optionally set `emd_url-icon-size` to a supported size. The favicon uses the Engine URL-icon asset path; this requires the combined plugin's NENC favicon route to be configured. Icons are off by default.

```tsx
<EngineLink href="https://github.com" emd_show-url-icon={true} emd_url-icon-size={18}>
  GitHub
</EngineLink>
```


## EngineUrlIcon direct component and helpers

`EngineUrlIcon` is the small decorative favicon component exported by Gen 3.

| Prop | Type | Notes |
|---|---|---|
| `href` | `string` | Required HTTP(S) destination used to resolve the favicon. Invalid or private/local destinations render no icon. |
| `size` | `EngineUrlIconSize` (`number \| "auto"`) | Defaults to `"auto"`; fixed sizes are rounded and clamped to 8–64 CSS pixels. `"auto"` follows the surrounding text size. |
| `className` | `string` | Optional image class. |
| `style` | `CSSProperties` | Optional inline image styles. |

```tsx
import { EngineUrlIcon } from "nextjs-engine";

<EngineUrlIcon href="https://github.com" size={18} />
```

The image is decorative (`alt=""`, `aria-hidden="true"`), lazy-loaded, and
served through Engine's same-origin NENC favicon asset route. The combined
Engine plugin must be enabled for that route.

The public helper signatures are:

```ts
type EngineUrlIconSize = number | "auto";

normalizeEngineUrlIconSize(
  size?: EngineUrlIconSize,
): number | "1em";

resolveEngineFaviconUrl(
  href: string,
  size?: EngineUrlIconSize,
): string | undefined;
```

`normalizeEngineUrlIconSize()` returns `"1em"` for `"auto"` and otherwise
returns the rounded 8–64 pixel value. `resolveEngineFaviconUrl()` returns the
provider-facing Google S2 favicon URL only for safe, credential-free HTTP(S)
destinations. It sends the normalized origin hostname rather than a URL path,
query, port, or fragment; invalid or private/local destinations return
`undefined`. Render `EngineUrlIcon` rather than inserting the provider URL
directly when you want the built-in same-origin asset path.

## When to use EngineNav

Use `EngineLink` for an individual link. Use [EngineNav](./enginenav.md) when you need the navigation shell, responsive menu, logo, dropdown items, or active-route behavior. See [EngineTransitions+](./enginetransitions.md) for the supported transition presets.
