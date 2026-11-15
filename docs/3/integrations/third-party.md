# Third-party libraries and framework interoperability — Generation 3

> **Generation 3 · Alpha** · Package ranges below are taken from the `main-3` package manifest.

## Framework baseline

| Package | Declared range | Role |
|---|---:|---|
| `next` | `^16.3.3` | Next.js framework and build/runtime integration |
| `react` | `^19.0.0` | React component runtime |
| `react-dom` | `^19.0.0` | DOM renderer |
| `next-view-transitions` | `^0.3.5` | View-transition integration |
| `three` | `^0.184.0` | Three.js-backed graphics |
| `two.js` | `^0.8.23` | 2D animation/rendering dependency |
| `react-markdown` | `^10.1.0` | EngineMarkdown's Markdown renderer dependency |
| `remark-gfm` | `^4.0.1` | GitHub-Flavored Markdown extensions used by EngineMarkdown |

These are the ranges declared by this source branch, not a blanket compatibility guarantee for every later major release. The actual resolved versions are determined by the package snapshot/lockfile. Verify the exact versions in the installed Engine build before debugging or overriding a dependency.

## React and Next.js composition

Keep normal Next.js layouts, Server Components, Client Components, route handlers, server data access, native HTML, hooks, and third-party React components. Use `createPage()` for a fully Engine-schema route and `createComponent()` to embed schema-driven content in an ordinary JSX tree. Generation 3's `createComponent({ mode: "custom" })` also adapts a trusted local React component to a schema node contract.

Do not cross the server/client boundary with private credentials, non-serializable values, or server-only functions. Hooks, state, browser APIs, and event handlers belong in Client Components. See [React/JSX integration](./react-and-jsx.md), [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components), and [React Server Components](https://react.dev/reference/rsc/server-components).

## Engine-owned dependencies

- **Three.js** backs the Engine 3D renderer. Begin with [EngineCanvas](../module/enginecanvas.md) and [Engine3D](../module/engine3d.md); direct Three.js resources still need correct lifecycle/disposal handling.
- **Two.js** is part of the Engine animation dependency set. See [EngineManim](../module/enginemanim.md).
- **next-view-transitions** supports the Engine transition integration. See [EngineTransitions+](../module/enginetransitions.md) and avoid layering competing navigation/transition managers over the same route without deliberate testing.
- **react-markdown** and **remark-gfm** support the Gen 3 EngineMarkdown renderer. This dependency pair is not declared by the Gen 2 package manifest, so don't assume the same renderer internals or GFM behavior on 2.x.

The Engine manifest includes these dependencies for Engine's implementation. Applications do not need to import an implementation dependency directly unless they intentionally use that package's API.

## Existing identity providers and server libraries

Auth.js, Clerk, Supabase Auth, database clients, observability packages, analytics, payment SDKs, and ordinary React UI libraries remain application-level choices. Engine does not bundle turnkey adapters for them. For private operations, connect the provider's server-side identity/session lookup to your Route Handler or NENC `resolveSession`/authentication policy; see [Authentication and authorization](./authentication-and-authorization.md).

Official references: [Auth.js](https://authjs.dev/getting-started) · [Clerk for Next.js](https://clerk.com/docs/nextjs/getting-started/quickstart) · [Supabase Auth SSR](https://supabase.com/docs/guides/auth/server-side).

## Upstream references

- [Next.js documentation](https://nextjs.org/docs)
- [React documentation](https://react.dev/)
- [Three.js documentation](https://threejs.org/docs/)
- [Two.js documentation](https://two.js.org/)
- [react-markdown](https://github.com/remarkjs/react-markdown)
- [remark-gfm](https://github.com/remarkjs/remark-gfm)
- [next-view-transitions package](https://www.npmjs.com/package/next-view-transitions)

Treat upstream APIs as versioned external contracts. A dependency upgrade can require changes in Engine or application integration even when the Engine's own API has not changed.
