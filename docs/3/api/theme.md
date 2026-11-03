# EngineTheme Public API

EngineTheme is a Generation 3 feature. The public entrypoints include theme creation/ID parsing, remote theme loading, highlighter registration, Data-API handlers and template adapters.

## Create and reference themes

`createTheme(definition, options?)` validates a declarative theme definition and returns a deeply frozen theme value. Its public generic contract is:

```ts
interface CreateEngineThemeOptions {
  registry?: EngineComponentRegistry;
}

function createTheme<T extends EngineThemeDefinition>(
  definition: T,
  options?: CreateEngineThemeOptions
): Readonly<T & { scope: EngineThemeScope }>;
```

`definition` is the theme data: it contains a one-segment `id`, an optional `scope` (`local`, `global`, or `remote`), and the component/token configuration. When `scope` is omitted it resolves to `local`. `options.registry` is a separate runtime registration scope and is not included in the serialized `.etr` definition. Without a registry, the backwards-compatible process-global registry is used for global themes.

`createTheme()` does not fetch URLs or load remote content. Remote definitions must be fetched and verified explicitly with `loadRemoteEngineTheme()`.

`parseEngineThemeId(id)` parses the qualified ID convention. Use the page schema's `theme` value or a registered theme ID to associate it with a page.

## Highlighter providers

`registerEngineHighlighterProvider()`, `unregisterEngineHighlighterProvider()`, `listEngineHighlighterProviders()`, `listEngineHighlighterLanguages()`, `listEngineHighlighterThemes()` and `highlightEngineCode()` manage the highlighter provider set. `createShikiEngineHighlighterProvider()` adapts a Shiki-backed provider.

## Data-API handlers

`registerEngineThemeDataHandler()`, `unregisterEngineThemeDataHandler()`, `listEngineThemeDataHandlers()` and `dispatchEngineThemeDataEvent()` register/dispatch typed theme data events. These handlers bridge declarative theme bindings to explicitly registered application behavior; they are not remote JavaScript execution.

## Template adapters

`registerEngineThemeTemplateAdapter()`, `unregisterEngineThemeTemplateAdapter()`, `listEngineThemeTemplateAdapters()` and `renderEngineThemeTemplate()` control the typed template adapter registry.

## Remote themes

`loadRemoteEngineTheme()` loads a remote theme artifact under the configured policy. `clearRemoteEngineThemeCache()`, `getRemoteEngineThemeCacheSize()` and `unregisterRemoteEngineTheme()` manage the cache/registration lifecycle.

Remote `.etr` content is declarative JSON data. It cannot execute code or supply application React component implementations. For the visual/theme contract, supported slots, tokens, CSS safety and fonts, see [EngineTheme module](../module/enginetheme.md). The exact exported types are listed in [exports](./exports.md).
