"use strict";

const fs = require("node:fs");
const path = require("node:path");

/**
 * Create a private temporary directory on the same filesystem as its eventual
 * destination. The caller owns cleanup; keep=true prevents process-exit cleanup.
 */
function createPrivateTempDirectory(parentDirectory, prefix) {
	const parent = path.resolve(parentDirectory);
	fs.mkdirSync(parent, { recursive: true });
	const name = fs.mkdtempSync(path.join(parent, prefix || ".ne-"));
	try {
		if (process.platform !== "win32") fs.chmodSync(name, 0o700);
	} catch (error) {
		fs.rmSync(name, { recursive: true, force: true });
		throw error;
	}
	return {
		name,
		removeCallback() {
			fs.rmSync(name, { recursive: true, force: true });
		},
	};
}

/**
 * Write beside a destination inside a private, atomically-created directory,
 * then rename into place. This prevents predictable temp-path pre-creation and
 * avoids cross-filesystem rename failures.
 */
/**
 * Run a file operation against one opened regular-file descriptor.
 * The descriptor pins the file identity so validation and reading cannot
 * silently switch to a different path target between separate filesystem calls.
 */
function withRegularFileDescriptor(filename, callback) {
	const noFollow = Number.isInteger(fs.constants.O_NOFOLLOW) ? fs.constants.O_NOFOLLOW : 0;
	const descriptor = fs.openSync(filename, fs.constants.O_RDONLY | noFollow);
	try {
		const before = fs.fstatSync(descriptor);
		if (!before.isFile()) throw new Error("Expected a regular file: " + filename);
		if (!noFollow) {
			const pathStats = fs.lstatSync(filename);
			if (!pathStats.isFile() || pathStats.isSymbolicLink() ||
				pathStats.dev !== before.dev || pathStats.ino !== before.ino) {
				throw new Error("File path changed while it was being opened: " + filename);
			}
		}
		const result = callback(descriptor, before);
		const after = fs.fstatSync(descriptor);
		if (before.dev !== after.dev || before.ino !== after.ino ||
			before.size !== after.size || before.mtimeMs !== after.mtimeMs ||
			before.ctimeMs !== after.ctimeMs) {
			throw new Error("File changed while it was being read: " + filename);
		}
		return { result, stats: before };
	} finally {
		fs.closeSync(descriptor);
	}
}

function readRegularFileNoFollow(filename, options) {
	const settings = options || {};
	const opened = withRegularFileDescriptor(filename, (descriptor, stats) => {
		if (Number.isFinite(settings.maxBytes) && stats.size > settings.maxBytes) {
			throw new Error("File exceeds the maximum safe read size of " + settings.maxBytes + " bytes: " + filename);
		}
		return fs.readFileSync(descriptor);
	});
	return {
		content: opened.result,
		mode: opened.stats.mode & 0o777,
		size: opened.stats.size,
	};
}

function isRegularFileNoFollow(filename) {
	try {
		withRegularFileDescriptor(filename, () => true);
		return true;
	} catch {
		return false;
	}
}

function writeFileAtomically(filename, contents, options) {
	const settings = options || {};
	const destination = path.resolve(filename);
	const parent = path.dirname(destination);
	fs.mkdirSync(parent, { recursive: true });

	let mode = settings.mode;
	if (mode === undefined) {
		try {
			mode = withRegularFileDescriptor(destination, (_descriptor, stats) => stats.mode & 0o777).result;
		} catch (error) {
			if (!error || error.code !== "ENOENT") throw error;
			mode = 0o600;
		}
	}

	const temporaryDirectory = createPrivateTempDirectory(parent, ".ne-write-");
	const temporaryFile = path.join(temporaryDirectory.name, path.basename(destination));
	try {
		fs.writeFileSync(temporaryFile, contents, {
			encoding: settings.encoding || "utf8",
			flag: "wx",
			mode,
		});
		fs.renameSync(temporaryFile, destination);
	} finally {
		temporaryDirectory.removeCallback();
	}
}

module.exports = {
	createPrivateTempDirectory,
	readRegularFileNoFollow,
	isRegularFileNoFollow,
	writeFileAtomically,
};
