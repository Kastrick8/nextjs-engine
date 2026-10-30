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

function unicodeEnabled() {
	return process.env.NE_ASCII !== "1" && process.env.TERM !== "dumb";
}

function statusBadge(status, frame) {
	const glyphs = unicodeEnabled();
	if (status === "running") {
		const frames = glyphs ? ["◐", "◓", "◑", "◒"] : ["|", "/", "-", "\\"];
		return { text: frames[frame % 4] + " RUNNING", color: "36;1" };
	}
	if (status === "success") return { text: (glyphs ? "✓" : "[OK]") + " DONE", color: "32;1" };
	if (status === "failed") return { text: (glyphs ? "✕" : "[X]") + " FAILED", color: "31;1" };
	if (status === "skipped") return { text: (glyphs ? "—" : "[-]") + " SKIPPED", color: "90" };
	return { text: (glyphs ? "…" : "...") + " PENDING", color: "33;1" };
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

	childrenOf(parentId) {
		return this.nodes.filter((node) => node.parentId === parentId);
	}

	branchColor(status) {
		if (status === "success") return "32;1";
		if (status === "failed") return "31;1";
		if (status === "running") return "36;1";
		if (status === "skipped") return "90";
		return "33;1";
	}

	renderRows(inner) {
		const width = Math.max(24, inner || 72);
		const glyphs = unicodeEnabled();
		const rows = [];
		const rootBadge = statusBadge(this.root.status, this.frame);
		const rootLabel = "> " + this.command;
		rows.push({
			text: clip(rootLabel, Math.max(1, width - rootBadge.text.length - 2)) +
				"  " + paint(rootBadge.text, rootBadge.color),
			color: this.branchColor(this.root.status),
		});

		for (const node of this.nodes) {
			const ancestors = [];
			let parent = this.byId.get(node.parentId);
			while (parent && parent.id !== "root") {
				ancestors.unshift(parent);
				parent = this.byId.get(parent.parentId);
			}

			let prefix = "";
			for (const ancestor of ancestors) {
				const siblings = this.childrenOf(ancestor.parentId);
				const isLast = siblings.length > 0 && siblings[siblings.length - 1].id === ancestor.id;
				const rail = glyphs ? (isLast ? "   " : "│  ") : (isLast ? "   " : "|  ");
				prefix += paint(rail, this.branchColor(ancestor.status));
			}

			const siblings = this.childrenOf(node.parentId);
			const isLast = siblings.length > 0 && siblings[siblings.length - 1].id === node.id;
			const branch = glyphs ? (isLast ? "└─>" : "├─>") : (isLast ? "\\-->" : "|-->");
			prefix += paint(branch + " ", this.branchColor(node.status));

			const badge = statusBadge(node.status, this.frame);
			const prefixWidth = prefix.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").length;
			const labelWidth = Math.max(1, width - prefixWidth - badge.text.length - 2);
			const text = prefix + paint(clip(node.label, labelWidth), this.branchColor(node.status)) +
				"  " + paint(badge.text, badge.color);
			rows.push({ text, color: this.branchColor(node.status) });

			if (node.detail) {
				const indent = " ".repeat(prefixWidth + 1);
				rows.push({
					text: paint(indent, this.branchColor(node.status)) + paint(clip(node.detail, width - prefixWidth - 1), "90"),
					color: this.branchColor(node.status),
				});
			}
		}
		return rows;
	}
	draw() {
		if (!this.interactive) return;
		const width = Math.max(52, Math.min(Number(process.stdout.columns) || 80, 112));
		const inner = width - 4;
		const glyphs = unicodeEnabled();
		const borderChars = glyphs ? ["─", "━", "═", "━"] : ["-", "=", "#", "="];
		const border = borderChars[this.frame % borderChars.length];
		const left = glyphs ? "╭" : "+";
		const right = glyphs ? "╮" : "+";
		const bottomLeft = glyphs ? "╰" : "+";
		const bottomRight = glyphs ? "╯" : "+";
		const vertical = glyphs ? "│" : "|";
		const color = this.root.status === "failed" ? "31;1" : this.root.status === "success" ? "32;1" : "36;1";
		const title = " NE TASK TREE · " + this.command + " ";
		const top = left + border + title + border.repeat(Math.max(1, width - title.length - 3)) + right;
		const bottom = bottomLeft + border.repeat(width - 2) + bottomRight;
		const rows = [paint(top, color)];
		for (const row of this.renderRows(inner)) {
			const visibleLength = row.text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").length;
			rows.push(paint(vertical, row.color) + " " + row.text +
				" ".repeat(Math.max(0, inner - visibleLength)) + " " + paint(vertical, row.color));
		}
		rows.push(paint(bottom, color));
		process.stdout.write("\x1b[2J\x1b[H\x1b[?25l" + rows.join("\n") + "\x1b[?25h");
	}
	drawFinal() {
		if (!this.interactive) return;
		const width = Math.max(52, Math.min(Number(process.stdout.columns) || 80, 112));
		const inner = width - 4;
		const glyphs = unicodeEnabled();
		const border = glyphs ? "═" : "=";
		const left = glyphs ? "╭" : "+";
		const right = glyphs ? "╮" : "+";
		const bottomLeft = glyphs ? "╰" : "+";
		const bottomRight = glyphs ? "╯" : "+";
		const vertical = glyphs ? "│" : "|";
		const title = " NE TASK TREE · " + this.command + " ";
		const top = left + border + title + border.repeat(Math.max(1, width - title.length - 3)) + right;
		const bottom = bottomLeft + border.repeat(width - 2) + bottomRight;
		const rows = [paint(top, "32;1")];
		for (const row of this.renderRows(inner)) {
			const visibleLength = row.text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").length;
			rows.push(paint(vertical, row.color) + " " + row.text +
				" ".repeat(Math.max(0, inner - visibleLength)) + " " + paint(vertical, row.color));
		}
		rows.push(paint(bottom, "32;1"));
		process.stdout.write("\x1b[2J\x1b[H" + rows.join("\n") + "\n\x1b[?25h");
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
		if (error && typeof error === "object") {
			error.neOutputDisplayed = true;
			error.neFailureDisplayed = true;
		}
		this.stopTimer();

		if (this.interactive) {
			process.stdout.write("\x1b[2J\x1b[H\x1b[?25h");
			process.stdout.write("> " + this.command + "\n");
		}
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
