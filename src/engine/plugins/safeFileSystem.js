"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const NO_FOLLOW = fs.constants.O_NOFOLLOW || 0;
const SAFE_FILE_NAME = /^[A-Za-z0-9._()[\]@%+-]{1,240}$/;

function resolveSafeOutputPath(filename) {
	if (typeof filename !== "string" || !filename.trim()) {
		throw new TypeError("A non-empty output file path is required.");
	}
	const absolute = path.resolve(filename);
	const fileName = path.basename(absolute);
	if (!SAFE_FILE_NAME.test(fileName) || fileName === "." || fileName === "..") {
		throw new Error("Refusing an unsafe output file name.");
	}
	const directory = path.dirname(absolute);
	fs.mkdirSync(directory, { recursive: true });
	const realDirectory = fs.realpathSync(directory);
	if (path.resolve(realDirectory) !== directory) {
		throw new Error("Refusing an output path whose parent traverses a symbolic link.");
	}
	return path.join(realDirectory, fileName);
}

function resolveSafeReadPath(filename) {
	if (typeof filename !== "string" || !filename.trim()) {
		throw new TypeError("A non-empty input file path is required.");
	}
	const absolute = path.resolve(filename);
	const fileName = path.basename(absolute);
	if (!SAFE_FILE_NAME.test(fileName) || fileName === "." || fileName === "..") {
		throw new Error("Refusing an unsafe input file name.");
	}
	const directory = path.dirname(absolute);
	const realDirectory = fs.realpathSync(directory);
	return path.join(realDirectory, fileName);
}

function readRegularFile(filename, encoding = "utf8") {
	const safeFilename = resolveSafeReadPath(filename);
	const descriptor = fs.openSync(safeFilename, fs.constants.O_RDONLY | NO_FOLLOW);
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
	const destination = resolveSafeOutputPath(filename);
	const directory = path.dirname(destination);
	const suffix = crypto.randomBytes(8).toString("hex");
	const temporary = path.join(directory, path.basename(destination) + ".tmp-" + process.pid + "-" + suffix);
	const mode = Number.isInteger(options.mode) ? options.mode : 0o600;
	let descriptor;
	try {
		descriptor = fs.openSync(temporary, "wx", mode);
		fs.writeFileSync(descriptor, data, options.encoding ? { encoding: options.encoding } : undefined);
		fs.fsyncSync(descriptor);
		fs.closeSync(descriptor);
		descriptor = undefined;
		fs.renameSync(temporary, destination);
	} catch (error) {
		if (descriptor !== undefined) {
			try { fs.closeSync(descriptor); } catch { /* Preserve the original write error. */ }
		}
		try { fs.rmSync(temporary, { force: true }); } catch { /* Preserve the original write error. */ }
		throw error;
	}
}

function writeFileExclusively(filename, data, options = {}) {
	const destination = resolveSafeOutputPath(filename);
	let descriptor;
	try {
		descriptor = fs.openSync(destination, "wx", Number.isInteger(options.mode) ? options.mode : 0o600);
		fs.writeFileSync(descriptor, data, options.encoding ? { encoding: options.encoding } : undefined);
		fs.fsyncSync(descriptor);
		return true;
	} catch (error) {
		if (descriptor !== undefined) {
			try { fs.closeSync(descriptor); } catch { /* Preserve the original write error. */ }
			descriptor = undefined;
		}
		if (error && error.code === "EEXIST") return false;
		try { fs.unlinkSync(destination); } catch { /* Preserve the original write error. */ }
		throw error;
	} finally {
		if (descriptor !== undefined) fs.closeSync(descriptor);
	}
}

module.exports = {
	readRegularFile,
	readRegularFileIfExists,
	resolveSafeReadPath,
	resolveSafeOutputPath,
	writeFileAtomically,
	writeFileExclusively,
};
