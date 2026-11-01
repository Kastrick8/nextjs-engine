# Third-party libraries and framework interoperability — Generation 2

> **Generation 2 · Stable 2.x** · The versions below are the ranges declared by the `main-2` package manifest, not a promise that every possible combination has been tested.

## Framework baseline

The Gen 2 source manifest declares:

| Package | Declared range | Role |
|---|---:|---|
| `next` | `^16.3.3` | Next.js framework and routing/build integration |
| `react` | `^19.0.0` | React component runtime |
| `react-dom` | `^19.0.0` | DOM renderer |
| `next-view-transitions` | `^0.3.5` | View-transition integration used by the transition system |
| `three` | `^0.184.0` | Three.js-backed 3D rendering |
| `two.js` | `^0.8.23` | 2D animation/rendering dependency |

The exact resolved versions come from the consuming project's lockfile/package snapshot. Check the installed package version and lockfile when diagnosing a compatibility issue; do not infer that every newer major release is supported.

## Keep the rest of your React ecosystem

Engine is not a replacement for React or the Next.js router. Existing React components, form libraries, charting packages, CSS Modules, Tailwind utilities, design systems, data clients, and application state can remain in the project. Compose normal JSX with Engine-created regions using [React/JSX integration](./react-and-jsx.md).

For App Router applications, preserve the Server/Client Component boundary: server-side data access and secrets belong on the server; hooks, browser APIs, and interactive event handlers belong in Client Components. Follow the framework's current rules for serializable props and client module imports.

## Engine-owned third-party dependencies

- **Three.js** is used by the 3D graphics path. Start with the [EngineCanvas](../module/enginecanvas.md) and [Engine3D](../module/engine3d.md) references before interacting with the underlying renderer.
- **Two.js** is part of the animation dependency set used by Engine's animation support. See [EngineManim](../module/enginemanim.md).
- **next-view-transitions** is part of the transition integration. See [EngineTransitions+](../module/enginetransitions.md). Avoid layering two independent navigation/transition systems over the same links without testing their interaction.

These dependencies are Engine implementation dependencies; applications do not need to import them just to use ordinary Engine components.

## Authentication products are application-owned

Auth.js, Clerk, Supabase Auth, and similar products are not included in the Gen 2 manifest as Engine authentication adapters. They can continue to own account login and sessions. Connect them to application-owned Route Handlers and perform authorization server-side; see [Authentication and authorization](./authentication-and-authorization.md).

Official references: [Next.js App Router authentication tutorial](https://nextjs.org/learn/dashboard-app/adding-authentication) · [Auth.js](https://authjs.dev/getting-started) · [Clerk for Next.js](https://clerk.com/docs/nextjs/getting-started/quickstart) · [Supabase Auth SSR](https://supabase.com/docs/guides/auth/server-side).

## Related framework references

- [Next.js documentation](https://nextjs.org/docs)
- [Next.js Server and Client Components](https://nextjs.org/learn/react-foundations/server-and-client-components)
- [React Server Components](https://react.dev/reference/rsc/server-components)
- [React documentation](https://react.dev/)

Check upstream documentation for the exact package version in your lockfile. Next.js and React have their own versioning and rendering constraints; Engine does not remove them.
