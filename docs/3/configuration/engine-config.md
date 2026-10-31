# Engine Configuration

Engine configuration is passed to `createPage({ config })`. It is separate from project-level Next.js plugin configuration and from external provider files in `.EngineAPIConfig`.

## Responsive breakpoints

Generation 3's style compiler resolves supported responsive props to CSS variables and media rules. The default named breakpoints are:

| Name | Minimum width |
|---|---:|
| `xs` | 0px |
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

Override named values through the page config:

```tsx
export default createPage({
  schema,
  config: {
    breakpoints: {
      md: 800,
      lg: 1100
    }
  }
});
```

Only supplied breakpoint values are changed; other defaults remain. Responsive object support is property-specific, so check the [Styling module](../module/styling.md) before assuming every prop supports breakpoints.

## Page options are not global project config

Options such as `handlers`, `slots`, `mobile`, `tablet`, `compiler` and `registry` belong to the `createPage()` call. They are not `next.config.js` plugin options.

## Compiler options

| Option | Purpose |
|---|---|
| `strict` | Strict compiler diagnostics where supported |
| `pageId` | Stable page identifier for compiler metadata |
| `serverFirst` | Temporarily disable the server-first path when migrating/debugging |

Use `serverFirst: false` only as an explicit compatibility measure. See [Compiler documentation](../ne/compiler/index.md) for its effect on rendering ownership.

## Related configuration

- [EngineAPIResolver](./engine-api.md)
- [APIStatic](./api-static.md)
- [NE-CLI](../ne/cli/index.md)
