# EngineSEO Public API

EngineSEO turns an explicit SEO schema, page schema or PageMeta input into Next.js metadata, robots, sitemap and JSON-LD output.

## Factory and builder

The factory accepts a static SEO input or a request-time resolver. Its public generic shape is:

```ts
type EngineSEOInput = EngineSEOSchema | PageSchema | PageMeta;
type EngineSEOSource<Props extends Record<string, unknown>> =
  EngineSEOInput | ((props: Props, parent: ResolvingMetadata) =>
    EngineSEOInput | Promise<EngineSEOInput>);

function createEngineSEO<Props extends Record<string, unknown> = Record<string, unknown>>(
  source?: EngineSEOSource<Props>
): EngineSEOBuilder<Props>;
```

`EngineSEOBuilder<Props>` exposes `set`, `generateMetadata(props, parent)`, `sitemap()`, `robots()`, `resolve(props?, parent?)`, and `jsonLd(props?, parent?)`. `generateMetadata()` returns Next.js `Metadata`; `sitemap()` and `robots()` return Next.js metadata-route values. The builder is intended to be created during server-module initialization, not per render.

### Setter contract

| Setter | Input |
| --- | --- |
| `set.title()` / `set.description()` / `set.canonical()` | `string` |
| `set.keywords()` | `string[]` |
| `set.noIndex()` / `set.noFollow()` | optional `boolean`; omitted means `true` |
| `set.site()` / `set.robots()` / `set.sitemap()` | The matching site/robots/sitemap schema |
| `set.structuredData()` | `"auto"`, `false`, or JSON-LD nodes |
| `set.social()` | Social metadata schema |
| `set.preview.generated()` | Generated-preview options, optional |
| `set.preview.customImage()` | `EngineSEOImage` or image URL string |
| `set.preview.website()` | Website-preview options |

Every setter returns the same builder, so configuration can be chained. Later builder overrides are merged over the normalized source input. `EngineSEO.generate<Props>(source)` is the shorthand for creating the builder and returning its `generateMetadata` function.

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

The image helper returns Next.js `ImageResponse` and accepts:

```ts
interface EngineSEOImageResponseOptions {
  width?: number;
  height?: number;
  title?: string;
  description?: string;
  background?: string;
  foreground?: string;
  accent?: string;
}

function createEngineSEOImageResponse(
  input: EngineSEOInput,
  options?: EngineSEOImageResponseOptions
): ImageResponse;
```

Dimensions default to 1200 × 630 unless a generated-preview schema supplies other dimensions. Explicit options take precedence over schema-provided title, description and generated-card colors.

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

The helper accepts an `EngineSEOInput` and optional `EngineSEOImageResponseOptions`. Keep public metadata free of secrets. See [EngineSEO module](../module/engineseo.md) and the [complete exports](./exports.md).
