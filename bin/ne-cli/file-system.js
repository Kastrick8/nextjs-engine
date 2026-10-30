"use strict";

const fs = require("node:fs");
const path = require("node:path");
const tmp = require("tmp");

/**
 * Create a private temporary directory on the same filesystem as its eventual
 * destination. The caller owns cleanup; keep=true prevents process-exit cleanup.
 */
function createPrivateTempDirectory(parentDirectory, prefix) {
	const parent = path.resolve(parentDirectory);
	fs.mkdirSync(parent, { recursive: true });
	return tmp.dirSync({
		tmpdir: parent,
		prefix: prefix || ".ne-",
		mode: 0o700,
		keep: true,
		unsafeCleanup: true,
	});
}

/**
 * Write beside a destination inside a private, atomically-created directory,
 * then rename into place. This prevents predictable temp-path pre-creation and
 * avoids cross-filesystem rename failures.
 */
function writeFileAtomically(filename, contents, options) {
	const settings = options || {};
	const destination = path.resolve(filename);
	const parent = path.dirname(destination);
	fs.mkdirSync(parent, { recursive: true });

	let mode = settings.mode;
	if (mode === undefined) {
		try {
			mode = fs.statSync(destination).mode & 0o777;
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
	writeFileAtomically,
};
