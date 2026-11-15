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

## Command help

Use `ne --help` for the overview, or request help for one command:

```sh
ne update --help
ne update -h
ne help update
```

Command help works outside a project directory and shows only the selected command's usage and options. In particular, `ne update --help` lists release channels, version selection, refresh/check modes, dry runs, JSON output, and install confirmation.

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


## Experimental updater safety preflight

The v2.7.0 updater now checks the selected release before changing the project. It compares installed and target versions, identifies the Engine generation from verified release-branch metadata (falling back to the package version), and scans a bounded set of application source files for known Generation 3-oriented APIs when selecting Gen 2.

The Gen 2 preflight reports a potential generation switch and flags references such as `createPage()`, `createTheme()`, and `EngineTheme` for manual review. These are warnings, not proof that the target is incompatible. Gen 2 must remain a Generation 2 runtime; this check does not port Generation 3 features into it.

`ne updater` displays the compatibility result and requires a separate acknowledgement for downgrades, generation changes, or compatibility warnings. Fatal preflight errors are blocking. Unknown target or installed generations fail closed. After installation, NE verifies the installed package's generation against the selected release. The same report is available in `ne update --check` and `ne update --dry-run` without modifying project files.

For non-interactive use, `--yes` must be combined with applicable acknowledgement flags:

~~~sh
ne update --version 2.7.0 --dry-run
ne update --version 2.6.2 --yes --allow-downgrade
ne update --channel stable --yes --allow-generation-change --acknowledge-compatibility
~~~

- `--allow-downgrade` permits an older version.
- `--allow-generation-change` permits switching between Gen 2 and Gen 3.
- `--acknowledge-compatibility` acknowledges static migration warnings.

This scanner is deliberately limited and does not provide complete npm dependency-tree, TypeScript, peer-dependency, API, or runtime compatibility analysis. It does not run `npm audit`, `npm ls`, or a production build before changing dependencies. It checks only known source patterns in a bounded number of project files. After installation NE verifies the exact package name, version, and generation; a mismatch or installation failure enters the existing dependency-file restoration path.
