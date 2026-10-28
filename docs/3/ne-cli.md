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

## Installation forms

After the package's bin entry has shipped:

- Local install: **ne updater** or **ne update --channel alpha**.
- One-shot executable: **npx --yes --package=@kastrick/nextjs-engine ne updater**.
- **ne updater** opens the interactive UI. **ne update** intentionally stays in command-line mode.

## Channels

- **Stable:** exact package versions from the npm registry.
- **Alpha:** the newest validated Alpha package artifact attached to a GitHub prerelease. Alpha artifacts are not published to npm by the release workflow.
- **Latest Green:** the highest SemVer release among Stable and Beta. Alpha versions are excluded.
- **Beta:** prerelease artifacts enter the catalog only after runtime CI and cross-browser CI both pass for the exact source commit recorded in the snapshot.

The channel feed is fetched from the npm registry and the public GitHub Releases API. A small cache is stored at **.nextjs-engine/cache/ne-channels-cache.json**; an offline cache is used only for a bounded period.

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

Published npm versions remain immutable. A GitHub Alpha artifact may be published under a new release version; it must not replace a package already published to npm.

## Confirmation, rollback, and cleanup

**ne update --channel alpha** asks for confirmation in an interactive terminal. Pass **--yes** only when intentionally installing the selected build. In CI/non-interactive use, confirmation is required unless **--yes** is explicitly provided. **--dry-run** prints the selected version without installing it, and **--check** refreshes channel metadata without changing the project.

Before switching a dependency, the updater snapshots package.json and package-manager lockfiles under **.nextjs-engine/cache/ne-backups/**. **ne rollback** restores the previous snapshot and reruns the package manager. Failed updates attempt the same restoration automatically.

**ne clean** only removes known generated paths under the project root, including the configured Next.js distDir, common build output directories, TypeScript build metadata, downloaded channel artifacts, and the channel cache. It does not delete rollback backup history.

## Error Book and migration checks

**ne check** runs the project's TypeScript check when available and invokes the existing Gen 3 migration diagnostics when packaged with the CLI. Diagnostics retain their established code, severity, source location, and recommended action. The scanner intentionally reports only patterns represented by explicit rules; unknown props or names are not guessed to be deprecated.

## Experimental notice and controls

Interactive use displays an experimental notice. It is suppressed by **-q**, **--quiet**, **CI=true**, or **NE_NO_WARN=1**. Set **NE_ASCII=1** for ASCII-only borders; otherwise the TUI uses Unicode box-drawing characters. Arrow keys and W/A/S/D navigation work in the TUI, and SGR mouse clicks are handled in terminals that report them.

## Verification

Run:

    node scripts/gen3-ne-cli-smoke.js

The smoke test covers version ordering, channel manifest validation, channel selection, argument parsing, the terminal frame, safe backup restoration, and cache cleanup behavior.
