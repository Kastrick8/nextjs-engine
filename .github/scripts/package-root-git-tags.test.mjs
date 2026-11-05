import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";

const script = new URL("./package-root-git-tags.mjs", import.meta.url);
function git(repo, args) { return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8" }).trim(); }
function runMigration(repo, args) {
  const result = spawnSync(process.execPath, [script.pathname, "migrate", repo, ...args], { encoding: "utf8" });
  return { ...result, parsed: result.stdout ? JSON.parse(result.stdout) : null };
}
function writePackage(folder, version) {
  const root = path.join(folder, "package");
  fs.mkdirSync(path.join(root, "engine"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    name: "@kastrick/nextjs-engine", version, private: false,
    files: ["engine", "index.ts", "README.md"],
    exports: { ".": { types: "./index.ts", import: "./index.ts", default: "./index.ts" } },
  }, null, 2));
  fs.writeFileSync(path.join(root, "index.ts"), 'export * from "./engine";\n');
  fs.writeFileSync(path.join(root, "engine/index.ts"), "export const engineVersion = " + JSON.stringify(version) + ";\n");
  fs.writeFileSync(path.join(root, "docs/not-packed.md"), "must not be in the package tag\n");
  fs.writeFileSync(path.join(root, "README.md"), "Package " + version + "\n");
  fs.writeFileSync(path.join(root, "UPSTREAM.md"), "- Requested and resolved source commit: " + "a".repeat(40) + "\n");
}
function initRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ne-tag-test-"));
  execFileSync("git", ["init", dir], { stdio: "ignore" });
  git(dir, ["config", "user.name", "Test"]);
  git(dir, ["config", "user.email", "test@example.invalid"]);
  return dir;
}

