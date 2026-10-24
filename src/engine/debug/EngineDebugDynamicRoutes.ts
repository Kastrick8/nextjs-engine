export interface EngineDebugDynamicParameter {
	name: string;
	kind: "single" | "catch-all" | "optional-catch-all";
}

export function isEngineDebugDynamicRoute(route: string): boolean {
	return route.split("/").some(segment => /^\[\[?.+\]\]$/.test(segment));
}

export function getEngineDebugDynamicParameters(route: string): EngineDebugDynamicParameter[] {
	return route.split("/").flatMap(segment => {
		const optionalCatchAll = segment.match(/^\[\[\.\.\.([^\]]+)\]\]$/);
		if (optionalCatchAll) return [{ name: optionalCatchAll[1], kind: "optional-catch-all" as const }];
		const catchAll = segment.match(/^\[\.\.\.([^\]]+)\]$/);
		if (catchAll) return [{ name: catchAll[1], kind: "catch-all" as const }];
		const single = segment.match(/^\[([^\]]+)\]$/);
		if (single) return [{ name: single[1], kind: "single" as const }];
		return [];
	});
}

export function matchesEngineDebugRoutePattern(pattern: string, concretePath: string): boolean {
	const expected = pattern.split("/").filter(Boolean);
	const actual = concretePath.split(/[?#]/, 1)[0].split("/").filter(Boolean);
	let index = 0;
	for (const segment of expected) {
		if (/^\[\[\.\.\.[^\]]+\]\]$/.test(segment)) return true;
		if (/^\[\.\.\.[^\]]+\]$/.test(segment)) return actual.length > index;
		if (/^\[[^\]]+\]$/.test(segment)) {
			if (!actual[index]) return false;
			index += 1;
			continue;
		}
		if (actual[index] !== segment) return false;
		index += 1;
	}
	return index === actual.length;
}

export function buildEngineDebugDynamicRoute(pattern: string, values: Record<string, string>): { path: string; error?: string } {
	const output: string[] = [];
	for (const segment of pattern.split("/")) {
		if (!segment) continue;
		const optionalCatchAll = segment.match(/^\[\[\.\.\.([^\]]+)\]\]$/);
		const catchAll = segment.match(/^\[\.\.\.([^\]]+)\]$/);
		const single = segment.match(/^\[([^\]]+)\]$/);
		const match = optionalCatchAll ?? catchAll ?? single;
		if (!match) {
			output.push(segment);
			continue;
		}
		const name = optionalCatchAll ? optionalCatchAll[1] : catchAll ? catchAll[1] : single![1];
		const value = (values[name] ?? "").trim();
		if (!value) {
			if (optionalCatchAll) continue;
			return { path: "", error: "Enter a value for " + name + "." };
		}
		const pieces = catchAll || optionalCatchAll ? value.split("/").map(part => part.trim()).filter(Boolean) : [value];
		if (pieces.length === 0 && !optionalCatchAll) return { path: "", error: "Enter a value for " + name + "." };
		for (const part of pieces) {
			if (part === "." || part === ".." || /[\u0000-\u001f]/.test(part)) return { path: "", error: name + " contains an invalid path segment." };
			output.push(encodeURIComponent(part));
		}
	}
	return { path: "/" + output.join("/") };
}
