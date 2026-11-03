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
    fs.mkdirSync(path.join(repo, ".github/workflows"), { recursive: true });
    fs.writeFileSync(path.join(repo, ".github/workflows/noise.yml"), "not package content\n");
    fs.mkdirSync(path.join(repo, "alpha"), { recursive: true });
    fs.writeFileSync(path.join(repo, "AGENT.md"), "archive repository only\n");
    git(repo, ["add", "--all"]);
    git(repo, ["commit", "-m", "legacy archive tree"]);
    const previous = git(repo, ["rev-parse", "HEAD"]);
    git(repo, ["tag", "-a", "package.2.6.2", "-m", "old archive tag"]);
    git(repo, ["tag", "-a", "package.latest", "-m", "old latest tag"]);

    const dry = runMigration(repo, []);
    assert.equal(dry.status, 0, dry.stderr);
    assert.equal(dry.parsed.mode, "dry-run");
    assert.equal(git(repo, ["rev-parse", "package.2.6.2^{commit}"]), previous, "dry-run must not move refs");

    const apply = runMigration(repo, ["--apply", "--no-push"]);
    assert.equal(apply.status, 0, apply.stderr);
    const rootCommit = git(repo, ["rev-parse", "package.2.6.2^{commit}"]);
    assert.notEqual(rootCommit, previous);
    assert.deepEqual(git(repo, ["ls-tree", "--name-only", rootCommit]).split("\n").sort(),
      [".package-tag.json", "README.md", "engine", "index.ts", "package.json"]);
    const marker = JSON.parse(git(repo, ["show", rootCommit + ":.package-tag.json"]));
    assert.equal(marker.tag, "package.2.6.2");
    assert.equal(marker.version, "2.6.2");
    assert.equal(marker.layout, "npm-pack-root");
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
