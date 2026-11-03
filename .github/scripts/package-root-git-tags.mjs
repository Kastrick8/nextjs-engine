#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const NAME = "@kastrick/nextjs-engine";
function die(message) { throw new Error(message); }
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env || process.env,
    encoding: options.encoding || "utf8",
    input: options.input,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = typeof result.stderr === "string" ? result.stderr.trim() : "";
    die(command + " " + args.join(" ") + " failed: " + (stderr || String(result.status)));
  }
  return result.stdout;
}
function git(repo, args, options = {}) {
  return run("git", ["-C", repo, ...args], options).trim();
}
function parseTag(tag) {
  let match = tag.match(/^package\.(\d+\.\d+\.\d+)$/);
  if (match) return { tag, version: match[1], track: "stable" };
  match = tag.match(/^package-alpha\.(\d+\.\d+\.\d+-alpha\.\d+)$/);
  if (match) return { tag, version: match[1], track: "alpha" };
  match = tag.match(/^package-beta\.(\d+\.\d+\.\d+-beta\.\d+)$/);
  if (match) return { tag, version: match[1], track: "beta" };
  return null;
}
function stableCompare(a, b) {
  const aa = a.split(".").map(Number), bb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (aa[i] !== bb[i]) return aa[i] - bb[i];
  return 0;
}
function markerAt(repo, commit) {
  try { return JSON.parse(git(repo, ["show", commit + ":.package-tag.json"])); }
  catch { return null; }
}
function sourceShaAt(repo, commit, folder) {
  for (const name of ["UPSTREAM.md", "README.md", "DOCUMENT.md"]) {
    try {
      const body = git(repo, ["show", commit + ":" + folder + "/" + name]);
      const match = body.match(/(?:Requested and resolved source commit|Source commit|Source SHA):\s*([0-9a-f]{40})/i);
      if (match) return match[1];
    } catch {}
  }
  return null;
}
function findPackage(repo, commit, version, track) {
  const prefix = track === "stable" ? "version/" : track === "alpha" ? "alpha/version/" : "beta/version/";
  const files = git(repo, ["ls-tree", "-r", "--name-only", commit]).split("\n")
    .filter((item) => item.startsWith(prefix) && item.endsWith("/package.json"));
  const matches = [];
  for (const file of files) {
    try {
      const pkg = JSON.parse(git(repo, ["show", commit + ":" + file]));
      if (pkg.name === NAME && pkg.version === version) matches.push(path.posix.dirname(file));
    } catch {}
  }
  if (matches.length !== 1) die("Expected one " + NAME + "@" + version + " snapshot under " + prefix + "; found " + matches.length + ".");
  return matches[0];
}
function buildRoot(repo, archiveCommit, folder, version, track, tag, sourceCommit) {
  if (!/^[0-9a-f]{40}$/.test(archiveCommit)) die("Invalid archive commit SHA.");
  if (sourceCommit && !/^[0-9a-f]{40}$/.test(sourceCommit)) die("Invalid source commit SHA.");
  if (!folder || folder.startsWith("/") || folder.split("/").includes("..")) die("Unsafe package snapshot path.");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ne-package-tag-"));
  const src = path.join(temp, "source"), packDir = path.join(temp, "pack");
  const untar = path.join(temp, "extract"), root = path.join(temp, "root");
  for (const dir of [src, packDir, untar, root]) fs.mkdirSync(dir, { recursive: true });
  try {
    const archive = execFileSync("git", ["-C", repo, "archive", "--format=tar", archiveCommit + ":" + folder], { maxBuffer: 128 * 1024 * 1024 });
    run("tar", ["-xf", "-", "-C", src], { input: archive });
    const sourcePkg = JSON.parse(fs.readFileSync(path.join(src, "package.json"), "utf8"));
    if (sourcePkg.name !== NAME || sourcePkg.version !== version || sourcePkg.private === true) {
      die("Package manifest does not match " + NAME + "@" + version + ".");
    }
    const packed = JSON.parse(run("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", packDir], { cwd: src }));
    if (!Array.isArray(packed) || !packed[0] || !packed[0].filename || !/^sha512-/.test(packed[0].integrity || "")) die("npm pack did not return a SHA-512 integrity value.");
    run("tar", ["-xzf", path.join(packDir, packed[0].filename), "-C", untar]);
    const packedRoot = path.join(untar, "package");
    if (!fs.existsSync(packedRoot)) die("npm pack did not contain package/.");
    fs.cpSync(packedRoot, root, { recursive: true });
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    if (pkg.name !== NAME || pkg.version !== version) die("Packed package manifest changed unexpectedly.");
    if (!fs.existsSync(path.join(root, "index.ts")) || !fs.existsSync(path.join(root, "engine/index.ts"))) {
      die("The packed package must contain index.ts and engine/index.ts.");
    }
    if (fs.readFileSync(path.join(root, "index.ts"), "utf8").trim() !== 'export * from "./engine";') {
      die('Root index.ts must contain export * from "./engine";');
    }
    for (const [key, value] of Object.entries(pkg.exports || {})) {
      const targets = typeof value === "string" ? [value] : [value.types, value.import, value.require, value.default].filter(Boolean);
      for (const target of targets) {
        if (!fs.existsSync(path.join(root, target.replace(/^\.\//, "")))) die("Missing packed export target " + key + ": " + target);
      }
    }
    const marker = {
      schemaVersion: 1, packageName: NAME, version, track, tag,
      layout: "npm-pack-root", archiveCommit, packagePath: folder,
      sourceCommit: sourceCommit || null, npmIntegrity: packed[0].integrity,
      packedFileCount: Array.isArray(packed[0].files) ? packed[0].files.length : null,
    };
    fs.writeFileSync(path.join(root, ".package-tag.json"), JSON.stringify(marker, null, 2) + "\n");
    const gitDir = git(repo, ["rev-parse", "--absolute-git-dir"]);
    const env = {
      ...process.env,
      GIT_INDEX_FILE: path.join(temp, "index"),
      GIT_AUTHOR_NAME: "github-actions[bot]",
      GIT_AUTHOR_EMAIL: "41898282+github-actions[bot]@users.noreply.github.com",
      GIT_COMMITTER_NAME: "github-actions[bot]",
      GIT_COMMITTER_EMAIL: "41898282+github-actions[bot]@users.noreply.github.com",
    };
    run("git", ["--git-dir", gitDir, "--work-tree", root, "read-tree", "--empty"], { cwd: repo, env });
    run("git", ["--git-dir", gitDir, "--work-tree", root, "add", "--all"], { cwd: repo, env });
    const tree = run("git", ["--git-dir", gitDir, "write-tree"], { cwd: repo, env }).trim();
    const commit = git(repo, ["commit-tree", tree, "-p", archiveCommit, "-m", "Package-root " + NAME + "@" + version + " (" + tag + ")"], { env });
    return { commit, tree, marker, temp };
  } catch (error) {
    fs.rmSync(temp, { recursive: true, force: true });
    throw error;
  }
}
function create(args) {
  const [repo, folder, archiveCommit, version, track, sourceCommit, tag] = args;
  if (!repo || !folder || !archiveCommit || !version || !track || !sourceCommit || !tag) {
    die("Usage: create <repo> <package-path> <archive-commit> <version> <track> <source-commit> <tag>");
  }
  const parsed = parseTag(tag);
  if (!parsed || parsed.version !== version || parsed.track !== track) die("Tag/version/track mismatch.");
  const result = buildRoot(repo, archiveCommit, folder, version, track, tag, sourceCommit);
  process.stdout.write(JSON.stringify({ commitSha: result.commit, treeSha: result.tree, marker: result.marker }) + "\n");
  fs.rmSync(result.temp, { recursive: true, force: true });
}
function migrate(args) {
  const repo = args[0] || ".", apply = args.includes("--apply"), push = args.includes("--push");
  if (push && !apply) die("--push requires --apply.");
  const tags = git(repo, ["tag", "--list"]).split("\n").map((x) => x.trim()).filter(Boolean);
  const versions = tags.map(parseTag).filter(Boolean);
  if (!versions.length) die("No immutable package version tags were found.");
  const migrated = new Map(), results = [];
  for (const item of versions) {
    const oldCommit = git(repo, ["rev-parse", item.tag + "^{commit}"]);
    const existing = markerAt(repo, oldCommit);
    if (existing && existing.schemaVersion === 1 && existing.packageName === NAME
      && existing.version === item.version && existing.tag === item.tag && existing.layout === "npm-pack-root") {
      migrated.set(item.tag, oldCommit);
      results.push({ tag: item.tag, status: "already-package-root", commitSha: oldCommit });
      continue;
    }
    const folder = findPackage(repo, oldCommit, item.version, item.track);
    const sourceCommit = sourceShaAt(repo, oldCommit, folder);
    const built = buildRoot(repo, oldCommit, folder, item.version, item.track, item.tag, sourceCommit);
    if (apply) {
      git(repo, ["tag", "--force", "--annotate", item.tag, "--message", NAME + "@" + item.version + " package-root migration", built.commit]);
      if (push) git(repo, ["push", "--force", "origin", "refs/tags/" + item.tag]);
    }
    migrated.set(item.tag, built.commit);
    results.push({
      tag: item.tag, status: apply ? "migrated" : "would-migrate",
      previousCommit: oldCommit, commitSha: built.commit, packagePath: folder, sourceCommit,
    });
    fs.rmSync(built.temp, { recursive: true, force: true });
  }
  const stable = versions.filter((x) => x.track === "stable").sort((a, b) => stableCompare(a.version, b.version));
  if (stable.length) {
    const latest = stable.at(-1);
    const target = migrated.get(latest.tag) || git(repo, ["rev-parse", latest.tag + "^{commit}"]);
    if (apply) {
      git(repo, ["tag", "--force", "--annotate", "package.latest", "--message", "Latest stable " + NAME + " is " + latest.version, target]);
      if (push) git(repo, ["push", "--force", "origin", "refs/tags/package.latest"]);
    }
    results.push({ tag: "package.latest", status: apply ? "updated" : "would-update", targetTag: latest.tag, commitSha: target });
  }
  process.stdout.write(JSON.stringify({ mode: apply ? "apply" : "dry-run", pushed: push, results }, null, 2) + "\n");
}
const [mode, ...args] = process.argv.slice(2);
try {
  if (mode === "create") create(args);
  else if (mode === "migrate") migrate(args);
  else die("Usage: package-root-git-tags.mjs <create|migrate> ...");
} catch (error) {
  process.stderr.write("[package-root-git-tags] " + error.message + "\n");
  process.exitCode = 1;
}
