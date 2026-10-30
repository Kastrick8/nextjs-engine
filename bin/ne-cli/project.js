"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
function loadGen3MigrationDiagnostics() {
	for (const candidate of [
		path.resolve(__dirname, "../../src/engine/plugins/gen3MigrationDiagnostics.js"),
		path.resolve(__dirname, "../../engine/plugins/gen3MigrationDiagnostics.js"),
	]) {
		try {
			const loaded = require(candidate);
			if (loaded && typeof loaded.runGen3MigrationDiagnostics === "function") {
				return loaded.runGen3MigrationDiagnostics;
			}
		} catch {}
	}
	return null;
}

const PACKAGE_NAME = "@kastrick/nextjs-engine";
const STATE_RELATIVE_PATH = path.join(".nextjs-engine", "config", "ne.config.json");
const BACKUP_RELATIVE_PATH = path.join(".nextjs-engine", "cache", "ne-backups");
const DEPENDENCY_FILES = [
	"package.json", "package-lock.json", "npm-shrinkwrap.json",
	"pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb",
];

function findProjectRoot(start) {
	let current = path.resolve(start || process.cwd());
	while (true) {
		if (fs.existsSync(path.join(current, "package.json"))) return current;
		const parent = path.dirname(current);
		if (parent === current) break;
		current = parent;
	}
	throw new Error("No package.json was found in this directory or its parents. Run ne from a project directory.");
}

function readJson(file, fallback) {
	try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

function loadState(root) {
	const value = readJson(path.join(root, STATE_RELATIVE_PATH), {});
	return value && typeof value === "object" ? value : {};
}

function saveState(root, value) {
	const file = path.join(root, STATE_RELATIVE_PATH);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	const temporary = file + ".tmp";
	fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + "\n", "utf8");
	fs.renameSync(temporary, file);
}

function detectPackageManager(root) {
	const pkg = readJson(path.join(root, "package.json"), {});
	if (typeof pkg.packageManager === "string") {
		const declared = pkg.packageManager.split("@")[0];
		if (["npm", "pnpm", "yarn", "bun"].includes(declared)) return declared;
	}
	if (fs.existsSync(path.join(root, "pnpm-lock.yaml"))) return "pnpm";
	if (fs.existsSync(path.join(root, "yarn.lock"))) return "yarn";
	if (fs.existsSync(path.join(root, "bun.lock")) || fs.existsSync(path.join(root, "bun.lockb"))) return "bun";
	return "npm";
}

function managerCommand(manager) {
	return process.platform === "win32" ? manager + ".cmd" : manager;
}

