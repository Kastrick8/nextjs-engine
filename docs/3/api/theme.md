# EngineTheme Public API

EngineTheme is a Generation 3 feature. The public entrypoints include theme creation/ID parsing, remote theme loading, highlighter registration, Data-API handlers and template adapters.

## Create and reference themes

`createTheme(options)` validates a declarative theme definition and returns a theme value. `parseEngineThemeId(id)` parses the qualified ID convention. Use the page schema's `theme` value or a registered theme ID to associate it with a page.

## Highlighter providers

`registerEngineHighlighterProvider()`, `unregisterEngineHighlighterProvider()`, `listEngineHighlighterProviders()`, `listEngineHighlighterLanguages()`, `listEngineHighlighterThemes()` and `highlightEngineCode()` manage the highlighter provider set. `createShikiEngineHighlighterProvider()` adapts a Shiki-backed provider.

## Data-API handlers

`registerEngineThemeDataHandler()`, `unregisterEngineThemeDataHandler()`, `listEngineThemeDataHandlers()` and `dispatchEngineThemeDataEvent()` register/dispatch typed theme data events. These handlers bridge declarative theme bindings to explicitly registered application behavior; they are not remote JavaScript execution.

## Template adapters

`registerEngineThemeTemplateAdapter()`, `unregisterEngineThemeTemplateAdapter()`, `listEngineThemeTemplateAdapters()` and `renderEngineThemeTemplate()` control the typed template adapter registry.

## Remote themes

`loadRemoteEngineTheme()` loads a remote theme artifact under the configured policy. `clearRemoteEngineThemeCache()`, `getRemoteEngineThemeCacheSize()` and `unregisterRemoteEngineTheme()` manage the cache/registration lifecycle.

Remote `.etr` content is declarative JSON data. It cannot execute code or supply application React component implementations. For the visual/theme contract, supported slots, tokens, CSS safety and fonts, see [EngineTheme module](../module/enginetheme.md). The exact exported types are listed in [exports](./exports.md).
