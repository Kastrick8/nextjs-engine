#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");

const RESERVED_ROOTS = new Set([
  ".github", ".git", ".gitignore", "content.include",
  "engine", "docs", "README.md", "DOCUMENT.md", "package.json",
  "tsconfig.json", "index.ts", "UPSTREAM.md"
]);
const FORBIDDEN_SEGMENTS = new Set([
  ".git", "node_modules", ".next", "dist", "coverage", "content.include"
]);

function fail(message) {
  throw new Error("content.include: " + message);
}

function parseEntries(sourceRoot, legacyBin) {
  const configPath = path.join(sourceRoot, "content.include");
  if (!fs.existsSync(configPath)) {
    if (legacyBin && fs.existsSync(path.join(sourceRoot, "bin")) &&
        fs.lstatSync(path.join(sourceRoot, "bin")).isDirectory()) {
      return ["bin"];
    }
    return [];
  }
  if (!fs.lstatSync(configPath).isFile()) {
    fail("root content.include must be a regular file.");
  }

  const entries = [];
  const lines = fs.readFileSync(configPath, "utf8").split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith("#")) continue;

    if (line.includes("\\") || line.startsWith("/") || /^[A-Za-z]:/.test(line) ||
        /[*?\[\]{}]/.test(line)) {
      fail("line " + (index + 1) + " must be a literal relative path (no globs or backslashes): " + line);
    }

    const relative = line.replace(/\/+$/, "");
    const parts = relative.split("/");
    if (!relative || parts.some((part) => !part || part === "." || part === "..")) {
      fail("line " + (index + 1) + " contains an empty or unsafe path segment: " + line);
    }
    if (parts.some((part) => FORBIDDEN_SEGMENTS.has(part))) {
      fail("line " + (index + 1) + " references a forbidden content/dependency path: " + line);
    }
    if (RESERVED_ROOTS.has(parts[0])) {
      fail("line " + (index + 1) + " conflicts with package-generated content: " + line);
    }

    const sourcePath = path.resolve(sourceRoot, ...parts);
    const sourcePrefix = sourceRoot.endsWith(path.sep) ? sourceRoot : sourceRoot + path.sep;
    if (!sourcePath.startsWith(sourcePrefix)) {
      fail("line " + (index + 1) + " escapes the source root: " + line);
    }

    let stat;
    try {
      stat = fs.lstatSync(sourcePath);
    } catch {
      fail("line " + (index + 1) + " does not exist in this source commit: " + line);
    }
    if (stat.isSymbolicLink()) {
      fail("line " + (index + 1) + " may not select a symbolic link: " + line);
    }
    if (!stat.isFile() && !stat.isDirectory()) {
      fail("line " + (index + 1) + " is not a regular file or directory: " + line);
    }

    for (const previous of entries) {
      if (relative === previous || relative.startsWith(previous + "/") ||
          previous.startsWith(relative + "/")) {
        fail("overlapping or duplicate paths are not allowed: " + previous + " and " + relative);
      }
    }
    entries.push(relative);
  }

  return entries;
}

function copyIncludedContent(sourceRootArg, destinationRootArg, legacyBin) {
  const sourceRoot = fs.realpathSync(sourceRootArg);
  const destinationRoot = path.resolve(destinationRootArg);
  if (!fs.existsSync(destinationRoot) || !fs.lstatSync(destinationRoot).isDirectory()) {
    fail("destination package directory must already exist.");
  }

  const entries = parseEntries(sourceRoot, legacyBin);
  for (const relative of entries) {
    const sourcePath = path.resolve(sourceRoot, ...relative.split("/"));
    const destinationPath = path.resolve(destinationRoot, ...relative.split("/"));
    const destinationPrefix = destinationRoot.endsWith(path.sep)
      ? destinationRoot
      : destinationRoot + path.sep;
    if (!destinationPath.startsWith(destinationPrefix)) {
      fail("destination path escapes the package root: " + relative);
    }
    if (fs.existsSync(destinationPath)) {
      fail("included path would overwrite package-generated content: " + relative);
    }
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.cpSync(sourcePath, destinationPath, {
      recursive: true,
      force: false,
      errorOnExist: true,
      dereference: false
    });
  }

  // The manifest is build-time configuration and must never ship in the package.
  const copiedControlFile = path.join(destinationRoot, "content.include");
  if (fs.existsSync(copiedControlFile)) {
    fs.rmSync(copiedControlFile, { recursive: true, force: true });
  }
  return entries;
}

function runSelfTest() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ne-content-include-"));
  const sourceRoot = path.join(tempRoot, "source");
  const destinationRoot = path.join(tempRoot, "package");
  try {
    fs.mkdirSync(path.join(sourceRoot, "bin"), { recursive: true });
    fs.mkdirSync(destinationRoot, { recursive: true });
    fs.writeFileSync(path.join(sourceRoot, "bin", "ne.js"), "#!/usr/bin/env node\n");
    fs.writeFileSync(path.join(sourceRoot, "content.include"),
      "# explicit package extras\n\n bin/ \n");
    fs.writeFileSync(path.join(sourceRoot, "package.json"), JSON.stringify({ bin: { ne: "./bin/ne.js" } }));
    fs.writeFileSync(path.join(destinationRoot, "package.json"), "{}");

    const copied = copyIncludedContent(sourceRoot, destinationRoot, false);
    assert.deepEqual(copied, ["bin"]);
    assert.equal(fs.readFileSync(path.join(destinationRoot, "bin", "ne.js"), "utf8"), "#!/usr/bin/env node\n");
    assert.equal(fs.existsSync(path.join(destinationRoot, "content.include")), false);

    fs.writeFileSync(path.join(sourceRoot, "content.include"), "../outside\n");
    assert.throws(() => parseEntries(sourceRoot, false), /unsafe path segment|escapes the source root/);
    fs.writeFileSync(path.join(sourceRoot, "content.include"), "content.include\n");
    assert.throws(() => parseEntries(sourceRoot, false), /forbidden content\/dependency path|conflicts with package-generated content/);

    fs.rmSync(path.join(sourceRoot, "content.include"));
    assert.deepEqual(parseEntries(sourceRoot, false), []);
    assert.deepEqual(parseEntries(sourceRoot, true), ["bin"]);
    process.stdout.write("content.include self-test passed\n");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--self-test") {
    runSelfTest();
    return;
  }
  const legacyBin = args.includes("--legacy-bin");
  const positional = args.filter((arg) => arg !== "--legacy-bin");
  if (positional.length !== 2) {
    fail("usage: copy-content-includes.js <source-root> <package-root> [--legacy-bin] | --self-test");
  }
  const entries = copyIncludedContent(positional[0], positional[1], legacyBin);
  process.stdout.write(JSON.stringify(entries) + "\n");
}

try {
  main();
} catch (error) {
  process.stderr.write((error && error.stack) ? error.stack + "\n" : String(error) + "\n");
  process.exitCode = 1;
}