function runProcess(command, args, options) {
	return new Promise((resolve, reject) => {
		const opts = options || {};
		const startedAt = Date.now();
		const label = typeof opts.label === "string" && opts.label.trim() ? opts.label.trim() : "";
		const canAnimate = Boolean(label && process.stdout.isTTY && process.stderr.isTTY &&
			process.env.CI !== "true" && process.env.NE_NO_PROGRESS !== "1" && process.env.NO_COLOR === undefined);
		const report = Boolean(label && !opts.quiet);
		const spinnerFrames = ["|", "/", "-", "\\"];
		let frame = 0;
		let timer = null;
		let finished = false;

		function elapsed() {
			return ((Date.now() - startedAt) / 1000).toFixed(1) + "s";
		}

		function clearStatus() {
			if (canAnimate) process.stdout.write("\r\x1b[2K");
		}

		function renderStatus() {
			if (!canAnimate || finished) return;
			process.stdout.write("\r\x1b[2K" + spinnerFrames[frame++ % spinnerFrames.length] +
				" " + label + " · " + elapsed());
		}

		function completeLine(success, suffix) {
			if (!report) return;
			if (canAnimate) clearStatus();
			process.stdout.write("[NE] " + (success ? "DONE " : "FAILED ") + label +
				" · " + elapsed() + (suffix ? " · " + suffix : "") + "\n");
		}

		if (report && !canAnimate) process.stdout.write("[NE] RUNNING " + label + "\n");
		const child = spawn(command, args, {
			cwd: opts.cwd || process.cwd(),
			env: opts.env || process.env,
			stdio: canAnimate ? ["inherit", "pipe", "pipe"] : (opts.stdio || "inherit"),
			windowsHide: true,
			shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(command),
		});

		function forward(stream, destination) {
			return (chunk) => {
				if (canAnimate) clearStatus();
				destination.write(chunk);
				if (canAnimate && !chunk.toString("utf8").endsWith("\n")) destination.write("\n");
				if (canAnimate) renderStatus();
			};
		}
		if (canAnimate) {
			child.stdout.on("data", forward(child.stdout, process.stdout));
			child.stderr.on("data", forward(child.stderr, process.stderr));
			renderStatus();
			timer = setInterval(renderStatus, 140);
			if (typeof timer.unref === "function") timer.unref();
		}

		function finish() {
			if (finished) return;
			finished = true;
			if (timer) clearInterval(timer);
		}

		child.once("error", (error) => {
			if (finished) return;
			finish();
			completeLine(false, error.message);
			reject(error);
		});
		child.once("close", (code, signal) => {
			if (finished) return;
			finish();
			if (code === 0) {
				completeLine(true);
				resolve();
			} else {
				const reason = signal || ("code " + code);
				completeLine(false, reason);
				reject(new Error(command + " exited with " + reason + "."));
			}
		});
	});
}

function packageScript(root, name) {
	const pkg = readJson(path.join(root, "package.json"), {});
	return Boolean(pkg.scripts && typeof pkg.scripts[name] === "string");
}

async function runPackageScript(root, name) {
	const manager = detectPackageManager(root);
	await runProcess(managerCommand(manager), ["run", name], {
		cwd: root,
		label: manager + " run " + name,
	});
}

function typeScriptCli(root) {
	for (const candidate of [
		path.join(root, "node_modules", "typescript", "bin", "tsc"),
		path.join(root, "node_modules", "typescript", "bin", "tsc.js"),
	]) {
		if (fs.existsSync(candidate)) return candidate;
	}
	return null;
}

function nextCli(root) {
	for (const candidate of [
		path.join(root, "node_modules", "next", "dist", "bin", "next"),
		path.join(root, "node_modules", "next", "dist", "bin", "next.js"),
	]) {
		if (fs.existsSync(candidate)) return candidate;
	}
	return null;
}

async function runNext(root, args) {
	const cli = nextCli(root);
	if (!cli) throw new Error("Next.js CLI was not found in this project. Install the project's dependencies first.");
	const action = Array.isArray(args) && args.length ? args[0] : "command";
	await runProcess(process.execPath, [cli, ...args], {
		cwd: root,
		label: "Next.js " + action,
	});
}

function projectName(root) {
	const pkg = readJson(path.join(root, "package.json"), {});
	return pkg.name || path.basename(root);
}

function safeRelativeTarget(root, relative) {
	const resolved = path.resolve(root, relative);
	const rel = path.relative(root, resolved);
	if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
		throw new Error("Refusing to clean a path outside the project: " + relative);
	}
	return resolved;
}

function cleanTargets(root) {
	const targets = new Set([".next", "dist", "tsconfig.tsbuildinfo",
		path.join(".nextjs-engine", "cache", "ne-downloads"),
		path.join(".nextjs-engine", "cache", "ne-channels-cache.json"),
		path.join(".nextjs-engine", ".cache")]);
	for (const configName of ["next.config.js", "next.config.cjs", "next.config.mjs", "next.config.ts"]) {
		const configPath = path.join(root, configName);
		if (!fs.existsSync(configPath)) continue;
		try {
			const text = fs.readFileSync(configPath, "utf8");
			const match = text.match(/\bdistDir\s*:\s*["']([^"']+)["']/);
			if (match) {
				if (path.isAbsolute(match[1])) throw new Error("next.config distDir must be relative before ne clean can remove it safely.");
				targets.add(match[1]);
			}
		} catch (error) {
			if (error && /distDir/.test(error.message || "")) throw error;
		}
		break;
	}
	return Array.from(targets);
}

