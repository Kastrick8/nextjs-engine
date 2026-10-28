"use strict";

const { channelLabel } = require("./channels");

const MENU_ITEMS = [
	{ id: "dev", label: "Dev Server", command: "ne dev" },
	{ id: "check", label: "Check & Compile", command: "ne check" },
	{ id: "build", label: "Production Build", command: "ne build" },
	{ id: "start", label: "Start Server", command: "ne start" },
	{ id: "updater", label: "Channel Updater", command: "ne updater" },
	{ id: "clean", label: "Clean Caches", command: "ne clean" },
	{ id: "rollback", label: "Rollback Build", command: "ne rollback" },
	{ id: "help", label: "Help & Docs", command: "ne help" },
];

function ansiEnabled() {
	return Boolean(process.stdout.isTTY) && !process.env.NO_COLOR && process.env.NE_COLOR !== "0";
}

function paint(value, code) {
	return ansiEnabled() ? "\x1b[" + code + "m" + value + "\x1b[0m" : value;
}

function unicodeEnabled() {
	return process.env.NE_ASCII !== "1" && process.env.TERM !== "dumb";
}

function widthForTerminal() {
	return Math.max(48, Math.min(Number(process.stdout.columns) || 80, 104));
}

function clip(value, max) {
	const text = String(value == null ? "" : value).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");
	if (text.length <= max) return text;
	if (max < 4) return text.slice(0, max);
	return text.slice(0, max - 3) + "...";
}

function frame(title, rows) {
	const width = widthForTerminal();
	const inner = width - 4;
	const uni = unicodeEnabled();
	const left = uni ? "╭" : "+";
	const right = uni ? "╮" : "+";
	const bottomLeft = uni ? "╰" : "+";
	const bottomRight = uni ? "╯" : "+";
	const horizontal = uni ? "─" : "-";
	const vertical = uni ? "│" : "|";
	const safeTitle = " " + clip(title, Math.max(12, inner - 4)) + " ";
	const remaining = Math.max(0, width - safeTitle.length - 2);
	const top = left + horizontal + safeTitle + horizontal.repeat(remaining) + right;
	const output = [paint(top, "90")];
	for (const raw of rows) {
		const text = clip(raw, inner).padEnd(inner, " ");
		output.push(paint(vertical, "90") + " " + text + " " + paint(vertical, "90"));
	}
	output.push(paint(bottomLeft + horizontal.repeat(width - 2) + bottomRight, "90"));
	return output.join("\n");
}

function selectedMarker(selected, index) {
	const glyph = unicodeEnabled() ? "❯" : ">";
	return selected === index ? paint(glyph, "36;1") : " ";
}

function renderDashboard(selected, context) {
	const width = widthForTerminal();
	const half = Math.floor((width - 8) / 2);
	const items = MENU_ITEMS.map((item, index) => {
		const marker = selectedMarker(selected, index);
		const text = marker + " [" + (index + 1) + "] " + item.label + " (" + item.command + ")";
		return { index, text };
	});
	const rows = [
		"Project   " + (context.projectName || "current directory"),
		"Channel   " + (context.channel || "not selected") + "    Cache: " + (context.cacheStatus || "ready"),
		"",
		"WORKFLOW & COMPILER".padEnd(half + 1, " ") + "VERSION & MAINTENANCE",
		(unicodeEnabled() ? "─" : "-").repeat(half) + "  " + (unicodeEnabled() ? "─" : "-").repeat(half),
	];
	for (let row = 0; row < 4; row += 1) {
		const left = clip(items[row].text, half).padEnd(half, " ");
		const right = clip(items[row + 4].text, half).padEnd(half, " ");
		rows.push(left + "  " + right);
	}
	rows.push("");
	rows.push("Move: arrows / W A S D    Open: Enter / E    Back/Quit: Esc / Q");
	rows.push("Mouse selection is enabled in terminals that report SGR mouse events.");
	return frame("NEXTJS-ENGINE (ne)  " + (context.version || "") + "  [Gen 3]", rows);
}

