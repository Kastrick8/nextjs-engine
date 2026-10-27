# AGENT.md — Nextjs Engine package archive

## Purpose

`package/main` is the curated npm-package archive, not a development mirror. Development remains on `main-2` and `main-3`. Do not sync every development commit automatically.

A manual import workflow resolves a selected branch, tag, or commit to a full SHA and creates a candidate branch. Review the candidate and merge it into `package/main` manually. An import is not a release and never publishes to npm.

## Directory contract

Stable snapshots are grouped by major/minor. When the patch is zero, shorten the snapshot folder to the major/minor name while keeping full SemVer in `package.json`:

```text
version/2.5/version/2.5/package.json
version/2.5/version/2.5/index.ts
version/2.5/version/2.5/engine/...
version/2.6/version/2.6/...
version/2.6/version/2.6.1/...
version/2.6/version/2.6.2/...
```

Alpha snapshots are separate. The family is shortened, but the snapshot directory and manifest retain full SemVer:

```text
alpha/version/3.alpha/version/3.0.0-alpha.1/package.json
alpha/version/3.alpha/version/3.0.0-alpha.1/index.ts
alpha/version/3.alpha/version/3.0.0-alpha.1/engine/...
```

Each version directory owns its own `package.json`, `index.ts`, `engine/`, and docs. Its `index.ts` exports from its local `./engine`. Never use one shared root entrypoint for all versions.

## Snapshot rules

1. Never replace an existing snapshot unless the manual import input `replace_existing=true` was explicitly selected. Inspect the entire diff before merging a repair.
2. The normal import flow creates `package/import-<version>` from `package/main`; it does not modify `package/main` directly.
3. Record both the requested source ref and resolved full source SHA in each snapshot's `UPSTREAM.md`. A snapshot is a source copy, not a live link.
4. If a source ref has `src/engine/`, copy it to the package's `engine/`. If it already has `engine/`, copy that directory without changing the implementation.
5. Some historic source tags have stale/mismatched root `package.json.version` values. Set the archived manifest to the intended full release version and clearly note any normalization in `UPSTREAM.md`.
6. Check every `exports` target exists in that specific snapshot. Remove unavailable subpath exports rather than referencing another version's files.
7. Keep stable snapshots in `version/` and alpha snapshots in `alpha/`. Use npm-compatible SemVer, e.g. `3.0.0-alpha.1`, not `3.0.0.alpha`.
8. Do not invent provenance. If the source commit for an old snapshot is not proven, state that limitation in `UPSTREAM.md`.
9. No npm publish occurs on import, pull-request, or ordinary branch commits.

## Package identity

Every archived snapshot is published as `@kastrick/nextjs-engine`. New imports must normalize the manifest name to this organization scope. Public installation uses `npm install @kastrick/nextjs-engine` (stable) or `npm install @kastrick/nextjs-engine@alpha` (prerelease).

## Publishing

The normal release form is `Actions → Publish versioned package` on the default branch `main-3`. Inputs are a development branch (`main-2` or `main-3`), the exact full 40-character commit SHA, full SemVer, and a matching track (`stable`, `alpha`, or `beta`). The action verifies the pin is reachable from that branch; refuses to overwrite a snapshot whose provenance differs; copies the engine; type-checks and dry-runs the npm pack; commits the snapshot to `package/main`; creates the version Git tag; and publishes/manages dist-tags in the same run.

Git tags:
- `package.latest` is a movable Git tag pointer to the latest stable version tag.
- Stable: `package.X.Y.Z`, e.g. `package.10.52.2`.
- Alpha: `package-alpha.X.Y.Z-alpha.N`, e.g. `package-alpha.3.0.0-alpha.1`.
- Beta: `package-beta.X.Y.Z-beta.N`, e.g. `package-beta.10.52.2-beta.1`.

npm dist-tags:
- `latest` must point at the newest stable version. That registry tag controls the default `npm install @kastrick/nextjs-engine` behavior; `package.latest` is not an npm dist-tag.
- Each stable version receives a `package.X.Y.Z` tag.
- Each alpha version receives `package-alpha.X.Y.Z-alpha.N`; each beta version receives `package-beta.X.Y.Z-beta.N`.
- The newest prerelease in each track additionally receives `alpha` or `beta`.

The `Seed package Git tags` workflow is idempotent, backfills version-specific Git tags for snapshots already in the archive, and sets `package.latest` to the current latest stable version tag. It does not publish anything to npm.

Before the first release, check `npm view @kastrick/nextjs-engine name`. If the name is not registered and version `2.6.2` does not already exist, publish the `version/2.6/version/2.6.2` snapshot once from an npm-authenticated CLI with `npm publish --access public`. Then configure the package's Trusted Publisher with owner `Kate-alt-69`, repository `nextjs-engine`, workflow `publish-package.yml`, blank environment, and both **Allow npm publish** and **Allow npm dist-tag**. The workflow uses a GitHub-hosted runner, `id-token: write`, Node 24 and npm CLI 11.21.0+. npm requires a new Trusted Publisher to complete its first successful operation within two days, so add the configuration when ready to run the release.

Do not store long-lived npm write tokens in the repository. The publisher skips already-published immutable versions and still applies the intended dist-tags when authorized.

## Branch safety

- Keep `main-2` and `main-3` as development branches.
- `main-2-package` and `main-3-package` are legacy protected branches. Do not remove their protections or delete them before the new archive is verified and required source/content has been migrated.
- The old `sync/main-3-package-<7-hex-sha>-<attempt>` refs are generated scratch branches. The cleanup workflow matches only this exact pattern, skips open-PR branches, defaults to dry-run, and requires a typed confirmation plus an explicit non-dry-run selection.
- Never delete unrelated `sync/*`, `fix/*`, `feature/*`, `proposal/*`, development, release or archive refs.
- After migration, protect `package/main` through repository settings and verify the package's npm trusted-publisher configuration.

## Review checklist

- `UPSTREAM.md` records the exact selected source SHA.
- The folder path follows the patch-zero shortening rule, and `package.json.version` is the full valid SemVer.
- `index.ts` and all manifest export targets exist within that snapshot.
- Run `npm run type-check` and `npm run pack:check` from the exact version folder.
- Review missing files, cross-version imports, accidental build artifacts/secrets, and unintended edits to other version directories.
