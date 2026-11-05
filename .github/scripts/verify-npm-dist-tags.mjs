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
const isStableVersion = (value) => /^\d+\.\d+\.\d+$/.test(String(value || ""));
function compareStableVersions(leftText, rightText) {
  const left = String(leftText || "").split(".").map(Number);
  const right = String(rightText || "").split(".").map(Number);
  if (left.length !== 3 || right.length !== 3
    || left.some((part) => !Number.isInteger(part))
    || right.some((part) => !Number.isInteger(part))) return -1;
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index] ? 1 : -1;
  }
  return 0;
}
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

// Keep npm's default latest alias on a stable package. Repair a missing,
// prerelease-valued, invalid, or stale stable alias to the highest stable snapshot
// that is both present in this archive and already published to the registry.
{
  const stable = [];
  const root = path.resolve(archiveRoot, "version");
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "package.json") {
        const manifest = JSON.parse(fs.readFileSync(full, "utf8"));
        if (manifest.name === packageName && isStableVersion(manifest.version)) {
          stable.push(manifest.version);
        }
      }
    }
  };
  walk(root);
  stable.sort(compareStableVersions);

  let newestPublishedStable = "";
  for (const candidate of stable.reverse()) {
    try {
      execFileSync("npm", ["view", `${packageName}@${candidate}`, "version"], { stdio: "ignore" });
      newestPublishedStable = candidate;
      break;
    } catch {
      // An archived snapshot is not necessarily published yet; keep searching.
    }
  }

  const latestNeedsRepair = !isStableVersion(tags.latest)
    || (newestPublishedStable && compareStableVersions(tags.latest, newestPublishedStable) < 0);
  if (latestNeedsRepair) {
    if (!newestPublishedStable) {
      throw new Error("npm latest was missing, invalid, or a prerelease, but no published stable archive version was found to repair it.");
    }
    execFileSync("npm", ["dist-tag", "add", `${packageName}@${newestPublishedStable}`, "latest"], { stdio: "inherit" });
  }
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
