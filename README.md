# Nextjs Engine — Versioned package archive

`package/main` contains reviewed, independent npm package snapshots. It is not automatically synchronized with development branches `main-2` or `main-3`.

## Layout

- Stable: `version/<major.minor>/version/<snapshot-dir>/` (patch-zero releases use the short directory name)
- Alpha: `alpha/version/<major>.alpha/version/<full-semver-prerelease>/`

Every version owns a complete package, including its own `package.json`, `index.ts`, `engine/`, and its relevant docs. Patch-zero folder names are shortened without changing the manifest SemVer: `version/2.5/version/2.5/package.json` declares `2.5.0`. For example:

```text
version/2.5/version/2.5/index.ts
version/2.6/version/2.6.2/index.ts
alpha/version/3.alpha/version/3.0.0-alpha.1/index.ts
```

## Import and review

Use **Actions → Import package snapshot** from the repository's default branch. Choose a source branch/tag/commit and the intended full version. The workflow records the resolved SHA, constructs an isolated package folder, checks exports and packaging, and pushes a candidate branch named `package/import-<version>`. Review it and merge it into `package/main` manually. A pre-existing snapshot is rejected unless you explicitly select the replacement option.

Historical release tags have some stale/mismatched source `package.json.version` values. The archived manifest uses the full intended version and `UPSTREAM.md` records the source commit and any normalization.

## Release

The published package is `@kastrick/nextjs-engine`. Start from **Actions → Publish versioned package** on the default branch (`main-3`). Choose `main-2` or `main-3`, paste the exact full 40-character commit SHA, provide the full SemVer, and select the corresponding track. GitHub Actions copies the pinned source into `package/main`, validates it, creates the correctly named version tag, moves `package.latest` when appropriate, and handles npm publication/dist-tags in that same run.

### Git tag names

- Latest stable pointer: `package.latest` (moves to the commit for the newest stable version).
- Stable releases: `package.X.Y.Z`, e.g. `package.2.6.2` or `package.10.52.2`.
- Alpha releases: `package-alpha.X.Y.Z-alpha.N`, e.g. `package-alpha.3.0.0-alpha.1`.
- Beta releases: `package-beta.X.Y.Z-beta.N`, e.g. `package-beta.10.52.2-beta.1`.

The `package.latest` name is a Git tag pointer. npm itself has a separate special dist-tag called `latest`; **that** is what makes an unpinned install select the newest stable package.

### npm dist-tags and install commands

- `latest` points to the newest stable version, so `npm install @kastrick/nextjs-engine` installs stable by default.
- Every stable version gets `package.X.Y.Z`, e.g. `npm install @kastrick/nextjs-engine@package.2.6.2`.
- Every alpha version gets `package-alpha.X.Y.Z-alpha.N`, e.g. `npm install @kastrick/nextjs-engine@package-alpha.3.0.0-alpha.1`.
- Every beta version gets `package-beta.X.Y.Z-beta.N`, e.g. `npm install @kastrick/nextjs-engine@package-beta.10.52.2-beta.1`.
- The newest alpha and beta in each stream also receive moving npm aliases `alpha` and `beta`.

The `Seed package Git tags` workflow backfills version tags for the existing archive and initializes `package.latest`. It never publishes to npm. Ordinary development commits are not automatically published.

### First publication on npm

npm does not offer a separate reservation-only button: the scope package is registered by its first successful publish. Check whether it already exists:

```powershell
npm view @kastrick/nextjs-engine name
```

If the name is not found, and `@kastrick/nextjs-engine@2.6.2` has not already been published, publish the existing stable snapshot once from an npm account allowed to publish under the `kastrick` organization:

```powershell
git fetch origin package/main
git worktree add ..\nextjs-engine-package origin/package/main
Set-Location ..\nextjs-engine-package\version\2.6\version\2.6.2
npm login
npm publish --access public
npm dist-tag add @kastrick/nextjs-engine@2.6.2 package.2.6.2
```

The first publish assigns npm's default `latest` tag to stable `2.6.2`; the final command adds its version-specific npm dist-tag. A published version is immutable; never retry the first publish if that version already exists.

### Connect npm to GitHub Actions

After the package exists, open [the package settings](https://www.npmjs.com/package/@kastrick/nextjs-engine/settings) and add a GitHub Actions Trusted Publisher:

- Owner: `Kate-alt-69`
- Repository: `nextjs-engine`
- Workflow filename: `publish-package.yml` (filename only)
- Environment: blank
- Allowed actions: direct `npm publish` **and** `npm dist-tag`

Trusted Publisher dist-tag permission is separate from publish permission. The workflow uses OIDC, Node 24 and npm CLI 11.21.0+, so no long-lived npm write token belongs in repository secrets. npm requires a new Trusted Publisher to complete its first successful operation within two days, so configure it when you're ready to run the initial automated release.

## Legacy branch cleanup

The old `sync/main-3-package-*` refs were generated by the previous source-sync workflow. The cleanup action matches only those refs, skips refs used by open PRs, defaults to dry-run, and requires explicit confirmation to delete. Protected legacy package branches are deliberately not included.