async function runClean(root, dryRun) {
	const removed = [];
	const targets = cleanTargets(root);
	process.stdout.write("[NE] Scanning " + targets.length + " safe generated target(s)...\n");
	for (const relative of targets) {
		const target = safeRelativeTarget(root, relative);
		if (!fs.existsSync(target)) continue;
		process.stdout.write("[NE] " + (dryRun ? "Would remove: " : "Removing: ") + relative + "\n");
		removed.push(relative);
		if (!dryRun) fs.rmSync(target, { recursive: true, force: true });
	}
	if (!removed.length) process.stdout.write("[NE] No generated build artifacts were found.\n");
	else process.stdout.write("[NE] " + (dryRun ? "Cleanup preview complete." : "Cleanup complete.") + " " + removed.length + " target(s).\n");
	process.stdout.write("[NE] Channel rollback backups are preserved.\n");
}

function captureDependencyFiles(root) {
	const backupRoot = path.join(root, BACKUP_RELATIVE_PATH);
	fs.mkdirSync(backupRoot, { recursive: true });
	const name = new Date().toISOString().replace(/[:.]/g, "-") + "-" + crypto.randomBytes(3).toString("hex");
	const directory = path.join(backupRoot, name);
	fs.mkdirSync(directory, { recursive: true });
	const files = {};
	for (const relative of DEPENDENCY_FILES) {
		const source = path.join(root, relative);
		const exists = fs.existsSync(source);
		files[relative] = { exists };
		if (exists) fs.copyFileSync(source, path.join(directory, relative));
	}
	fs.writeFileSync(path.join(directory, "backup.json"), JSON.stringify({ files }, null, 2) + "\n", "utf8");
	return { directory, relative: path.relative(root, directory), files };
}

function restoreDependencyFiles(root, backup) {
	const directory = path.resolve(root, backup.directory || path.join(root, backup.relative || ""));
	const allowed = path.resolve(root, BACKUP_RELATIVE_PATH) + path.sep;
	if (!directory.startsWith(allowed)) throw new Error("Rollback backup path is outside the NE backup directory.");
	const details = backup.files || readJson(path.join(directory, "backup.json"), {}).files;
	if (!details) throw new Error("Rollback backup metadata is missing.");
	for (const relative of DEPENDENCY_FILES) {
		const target = path.join(root, relative);
		const info = details[relative] || { exists: false };
		if (info.exists) {
			const source = path.join(directory, relative);
			if (!fs.existsSync(source)) throw new Error("Rollback backup is missing " + relative + ".");
			fs.mkdirSync(path.dirname(target), { recursive: true });
			fs.copyFileSync(source, target);
		} else {
			fs.rmSync(target, { force: true });
		}
	}
}

async function installWithManager(root, target) {
	const manager = detectPackageManager(root);
	let args;
	if (manager === "npm") args = ["install", "--save-exact", target];
	else if (manager === "pnpm") args = ["add", "--save-exact", target];
	else if (manager === "yarn") args = ["add", "--exact", target];
	else args = ["add", "--exact", target];
	await runProcess(managerCommand(manager), args, {
		cwd: root,
		label: "Installing " + target + " with " + manager,
	});
	return manager;
}

function readInstalledPackage(root) {
	return readJson(path.join(root, "node_modules", "@kastrick", "nextjs-engine", "package.json"), null);
}

