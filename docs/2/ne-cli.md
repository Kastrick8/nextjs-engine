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

A normal local `npm install` places the executable shim in `node_modules/.bin`; it does not add `ne` to a new PowerShell/CMD session's global `PATH`. From the project directory, run `npx ne --help` or `npm exec -- ne --help`. Use `npm install --global` for a global command, or `npm link` from this repository checkout for development.

The package declares the executable through npm's `bin` field and its `#!/usr/bin/env node` entry point. npm creates the appropriate command link/shim during installation: a POSIX executable link or a Windows `.cmd` shim. PowerShell can invoke `ne` (or `ne.cmd`) once npm's global binary directory is on `PATH`; no separately maintained `.ps1` or `.sh` launcher is required.

## Update and automation options

| Option | Purpose |
| --- | --- |
| `--channel <stable|alpha|beta|latest-green>` | Select a release channel. |
| `--version <version>` | Select a specific version from the verified release catalog. |
| `--check` | Refresh the catalog and inspect availability without installing. |
| `--dry-run` | Resolve a selected release and show the planned install without changing the project. |
| `--json` | Print the release catalog as JSON. Combine with `--check` for a read-only refresh. |
| `--force` | Bypass the cached catalog and refresh release information. |
| `--yes` | Skip the install confirmation. In CI or another non-interactive session, this flag is required before an install can proceed. |
| `-q`, `--quiet` | Suppress the introductory v2.7.0 notice. |
| `--no-color` | Disable ANSI color for this invocation. |

For example, inspect the Alpha channel without installing, or preview a selected version:

~~~sh
ne update --channel alpha --check
ne update --version 3.0.0-alpha.2 --dry-run
~~~

Use `--and` to run an additional executable after the selected NE command completes. Repeat the option to run multiple commands. NE launches the executable directly rather than through a shell, so shell operators such as `&&` and `|` are not supported. `--and-terminal` controls how many trailing output lines are shown for each chained command (default: 5; allowed: 1–100).

~~~sh
ne check --and "node --version" --and-terminal 8
~~~

## Versioned Git package tags

The updater reads the npm version catalog and the versioned Git tags in the official repository. A version tag is installable only after NE verifies its root `.package-tag.json` marker, proving that the tag contains the package-only layout produced from that archived version's `npm pack` output. Verified tags can be installed directly from their immutable Git ref; npm, pnpm, or Yarn then records the resolved Git commit in the project lockfile.

Legacy tags that still contain the entire package archive repository remain **TAG ONLY** until the one-time migration replaces them with verified package-root tags. The moving `package.latest` ref is an alias for the newest stable package tag, not a separate package version. Non-version tags are never accepted as package installation targets.

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

Suggestions never execute commands automatically. Coded failures include a code-specific `Help:` link to the [NE CLI Error Book](./ne-cli-error-book.md).

For the separate Generation 3 compiler/runtime migration diagnostics, see [Migrating from Generation 2 to Generation 3](./migrating-to-3.md). Gen 2 CLI codes and Gen 3 migration diagnostic codes are different namespaces; do not treat them as interchangeable.
