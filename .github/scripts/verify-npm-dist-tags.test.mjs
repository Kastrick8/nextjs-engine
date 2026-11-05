import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const packageName = "@kastrick/nextjs-engine";
const helper = new URL("./verify-npm-dist-tags.mjs", import.meta.url);

function runVerifier(initialTags, {
  version = "3.0.0-alpha.2",
  track = "alpha",
  versionTag = "package-alpha.3.0.0-alpha.2",
  channelTag = "alpha",
  published = ["2.6.2"],
  stableArchiveVersions = ["2.6.2"],
} = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), "engine-dist-tags-"));
  try {
    const bin = path.join(root, "bin");
    const archive = path.join(root, "archive");
    mkdirSync(bin, { recursive: true });
    for (const stableVersion of stableArchiveVersions) {
      const [major, minor, patch] = stableVersion.split(".");
      const family = major + "." + minor;
      const snapshot = patch === "0" ? family : stableVersion;
      const stableDir = path.join(archive, "version", family, "version", snapshot);
      mkdirSync(stableDir, { recursive: true });
      writeFileSync(path.join(stableDir, "package.json"), JSON.stringify({
        name: packageName,
        version: stableVersion,
      }));
    }
    const tagsFile = path.join(root, "dist-tags.json");
    const stateFile = path.join(root, "registry.json");
    writeFileSync(tagsFile, JSON.stringify(initialTags));
    writeFileSync(stateFile, JSON.stringify(initialTags));
    const npmMock = `#!/usr/bin/env node
const fs = require("node:fs");
const [command, ...args] = process.argv.slice(2);
const stateFile = process.env.MOCK_NPM_STATE;
const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
const published = JSON.parse(process.env.MOCK_PUBLISHED_VERSIONS || "[]");
if (command === "view" && args[0] === "${packageName}" && args[1] === "dist-tags") {
  process.stdout.write(JSON.stringify(state));
  process.exit(0);
}
if (command === "view" && args[0].startsWith("${packageName}@") && args[1] === "version") {
  const candidate = args[0].slice("${packageName}@".length);
  if (published.includes(candidate)) {
    process.stdout.write(candidate);
    process.exit(0);
  }
  process.exit(1);
}
if (command === "dist-tag" && args[0] === "add") {
  const candidate = args[1].slice("${packageName}@".length);
  state[args[2]] = candidate;
  fs.writeFileSync(stateFile, JSON.stringify(state));
  process.exit(0);
}
process.stderr.write("Unexpected npm mock invocation: " + [command, ...args].join(" "));
process.exit(2);
`;
    const npmPath = path.join(bin, "npm");
    writeFileSync(npmPath, npmMock, { mode: 0o755 });
    const result = spawnSync(process.execPath, [
      helper.pathname,
      tagsFile,
      version,
      track,
      versionTag,
      channelTag,
      archive,
    ], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: bin + path.delimiter + process.env.PATH,
        MOCK_NPM_STATE: stateFile,
        MOCK_PUBLISHED_VERSIONS: JSON.stringify(published),
      },
    });
    return {
      ...result,
      registry: JSON.parse(readFileSync(stateFile, "utf8")),
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("accepts a valid Alpha alias without moving stable latest", () => {
  const result = runVerifier({
    "package-alpha.3.0.0-alpha.2": "3.0.0-alpha.2",
    alpha: "3.0.0-alpha.2",
    latest: "2.6.2",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).latest, "2.6.2");
});

test("repairs a prerelease-valued latest to the newest published stable archive", () => {
  const result = runVerifier({
    "package-alpha.3.0.0-alpha.2": "3.0.0-alpha.2",
    alpha: "3.0.0-alpha.2",
    latest: "3.0.0-alpha.1",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.registry.latest, "2.6.2");
  assert.equal(JSON.parse(result.stdout).latest, "2.6.2");
});

test("rejects a stale moving channel alias", () => {
  const result = runVerifier({
    "package-alpha.3.0.0-alpha.2": "3.0.0-alpha.2",
    alpha: "3.0.0-alpha.1",
    latest: "2.6.2",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /channel dist-tag alpha/);
});

test("rejects an Alpha release that advances npm latest", () => {
  const result = runVerifier({
    "package-alpha.3.0.0-alpha.2": "3.0.0-alpha.2",
    latest: "3.0.0-alpha.2",
  }, { channelTag: "latest" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must never advance npm's default latest/);
});

test("repairs a missing npm latest alias from the newest published stable snapshot", () => {
  const result = runVerifier({
    "package-alpha.3.0.0-alpha.2": "3.0.0-alpha.2",
    alpha: "3.0.0-alpha.2",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.registry.latest, "2.6.2");
});

test("repairs a stable latest alias that trails a newer published stable archive", () => {
  const result = runVerifier({
    "package-alpha.3.0.0-alpha.2": "3.0.0-alpha.2",
    alpha: "3.0.0-alpha.2",
    latest: "2.6.0",
  }, { published: ["2.6.0", "2.6.2"] });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.registry.latest, "2.6.2");
});

test("fails closed when a prerelease latest cannot be repaired to a published stable version", () => {
  const result = runVerifier({
    "package-alpha.3.0.0-alpha.2": "3.0.0-alpha.2",
    alpha: "3.0.0-alpha.2",
    latest: "3.0.0-alpha.2",
  }, { published: [] });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /no published stable archive version was found/);
});

test("rejects an immutable version tag that points at a different package version", () => {
  const result = runVerifier({
    "package-alpha.3.0.0-alpha.2": "3.0.0-alpha.1",
    alpha: "3.0.0-alpha.2",
    latest: "2.6.2",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /expected 3.0.0-alpha.2/);
});

test("a Beta release advances beta without moving the stable latest alias", () => {
  const result = runVerifier({
    "package-beta.3.0.0-beta.1": "3.0.0-beta.1",
    beta: "3.0.0-beta.1",
    latest: "2.6.2",
  }, {
    version: "3.0.0-beta.1",
    track: "beta",
    versionTag: "package-beta.3.0.0-beta.1",
    channelTag: "beta",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).channelTag, "3.0.0-beta.1");
  assert.equal(result.registry.latest, "2.6.2");
});

test("a newer Stable release advances package version and latest aliases", () => {
  const result = runVerifier({
    "package.2.6.3": "2.6.3",
    latest: "2.6.3",
  }, {
    version: "2.6.3",
    track: "stable",
    versionTag: "package.2.6.3",
    channelTag: "latest",
    published: ["2.6.2", "2.6.3"],
    stableArchiveVersions: ["2.6.2", "2.6.3"],
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).latest, "2.6.3");
  assert.equal(result.registry["package.2.6.3"], "2.6.3");
});
