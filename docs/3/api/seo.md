# EngineSEO Public API

EngineSEO turns an explicit SEO schema, page schema or PageMeta input into Next.js metadata, robots, sitemap and JSON-LD output.

## Factory and builder

`createEngineSEO(source?)` returns a builder with `resolve()`, `generateMetadata()`, `sitemap()`, `robots()`, `jsonLd()` and a `set` object.

The setter groups cover title, description, canonical URL, keywords, noIndex/noFollow, site, robots, sitemap, structured data, social cards and preview modes. The `EngineSEO` object provides shorthand `create`, `metadata`, `sitemap`, `robots`, `jsonLd`, `infer` and `generate` methods.

## Compiler helpers

- `inferEngineSEOSchema()` derives page SEO information from a PageSchema.
- `compileEngineSEOMetadata()` returns Next.js Metadata.
- `compileEngineSEORobots()` creates robots metadata.
- `compileEngineSEOSitemap()` creates sitemap entries.
- `compileEngineSEOJsonLd()` returns structured data nodes.
- `serializeEngineSEOJsonLd()` serializes JSON-LD safely.
- `EngineSEOJsonLd` emits JSON-LD markup.
- `generateEngineMetadata()` is the metadata helper.
- `normalizeEngineSEOSchema()` and `compileEngineSEOProviderSitemap()` are additionally available from the `nextjs-engine/seo` subpath.

## Next.js route integration

The Engine plugin scans App Router/Pages Router sources and can generate metadata, robots and sitemap route outputs. The `nextjs-engine/seo` subpath also exports the provider-sitemap compiler options and `createEngineSEOImageResponse()` for Open Graph image route handlers.

~~~tsx
// app/og/route.tsx
import { createEngineSEOImageResponse } from "nextjs-engine/seo";

export async function GET() {
  return createEngineSEOImageResponse({
    page: { title: "My site", description: "A page preview" },
    site: { name: "Example", url: "https://example.com" }
  });
}
~~~

The image helper accepts an `EngineSEOInput` and optional `EngineSEOImageResponseOptions`. Keep public metadata free of secrets. See [EngineSEO module](../module/engineseo.md) and the [complete exports](./exports.md).
