"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const NO_FOLLOW = fs.constants.O_NOFOLLOW || 0;

function readRegularFile(filename, encoding = "utf8") {
	const descriptor = fs.openSync(filename, fs.constants.O_RDONLY | NO_FOLLOW);
	try {
		const stat = fs.fstatSync(descriptor);
		if (!stat.isFile()) {
			const error = new Error("Refusing to read a non-regular file: " + filename);
			error.code = "ERR_NOT_REGULAR_FILE";
			throw error;
		}
		return fs.readFileSync(descriptor, encoding);
	} finally {
		fs.closeSync(descriptor);
	}
}

function readRegularFileIfExists(filename, encoding = "utf8") {
	try {
		return readRegularFile(filename, encoding);
	} catch (error) {
		if (error && error.code === "ENOENT") return undefined;
		throw error;
	}
}

function writeFileAtomically(filename, data, options = {}) {
	const directory = path.dirname(filename);
	fs.mkdirSync(directory, { recursive: true });
	const suffix = crypto.randomBytes(8).toString("hex");
	const temporary = filename + ".tmp-" + process.pid + "-" + suffix;
	const mode = Number.isInteger(options.mode) ? options.mode : 0o600;
	let descriptor;
	try {
		descriptor = fs.openSync(temporary, "wx", mode);
		fs.writeFileSync(descriptor, data, options.encoding ? { encoding: options.encoding } : undefined);
		fs.fsyncSync(descriptor);
		fs.closeSync(descriptor);
		descriptor = undefined;
		fs.renameSync(temporary, filename);
	} catch (error) {
		if (descriptor !== undefined) {
			try { fs.closeSync(descriptor); } catch { /* Preserve the original write error. */ }
		}
		try { fs.rmSync(temporary, { force: true }); } catch { /* Preserve the original write error. */ }
		throw error;
	}
}

function writeFileExclusively(filename, data, options = {}) {
	fs.mkdirSync(path.dirname(filename), { recursive: true });
	let descriptor;
	try {
		descriptor = fs.openSync(filename, "wx", Number.isInteger(options.mode) ? options.mode : 0o600);
		fs.writeFileSync(descriptor, data, options.encoding ? { encoding: options.encoding } : undefined);
		fs.fsyncSync(descriptor);
		return true;
	} catch (error) {
		if (descriptor !== undefined) {
			try { fs.closeSync(descriptor); } catch { /* Preserve the original write error. */ }
			descriptor = undefined;
		}
		if (error && error.code === "EEXIST") return false;
		try { fs.unlinkSync(filename); } catch { /* Preserve the original write error. */ }
		throw error;
	} finally {
		if (descriptor !== undefined) fs.closeSync(descriptor);
	}
}

module.exports = {
	readRegularFile,
	readRegularFileIfExists,
	writeFileAtomically,
	writeFileExclusively,
};
