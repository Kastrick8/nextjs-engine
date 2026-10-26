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

## Publishing

The `publish-package.yml` workflow accepts tags such as `v2.6.3` and `v3.0.0-alpha.2`. It verifies the tag is in `package/main` history, resolves exactly one snapshot directory, matches the tag and package manifest version, validates type-check/packed contents, then publishes that directory.

- Stable packages use npm dist-tag `latest`.
- Alpha prereleases use npm dist-tag `alpha`.
- Prefer npm Trusted Publishing using GitHub Actions OIDC; do not put npm write tokens in this repository. Configure the npm trusted publisher for owner `Kate-alt-69`, repo `nextjs-engine`, workflow filename `publish-package.yml`, and leave environment empty unless the workflow later adopts a GitHub deployment environment. Trusted publishing requires a GitHub-hosted runner, `id-token: write`, Node.js 22.14+ and npm 11.5.1+.

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