async function downloadVerifiedArtifact(root, release) {
	if (!release.artifactUrl || !release.sha256) throw new Error("This channel has no verified GitHub package artifact.");
	const response = await fetch(release.artifactUrl, {
		headers: { "User-Agent": "nextjs-engine-ne-cli", Accept: "application/octet-stream" },
		signal: AbortSignal.timeout(30000),
	});
	if (!response.ok) {
		try { await response.body?.cancel(); } catch {}
		throw new Error("GitHub artifact download returned HTTP " + response.status + ".");
	}
	const maxBytes = 100 * 1024 * 1024;
	const declaredSize = Number(response.headers.get("content-length") || 0);
	if (declaredSize > maxBytes) {
		try { await response.body?.cancel(); } catch {}
		throw new Error("Refusing to download an NE package larger than 100 MiB.");
	}
	if (!response.body) throw new Error("GitHub artifact response did not include a body.");

	const directory = path.join(root, ".nextjs-engine", "cache", "ne-downloads");
	fs.mkdirSync(directory, { recursive: true });
	const file = path.join(directory, "nextjs-engine-" + release.version + "-" + release.sha256.slice(0, 12) + ".tgz");
	const temporary = file + ".tmp-" + crypto.randomBytes(6).toString("hex");
	const sha256 = crypto.createHash("sha256");
	const sha512 = crypto.createHash("sha512");
	let totalBytes = 0;
	let header = Buffer.alloc(0);
	const { Transform } = require("node:stream");
	const { pipeline } = require("node:stream/promises");

	try {
		const boundedHash = new Transform({
			transform(chunk, encoding, callback) {
				const bytes = Buffer.from(chunk);
				totalBytes += bytes.length;
				if (totalBytes > maxBytes) {
					callback(new Error("Refusing to cache an NE package larger than 100 MiB."));
					return;
				}
				if (header.length < 2) {
					const needed = 2 - header.length;
					header = Buffer.concat([header, bytes.subarray(0, needed)]);
				}
				sha256.update(bytes);
				sha512.update(bytes);
				callback(null, bytes);
			},
		});
		await pipeline(response.body, boundedHash, fs.createWriteStream(temporary, { flags: "wx" }));
		if (header.length < 2 || header[0] !== 0x1f || header[1] !== 0x8b) {
			throw new Error("The channel artifact is not a gzip package archive.");
		}
		const digest = sha256.digest("hex");
		if (digest !== release.sha256) {
			throw new Error("SHA-256 mismatch for " + release.version + ". No dependency manifest or lockfile was changed.");
		}
		const integrity = sha512.digest("base64");
		// The final filename includes the expected SHA-256 prefix. Replace an old
		// copy only after the new file has streamed and passed its digest check.
		fs.rmSync(file, { force: true });
		fs.renameSync(temporary, file);
		return { file, sha512: integrity };
	} catch (error) {
		fs.rmSync(temporary, { force: true });
		throw error;
	}
}

function verifyInstalledVersion(root, release, artifact) {
	const installed = readInstalledPackage(root);
	if (!installed || installed.name !== PACKAGE_NAME || installed.version !== release.version) {
		throw new Error("Installed package identity did not match " + PACKAGE_NAME + "@" + release.version + ".");
	}
	if (artifact) {
		const lockPath = ["npm-shrinkwrap.json", "package-lock.json"].map((name) => path.join(root, name))
			.find((file) => fs.existsSync(file));
		if (lockPath) {
			const lock = readJson(lockPath, {});
			const entry = (lock.packages && lock.packages["node_modules/" + PACKAGE_NAME]) ||
				(lock.dependencies && lock.dependencies[PACKAGE_NAME]);
			if (!entry || !entry.integrity || !entry.integrity.split(/\s+/).includes("sha512-" + artifact.sha512)) {
				throw new Error("The lockfile integrity did not match the checksum-verified artifact.");
			}
		}
	}
	return installed;
}

