"use strict";

// Keep native dynamic import in an ordinary JavaScript module. TypeScript's
// CommonJS transform rewrites import() calls in .ts files into require(), which
// cannot consume file:// URLs and breaks user-configured .cjs / .mjs adapters.
const { pathToFileURL } = require("node:url");

async function importAdapterModule(adapterPath) {
	return import(pathToFileURL(adapterPath).href);
}

module.exports = { importAdapterModule };
