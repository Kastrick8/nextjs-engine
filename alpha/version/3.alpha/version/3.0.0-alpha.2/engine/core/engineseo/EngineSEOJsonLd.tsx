import React from "react";
import { compileEngineSEOJsonLd } from "./EngineSEO";
import type { EngineSEOJsonLdNode, EngineSEOSchema } from "./EngineSEOTypes";
import { createEngineSEODiagnosticError } from "./EngineSEODiagnostics";

export function serializeEngineSEOJsonLd(data: EngineSEOJsonLdNode[]): string {
	const value = data.length === 1
		? data[0]
		: {
			"@context": "https://schema.org",
			"@graph": data.map(({ "@context": _context, ...node }) => node),
		};
	let encoded: string | undefined;
	try {
		encoded = JSON.stringify(value);
	} catch (cause) {
		throw createEngineSEODiagnosticError("NESEO3001", "JSON-LD value is not serializable as JSON.", cause);
	}
	if (typeof encoded !== "string") {
		throw createEngineSEODiagnosticError("NESEO3001", "JSON-LD serialization did not produce a JSON string.");
	}
	return encoded
		.replace(/</g, "\\u003c")
		.replace(/>/g, "\\u003e")
		.replace(/&/g, "\\u0026");
}

export interface EngineSEOJsonLdProps {
	schema?: EngineSEOSchema;
	data?: EngineSEOJsonLdNode[];
	id?: string;
}

export function EngineSEOJsonLd({ schema, data, id = "engine-seo-jsonld" }: EngineSEOJsonLdProps) {
	const resolved = data ?? (schema ? compileEngineSEOJsonLd(schema) : []);
	if (resolved.length === 0) return null;
	return <script id={id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeEngineSEOJsonLd(resolved) }} />;
}
