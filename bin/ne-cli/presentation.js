"use strict";

const ANSI_PATTERN = /\u001B(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001B\\))/g;
const MARK_PATTERN = /\p{Mark}/u;
const COLORS = {
	error: "\u001B[31;1m",
	warning: "\u001B[33;1m",
	success: "\u001B[32;1m",
	info: "\u001B[36;1m",
	running: "\u001B[36;1m",
	muted: "\u001B[90m",
	reset: "\u001B[0m",
};

function stripAnsi(value) {
	return String(value == null ? "" : value).replace(ANSI_PATTERN, "");
}

function isWideCodePoint(codePoint) {
	return (
		(codePoint >= 0x1100 && codePoint <= 0x115f) ||
		codePoint === 0x2329 || codePoint === 0x232a ||
		(codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) ||
		(codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
		(codePoint >= 0xf900 && codePoint <= 0xfaff) ||
		(codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
		(codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
		(codePoint >= 0xff00 && codePoint <= 0xff60) ||
		(codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
		(codePoint >= 0x1f300 && codePoint <= 0x1faff) ||
		(codePoint >= 0x20000 && codePoint <= 0x3fffd)
	);
}

function visibleWidth(value) {
	let width = 0;
	for (const character of stripAnsi(value)) {
		const codePoint = character.codePointAt(0);
		if (codePoint === 0x200d || codePoint === 0xfe0f || MARK_PATTERN.test(character)) continue;
		if (codePoint < 0x20 || (codePoint >= 0x7f && codePoint < 0xa0)) continue;
		width += isWideCodePoint(codePoint) ? 2 : 1;
	}
	return width;
}

function colorEnabled(options) {
	if (options && typeof options.color === "boolean") return options.color;
	if (process.env.NO_COLOR !== undefined || process.env.TERM === "dumb" || process.env.FORCE_COLOR === "0") return false;
	return Boolean(process.stderr.isTTY || process.stdout.isTTY);
}

function paint(value, color, enabled) {
	return enabled && COLORS[color]
		? COLORS[color] + value + COLORS.reset
		: value;
}

function splitLongWord(word, maxWidth) {
	const result = [];
	let current = "";
	for (const character of word) {
		if (current && visibleWidth(current + character) > maxWidth) {
			result.push(current);
			current = "";
		}
		current += character;
	}
	if (current || !result.length) result.push(current);
	return result;
}

function wrapText(value, maxWidth) {
	const width = Math.max(1, Number(maxWidth) || 1);
	const output = [];
	for (const paragraph of String(value == null ? "" : value).split(/\r?\n/)) {
		const words = paragraph.trim().split(/\s+/).filter(Boolean);
		if (!words.length) {
			output.push("");
			continue;
		}
		let line = "";
		for (const word of words) {
			const chunks = visibleWidth(word) > width ? splitLongWord(word, width) : [word];
			for (const chunk of chunks) {
				if (!line) {
					line = chunk;
				} else if (visibleWidth(line) + 1 + visibleWidth(chunk) <= width) {
					line += " " + chunk;
				} else {
					output.push(line);
					line = chunk;
				}
			}
		}
		if (line) output.push(line);
	}
	return output;
}

function terminalColumns(options) {
	if (options && Number.isFinite(options.width) && options.width > 0) {
		return Math.floor(options.width);
	}
	return Number(process.stderr.columns || process.stdout.columns || 80);
}

function renderBanner(options) {
	const settings = options || {};
	const severity = ["error", "warning", "success", "info", "running"].includes(settings.type)
		? settings.type
		: "info";
	const ascii = settings.ascii === true || (
		settings.ascii !== false && (process.env.NE_ASCII === "1" || process.env.TERM === "dumb")
	);
	const enabled = colorEnabled(settings);
	const requestedWidth = terminalColumns(settings);
	const boxWidth = Math.max(12, Math.min(100, requestedWidth - 2));
	const contentWidth = Math.max(4, boxWidth - 4);
	const border = ascii ? { topLeft: "+", topRight: "+", bottomLeft: "+", bottomRight: "+", horizontal: "-", vertical: "|" }
		: { topLeft: "╭", topRight: "╮", bottomLeft: "╰", bottomRight: "╯", horizontal: "─", vertical: "│" };
	const headingParts = [String(settings.title || severity.toUpperCase()).trim()];
	if (settings.code) headingParts.push(String(settings.code).trim());
	const heading = headingParts.filter(Boolean).join(" · ");
	const rows = wrapText(heading, contentWidth);
	for (const item of Array.isArray(settings.lines) ? settings.lines : []) {
		if (item == null) continue;
		rows.push(...wrapText(String(item), contentWidth));
	}
	if (settings.message) {
		if (rows.length) rows.push("");
		rows.push(...wrapText(settings.message, contentWidth));
	}
	for (const item of Array.isArray(settings.details) ? settings.details : []) {
		if (item == null || item === "") continue;
		if (item && typeof item === "object" && item.preformatted) {
			rows.push(...String(item.text || "").split(/\r?\n/));
		} else {
			rows.push(...wrapText(String(item), contentWidth));
		}
	}
	if (!rows.length) rows.push("");
	const pad = (value) => {
		const plainWidth = visibleWidth(value);
		return value + " ".repeat(Math.max(0, contentWidth - plainWidth));
	};
	const top = border.topLeft + border.horizontal.repeat(boxWidth - 2) + border.topRight;
	const bottom = border.bottomLeft + border.horizontal.repeat(boxWidth - 2) + border.bottomRight;
	const coloredBorder = (value) => paint(value, severity, enabled);
	const body = rows.map((row, index) => {
		const content = index === 0 ? paint(row, severity, enabled) : row;
		return coloredBorder(border.vertical) + " " + pad(content) + " " + coloredBorder(border.vertical);
	});
	return [coloredBorder(top), ...body, coloredBorder(bottom)].join("\n");
}

function expandTabs(value, tabSize) {
	const size = Math.max(1, Number(tabSize) || 4);
	let result = "";
	let column = 0;
	for (const character of String(value)) {
		if (character === "\t") {
			const count = size - (column % size);
			result += " ".repeat(count);
			column += count;
		} else {
			result += character;
			column += visibleWidth(character);
		}
	}
	return result;
}

function renderCodeFrame(source, location, options) {
	const settings = options || {};
	const lines = String(source == null ? "" : source).split(/\r?\n/);
	const lineNumber = Math.max(1, Number(location && location.line) || 1);
	const column = Math.max(1, Number(location && location.column) || 1);
	if (!lines.length || lineNumber > lines.length) return "";
	const context = Math.max(0, Math.min(3, Number(settings.context) || 1));
	const start = Math.max(1, lineNumber - context);
	const end = Math.min(lines.length, lineNumber + context);
	const gutterWidth = String(end).length;
	const ascii = settings.ascii === true || (
		settings.ascii !== false && (process.env.NE_ASCII === "1" || process.env.TERM === "dumb")
	);
	const marker = ascii ? "> " : "› ";
	const separator = ascii ? " | " : " │ ";
	const maxWidth = Math.max(12, Math.min(100, terminalColumns(settings) - 10));
	const visible = [];
	for (let number = start; number <= end; number += 1) {
		const sourceLine = expandTabs(lines[number - 1]);
		const prefix = (number === lineNumber ? marker : "  ") +
			String(number).padStart(gutterWidth, " ") + separator;
		const available = Math.max(1, maxWidth - visibleWidth(prefix));
		let shown = sourceLine;
		let caretColumn = column - 1;
		if (visibleWidth(shown) > available) {
			const offset = Math.max(0, Math.min(caretColumn - Math.floor(available / 2), visibleWidth(shown) - available));
			shown = Array.from(shown).slice(offset, offset + available).join("");
			caretColumn = Math.max(0, caretColumn - offset);
			if (offset > 0) shown = "…" + shown.slice(1);
		}
		visible.push(prefix + shown);
		if (number === lineNumber) {
			visible.push("  " + " ".repeat(gutterWidth) + " │ " + " ".repeat(Math.max(0, Math.min(caretColumn, available - 1))) + "^");
		}
	}
	return visible.join("\n");
}

function extractSyntaxContext(error) {
	if (!error || error.name !== "SyntaxError") return null;
	const lines = String(error.stack || "").split(/\r?\n/);
	for (let index = 0; index < lines.length; index += 1) {
		const match = lines[index].match(/^(.+):(\d+)(?::(\d+))?$/);
		if (!match) continue;
		const sourceLine = lines[index + 1] && !/^\s*at\s/.test(lines[index + 1]) ? lines[index + 1] : "";
		const markerLine = sourceLine && lines[index + 2] && /\^/.test(lines[index + 2]) ? lines[index + 2] : "";
		const caret = markerLine.indexOf("^");
		let source = "";
		let column = Number(match[3]) || (caret >= 0 ? caret + 1 : 1);
		try {
			source = require("node:fs").readFileSync(match[1], "utf8");
		} catch {
			source = sourceLine;
		}
		if (!source) continue;
		return {
			location: { file: match[1], line: Number(match[2]), column },
			source,
		};
	}
	return null;
}

function renderError(error, options) {
	const failure = error || new Error("Unknown NE CLI failure.");
	const inferred = extractSyntaxContext(failure);
	const locationInfo = failure.neLocation
		? { location: failure.neLocation, source: failure.neSource || "" }
		: inferred;
	const details = [];
	if (locationInfo && locationInfo.location) {
		const location = locationInfo.location;
		const where = [location.file, location.line && ("line " + location.line), location.column && ("column " + location.column)]
			.filter(Boolean).join(":");
		if (where) details.push("at " + where);
	}
	if (failure.neSuggestion) details.push("Suggestion: " + failure.neSuggestion);
	if (failure.neHint) details.push("Hint: " + failure.neHint);
	if (locationInfo && locationInfo.source && locationInfo.location) {
		const frame = renderCodeFrame(locationInfo.source, locationInfo.location, options);
		if (frame) details.push({ preformatted: true, text: frame });
	}
	return renderBanner({
		...(options || {}),
		type: "error",
		title: "ERROR",
		code: failure.neCode || (inferred ? "NE2001" : "NE CLI"),
		message: failure.message || String(failure),
		details,
	});
}

module.exports = {
	visibleWidth,
	wrapText,
	renderBanner,
	renderCodeFrame,
	extractSyntaxContext,
	renderError,
};
