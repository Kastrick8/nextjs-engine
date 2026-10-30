# NE CLI and Channel Manager

**Generation:** 3.x alpha  
**Executable:** **ne**  
**Source:** **bin/ne.js** and **bin/ne-cli/**

The NE CLI gives projects one command interface for development, production builds, diagnostics, cache cleanup, channel updates, and rollback. It uses Node.js built-ins rather than a browser-based desktop shell or a heavyweight TUI dependency.

## Commands

| Command | Behavior |
| --- | --- |
| **ne** | Open the interactive dashboard. |
| **ne dev** | Start the local Next.js development server, including the project's Engine/NENC integration. |
| **ne build** | Run prepare:production when defined, run ne check, then invoke the local Next.js production build. |
| **ne start** | Start the production Next.js server. |
| **ne check** | Run TypeScript checking and the available Gen 3 migration diagnostics. |
| **ne clean** | Remove generated build/cache targets from a bounded list. Rollback backups are preserved. |
| **ne updater** | Open the Play Store-style interactive release catalog directly. |
| **ne update** | Print channel releases in CLI form; flags can select and install a channel without opening the TUI. |
| **ne rollback** | Restore the previous package manifest and lockfiles, then reinstall dependencies. |
| **ne help** | Print command help. |

## Live command task tree

Build and check commands render a live hierarchical task tree instead of leaving the terminal blank or printing successful package-manager output:

```text
> ne build
│
├─> ne prepare:production                         ✓
│   └─> npm run prepare:production                ✓
│       └─> node scripts/gen3-prepare-production.js ✓
│
├─> ne check                                      ✓
│   ├─> npm run type-check                        ✓
│   │   └─> tsc --noEmit                          ✓
│   └─> Gen 3 migration diagnostics               ✓
│
└─> next build                                    ●
    └─> NENC compiler activity                    ●
```

Only steps that actually exist in the current project are shown. The prepare step is omitted when no `prepare:production` script exists. Check subtasks are nested beneath `ne check`. The Next.js build runs from the CLI main thread; safe package/check subprocesses can run through NE's bounded worker pool (up to three workers). NENC output is summarized inside the live build step instead of flooding the terminal.

The task tree uses ANSI status colors: green for completed steps, cyan for running steps, yellow for pending steps, and red for failed steps. Branch connectors inherit their group status, so a completed `ne check` branch turns green while a pending `next build` branch remains yellow. The border animates while a task is active and settles to green on success. Set `NE_ASCII=1` for ASCII connectors.

On failure, NE clears the live frame, preserves the original `> ne build` command header, and prints the failed subcommand's captured stdout/stderr. Successful npm output and routine notifier/fund notices stay hidden; diagnostics are not discarded on failure. Output capture is bounded to prevent a runaway command from consuming unbounded memory.

NE does not run `npm install` or `npm audit fix` automatically on every build. Dependency installation and security remediation modify manifests, lockfiles, or package versions and must remain explicit operations.

## Startup behavior

The executable keeps its initial loader small. `ne --version` / `ne -v` reads the installed package version directly without loading the CLI router, dashboard, updater feeds, or worker pool. `ne --help` loads only the lightweight command router; command-specific modules are required after argument routing. The project runner loads the task worker runtime only for check/build/worker-backed operations, not for `ne clean`, `ne dev`, or `ne start`.

This keeps common shell actions off the dashboard/updater code path while preserving the same command interface.

## Installation forms

The published npm package exposes **ne** through its `bin` entry. Install it once globally to use the commands directly from a project directory:

```sh
npm install --global @kastrick/nextjs-engine
ne
ne build
ne clean
```

For local development from a source checkout, run **npm link** at the repository root; npm then places this checkout's **ne** executable on the shell PATH. In a project with a local package install, npm scripts can also call **ne** directly because npm adds `node_modules/.bin` to the script PATH.

A one-shot invocation without a global installation remains available:

```sh
npx --yes --package=@kastrick/nextjs-engine ne updater
```

**ne** opens the interactive dashboard. **ne updater** opens the release catalog directly. **ne update** intentionally stays in command-line mode.

## Channels

- **Stable:** exact package versions from the npm registry.
- **Alpha:** the newest validated Alpha package artifact attached to a GitHub prerelease. Named versioned Alpha releases may also be published to npm by the source/archive release workflows; the moving `channel-alpha-latest` artifact is never published to npm.
- **Latest Green:** the highest SemVer release among Stable and Beta. Alpha versions are excluded.
- **Beta:** prerelease artifacts enter the catalog only after runtime CI and cross-browser CI both pass for the exact source commit recorded in the snapshot.

The updater loads the complete npm packument (all published SemVer versions and npm dist-tags), GitHub Releases (including the rolling **channel-alpha-latest** manifest), and repository Git tags. Package version tags, the **package.latest** alias, the rolling Alpha tag, and other GitHub tags remain visible in the catalog; Git tags without a verified package artifact are marked **TAG ONLY** and cannot be installed directly. Feed failures are reported by source instead of being silently swallowed.

A small cache is stored at **.nextjs-engine/cache/ne-channels-cache.json**; the dashboard renders from this cache immediately, then refreshes npm and GitHub feeds in place. An offline cache is used only for a bounded period.

### Rolling Latest Alpha

The `ne-alpha-channel.yml` workflow reacts to a successful `Engine runtime CI` push on `main-3`, then waits for `Engine cross-browser compatibility` to pass for the exact same commit. It skips pull-request runs, skips failed/timeout browser checks, and skips an older completion when `main-3` has advanced. It does not gate on Vercel or unrelated external status rollups.

On a passing current `main-3` head, the workflow packages that exact commit and updates the GitHub prerelease tagged `channel-alpha-latest`. Its manifest has `floating: true` and the tarball name embeds the full 40-character source commit SHA. The release tag and manifest move, while commit-specific asset names keep earlier builds individually addressable so the updater can pin the exact bytes installed. The workflow does **not** publish the rolling Alpha to npm.

`ne update --channel alpha` selects `channel-alpha-latest` before the newest named Alpha release. `ne update --version 3.0.0-alpha.2` deliberately selects a named, non-floating artifact rather than the moving channel, when that named release exists. Latest Green remains the highest available Stable/Beta version and never includes Alpha.

### GitHub release asset contract

Alpha/Beta GitHub prereleases attach a tarball named like **nextjs-engine-3.0.0-alpha.2.tgz** and a **ne-release.json** asset. The GitHub release notes embed the same JSON between the following markers:

    <!-- NE-CHANNEL-MANIFEST-START -->
    ...
    <!-- NE-CHANNEL-MANIFEST-END -->

The manifest contains the scoped package name, version, track, source branch, full source commit, package asset name, and SHA-256 digest. The updater streams the download to a bounded temporary file, verifies SHA-256 and the gzip signature, and installs the exact verified local bytes. After installation, it rewrites the dependency and active text lockfile entry to the commit-specific GitHub asset URL while preserving SHA-512 integrity, so the project does not end up depending on an ignored local cache path. If the package manager cannot retain a portable integrity-pinned lock entry, the update fails and restores the dependency files.

Source-pinned and archived Alpha/Beta release paths run the same exact-commit green check before npm publication or GitHub Release creation. The gate requires completed `Engine runtime CI` and `Engine cross-browser compatibility` push runs for the source branch/SHA and fails closed if either run is missing or not successful. Workflow-generated release tags use the `package-snapshot-published` repository-dispatch event so the release builder runs even when a tag push was made with `GITHUB_TOKEN`.

Published npm versions remain immutable. The source/archive release workflows can publish named Alpha/Beta versions after the exact-source CI gate passes; the rolling `channel-alpha-latest` channel only updates GitHub assets and never publishes to npm. Existing npm versions are never overwritten.

## Confirmation, rollback, and cleanup

**ne update --channel alpha** asks for confirmation in an interactive terminal. Pass **--yes** only when intentionally installing the selected build. In CI/non-interactive use, confirmation is required unless **--yes** is explicitly provided. **--dry-run** prints the selected version without installing it, and **--check** refreshes channel metadata without changing the project.

Before switching a dependency, the updater snapshots package.json and package-manager lockfiles under **.nextjs-engine/cache/ne-backups/**. **ne rollback** restores the previous snapshot and reruns the package manager. Failed updates attempt the same restoration automatically.

**ne clean** only removes known generated paths under the project root, including the configured Next.js distDir, common build output directories, TypeScript build metadata, downloaded channel artifacts, and the channel cache. It does not delete rollback backup history.

## Error Book and migration checks

**ne check** runs the project's TypeScript check when available and invokes the existing Gen 3 migration diagnostics when packaged with the CLI. Diagnostics retain their established code, severity, source location, and recommended action. The scanner intentionally reports only patterns represented by explicit rules; unknown props or names are not guessed to be deprecated.

## Experimental notice and controls

Interactive use displays an experimental notice. It is suppressed by **-q**, **--quiet**, **CI=true**, or **NE_NO_WARN=1**. Set **NE_ASCII=1** for ASCII-only borders; otherwise the TUI uses Unicode box-drawing characters. Arrow keys and W/A/S/D navigation work in the TUI, and SGR mouse clicks are handled in terminals that report them.

The dashboard shows an animated activity indicator and per-feed status while the release catalog loads. Build, check, install, Next.js, and cleanup tasks announce their active operation; interactive terminals receive a lightweight spinner and live child-process output. Non-interactive terminals receive plain-text RUNNING/DONE/FAILED lines, with animation disabled.

## Verification

Run:

    node scripts/gen3-ne-cli-smoke.js

The smoke test covers version ordering, channel manifest validation, channel selection, argument parsing, the terminal frame, safe backup restoration, and cache cleanup behavior.
