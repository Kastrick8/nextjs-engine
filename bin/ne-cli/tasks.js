"use strict";

const path = require("node:path");
const { Worker } = require("node:worker_threads");

const MAX_WORKERS = 3;
const workerFile = path.join(__dirname, "task-worker.js");

class CommandWorkerPool {
	constructor(maxWorkers) {
		this.maxWorkers = Math.max(1, Math.min(3, Number(maxWorkers) || MAX_WORKERS));
		this.active = 0;
		this.queue = [];
	}

	run(command, args, options) {
		return new Promise((resolve, reject) => {
			this.queue.push({
				command,
				args: Array.isArray(args) ? args : [],
				options: options || {},
				resolve,
				reject,
			});
			this.drain();
		});
	}

	drain() {
		while (this.active < this.maxWorkers && this.queue.length) {
			const job = this.queue.shift();
			this.start(job);
		}
	}

	start(job) {
		this.active += 1;
		let settled = false;
		let result = null;
		const worker = new Worker(workerFile);

		const settle = (error, value) => {
			if (settled) return;
			settled = true;
			if (error) job.reject(error);
			else job.resolve(value);
		};

		worker.once("message", (message) => {
			if (!message || message.type !== "result") return;
			result = message.result;
			settle(null, result);
		});
		worker.once("error", (error) => {
			settle(error);
		});
		worker.once("exit", (code) => {
			this.active = Math.max(0, this.active - 1);
			if (!settled) {
				settle(new Error("NE worker exited before returning its task result (exit " + code + ")."));
			}
			this.drain();
		});

		try {
			worker.postMessage({
				command: job.command,
				args: job.args,
				cwd: job.options.cwd,
				env: job.options.env,
			});
		} catch (error) {
			settle(error);
			worker.terminate().catch(() => {});
		}
	}
}

const commandWorkers = new CommandWorkerPool(MAX_WORKERS);

function ansiEnabled() {
	return Boolean(process.stdout.isTTY && process.stderr.isTTY) &&
		!process.env.NO_COLOR && process.env.NE_COLOR !== "0";
}

function paint(value, code) {
	return ansiEnabled() ? "\x1b[" + code + "m" + value + "\x1b[0m" : value;
}

function clip(value, width) {
	const text = String(value == null ? "" : value)
		.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
		.replace(/[\r\n\t]+/g, " ");
	if (text.length <= width) return text;
	if (width < 4) return text.slice(0, width);
	return text.slice(0, width - 3) + "...";
}

function statusText(status, frame) {
	if (status === "running") return paint((["◐", "◓", "◑", "◒"][frame % 4]) + " RUNNING", "36;1");
	if (status === "success") return paint("✓ DONE", "32;1");
	if (status === "failed") return paint("✕ FAILED", "31;1");
	if (status === "skipped") return paint("— SKIPPED", "33");
	return paint("… PENDING", "90");
}

class TaskTree {
	constructor(command) {
		this.command = String(command || "ne");
		this.nodes = [];
		this.byId = new Map();
		this.frame = 0;
		this.timer = null;
		this.finished = false;
		this.failed = false;
		this.lastTaskId = null;
		this.lastError = null;
		this.interactive = Boolean(process.stdout.isTTY && process.stderr.isTTY);
		this.root = {
			id: "root",
			label: this.command,
			parentId: null,
			status: "running",
			detail: "",
		};
		this.byId.set("root", this.root);
		if (this.interactive) {
			this.draw();
			this.timer = setInterval(() => {
				if (this.finished) return;
				this.frame += 1;
				this.draw();
			}, 120);
			if (typeof this.timer.unref === "function") this.timer.unref();
		} else {
			process.stdout.write("> " + this.command + "\n");
			process.stdout.write("[NE] RUNNING " + this.command + "\n");
		}
	}

	add(id, label, parentId) {
		if (!id || this.byId.has(id)) throw new Error("Duplicate or empty NE task id: " + id);
		const parent = parentId || "root";
		if (!this.byId.has(parent)) throw new Error("Unknown parent task: " + parent);
		const node = {
			id,
			label: String(label || id),
			parentId: parent,
			status: "pending",
			detail: "",
		};
		this.nodes.push(node);
		this.byId.set(id, node);
		this.renderChange(node, "PLAN");
		return node;
	}

	setStatus(id, status, detail) {
		const node = this.byId.get(id);
		if (!node) throw new Error("Unknown NE task id: " + id);
		node.status = status;
		if (detail !== undefined) node.detail = String(detail || "");
		this.lastTaskId = id;
		this.renderChange(node, status.toUpperCase());
	}

