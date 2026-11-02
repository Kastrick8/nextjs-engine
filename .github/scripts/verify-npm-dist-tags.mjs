#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const [tagsFile, version, track, versionTag, channelTag = "", archiveRoot = "."] = process.argv.slice(2);
if (!tagsFile || !version || !track || !versionTag) {
  throw new Error("Usage: verify-npm-dist-tags.mjs <dist-tags.json> <version> <track> <version-tag> <channel-tag> [archive-root]");
}

const packageName = "@kastrick/nextjs-engine";
let tags = JSON.parse(fs.readFileSync(tagsFile, "utf8"));
const isPrerelease = (value) => /-(?:alpha|beta)\./.test(String(value || ""));
const expectedTrack = version.includes("-alpha.") ? "alpha" : version.includes("-beta.") ? "beta" : "stable";

if (track !== expectedTrack) {
  throw new Error(`Track mismatch: workflow selected ${track}, but ${version} is ${expectedTrack}.`);
}
if (!/^package-(?:alpha|beta)\./.test(versionTag) && !/^package\./.test(versionTag)) {
  throw new Error(`Unexpected immutable package dist-tag name: ${versionTag}`);
}
if (versionTag === version) {
  throw new Error("Immutable version dist-tags must be aliases, not raw SemVer strings.");
}
if (tags[versionTag] !== version) {
  throw new Error(`npm dist-tag ${versionTag} points to ${tags[versionTag] || "nothing"}, expected ${version}.`);
}
if (channelTag && tags[channelTag] !== version) {
  throw new Error(`npm channel dist-tag ${channelTag} points to ${tags[channelTag] || "nothing"}, expected ${version}.`);
}
if (track !== "stable" && channelTag === "latest") {
  throw new Error("Alpha/beta releases must never advance npm's default latest dist-tag.");
}

// Older workflows or manual publishes may have left npm's default latest alias
// pointing at a prerelease. Repair that state to the newest stable version that
// is both archived here and already present in the registry before accepting
// a prerelease channel update.
if (!tags.latest || isPrerelease(tags.latest)) {
  const stable = [];
  const root = path.resolve(archiveRoot, "version");
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "package.json") {
        const manifest = JSON.parse(fs.readFileSync(full, "utf8"));
        if (manifest.name === packageName && /^\d+\.\d+\.\d+$/.test(manifest.version || "")) {
          stable.push(manifest.version);
        }
      }
    }
  };
  walk(root);
  stable.sort((a, b) => {
    const A = a.split(".").map(Number), B = b.split(".").map(Number);
    for (let i = 0; i < 3; i += 1) if (A[i] !== B[i]) return A[i] - B[i];
    return 0;
  });

  let stableVersion = "";
  for (const candidate of stable.reverse()) {
    try {
      execFileSync("npm", ["view", `${packageName}@${candidate}`, "version"], { stdio: "ignore" });
      stableVersion = candidate;
      break;
    } catch {
      // Keep searching; an archive snapshot is not necessarily published.
    }
  }
  if (!stableVersion) {
    throw new Error("npm latest was missing or pointed at a prerelease, but no published stable archive version was found to repair it.");
  }
  execFileSync("npm", ["dist-tag", "add", `${packageName}@${stableVersion}`, "latest"], { stdio: "inherit" });
  tags.latest = stableVersion;
}

// Re-read the registry after any repair so the check validates the
// persisted dist-tag map, not merely the intended npm CLI operation.
tags = JSON.parse(execFileSync("npm", ["view", packageName, "dist-tags", "--json"], { encoding: "utf8" }));

if (tags[versionTag] !== version) {
  throw new Error(`Final registry check: ${versionTag} points to ${tags[versionTag] || "nothing"}, expected ${version}.`);
}
if (channelTag && tags[channelTag] !== version) {
  throw new Error(`Final registry check: ${channelTag} points to ${tags[channelTag] || "nothing"}, expected ${version}.`);
}
if (isPrerelease(tags.latest)) {
  throw new Error(`npm latest still points to prerelease ${tags.latest}; refusing to report a successful release.`);
}
if (track === "stable" && channelTag === "latest" && tags.latest !== version) {
  throw new Error(`Stable release expected latest=${version}, but registry reports ${tags.latest}.`);
}

console.log(JSON.stringify({
  package: packageName,
  version,
  track,
  versionTag: tags[versionTag],
  channelTag: channelTag ? tags[channelTag] : null,
  latest: tags.latest,
}, null, 2));
