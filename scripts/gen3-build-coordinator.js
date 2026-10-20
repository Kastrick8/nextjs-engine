"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const node = process.execPath;
const compilerScript = path.join(projectRoot, "scripts", "gen3-build-compiler.js");
const prepareScript = path.join(projectRoot, "scripts", "gen3-prepare-production.js");
const typeScriptBin = path.join(projectRoot, "node_modules", "typescript", "bin", "tsc");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

function run(label, command, args, env = process.env) {
	return new Promise((resolve, reject) => {
		console.log("nextjs-engine | " + label);
		const child = spawn(command, args, { cwd: projectRoot, env, stdio: "inherit", windowsHide: true });
		child.once("error", (error) => reject(new Error(label + " could not start: " + error.message)));
		child.once("close", (code, signal) => {
			if (code === 0) resolve();
			else reject(new Error(label + " failed with " + (signal ? "signal " + signal : "exit code " + code)));
		});
	});
}

function runParallelBuilds(manifestFile) {
	return new Promise((resolve, reject) => {
		const env = { ...process.env, ENGINE_COMPILER_LOGS: "1" };
		const children = [];
		let hasFailed = false;
		let completed = 0;
		let failureMessage = "";

		function stopOthers(failedChild) {
			for (const child of children) {
				if (child !== failedChild && child.exitCode === null && !child.killed) child.kill("SIGTERM");
			}
		}
		function start(label, command, args) {
			console.log("nextjs-engine | Starting alongside Next.js: " + label);
			const child = spawn(command, args, { cwd: projectRoot, env, stdio: "inherit", windowsHide: true });
			children.push(child);
			child.once("error", (error) => {
				if (!hasFailed) {
					hasFailed = true;
					failureMessage = label + " could not start: " + error.message;
					stopOthers(child);
				}
			});
			child.once("close", (code, signal) => {
				completed += 1;
				if (code !== 0 && !hasFailed) {
					hasFailed = true;
					failureMessage = label + " failed with " + (signal ? "signal " + signal : "exit code " + code);
					stopOthers(child);
				}
				if (completed === 2) {
					if (hasFailed) reject(new Error(failureMessage));
					else resolve();
				}
			});
		}
		start("Next.js production compiler", node, [nextBin, "build"]);
		start("Generation 3 schema compiler", node, [compilerScript, "--scan", "--project-root", projectRoot, "--output", manifestFile]);
	});
}

async function main() {
	if (!fs.existsSync(nextBin)) throw new Error("Next.js is not installed. Run the repository's dependency install first.");
	if (!fs.existsSync(typeScriptBin)) throw new Error("TypeScript is not installed. Run the repository's dependency install first.");

	const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "nextjs-engine-build-"));
	const manifestFile = path.join(scratch, "compiler-manifest.json");
	try {
		await run("Preparing production-only routes and generated types", node, [prepareScript]);
		await run("Type-checking the Generation 3 compiler and application", node, [typeScriptBin, "--noEmit"]);
		await runParallelBuilds(manifestFile);
		if (!fs.existsSync(manifestFile)) throw new Error("Generation 3 compiler did not produce its temporary manifest.");
		await run("Finalizing Engine artifacts after Next.js build success", node, [
			compilerScript, "--emit", "--project-root", projectRoot, "--input", manifestFile,
		]);
		console.log("nextjs-engine | Production build and Engine artifact emission completed");
	} finally {
		fs.rmSync(scratch, { recursive: true, force: true });
	}
}

main().catch((error) => {
	console.error("nextjs-engine | BUILD FAILED — " + (error instanceof Error ? error.message : String(error)));
	process.exitCode = 1;
});
