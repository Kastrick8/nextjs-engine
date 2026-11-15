#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");

function readRegularFile(filename) {
  const descriptor = fs.openSync(filename, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    if (!fs.fstatSync(descriptor).isFile()) fail("root content.include must be a regular file.");
    return fs.readFileSync(descriptor, "utf8");
  } finally {
    fs.closeSync(descriptor);
  }
}

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

function validateIncludedTree(sourceRoot, relative, lineNumber) {
  const parts = relative.split("/");
  let current = sourceRoot;
  let currentStat = null;

  for (let index = 0; index < parts.length; index += 1) {
    const segment = parts[index];
    if (FORBIDDEN_SEGMENTS.has(segment)) {
      fail("line " + lineNumber + " contains a forbidden path segment: " + segment);
    }
    current = path.join(current, segment);
    try {
      currentStat = fs.lstatSync(current);
    } catch {
      fail("line " + lineNumber + " does not exist in this source commit: " + relative);
    }
    if (currentStat.isSymbolicLink()) {
      fail("line " + lineNumber + " traverses a symbolic link: " + relative);
    }
    if (index < parts.length - 1 && !currentStat.isDirectory()) {
      fail("line " + lineNumber + " traverses a non-directory path: " + relative);
    }
    if (!currentStat.isFile() && !currentStat.isDirectory()) {
      fail("line " + lineNumber + " contains a non-regular file: " + relative);
    }
  }

  function inspectDirectory(directory, relativeDirectory) {
    for (const name of fs.readdirSync(directory)) {
      const childRelative = relativeDirectory + "/" + name;
      if (FORBIDDEN_SEGMENTS.has(name)) {
        fail("line " + lineNumber + " includes a forbidden path inside a directory: " + childRelative);
      }
      const childPath = path.join(directory, name);
      let childStat;
      try {
        childStat = fs.lstatSync(childPath);
      } catch {
        fail("line " + lineNumber + " could not inspect included path: " + childRelative);
      }
      if (childStat.isSymbolicLink()) {
        fail("line " + lineNumber + " includes a symbolic link inside a directory: " + childRelative);
      }
      if (childStat.isDirectory()) {
        inspectDirectory(childPath, childRelative);
      } else if (!childStat.isFile()) {
        fail("line " + lineNumber + " includes a non-regular file: " + childRelative);
      }
    }
  }

  if (currentStat.isDirectory()) inspectDirectory(current, relative);
  return currentStat;
}

function parseEntries(sourceRoot, legacyBin) {
  const configPath = path.join(sourceRoot, "content.include");
  let configText;
  try {
    configText = readRegularFile(configPath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      if (legacyBin) {
        try {
          const binStat = fs.lstatSync(path.join(sourceRoot, "bin"));
          if (binStat.isDirectory() && !binStat.isSymbolicLink()) return ["bin"];
        } catch (statError) {
          if (!statError || statError.code !== "ENOENT") throw statError;
        }
      }
      return [];
    }
    if (error && (error.code === "ELOOP" || error.code === "ERR_NOT_REGULAR_FILE")) {
      fail("root content.include must be a regular, non-symlink file.");
    }
    throw error;
  }

  const entries = [];
  const lines = configText.split(/\r?\n/);
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

    const stat = validateIncludedTree(sourceRoot, relative, index + 1);
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


    const outsideRoot = path.join(tempRoot, "outside");
    fs.mkdirSync(outsideRoot, { recursive: true });
    fs.writeFileSync(path.join(outsideRoot, "secret.txt"), "must not be copied");
    let linkedPath = false;
    try {
      fs.symlinkSync(outsideRoot, path.join(sourceRoot, "linked"), "dir");
      linkedPath = true;
    } catch (error) {
      if (!error || !["EPERM", "EACCES", "ENOTSUP", "EINVAL"].includes(error.code)) throw error;
    }
    if (linkedPath) {
      fs.writeFileSync(path.join(sourceRoot, "content.include"), "linked/secret.txt\n");
      assert.throws(() => parseEntries(sourceRoot, false), /symbolic link/);
      fs.rmSync(path.join(sourceRoot, "linked"));
    }
    fs.writeFileSync(path.join(sourceRoot, "content.include"), "bin/\nbin/ne.js\n");
    assert.throws(() => parseEntries(sourceRoot, false), /overlapping or duplicate paths/);

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
