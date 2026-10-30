"use strict";

const { parentPort } = require("node:worker_threads");
const { spawn } = require("node:child_process");

const MAX_CAPTURE_BYTES = 256 * 1024;

function appendTail(previous, chunk) {
	const next = Buffer.concat([previous, Buffer.from(chunk)]);
	if (next.length <= MAX_CAPTURE_BYTES) return next;
	return next.subarray(next.length - MAX_CAPTURE_BYTES);
}

function resolveProcessInvocation(command, args) {
	if (process.platform !== "win32") return { command, args };
	if (/\.(?:cmd|bat)$/i.test(command)) {
		throw new Error("NE workers do not execute .cmd/.bat wrappers through a shell.");
	}
	const pathApi = require("node:path").win32;
	const basename = pathApi.basename(command).replace(/\.exe$/i, "").toLowerCase();
	if (/[\\/]/.test(command) || !["npm", "npx", "pnpm", "yarn"].includes(basename)) {
		return { command, args };
	}
	const runtimeDirectory = pathApi.dirname(process.execPath);
	const candidates = {
		npm: [pathApi.join(runtimeDirectory, "node_modules", "npm", "bin", "npm-cli.js")],
		npx: [pathApi.join(runtimeDirectory, "node_modules", "npm", "bin", "npx-cli.js")],
		pnpm: [pathApi.join(runtimeDirectory, "node_modules", "corepack", "dist", "pnpm.js")],
		yarn: [pathApi.join(runtimeDirectory, "node_modules", "corepack", "dist", "yarn.js")],
	}[basename];
	const scriptPath = candidates.find((candidate) => require("node:fs").existsSync(candidate));
	if (!scriptPath) {
		throw new Error("NE worker could not locate the JavaScript entry point for '" + basename + "' beside the active Node.js installation.");
	}
	return { command: process.execPath, args: [scriptPath, ...args] };
}

function run(request) {
	return new Promise((resolve) => {
		let stdout = Buffer.alloc(0);
		let stderr = Buffer.alloc(0);
		let settled = false;
		let invocation;
		try {
			invocation = resolveProcessInvocation(request.command, request.args || []);
		} catch (error) {
			finish({ code: null, signal: null, error: error.message || String(error) });
			return;
		}
		const child = spawn(invocation.command, invocation.args, {
			cwd: request.cwd || process.cwd(),
			env: { ...process.env, ...(request.env || {}) },
			stdio: ["ignore", "pipe", "pipe"],
			windowsHide: true,
			shell: false,
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
