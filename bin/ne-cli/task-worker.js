"use strict";

const { parentPort } = require("node:worker_threads");
const { spawn } = require("node:child_process");

const MAX_CAPTURE_BYTES = 256 * 1024;

function appendTail(previous, chunk) {
	const next = Buffer.concat([previous, Buffer.from(chunk)]);
	if (next.length <= MAX_CAPTURE_BYTES) return next;
	return next.subarray(next.length - MAX_CAPTURE_BYTES);
}

function run(request) {
	return new Promise((resolve) => {
		let stdout = Buffer.alloc(0);
		let stderr = Buffer.alloc(0);
		let settled = false;
		const child = spawn(request.command, request.args || [], {
			cwd: request.cwd || process.cwd(),
			env: { ...process.env, ...(request.env || {}) },
			stdio: ["ignore", "pipe", "pipe"],
			windowsHide: true,
			shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(request.command),
		});

		child.stdout.on("data", (chunk) => { stdout = appendTail(stdout, chunk); });
		child.stderr.on("data", (chunk) => { stderr = appendTail(stderr, chunk); });

		function finish(result) {
			if (settled) return;
			settled = true;
			resolve({
				...result,
				stdout: stdout.toString("utf8"),
				stderr: stderr.toString("utf8"),
				outputTruncated: stdout.length === MAX_CAPTURE_BYTES || stderr.length === MAX_CAPTURE_BYTES,
			});
		}

		child.once("error", (error) => finish({
			code: null,
			signal: null,
			error: error.message || String(error),
		}));
		child.once("close", (code, signal) => finish({ code, signal: signal || null }));
	});
}

if (!parentPort) {
	throw new Error("NE task worker must be started by the NE CLI worker pool.");
}

parentPort.once("message", async (request) => {
	try {
		const result = await run(request);
		parentPort.postMessage({ type: "result", result });
	} catch (error) {
		parentPort.postMessage({
			type: "result",
			result: {
				code: null,
				signal: null,
				error: error && error.message || String(error),
				stdout: "",
				stderr: "",
				outputTruncated: false,
			},
		});
	} finally {
		parentPort.close();
	}
});