test("migration converts a legacy full-repository version tag into an npm-pack-only root", () => {
  const repo = initRepo();
  try {
    writePackage(repo, "2.6.2");
    fs.mkdirSync(path.join(repo, "version/2.6/version/2.6.2"), { recursive: true });
    fs.cpSync(path.join(repo, "package"), path.join(repo, "version/2.6/version/2.6.2"), { recursive: true });
    fs.rmSync(path.join(repo, "package"), { recursive: true, force: true });
    const legacySnapshots = [
      ["1.0.0", "version/1.0/version/1.0"],
      ["2.6.1", "version/2.6/version/2.6.1"],
    ];
    for (const [version, relative] of legacySnapshots) {
      const staging = path.join(repo, "staging-" + version);
      writePackage(staging, version);
      const target = path.join(repo, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.cpSync(path.join(staging, "package"), target, { recursive: true });
      fs.rmSync(staging, { recursive: true, force: true });
    }
    const alphaStaging = path.join(repo, "staging-alpha");
    writePackage(alphaStaging, "3.0.0-alpha.1");
    const alphaTarget = path.join(repo, "alpha/version/3.alpha/version/3.0.0-alpha.1");
    fs.mkdirSync(path.dirname(alphaTarget), { recursive: true });
    fs.cpSync(path.join(alphaStaging, "package"), alphaTarget, { recursive: true });
    fs.rmSync(alphaStaging, { recursive: true, force: true });
    fs.writeFileSync(path.join(alphaTarget, "UPSTREAM.md"), "- Preserved distributable-branch commit: " + "b".repeat(40) + "\n");
    fs.mkdirSync(path.join(repo, ".github/workflows"), { recursive: true });
    fs.writeFileSync(path.join(repo, ".github/workflows/noise.yml"), "not package content\n");
    fs.mkdirSync(path.join(repo, "alpha"), { recursive: true });
    fs.writeFileSync(path.join(repo, "AGENT.md"), "archive repository only\n");
    git(repo, ["add", "--all"]);
    git(repo, ["commit", "-m", "legacy archive tree"]);
    const previous = git(repo, ["rev-parse", "HEAD"]);
    git(repo, ["tag", "-a", "package.1.0.0", "-m", "old archive tag"]);
    git(repo, ["tag", "-a", "package.2.6.1", "-m", "old archive tag"]);
    git(repo, ["tag", "-a", "package.2.6.2", "-m", "old archive tag"]);
    git(repo, ["tag", "-a", "package-alpha.3.0.0-alpha.1", "-m", "old alpha archive tag"]);
    git(repo, ["tag", "-a", "package.latest", "-m", "old latest tag"]);

    const dry = runMigration(repo, []);
    assert.equal(dry.status, 0, dry.stderr);
    assert.equal(dry.parsed.mode, "dry-run");
    for (const tag of ["package.1.0.0", "package.2.6.1", "package.2.6.2", "package-alpha.3.0.0-alpha.1"]) {
      assert.equal(git(repo, ["rev-parse", tag + "^{commit}"]), previous, "dry-run must not move " + tag);
    }
    const plannedAlpha = dry.parsed.results.find((item) => item.tag === "package-alpha.3.0.0-alpha.1");
    assert.equal(plannedAlpha.sourceCommit, "b".repeat(40), "legacy Alpha provenance wording is retained");
    const plannedLatest = dry.parsed.results.find((item) => item.tag === "package.latest");
    assert.equal(plannedLatest.targetTag, "package.2.6.2");
    assert.notEqual(plannedLatest.commitSha, previous, "dry-run preview points package.latest at the planned package-root commit");

    const apply = runMigration(repo, ["--apply", "--no-push"]);
    assert.equal(apply.status, 0, apply.stderr);
    const rootCommit = git(repo, ["rev-parse", "package.2.6.2^{commit}"]);
    assert.notEqual(rootCommit, previous);
    for (const [tag, version] of [
      ["package.1.0.0", "1.0.0"],
      ["package.2.6.1", "2.6.1"],
      ["package-alpha.3.0.0-alpha.1", "3.0.0-alpha.1"],
    ]) {
      const tagCommit = git(repo, ["rev-parse", tag + "^{commit}"]);
      const tagMarker = JSON.parse(git(repo, ["show", tagCommit + ":.package-tag.json"]));
      assert.equal(tagMarker.version, version, "each tag resolves its own snapshot from the shared legacy archive commit");
      if (version === "3.0.0-alpha.1") assert.equal(tagMarker.sourceCommit, "b".repeat(40));
      assert.deepEqual(git(repo, ["ls-tree", "--name-only", tagCommit]).split("\n").sort(),
        [".package-tag.json", "README.md", "engine", "index.ts", "package.json"]);
    }
    assert.deepEqual(git(repo, ["ls-tree", "--name-only", rootCommit]).split("\n").sort(),
      [".package-tag.json", "README.md", "engine", "index.ts", "package.json"]);
    const marker = JSON.parse(git(repo, ["show", rootCommit + ":.package-tag.json"]));
    assert.equal(marker.tag, "package.2.6.2");
    assert.equal(marker.version, "2.6.2");
    assert.equal(marker.layout, "npm-pack-root");
    assert.equal(marker.migrationOnly, true, "legacy tag rewrites are marked to suppress npm publication");
    assert.equal(marker.sourceCommit, "a".repeat(40));
    assert.equal(git(repo, ["rev-parse", "package.latest^{commit}"]), rootCommit);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("migration is idempotent once a version tag has a package-root marker", () => {
  const repo = initRepo();
  try {
    writePackage(repo, "2.7.0");
    fs.mkdirSync(path.join(repo, "version/2.7/version/2.7"), { recursive: true });
    fs.cpSync(path.join(repo, "package"), path.join(repo, "version/2.7/version/2.7"), { recursive: true });
    fs.rmSync(path.join(repo, "package"), { recursive: true, force: true });
    git(repo, ["add", "--all"]);
    git(repo, ["commit", "-m", "package archive"]);
    git(repo, ["tag", "-a", "package.2.7.0", "-m", "legacy tag"]);
    assert.equal(runMigration(repo, ["--apply", "--no-push"]).status, 0);
    const first = git(repo, ["rev-parse", "package.2.7.0^{commit}"]);
    const second = runMigration(repo, ["--apply", "--no-push"]);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(git(repo, ["rev-parse", "package.2.7.0^{commit}"]), first);
    assert.equal(second.parsed.results.find((item) => item.tag === "package.2.7.0").status, "already-package-root");
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});


test("migration preflights every legacy tag before moving any ref", () => {
  const repo = initRepo();
  try {
    writePackage(repo, "2.6.2");
    const goodDir = path.join(repo, "version/2.6/version/2.6.2");
    fs.mkdirSync(goodDir, { recursive: true });
    fs.cpSync(path.join(repo, "package"), goodDir, { recursive: true });
    fs.rmSync(path.join(repo, "package"), { recursive: true, force: true });
    const badDir = path.join(repo, "version/2.7/version/2.7");
    fs.mkdirSync(badDir, { recursive: true });
    fs.writeFileSync(path.join(badDir, "package.json"), JSON.stringify({
      name: "@kastrick/nextjs-engine", version: "2.7.0", private: false,
      files: ["index.ts", "engine"],
    }));
    fs.writeFileSync(path.join(badDir, "index.ts"), 'export * from "./engine";\n');
    fs.writeFileSync(path.join(badDir, "UPSTREAM.md"), "- Requested and resolved source commit: " + "d".repeat(40) + "\n");
    git(repo, ["add", "--all"]);
    git(repo, ["commit", "-m", "archive with one invalid package"]);
    const previous = git(repo, ["rev-parse", "HEAD"]);
    git(repo, ["tag", "-a", "package.2.6.2", "-m", "old 2.6.2 tag"]);
    git(repo, ["tag", "-a", "package.2.7.0", "-m", "invalid 2.7.0 tag"]);
    const result = runMigration(repo, ["--apply", "--no-push"]);
    assert.notEqual(result.status, 0, "the malformed later package must fail migration");
    assert.equal(git(repo, ["rev-parse", "package.2.6.2^{commit}"]), previous,
      "an earlier valid tag must remain untouched when a later tag fails preflight");
    assert.equal(git(repo, ["rev-parse", "package.2.7.0^{commit}"]), previous,
      "the malformed tag must remain untouched");
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});


test("migration rejects a package in a noncanonical version folder", () => {
  const repo = initRepo();
  try {
    const staging = path.join(repo, "staging");
    writePackage(staging, "2.7.0");
    const wrong = path.join(repo, "version/2.7/version/2.7.0");
    fs.mkdirSync(path.dirname(wrong), { recursive: true });
    fs.cpSync(path.join(staging, "package"), wrong, { recursive: true });
    fs.rmSync(staging, { recursive: true, force: true });
    git(repo, ["add", "--all"]);
    git(repo, ["commit", "-m", "noncanonical stable package folder"]);
    const previous = git(repo, ["rev-parse", "HEAD"]);
    git(repo, ["tag", "-a", "package.2.7.0", "-m", "legacy tag with wrong folder"]);
    const result = runMigration(repo, []);
    assert.notEqual(result.status, 0, "a stable patch-zero package must use the shortened major/minor folder");
    assert.equal(git(repo, ["rev-parse", "package.2.7.0^{commit}"]), previous,
      "the invalid tag must remain unchanged");
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});


test("seed migrates existing tags and creates missing versions as package-only refs", () => {
  const repo = initRepo();
  try {
    for (const [version, relative] of [
      ["2.6.2", "version/2.6/version/2.6.2"],
      ["2.7.0", "version/2.7/version/2.7"],
    ]) {
      const staging = path.join(repo, "staging-" + version);
      writePackage(staging, version);
      const target = path.join(repo, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.cpSync(path.join(staging, "package"), target, { recursive: true });
      fs.rmSync(staging, { recursive: true, force: true });
    }
    fs.mkdirSync(path.join(repo, ".github/workflows"), { recursive: true });
    fs.writeFileSync(path.join(repo, ".github/workflows/noise.yml"), "archive-only file\n");
    git(repo, ["add", "--all"]);
    git(repo, ["commit", "-m", "archive two package versions"]);
    const archiveHead = git(repo, ["rev-parse", "HEAD"]);
    git(repo, ["tag", "-a", "package.2.6.2", "-m", "legacy full archive tag"]);

    const dry = runMigration(repo, ["--seed"]);
    assert.equal(dry.status, 0, dry.stderr);
    assert.equal(dry.parsed.operation, "seed-and-migrate");
    assert.ok(dry.parsed.results.some((item) => item.tag === "package.2.6.2" && item.status === "would-migrate"));
    assert.ok(dry.parsed.results.some((item) => item.tag === "package.2.7.0" && item.status === "would-create"));
    assert.equal(git(repo, ["tag", "--list", "package.2.7.0"]), "", "dry-run must not create missing tags");

    const apply = runMigration(repo, ["--seed", "--apply", "--no-push"]);
    assert.equal(apply.status, 0, apply.stderr);
    for (const [tag, version] of [["package.2.6.2", "2.6.2"], ["package.2.7.0", "2.7.0"]]) {
      const commit = git(repo, ["rev-parse", tag + "^{commit}"]);
      const marker = JSON.parse(git(repo, ["show", commit + ":.package-tag.json"]));
      const pkg = JSON.parse(git(repo, ["show", commit + ":package.json"]));
      assert.equal(pkg.version, version);
      assert.equal(marker.migrationOnly, true, "seeded refs never initiate npm publication");
      assert.deepEqual(git(repo, ["ls-tree", "--name-only", commit]).split("\n").sort(),
        [".package-tag.json", "README.md", "engine", "index.ts", "package.json"]);
      if (version === "2.7.0") assert.equal(marker.archiveCommit, archiveHead);
    }
    assert.equal(git(repo, ["rev-parse", "package.latest^{commit}"]), git(repo, ["rev-parse", "package.2.7.0^{commit}"]));
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