	start(id, detail) {
		this.setStatus(id, "running", detail);
	}

	update(id, detail) {
		const node = this.byId.get(id);
		if (!node) return;
		node.detail = String(detail || "");
		if (this.interactive) this.draw();
	}

	succeed(id, detail) {
		this.setStatus(id, "success", detail);
	}

	skip(id, detail) {
		this.setStatus(id, "skipped", detail || "Not required");
	}

	renderChange(node, action) {
		if (this.finished || this.failed) return;
		if (this.interactive) this.draw();
		else if (action === "RUNNING" || action === "SUCCESS" || action === "SKIPPED" || action === "FAILED") {
			process.stdout.write("[NE] " + action + " " + node.label +
				(node.detail ? " · " + node.detail : "") + "\n");
		}
	}

	depthOf(node) {
		let depth = 1;
		let current = node;
		while (current.parentId && current.parentId !== "root") {
			depth += 1;
			current = this.byId.get(current.parentId);
			if (!current) break;
		}
		return depth;
	}

	renderRows() {
		const rows = [
			"> " + this.command + "  " + statusText(this.root.status, this.frame),
		];
		for (const node of this.nodes) {
			const depth = this.depthOf(node);
			const arrow = depth === 1 ? "->" : "-".repeat(depth) + ">";
			rows.push(arrow + " " + node.label + "  " + statusText(node.status, this.frame));
			if (node.detail) rows.push("   " + node.detail);
		}
		return rows;
	}

	draw() {
		if (!this.interactive) return;
		const width = Math.max(52, Math.min(Number(process.stdout.columns) || 80, 112));
		const inner = width - 4;
		const borderChars = ["─", "━", "═", "━"];
		const border = borderChars[this.frame % borderChars.length];
		const color = this.root.status === "failed" ? "31;1" : this.root.status === "success" ? "32;1" : "36;1";
		const title = " NE TASK TREE · " + this.command + " ";
		const top = "╭" + border + title + border.repeat(Math.max(1, width - title.length - 2)) + "╮";
		const bottom = "╰" + border.repeat(width - 2) + "╯";
		const rows = [top, ...this.renderRows().map((line) => "│ " + clip(line, inner).padEnd(inner, " ") + " │"), bottom];
		process.stdout.write("\x1b[2J\x1b[H\x1b[?25l" + paint(rows.join("\n"), color) + "\x1b[?25h");
	}

	stopTimer() {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	complete() {
		if (this.finished) return;
		this.root.status = "success";
		this.finished = true;
		this.stopTimer();
		if (this.interactive) this.drawFinal();
		else process.stdout.write("[NE] DONE " + this.command + "\n");
	}

	drawFinal() {
		if (!this.interactive) return;
		const width = Math.max(52, Math.min(Number(process.stdout.columns) || 80, 112));
		const inner = width - 4;
		const title = " NE TASK TREE · " + this.command + " ";
		const border = "═";
		const top = "╭" + border + title + border.repeat(Math.max(1, width - title.length - 2)) + "╮";
		const bottom = "╰" + border.repeat(width - 2) + "╯";
		const rows = [top, ...this.renderRows().map((line) => "│ " + clip(line, inner).padEnd(inner, " ") + " │"), bottom];
		process.stdout.write("\x1b[2J\x1b[H" + paint(rows.join("\n"), "32;1") + "\n\x1b[?25h");
	}

	fail(id, error) {
		if (this.failed) return;
		const node = this.byId.get(id) || this.root;
		node.status = "failed";
		this.root.status = "failed";
		this.failed = true;
		this.finished = true;
		this.lastTaskId = id || "root";
		this.lastError = error || new Error("Task failed.");
		this.stopTimer();

		if (this.interactive) process.stdout.write("\x1b[2J\x1b[H\x1b[?25h");
		process.stdout.write("> " + this.command + "\n");
		process.stderr.write("[NE] FAILED " + node.label + "\n");
		if (error && error.message) process.stderr.write(error.message + "\n");
		const output = error && (error.output ||
			[error.stdout, error.stderr].filter(Boolean).join("\n"));
		if (output) {
			if (error.outputTruncated) process.stderr.write("[NE] Earlier command output was truncated; showing the final captured lines.\n");
			process.stderr.write("\n" + output.replace(/\s+$/, "") + "\n");
		}
	}
}

module.exports = {
	MAX_WORKERS,
	CommandWorkerPool,
	commandWorkers,
	TaskTree,
};
