# NE CLI — Generation 2

**Generation:** 2.x  
**Introduced:** v2.7.0  
**Executable:** `ne`  
**Source:** `bin/ne.js` and `bin/ne-cli/`

The NE CLI was introduced to the Generation 2 package in v2.7.0. It provides project commands for development, builds, checks, cleanup, channel updates, and rollback.

> **New CLI notice:** The NE CLI is newly introduced in v2.7.0. Its commands and behavior may change, and it could be removed in a future release. Do not treat the initial CLI interface as a permanent compatibility contract.

## Commands

| Command | Purpose |
| --- | --- |
| `ne` | Open the interactive dashboard. |
| `ne dev` | Start the development server. |
| `ne build` | Run the project's production build flow. |
| `ne start` | Start the production server. |
| `ne check` | Run the available project checks. |
| `ne clean` | Clean supported generated build/cache targets. |
| `ne updater` | Open the release catalog. |
| `ne update` | List or install a selected channel/version. |
| `ne rollback` | Restore the previous managed package state. |
| `ne help` | Show command help. |

Install the package globally to use `ne` directly from a shell:

~~~sh
npm install --global @kastrick/nextjs-engine
ne
ne build
ne clean
~~~

From a source checkout, `npm link` exposes the repository's `ne` executable on `PATH`.

## Terminal banners and diagnostics

All NE CLI notices and errors use the shared adaptive renderer. It measures visible character width rather than raw string length (ANSI color sequences do not count), wraps long messages to fit the terminal, and falls back to ASCII box drawing when `NE_ASCII=1` or `TERM=dumb` is set.

- Errors use red styling.
- Warnings use yellow styling.
- Successful notices use green styling.
- Informational and running notices use cyan styling.

Use `--no-color` for a single invocation or `NO_COLOR=1` to disable ANSI colors.

Command diagnostics use stable codes:

| Code | Meaning |
| --- | --- |
| `NE1001` | Unknown command; suggests a close match when available. |
| `NE1002` | Unknown option; suggests a close match when available. |
| `NE1003` | Required option value is missing. |
| `NE1004` | Option value is invalid. |
| `NE2001` | JavaScript syntax error with a source code frame when Node provides a file location. |

Examples:

~~~sh
ne bulid
# Suggests: ne build

ne --verison
# Suggests: --version
~~~

Suggestions never execute commands automatically.
