# Snapshot provenance

- Full package version: `2.6.1`
- Source tag: `Release-v2.6.1`
- Resolved source commit: `deb11c8441eb67471e8ac541dc3772d8acb7c874`
- Source engine layout: `src/engine`
- Source repository package.json version: `2.5.0`
- Archived package.json version: `2.6.1`

This snapshot copies the engine implementation and release documentation from the tagged source commit. The distributable manifest is based on the maintained package manifest, filtered to exports present in this snapshot, and normalized to the full release tag. Some older source tags had stale or mismatched `package.json.version` values; that mismatch is recorded here instead of silently giving npm the wrong version. This is a self-contained copy, not a live link to development.
