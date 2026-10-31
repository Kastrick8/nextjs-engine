# Global error handling (Generation 3)

> **Generation 3 · alpha** — applies to projects using the combined `withEngine()` Next.js plugin.

## What is installed

During Next.js configuration, the Engine creates default `error.tsx`, `global-error.tsx`, and `instrumentation.ts` entry points when the corresponding files are absent. Every generated file starts with an ownership marker; the plugin updates its own generated files but never overwrites a user-owned file.

`instrumentation.ts` uses Next.js `onRequestError` to report server-side route/render/action errors and `register()` installs a Node `uncaughtExceptionMonitor`. Generated boundaries and the request hook use stable `NECORE` codes from the [Generation 3 Error Code Book](./error-codes/README.md). That monitor prints a structured summary before Node's default fatal-error handler runs. It deliberately does not install an `uncaughtException` handler, suppress the crash, or change Node's normal exit behavior.

## Terminal and VS Code diagnostics

Terminal output is separate from the EngineDebug UI. In a color-capable interactive terminal, the reporter colors the severity/code, message, metadata labels, and cause chain with ANSI styles. It respects `NO_COLOR`, `NODE_DISABLE_COLORS`, `FORCE_COLOR`, and dumb-terminal settings, so CI logs and redirected output remain plain text unless color is explicitly forced.

Reports use a stable code, source, message, route/request context, and a source location when the stack provides one. Source locations use `path/to/file.tsx:line:column`, which VS Code-compatible terminals can open with Ctrl+Click. Nested `Error.cause` chains are printed as `Caused by` lines. The final Project line links to the Kastrick website project page and prints its full URL for terminals that auto-link web addresses.

Secrets are filtered from messages, stack text, URL query values, and error causes. Request headers and cookies are not logged.

Example (colors omitted here):

~~~text
[nextjs-engine][ERROR NECORE4003] TypeError: Cannot read properties of undefined
  Source: next-request
  Where: app/guide/page.tsx:42:17
         Open the file at this line/column in your editor (Ctrl+Click in supported terminals).
  Route: /guide
  Request: GET /guide
  Caused by: TypeError: ...
  Help: Error Book · NECORE4003 — https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/core#necore4003
  Project: Kastrick · Website — https://kastrick.vercel.app/project/nextjs-engine
~~~

Development route boundaries show the useful error message; production UI shows a digest/reference instead of a stack. Detailed server errors remain in server logs. `NEXTJS_ENGINE_ERROR_MONITOR=off` disables the supplemental Node fatal-error monitor.

## Report errors from Engine code or application code

The public reporter is also available to explicit catch blocks, plugins, and custom error boundaries:

~~~ts
import { reportEngineError } from "nextjs-engine";

try {
	await loadWorkspaceData();
} catch (error) {
	reportEngineError(error, {
		code: "APP-WORKSPACE-001",
		source: "application",
		route: "/workspace",
	});
	// Decide here whether the operation should recover or rethrow.
}
~~~

`reportEngineError()` logs a structured record and dispatches the browser-only `engine:error` event. It returns the report and does not throw. It intentionally does not decide whether an expected application error should be recovered or rethrown.

## Existing custom files

If a project already owns `app/error.tsx`, `app/global-error.tsx`, or `instrumentation.ts`, those files are preserved. In development the Engine emits a warning naming the file and explaining that automatic integration was skipped. Add `reportEngineError()` in your custom boundary or `onRequestError` hook to opt in without giving the Engine ownership of your application code.

## Boundaries and verification

Next.js route/global error boundaries cover render failures in their boundary scope; `onRequestError` covers server request errors. The Node monitor observes uncaught fatal exceptions without swallowing them. Expected errors, event-handler failures, errors in detached asynchronous work, and errors from a custom boundary itself still need appropriate `try/catch`, an error boundary, or an explicit call to `reportEngineError()`.

Run `npm run test:error-handling` and `npm run test:error-book` for the focused reporter and Error Book tests. The regular Generation 3 CI job also type-checks and builds the Next.js integration app.

See the [Generation 3 Error Code Book](./error-codes/README.md), [Generation 3 documentation](./index.md), [migration from Gen 2](./migration-from-2x.md), and the [Kastrick Nextjs Engine project page](https://kastrick.vercel.app/project/nextjs-engine).