function renderReleaseList(selected, catalog, context) {
	const rows = [
		"Project   " + (context.projectName || "current directory"),
		"Feed      " + (catalog.cached ? "cached fallback" : "live GitHub + npm metadata"),
		"",
		"AVAILABLE RELEASES  (select a version to inspect)",
	];
	const releases = catalog.releases || [];
	if (!releases.length) {
		rows.push("No installable channel artifacts were found.");
		rows.push("Alpha/Beta require a passing package artifact attached to a GitHub Release.");
	} else {
		releases.slice(0, 24).forEach((release, index) => {
			const marker = selectedMarker(selected, index);
			const active = release.version === context.installedVersion ? "  INSTALLED" : "";
			const source = release.source === "github" ? "GitHub" : "npm";
			rows.push(marker + " " + release.version.padEnd(24, " ") + " [" + channelLabel(release) + "] " + source + active);
			rows.push("    " + clip(release.description || "", Math.max(20, widthForTerminal() - 10)));
		});
	}
	rows.push("");
	rows.push("Move: arrows / W S    Inspect: Enter / E    Back/Quit: Esc / Q");
	return frame("ne › updater  [PLAY STORE]", rows);
}

function renderReleaseDetails(release, context) {
	const rows = [
		"Package   @kastrick/nextjs-engine",
		"Version   " + release.version,
		"Channel   " + channelLabel(release),
		"Source    " + release.sourceLabel,
		"Branch    " + (release.sourceBranch || "registry"),
		"Commit    " + (release.sourceCommit || "published npm version"),
		"SHA-256   " + (release.sha256 || "provided by the npm registry"),
		"",
		"INSTALLATION",
		"Install Now will back up package.json and lockfiles before modifying the project.",
		"On failure, the updater restores those files and attempts to restore dependencies.",
		"",
		"Selected action: " + paint("INSTALL NOW", "32;1") + "    Back: Esc / Q",
		"Press Enter or Space to install. Press Esc to return to the release list.",
	];
	return frame("ne › updater › " + release.version, rows);
}

