# NE-CLI — Generation 3

NE-CLI is the `ne` executable shipped with the Generation 3 package. It provides project commands, structured diagnostics, build orchestration, release-channel discovery, dependency update/rollback, and an interactive terminal dashboard. It uses Node.js tooling rather than a browser-based desktop shell.

## Command discovery

| Command | Purpose |
|---|---|
| `ne` | Open the interactive dashboard; prints help in non-interactive terminals |
| `ne --version` / `ne -v` | Print the installed package version without loading the dashboard/updater |
| `ne help` / `ne --help` | Print the command and option reference |
| `ne dev` | Start the project's Next.js development server |
| `ne build` | Run the configured production preparation, checks and Next.js build |
| `ne start` | Start the production Next.js server |
| `ne check` | Run the project's TypeScript check and available Gen 3 migration diagnostics |
| `ne clean` | Preview or remove a bounded set of generated build/cache targets |
| `ne updater` | Open the interactive Play Store-style release catalog |
| `ne update` | List release-channel versions from the command line |
| `ne update --channel stable` | Select the latest verified stable npm release |
| `ne update --channel alpha` | Select the newest verified Alpha artifact |
| `ne update --channel latest-green` | Select the newest verified Stable/Beta release (never Alpha) |
| `ne update --version 3.0.0-alpha.2` | Select a specific version when the catalog has a verified installable artifact |
| `ne rollback` | Restore the previous managed package/lockfile snapshot |

Run `ne help` in the target project for the exact option surface of the installed package version.

## Build and check task tree

`ne build` runs only the tasks applicable to the current project. If the project defines `prepare:production`, that script runs first; then `ne check` runs; finally the local Next.js production build is invoked.

```text
> ne build
│
├─> ne prepare:production                         ✓
│   └─> npm run prepare:production                ✓
│
├─> ne check                                      ✓
│   ├─> npm run type-check                        ✓
│   │   └─> tsc --noEmit                          ✓
│   └─> Gen 3 migration diagnostics               ✓
│
└─> next build                                    ●
    └─> NENC compiler activity                    ●
```

The display is illustrative: absent project scripts/diagnostics are skipped or omitted. The task tree records nested task state, details and failures. In interactive terminals it is held in a reserved bottom panel while command output scrolls above it; non-interactive terminals receive plain-text RUNNING/DONE/FAILED lines.

The worker pool is bounded to at most three workers. Safe package/check subprocesses can run through this pool; the main Next.js build remains on the CLI main thread. Output capture is bounded, routine successful package-manager notices are suppressed, and failure output is preserved for diagnosis. NE does not silently run `npm install` or `npm audit fix` on every build.

## Command chaining without a shell

Use `--and` to run one or more additional commands after the selected NE action:

```sh
ne check --and "npm run lint" --and "node scripts/verify.js" --and-terminal 10
```

Each `--and` value is parsed into a single executable plus its arguments and launched with `shell: false`. Quoted arguments containing spaces are supported. Shell operators and expansions—including pipes, redirects, semicolons, command substitutions and environment-variable expansion—are rejected. Put multi-step shell logic into a script file and invoke that file instead.

`--and-terminal` sets the number of trailing output rows shown for each chained command (an integer from 1 through 100). A failed chained command stops the chain and reports the failing command.

On Windows, known package-manager commands are resolved to their JavaScript entry points beside the active Node.js installation. NE does not pass `.cmd` or `.bat` wrappers through a shell.

## Safety and project-state management

| Option | Behavior |
|---|---|
| `--yes` | Skip the interactive release-install confirmation; use only when intentionally installing the selected version |
| `--dry-run` | Show the selected release or cleanup targets without modifying the project |
| `--check` | Refresh and list channel availability without installing |
| `--json` | Print the release catalog as JSON |
| `--force` | Force a release-catalog refresh |
| `-q`, `--quiet` | Suppress the experimental notice |
| `--no-color` | Disable ANSI colors for that invocation |

A release install snapshots `package.json` and supported package-manager lockfiles under `.nextjs-engine/cache/ne-backups/` before changing dependencies. If installation fails, NE attempts to restore the snapshot; `ne rollback` restores the previous saved state and reinstalls dependencies. Managed backups are retained for rollback history.

`ne clean` does not recursively delete arbitrary directories. It checks a bounded list of generated targets under the project root: common Next.js build output, the configured relative `distDir`, TypeScript build metadata, NE channel downloads/cache, and `.nextjs-engine/.cache`. Absolute or out-of-project targets are rejected. Rollback backup history is preserved.

The CLI stores its project state at `.nextjs-engine/config/ne.config.json`. Managed state and backups use restrictive file modes and private temporary directories; state writes use an atomic rename rather than writing directly over the destination.

## Release channels and version discovery

| Channel | Selection rule |
|---|---|
| **Stable** | Published stable versions from the npm registry |
| **Alpha** | Newest verified Alpha artifact attached to a GitHub prerelease |
| **Beta** | Prerelease artifact is installable only after runtime CI and cross-browser CI pass for the exact source commit in the release snapshot |
| **Latest Green** | Highest SemVer among Stable and Beta; Alpha is excluded |

The catalog combines the npm packument/dist-tags, GitHub Releases and repository Git tags. A Git tag without a verified package artifact is shown as **TAG ONLY** and cannot be installed directly. Feed failures are shown by source instead of silently discarded. A bounded cache is stored at `.nextjs-engine/cache/ne-channels-cache.json` and allows the dashboard to render cached entries while feeds refresh.

The rolling Alpha channel is produced by a workflow that waits for both Engine runtime CI and cross-browser compatibility on the same `main-3` commit. It skips pull-request runs, failed/timeout browser checks, and stale completions after the branch advances. The rolling Alpha manifest/artifact is a GitHub release artifact, not an npm dist-tag.

## Terminal presentation and experimental status

The CLI uses adaptive terminal banners and structured diagnostic codes, with ANSI color only when supported. `NO_COLOR=1` or `--no-color` disables color; `NE_ASCII=1` forces ASCII borders. Narrow or non-interactive terminals retain readable plain-text output.

Interactive use displays an experimental notice. It is suppressed by `-q` / `--quiet`, `CI=true`, or `NE_NO_WARN=1`. The Gen 3 CLI and its command/channel interfaces are pre-release and may change; review the selected release and channel before installing.

## Installation forms

Install globally to call `ne` directly from a project directory:

```sh
npm install --global @kastrick/nextjs-engine
ne
ne build
ne clean
```

For development from a source checkout, run `npm link` at the repository root. In a project with a local package install, use `npx ne --help` or `npm exec -- ne --help` from that project. A local install does not add the executable to a separate terminal session's global PATH.

One-shot invocation without a global installation:

```sh
npx --yes --package=@kastrick/nextjs-engine ne updater
```

## Detailed reference and verification

The [detailed NE-CLI and Channel Manager guide](../../ne-cli.md) retains the full command descriptions, diagnostic codes, task-tree behavior, rolling-release artifact contract, confirmation/rollback details, and release feed verification.

Run the repository CLI smoke test with:

```sh
node scripts/gen3-ne-cli-smoke.js
```

Related: [Configuration](../../configuration/index.md) · [NE architecture](../architecture.md) · [Error handling](../errors/index.md).
