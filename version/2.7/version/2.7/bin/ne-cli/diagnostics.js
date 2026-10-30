"use strict";

function damerauLevenshtein(left, right) {
	const a = String(left).toLowerCase();
	const b = String(right).toLowerCase();
	const rows = a.length + 1;
	const columns = b.length + 1;
	const matrix = Array.from({ length: rows }, () => Array(columns).fill(0));
	for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
	for (let column = 0; column < columns; column += 1) matrix[0][column] = column;
	for (let row = 1; row < rows; row += 1) {
		for (let column = 1; column < columns; column += 1) {
			const cost = a[row - 1] === b[column - 1] ? 0 : 1;
			matrix[row][column] = Math.min(
				matrix[row - 1][column] + 1,
				matrix[row][column - 1] + 1,
				matrix[row - 1][column - 1] + cost
			);
			if (
				row > 1 && column > 1 &&
				a[row - 1] === b[column - 2] &&
				a[row - 2] === b[column - 1]
			) {
				matrix[row][column] = Math.min(matrix[row][column], matrix[row - 2][column - 2] + cost);
			}
		}
	}
	return matrix[a.length][b.length];
}

function closestMatch(input, candidates) {
	const value = String(input || "").trim();
	if (!value || !Array.isArray(candidates)) return null;
	const ranked = candidates
		.filter((candidate) => typeof candidate === "string" && candidate !== value)
		.map((candidate) => ({ candidate, distance: damerauLevenshtein(value, candidate) }))
		.sort((left, right) => left.distance - right.distance || left.candidate.localeCompare(right.candidate));
	if (!ranked.length) return null;
	const threshold = Math.max(1, Math.min(3, Math.floor(Math.max(value.length, ranked[0].candidate.length) * 0.28)));
	return ranked[0].distance <= threshold ? ranked[0].candidate : null;
}

function createCliError(message, options) {
	const settings = options || {};
	const error = new Error(message);
	error.name = "NeCliError";
	if (settings.code) error.neCode = settings.code;
	if (settings.suggestion) error.neSuggestion = settings.suggestion;
	if (settings.hint) error.neHint = settings.hint;
	if (settings.location) error.neLocation = settings.location;
	if (settings.source) error.neSource = settings.source;
	return error;
}

function unknownCommand(command, commands) {
	const suggestion = closestMatch(command, commands);
	return createCliError(
		"Unknown command: " + command + ".",
		{
			code: "NE1001",
			suggestion: suggestion ? 'Did you mean "ne ' + suggestion + '"?' : null,
			hint: "Run \"ne help\" to see the available commands.",
		}
	);
}

function unknownOption(option, options) {
	const suggestion = closestMatch(option, options);
	return createCliError(
		"Unknown option: " + option + ".",
		{
			code: "NE1002",
			suggestion: suggestion ? 'Did you mean "' + suggestion + '"?' : null,
			hint: "Run \"ne help\" to see supported options for this command.",
		}
	);
}

function missingOptionValue(option, expected) {
	return createCliError(
		"Option " + option + " requires " + (expected || "a value") + ".",
		{
			code: "NE1003",
			hint: "Provide the value after the option or use the --name=value form.",
		}
	);
}

function invalidOptionValue(option, expected) {
	return createCliError(
		"Invalid value for " + option + ". Expected " + expected + ".",
		{
			code: "NE1004",
			hint: "Run \"ne help\" for examples of valid command syntax.",
		}
	);
}

module.exports = {
	damerauLevenshtein,
	closestMatch,
	createCliError,
	unknownCommand,
	unknownOption,
	missingOptionValue,
	invalidOptionValue,
};