function parseMouseSequence(sequence) {
	const match = sequence.match(/^\x1b\[<(\d+);(\d+);(\d+)([Mm])$/);
	if (!match || match[4] !== "M") return null;
	const button = Number(match[1]);
	if ((button & 3) !== 0) return null;
	return { x: Number(match[2]), y: Number(match[3]), button };
}

function runTui(options) {
	if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== "function") {
		return Promise.resolve({ action: "non-interactive" });
	}
	const settings = options || {};
	const catalog = settings.catalog || { releases: [], cached: false };
	const context = settings.context || {};
	const initialScreen = settings.initialScreen || "dashboard";
	let screen = settings.showWarning ? "warning" : initialScreen;
	let priorScreen = initialScreen === "dashboard" ? null : "dashboard";
	let selected = 0;
	let selectedRelease = null;
	let inputBuffer = "";
	let settled = false;
	let busy = false;

	return new Promise((resolve) => {
		const oldRaw = Boolean(process.stdin.isRaw);
		const oldPaused = process.stdin.isPaused();

		function cleanup() {
			if (settled) return;
			settled = true;
			process.stdin.removeListener("data", onData);
			try { process.stdin.setRawMode(oldRaw); } catch {}
			try { process.stdin.pause(); } catch {}
			process.stdout.write("\x1b[?1000l\x1b[?1006l\x1b[?25h\x1b[?1049l");
			if (!oldPaused) process.stdin.resume();
		}

		function finish(result) {
			cleanup();
			resolve(result);
		}

		function draw() {
			let content;
			if (screen === "warning") content = frame("EXPERIMENTAL NOTICE", ["NE is experimental and may change or be removed in a future release.", "Review the selected channel before applying updates.", "", "Press any key to continue. Press Ctrl+C to quit."]);
			else if (screen === "dashboard") content = renderDashboard(selected, context);
			else if (screen === "releases") content = renderReleaseList(selected, catalog, context);
			else content = renderReleaseDetails(selectedRelease, context);
			process.stdout.write("\x1b[2J\x1b[H\x1b[?25l" + content + "\n");
		}

		function chooseMenu() {
			const item = MENU_ITEMS[selected];
			if (!item) return;
			if (item.id === "updater") {
				priorScreen = "dashboard";
				screen = "releases";
				selected = 0;
				draw();
				return;
			}
			finish({ action: item.id });
		}

		function move(delta) {
			if (screen === "warning") {
				screen = initialScreen;
				draw();
				return;
			}
			if (screen === "dashboard") {
				const row = selected % 4;
				const column = Math.floor(selected / 4);
				if (delta === "up") selected = column * 4 + ((row + 3) % 4);
				if (delta === "down") selected = column * 4 + ((row + 1) % 4);
				if (delta === "left" || delta === "right") selected = (1 - column) * 4 + row;
			} else if (screen === "releases") {
				const count = Math.min(24, catalog.releases.length);
				if (count) {
					if (delta === "up") selected = (selected + count - 1) % count;
					if (delta === "down") selected = (selected + 1) % count;
				}
			}
			draw();
		}

		async function activate() {
			if (busy) return;
			if (screen === "warning") {
				screen = initialScreen;
				draw();
				return;
			}
			if (screen === "dashboard") {
				chooseMenu();
				return;
			}
			if (screen === "releases") {
				selectedRelease = catalog.releases[Math.min(selected, Math.max(0, catalog.releases.length - 1))] || null;
				if (!selectedRelease) return;
				screen = "details";
				draw();
				return;
			}
			if (screen === "details" && selectedRelease) {
				finish({ action: "install", release: selectedRelease });
			}
		}

		function back() {
			if (screen === "details") {
				screen = "releases";
				draw();
				return;
			}
			if (screen === "releases" && priorScreen === "dashboard") {
				screen = "dashboard";
				selected = 4;
				draw();
				return;
			}
			finish({ action: "quit" });
		}

		function mouseClick(mouse) {
			if (screen === "dashboard") {
				const row = mouse.y - 7;
				if (row >= 0 && row < 4) {
					const column = mouse.x > Math.floor(widthForTerminal() / 2) ? 1 : 0;
					selected = column * 4 + row;
					draw();
					activate();
				}
			} else if (screen === "releases") {
				const index = Math.floor((mouse.y - 6) / 2);
				if (index >= 0 && index < Math.min(24, catalog.releases.length) && (mouse.y - 6) % 2 === 0) {
					selected = index;
					draw();
					activate();
				}
			} else if (screen === "details" && mouse.y >= 12) {
				activate();
			}
		}

		async function onData(chunk) {
			if (busy) return;
			inputBuffer += chunk.toString("utf8");
			while (inputBuffer.length) {
				if (inputBuffer.startsWith("\x1b[<")) {
					const end = inputBuffer.search(/[Mm]/);
					if (end === -1) return;
					const sequence = inputBuffer.slice(0, end + 1);
					inputBuffer = inputBuffer.slice(end + 1);
					const mouse = parseMouseSequence(sequence);
					if (mouse) mouseClick(mouse);
					continue;
				}
				if (inputBuffer.startsWith("\x1b[")) {
					if (inputBuffer.length < 3) return;
					const key = inputBuffer.slice(0, 3);
					inputBuffer = inputBuffer.slice(3);
					if (key === "\x1b[A") move("up");
					else if (key === "\x1b[B") move("down");
					else if (key === "\x1b[C") move("right");
					else if (key === "\x1b[D") move("left");
					continue;
				}
				const key = inputBuffer[0];
				inputBuffer = inputBuffer.slice(1);
				if (key === "\x03") { finish({ action: "quit" }); return; }
				if (screen === "warning") { screen = initialScreen; draw(); continue; }
				if (key === "\x1b" || key === "q" || key === "Q" || key === "x" || key === "X") { back(); continue; }
				if (key === "w" || key === "W") { move("up"); continue; }
				if (key === "s" || key === "S") { move("down"); continue; }
				if (key === "a" || key === "A") { move("left"); continue; }
				if (key === "d" || key === "D") { move("right"); continue; }
				if (key === "\r" || key === "\n" || key === "e" || key === "E" || key === " ") await activate();
			}
		}

		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.on("data", onData);
		process.stdout.write("\x1b[?1049h\x1b[?1000h\x1b[?1006h");
		draw();
	});
}

module.exports = {
	MENU_ITEMS,
	renderDashboard,
	renderReleaseList,
	renderReleaseDetails,
	parseMouseSequence,
	runTui,
};
