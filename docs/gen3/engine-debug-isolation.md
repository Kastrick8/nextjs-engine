# EngineDebug ephemeral isolation

`/_engine/debug` is a development-only Engine route. It must behave like an Engine-owned workbench even when the host Next.js application has a global root layout with headers, footers, cookie banners, portals, analytics UI, or aggressive global CSS.

## Why isolation is required

Next.js App Router root layouts always wrap nested pages. A generated `app/%5Fengine/debug/page.tsx` therefore cannot structurally opt out of an application's `app/layout.tsx`.

EngineDebug solves this at the client boundary instead of requiring every application to special-case `/_engine/*`.

## Isolation contract

The generated debug route wraps the workbench in `EngineDebugIsolation`.

During the first server paint, a bootstrap surface covers the viewport and suppresses sibling host chrome along the route's ancestor chain.

After hydration, EngineDebug:

- creates a dedicated host directly under `document.body`;
- mounts the workbench into a Shadow DOM root through a React portal;
- hides and marks every other direct body surface inert and `aria-hidden`;
- watches for later body-level portals and suppresses them as they are added;
- applies maximum-priority fixed positioning to the debug host;
- prevents host global CSS from crossing into the workbench through Shadow DOM;
- restores all previous `inert`, `aria-hidden`, focus, and document state when the route unmounts.

This keeps host headers, footers, cookie portals, floating widgets, and unrelated overlays out of the EngineDebug UI without depending on application class names.

## Preview behavior

Isolation applies to the **debug workbench**, not to the page being inspected inside its preview iframe.

If the selected application route legitimately renders its own navigation, cookie notice, modal, or footer, that UI remains visible inside the preview. Removing it would make the preview inaccurate.

The outer `/_engine/debug` workbench itself must not inherit those surfaces.

## What isolation does not claim

The App Router parent layout has already been instantiated before a nested page can run. EngineDebug therefore cannot prevent arbitrary host React effects, analytics calls, or server work from having executed.

The isolation contract is specifically that host UI cannot render into, style, cover, focus, or accept input over the EngineDebug workbench. Applications that want to avoid even mounting expensive host effects may additionally short-circuit `/_engine/*` in their own root chrome, but that is an optional optimization rather than a correctness requirement.

## Production invariant

`EngineDebugIsolation` is reachable only from the generated development route. Production preparation removes `app/%5Fengine/debug/page.tsx` before route discovery, and the production proof rejects both EngineDebug UI markers and the isolation marker from emitted server/client bundles.

## Development error inspector

The workbench's **Errors** view captures diagnostics from its same-origin preview while the workbench is open:

- uncaught browser runtime errors and unhandled promise rejections;
- calls to the preview frame's `console.error`, including common React hydration mismatch messages;
- visible Next.js development error overlay text when it can be read from the preview DOM or overlay shadow root.

The inspector keeps a bounded, in-memory history (up to 200 items), coalesces adjacent repeats, redacts common credential-shaped text, and can copy a selected diagnostic. It does not upload reports or modify application source.

**Likely owner is a hint, not a verdict.** Paths and stack traces that point into Engine source are marked *Likely NE source*; app/page/component paths are marked *Likely application code*; React/Next frames receive a framework hint. Always confirm the relevant stack and reproduce before filing an Engine bug or changing application code.

This is a browser-side collector, not a replacement for the Next.js dev overlay or terminal. Server exceptions that happen before the preview sends a usable document, process-level build errors, and diagnostics hidden in a cross-origin or inaccessible frame may only be visible in Next.js' own overlay/terminal output. Captured messages are intentionally bounded and redacted heuristically; treat copied diagnostic details as potentially sensitive before sharing them.

The workbench layout uses a compact, VS Code-inspired dark workspace: activity rail, route explorer, live preview, and an Errors/Node/Scheduler/Device inspector. The editor styling is confined to the development-only workbench and does not change application UI.