function normalizeArtifactDependency(root, release, artifact) {
	if (!release || !release.artifactUrl || !artifact || !artifact.file || !artifact.sha512) {
		throw new Error("The verified artifact is missing its URL, local file, or integrity digest.");
	}
	const packageFile = path.join(root, "package.json");
	const pkgText = fs.readFileSync(packageFile, "utf8");
	const pkg = JSON.parse(pkgText);
	const sections = ["dependencies", "devDependencies", "optionalDependencies"];
	let foundDependency = false;
	for (const section of sections) {
		if (pkg[section] && Object.prototype.hasOwnProperty.call(pkg[section], PACKAGE_NAME)) {
			pkg[section][PACKAGE_NAME] = release.artifactUrl;
			foundDependency = true;
		}
	}
	if (!foundDependency) {
		throw new Error("The package manager did not save " + PACKAGE_NAME + " to package.json; refusing to leave an untracked install.");
	}
	const indent = (pkgText.match(/\n([ \t]+)"/) || [null, "\t"])[1];
	fs.writeFileSync(packageFile, JSON.stringify(pkg, null, indent) + "\n", "utf8");

	const manager = detectPackageManager(root);
	const lockFilesByManager = {
		npm: ["npm-shrinkwrap.json", "package-lock.json"],
		pnpm: ["pnpm-lock.yaml"],
		yarn: ["yarn.lock"],
		bun: ["bun.lock"],
	};
	if (manager === "bun" && fs.existsSync(path.join(root, "bun.lockb")) && !fs.existsSync(path.join(root, "bun.lock"))) {
		throw new Error("This Bun project still uses binary bun.lockb. Convert it to bun.lock before installing a verified NE channel artifact.");
	}

	const tarballName = path.basename(artifact.file);
	const escapedName = tarballName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const localFileReference = new RegExp("file:[^\\s\"'\\x60,}]*" + escapedName, "g");
	const remoteUrl = release.artifactUrl;
	const rewriteTextLock = (text) => {
		let updated = text.replace(localFileReference, remoteUrl);
		updated = updated.split(artifact.file).join(remoteUrl);
		const relativeFile = path.relative(root, artifact.file);
		if (relativeFile) updated = updated.split(relativeFile).join(remoteUrl);
		if (new RegExp("file:[^\\s\"'\\x60,}]*" + escapedName).test(updated) ||
			updated.includes(artifact.file) || (relativeFile && updated.includes(relativeFile))) {
			throw new Error("Could not normalize the local verified artifact reference in a lockfile.");
		}
		return updated;
	};

	let lockCount = 0;
	for (const name of lockFilesByManager[manager] || []) {
		const file = path.join(root, name);
		if (!fs.existsSync(file)) continue;
		const text = fs.readFileSync(file, "utf8");
		let updated;
		if (name === "package-lock.json" || name === "npm-shrinkwrap.json") {
			const lock = JSON.parse(text);
			for (const section of sections) {
				if (lock.packages && lock.packages[""] && lock.packages[""][section] &&
					Object.prototype.hasOwnProperty.call(lock.packages[""][section], PACKAGE_NAME)) {
					lock.packages[""][section][PACKAGE_NAME] = remoteUrl;
				}
			}
			const packageEntry = lock.packages && lock.packages["node_modules/" + PACKAGE_NAME];
			const legacyEntry = lock.dependencies && lock.dependencies[PACKAGE_NAME];
			if (packageEntry) {
				packageEntry.version = release.version;
				packageEntry.resolved = remoteUrl;
				packageEntry.integrity = "sha512-" + artifact.sha512;
			}
			if (legacyEntry) {
				legacyEntry.version = release.version;
				legacyEntry.resolved = remoteUrl;
				legacyEntry.integrity = "sha512-" + artifact.sha512;
			}
			if (!packageEntry && !legacyEntry) {
				throw new Error(name + " did not contain an entry for " + PACKAGE_NAME + " after installation.");
			}
			updated = rewriteTextLock(JSON.stringify(lock, null, 2) + "\n");
		} else {
			updated = rewriteTextLock(text);
		}
		if (!updated.includes(artifact.sha512) && !(name === "yarn.lock" && /^\s*checksum:\s*\S+/m.test(updated))) {
			throw new Error(name + " did not preserve integrity metadata for the verified artifact.");
		}
		fs.writeFileSync(file, updated, "utf8");
		lockCount += 1;
	}
	if (lockCount === 0) {
		throw new Error("No supported text lockfile was available to pin the verified channel artifact. Refusing to save an unpinned dependency.");
	}
	return { manager, lockFilesUpdated: lockCount, dependencyUrl: remoteUrl };
}

async function installRelease(root, release, requestedChannel) {
	if (!release || !release.version) throw new Error("No installable release was selected.");
	const current = loadState(root);
	let backup = null;
	let artifact = null;
	let managerInstallStarted = false;
	try {
		let installTarget = release.installSpec;
		if (release.source === "github") {
			artifact = await downloadVerifiedArtifact(root, release);
			// Install the exact local bytes that passed SHA-256 validation. Do not
			// ask the package manager to download the URL a second time.
			installTarget = artifact.file;
		}
		backup = captureDependencyFiles(root);
		managerInstallStarted = true;
		await installWithManager(root, installTarget);
		if (artifact) normalizeArtifactDependency(root, release, artifact);
		const installed = verifyInstalledVersion(root, release, artifact);
		const resolvedChannel = requestedChannel || (release.track === "beta" ? "latest-green" : release.track);
		saveState(root, {
			schemaVersion: 1,
			controlScheme: current.controlScheme || "hybrid",
			activeChannel: resolvedChannel,
			installedVersion: installed.version,
			installedCommit: release.sourceCommit || null,
			sha256: release.sha256 || null,
			source: release.source,
			cacheDir: path.join(".nextjs-engine", "cache"),
			defaultAndTerminalHeight: current.defaultAndTerminalHeight || 5,
			previous: {
				activeChannel: current.activeChannel || null,
				installedVersion: current.installedVersion || null,
				installedCommit: current.installedCommit || null,
				source: current.source || null,
				backup: backup.relative,
				files: backup.files,
			},
		});
		process.stdout.write("[NE] Installed " + PACKAGE_NAME + "@" + installed.version + " (" + resolvedChannel + ").\n");
		if (release.sourceCommit) process.stdout.write("[NE] Source commit: " + release.sourceCommit + "\n");
		return installed;
	} catch (error) {
		if (backup) {
			try {
				restoreDependencyFiles(root, backup);
				if (managerInstallStarted) {
					await runProcess(managerCommand(detectPackageManager(root)), ["install"], { cwd: root });
				}
			} catch (restoreError) {
				error.message += " Automatic rollback also failed: " + restoreError.message;
			}
		}
		throw error;
	}
}

async function rollback(root) {
	const state = loadState(root);
	if (!state.previous || !state.previous.backup) {
		throw new Error("No NE rollback snapshot is available. Install a channel with ne update first.");
	}
	const backupRoot = path.resolve(root, BACKUP_RELATIVE_PATH);
	const backupDirectory = path.resolve(root, state.previous.backup);
	if (!backupDirectory.startsWith(backupRoot + path.sep)) {
		throw new Error("Rollback state points outside the managed NE backup directory.");
	}
	const currentBackup = captureDependencyFiles(root);
	try {
		restoreDependencyFiles(root, { directory: backupDirectory, files: state.previous.files });
		await runProcess(managerCommand(detectPackageManager(root)), ["install"], { cwd: root });
		const restored = readInstalledPackage(root);
		if (state.previous.installedVersion && (!restored || restored.version !== state.previous.installedVersion)) {
			throw new Error("Restored package version did not match the saved NE state.");
		}
		saveState(root, {
			...state,
			activeChannel: state.previous.activeChannel || "unknown",
			installedVersion: state.previous.installedVersion || null,
			installedCommit: state.previous.installedCommit || null,
			source: state.previous.source || null,
			previous: {
				activeChannel: state.activeChannel || null,
				installedVersion: state.installedVersion || null,
				installedCommit: state.installedCommit || null,
				source: state.source || null,
				backup: currentBackup.relative,
				files: currentBackup.files,
			},
		});
		process.stdout.write("[NE] Rollback complete.\n");
	} catch (error) {
		try {
			restoreDependencyFiles(root, currentBackup);
			await runProcess(managerCommand(detectPackageManager(root)), ["install"], { cwd: root });
		} catch (restoreError) {
			error.message += " Failed to restore the pre-rollback dependency state: " + restoreError.message;
		}
		throw error;
	}
}

async function runCheck(root) {
	let errors = 0;
	if (packageScript(root, "type-check")) {
		try { await runPackageScript(root, "type-check"); }
		catch (error) {
			errors += 1;
			process.stderr.write("[NE-CHECK] Type-check failed: " + error.message + "\n");
		}
	} else if (fs.existsSync(path.join(root, "tsconfig.json"))) {
		const cli = typeScriptCli(root);
		if (!cli) {
			errors += 1;
			process.stderr.write("[NE-CHECK] tsconfig.json exists but TypeScript is not installed.\n");
		} else {
			try { await runProcess(process.execPath, [cli, "--noEmit"], { cwd: root }); }
			catch (error) {
				errors += 1;
				process.stderr.write("[NE-CHECK] Type-check failed: " + error.message + "\n");
			}
		}
	} else {
		process.stdout.write("[NE-CHECK] No TypeScript project was detected; skipping tsc.\n");
	}

	const runGen3MigrationDiagnostics = loadGen3MigrationDiagnostics();
	if (typeof runGen3MigrationDiagnostics === "function") {
		process.stdout.write("[NE-CHECK] Running Generation 3 migration diagnostics...\n");
		const pkg = readJson(path.join(root, "package.json"), {});
		const isEngineSource = pkg.name === "nextjs-engine" && fs.existsSync(path.join(root, "src", "engine", "plugins", "gen3MigrationDiagnostics.js"));
		if (!isEngineSource) {
			const warnings = [];
			const errorsFound = [];
			const originalWarn = console.warn;
			const originalError = console.error;
			let diagnostics = [];
			console.warn = (...args) => warnings.push(args.join(" "));
			console.error = (...args) => errorsFound.push(args.join(" "));
			try {
				diagnostics = runGen3MigrationDiagnostics({ rootDir: root, development: true }) || [];
			} finally {
				console.warn = originalWarn;
				console.error = originalError;
			}
			for (const line of [...warnings, ...errorsFound]) process.stdout.write(line + "\n");
			const fatal = diagnostics.filter((item) => item && item.severity === "error");
			errors += fatal.length;
			if (fatal.length) process.stderr.write("[NE-CHECK] " + fatal.length + " migration error(s) must be fixed.\n");
			if (!diagnostics.length) process.stdout.write("[NE-CHECK] No Generation 3 migration diagnostics were found.\n");
		} else {
			process.stdout.write("[NE-CHECK] Running inside the NE source repository; skipping self-scanning migration rules.\n");
		}
	}
	if (errors) throw new Error("ne check failed with " + errors + " error(s).");
	process.stdout.write("[NE-CHECK] Checks passed.\n");
}

async function runBuild(root) {
	if (packageScript(root, "prepare:production")) {
		process.stdout.write("[NE] Preparing production artifacts...\n");
		await runPackageScript(root, "prepare:production");
	}
	await runCheck(root);
	process.stdout.write("[NE] Running the Next.js production build...\n");
	await runNext(root, ["build"]);
}

module.exports = {
	PACKAGE_NAME,
	findProjectRoot,
	readJson,
	loadState,
	saveState,
	detectPackageManager,
	runProcess,
	packageScript,
	runPackageScript,
	nextCli,
	runNext,
	projectName,
	cleanTargets,
	runClean,
	captureDependencyFiles,
	restoreDependencyFiles,
	downloadVerifiedArtifact,
	verifyInstalledVersion,
	installRelease,
	normalizeArtifactDependency,
	rollback,
	runCheck,
	runBuild,
};
