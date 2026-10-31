# Complete Public Export Inventory — Generation 3

> Source of truth: package export barrels on `main-3`, package version `3.0.0-alpha.1`. Every named value/type re-exported by the entrypoints is listed below. Private implementation exports are excluded.

## Entry points

| Import | Runtime boundary | Purpose |
|---|---|---|
| `nextjs-engine` | Shared/client-safe where documented | Factories, components, hooks, schema types, EngineTheme, SEO, compiler and feature runtimes |
| `nextjs-engine/server` | Server-only | Request context, device helpers, CORS and NENC server enforcement |
| `nextjs-engine/network` | Client-facing transport | EngineCommand, NENC transport, EngineCookies and device proof |
| `nextjs-engine/seo` | Server route helper | SEO star exports and Open Graph image response helper |

**Values** are runtime symbols; **Types** are type-only. An alias is shown exactly as re-exported. A private implementation export is not a package API unless a public entrypoint re-exports it.

## `nextjs-engine`

### Factories and component registry

**Values** from `./createPage`

`createPage` · `createComponent` · `defineSchema`

**Values** from `./core/registry`

`createEngineComponentRegistry` · `EngineComponentRegistry`

**Types** from `./createPage`

`CreateComponentOptions` · `CreatePageOptions` · `EngineComponentProps` · `EngineCompilerOptions` · `EnginePageComponent`

**Types** from `./core/EngineCustomComponent`

`CreateCustomComponentOptions` · `EngineCustomPropRule` · `EngineCustomPropSchema` · `EngineCustomPropType` · `EngineCustomReactComponent` · `EngineCustomThemeStyles`

**Values** from `./core/registry`

`registerComponent` · `unregisterComponent` · `getComponent` · `hasComponent` · `registeredTypes`

### Error reporting

**Values** from `./errors/engineErrorReporter`

`ERROR_BOOK_URL` · `createEngineErrorReport` · `formatEngineErrorReport` · `reportEngineError` · `resolveEngineErrorHelpUrl` · `installEngineUncaughtExceptionMonitor`

**Types** from `./errors/engineErrorReporter`

`EngineErrorContext` · `EngineErrorFormatOptions` · `EngineErrorReport` · `EngineErrorSeverity` · `EngineErrorSource`

### Compiler, fallbacks, artifacts and budgets

**Values** from `./compiler`

`ENGINE_DEFAULT_FALLBACK_POLICIES` · `EngineBuildBudgetError` · `assertEngineBuildBudgets` · `assertEngineSecurityDiagnostics` · `compilePage` · `compileEngineUsedFeatureManifest` · `compileEngineFallbackPlan` · `compileEngineArtifact` · `compileEngineSecurityDiagnostics` · `evaluateEngineBuildBudgets` · `explainCompiledNode` · `fingerprintEngineArtifact` · `findCompiledNode` · `getEngineRuntimeProfile` · `getEngineRuntimeRegistryRevision` · `inspectEngineArtifactGraph` · `invalidateEngineArtifacts` · `registerEngineRuntimeProfile` · `resolveEngineFallbackPlan` · `resolveNodeRuntime` · `unregisterEngineRuntimeProfile`

**Types** from `./compiler`

`EngineAssetKind` · `EngineBuildAttribution` · `EngineBuildBudgetLimits` · `EngineBuildBudgetMetric` · `EngineBuildBudgetReport` · `EngineBuildBudgetResult` · `EngineBuildMeasurements` · `EngineArtifactDescriptor` · `EngineArtifactInspection` · `EngineArtifactKind` · `EngineArtifactReference` · `EngineArtifactResult` · `EngineCapability` · `EngineCompileOptions` · `EngineCompiledAsset` · `EngineCompiledNode` · `EngineCompiledPage` · `EngineCompilerDiagnostic` · `EngineCompilerProgressEvent` · `EngineCompilerSummary` · `EngineDeviceTarget` · `EngineCompiledFeatureFallback` · `EngineCompatibilityImportance` · `EngineFallbackFidelity` · `EngineFallbackKind` · `EngineFallbackPlan` · `EngineFallbackStrategy` · `EngineFeatureFallbackPolicy` · `EngineFeatureSupportResolver` · `EngineLegacyContent` · `EngineLegacyRenderPlan` · `EngineResolvedFallbackPlan` · `EngineResolvedFallbackStatus` · `EngineResolvedFeatureFallback` · `EngineRuntimeKind` · `EngineRuntimeProfile` · `EngineUsedFeature` · `EngineUsedFeatureManifest` · `EngineUsedFeatureSource` · `EngineWorkClass`

**Values** from `./compiler/EngineAdaptiveCompiler`

`compileAdaptiveSchema`

**Types** from `./compiler/EngineAdaptiveCompiler`

`EngineAdaptiveChange` · `EngineAdaptiveCompileResult` · `EngineAdaptiveDeviceConfig` · `EngineAdaptiveDeviceOptions`

### Browser compatibility

**Values** from `./core/enginecompatibility`

`createEngineBrowserSupportResolver` · `EngineCompatibilityDialog` · `resolveEngineBrowserCompatibility` · `supportsEngineBrowserFeature`

**Types** from `./core/enginecompatibility`

`EngineCompatibilityDialogProps` · `EngineFeatureSupportOverrides`

**Values** from `./components/EngineCompatibilityDialog`

`EngineBrowserUpdateDialog`

**Types** from `./components/EngineCompatibilityDialog`

`EngineBrowserUpdateDialogProps`

**Values** from `./core/EngineBrowserCompatibility`

`detectEngineBrowserFeature` · `engineFallbackPlanNeedsCompatibilityCheck` · `evaluateEngineBrowserCompatibility`

**Types** from `./core/EngineBrowserCompatibility`

`EngineCompatibilityIssue` · `EngineCompatibilityReport`

### Scheduler

**Values** from `./core/enginescheduler`

`EngineScheduler`

**Types** from `./core/enginescheduler`

`EngineScheduleListener` · `EngineSchedulePolicy` · `EngineScheduleSnapshot`

**Values** from `./hooks/useEngineScheduler`

`useEngineSchedule` · `useEngineVisible`

**Types** from `./hooks/useEngineScheduler`

`UseEngineScheduleReturn`

### Model

**Values** from `./core/EngineModel`

`EngineModel`

**Types** from `./core/EngineModel`

`EngineModelAction` · `EngineModelConsumerInspection` · `EngineModelInspection` · `EngineModelKeyListener` · `EngineModelListener` · `EngineModelOptions` · `EngineModelState`

**Values** from `./hooks/useEngineModel`

`useEngineModel` · `useEngineModelValue`

### Viewport

**Values** from `./core/EngineViewport`

`EngineViewport`

**Types** from `./core/EngineViewport`

`EngineViewportSnapshot`

**Values** from `./hooks/useEngineViewport`

`useEngineViewport`

### Other public exports

**Values** from `./core/engineMetadata`

`generateEngineMetadata`

**Types** from `./schema/EngineShaderSchemaTypes`

`EngineShaderSurfaceProps`

**Values** from `./components/EngineImage`

`EngineImage`

**Values** from `./components/EngineVideo`

`EngineVideo`

**Values** from `./components/EngineShader`

`EngineShader`

**Types** from `./components/EngineShader`

`EngineShaderProps`

**Values** from `./core/engineshader`

`EngineShaderScheduler` · `clearEngineShaderCache` · `loadEngineShader` · `normalizeEngineShaderName`

**Types** from `./core/engineshader`

`EngineShaderConfig` · `EngineShaderExecution` · `EngineShaderInput` · `EngineShaderManifest` · `EngineShaderManifestEntry` · `EngineShaderRenderPlan` · `EngineShaderVariableDefinition` · `EngineShaderVariableValue`

**Values** from `./components/EngineMarkdown`

`EngineMarkdown`

**Values** from `./components/EngineUrlIcon`

`EngineUrlIcon`

**Types** from `./components/EngineUrlIcon`

`EngineUrlIconProps`

**Values** from `./core/engineUrlIcon`

`normalizeEngineUrlIconSize` · `resolveEngineFaviconUrl`

**Types** from `./core/engineUrlIcon`

`EngineUrlIconSize`

**Values** from `./components/EngineHero`

`EngineHero`

**Values** from `./components/LazyMount`

`LazyMount` · `LazySection`

**Values** from `./components/CustomSelect`

`CustomSelect`

**Values** from `./components/EngineSuspense`

`EngineSuspense`

**Values** from `./components/EngineForms`

`EngineForm` · `EngineInput` · `EngineTextarea` · `EngineCheckbox` · `EngineLabel`

**Values** from `./not-found`

`default as DefaultNotFoundPage`

**Types** from `./core/markdownParser`

`EngineAnsiColor` · `EngineAnsiPalette` · `EngineAnsiSegment`

### Metadata and SEO

**Values** from `./core/engineseo`

`EngineSEO` · `EngineSEOJsonLd` · `compileEngineSEOJsonLd` · `compileEngineSEOMetadata` · `compileEngineSEORobots` · `compileEngineSEOSitemap` · `createEngineSEO` · `inferEngineSEOSchema` · `serializeEngineSEOJsonLd`

**Types** from `./core/engineseo`

`EngineSEOBuilder` · `EngineSEOCustomPreview` · `EngineSEOGeneratedPreview` · `EngineSEOGeneratorProps` · `EngineSEOImage` · `EngineSEOInput` · `EngineSEOJsonLdNode` · `EngineSEOJsonLdProps` · `EngineSEOJsonValue` · `EngineSEOPageSchema` · `EngineSEOPreview` · `EngineSEOResolver` · `EngineSEORobotsSchema` · `EngineSEOSchema` · `EngineSEOSetters` · `EngineSEOSitemapLastModifiedMode` · `EngineSEOSitemapRoute` · `EngineSEOSitemapSchema` · `EngineSEOSiteSchema` · `EngineSEOSocialSchema` · `EngineSEOSource` · `EngineSEOVerificationSchema` · `EngineSEOWebsitePreview`

### Validation and schema diagnostics

**Values** from `./core/validateSchema`

`validateSchema` · `validatePageSchema`

**Types** from `./core/validateSchema`

`ValidationError` · `ValidationResult`

**Values** from `./core/schemaAnalyzer`

`analyzeNode` · `analyzeSchema` · `isSchemaValid`

**Types** from `./core/schemaAnalyzer`

`EngineDiagnostic` · `AnalyzerResult` · `DiagnosticSeverity`

### EngineTheme

**Values** from `./component/engineTheme/createTheme`

`createTheme` · `parseEngineThemeId`

**Types** from `./component/engineTheme/createTheme`

`ParsedEngineThemeId` · `CreateEngineThemeOptions`

**Values** from `./component/engineTheme/highlighting`

`registerEngineHighlighterProvider` · `unregisterEngineHighlighterProvider` · `listEngineHighlighterProviders` · `listEngineHighlighterLanguages` · `listEngineHighlighterThemes` · `highlightEngineCode` · `normalizeEngineHighlightLanguage` · `normalizeEngineThemeColor`

**Values** from `./component/engineTheme/shikiProvider`

`createShikiEngineHighlighterProvider`

**Types** from `./component/engineTheme/shikiProvider`

`EngineShikiHighlighter` · `EngineShikiProviderOptions`

**Types** from `./component/engineTheme/highlighting`

`EngineHighlighterProvider` · `EngineHighlighterProviderInfo` · `EngineHighlighterThemeInfo` · `EngineHighlighterToken` · `EngineHighlighterContext`

**Values** from `./component/engineTheme/dataApi`

`registerEngineThemeDataHandler` · `unregisterEngineThemeDataHandler` · `listEngineThemeDataHandlers` · `dispatchEngineThemeDataEvent`

**Values** from `./component/engineTheme/templates`

`registerEngineThemeTemplateAdapter` · `unregisterEngineThemeTemplateAdapter` · `listEngineThemeTemplateAdapters` · `renderEngineThemeTemplate`

**Values** from `./component/engineTheme/remoteTheme`

`loadRemoteEngineTheme` · `clearRemoteEngineThemeCache` · `getRemoteEngineThemeCacheSize` · `unregisterRemoteEngineTheme`

**Types** from `./component/engineTheme/remoteTheme`

`EngineThemeArtifact` · `LoadRemoteEngineThemeOptions`

**Types** from `./component/engineTheme/templates`

`EngineThemeTemplateAdapter` · `EngineThemeTemplateContext`

### Schema and feature types

**Types** from `./schema/types`

`PageSchema` · `SchemaNode` · `PageMeta` · `EngineTheme` · `EngineThemeDefinition` · `EngineThemeReference` · `EngineThemeScope` · `EngineThemeJsonValue` · `EngineThemeJsonObject` · `EngineConfig` · `EngineThemeJoinDirection` · `EngineThemeDataEventType` · `EngineThemeDataEventBinding` · `EngineThemeDataEventContext` · `EngineThemeDataEvent` · `EngineThemeDataCompositionResult` · `EngineThemeDataHandlerResult` · `EngineThemeDataHandler` · `EngineThemeTemplateNodeType` · `EngineThemeTemplateNode` · `EngineThemeTemplateDefinition` · `EngineThemeTemplateOptions` · `EngineThemeTemplatePlacement` · `EngineThemeTemplateMerge` · `EngineThemeTemplateLayout` · `EngineThemeTemplateDataApiBinding` · `EngineMarkdownThemeTemplates` · `EngineHighlighterTokenKind` · `EngineMarkdownTokenPalette` · `EngineMarkdownPrettyPleaseConfig` · `NodeType` · `BuiltinNodeType` · `Breakpoint` · `ResponsiveValue` · `CpropValue` · `SelectOption` · `BoxProps` · `StackProps` · `GridProps` · `TextProps` · `TextPart` · `TextVariant` · `MarkdownProps` · `EngineMarkdownStyleSlot` · `EngineMarkdownStyles` · `HeadingProps` · `ImageNodeProps` · `ButtonProps` · `ButtonVariant` · `ButtonSize` · `SectionProps` · `HeroProps` · `CardProps` · `SpacerProps` · `DividerProps` · `EngineScrollProps` · `CustomSelectProps` · `OptionProps` · `OptGroupProps` · `SlotProps` · `EngineSuspenseProps` · `SuspensePreset` · `EngineHeroProps` · `EngineFormProps` · `EngineInputProps` · `EngineTextareaProps` · `EngineCheckboxProps` · `EngineLabelProps` · `InputType`

**Values** from `./schema/types`

`BREAKPOINTS` · `BREAKPOINT_ORDER`

### EngineScroll

**Types** from `./schema/EngineScrollSchema`

`EngineScrollPointSchemaProps`

**Values** from `./components/EngineScroll`

`EngineScroll as EngineScrollComponent` · `EngineScrollProvider as _OldScrollProvider` · `useEngineScroll as _oldUseEngineScroll`

**Values** from `./core/enginescroll`

`EngineScroll` · `EngineScrollBehavior` · `EngineScrollProvider` · `useEngineScroll` · `useEngineScrollTimeline` · `EngineScrollRange` · `EngineScrollDirector` · `EngineScrollTimeline` · `EngineScrollTimelineTrack` · `bindEngineScrollTimelineStyles` · `EngineScrollNavigator` · `EngineScrollURL` · `EngineScrollMovement` · `EngineScrollHash` · `EngineScrollSnap` · `EngineScrollPointManager` · `EngineScrollPointTracker` · `EngineScrollEasing`

**Types** from `./core/enginescroll`

`EngineScrollCtx` · `EngineScrollTarget` · `EngineScrollNavigationOptions` · `EngineScrollState` · `EngineScrollPoint` · `EngineRegisteredPoint` · `EngineScrollPointGroupInput` · `EngineScrollPointLocation` · `EngineScrollPointOptions` · `EngineScrollRegisteredPoint` · `EngineScrollResolvedPoint` · `EngineScrollPointChangeSubscriber` · `EngineScrollPointTrackerConfig` · `EngineScrollPointTrackerFrame` · `EngineScrollPointTrackerSource` · `EngineScrollPointTrackerSubscriber` · `EngineScrollRangeConfig` · `EngineScrollRangeSnapshot` · `EngineScrollRangeTarget` · `EngineScrollDirectorConfig` · `EngineScrollDirectorFrame` · `EngineScrollDirectorName` · `EngineScrollDirectorSubscriber` · `EngineScrollDirectorTimelineFrames` · `EngineScrollAlignment` · `EngineScrollDirection` · `EngineScrollEasingName` · `EngineScrollBehaviorPolicy` · `EngineScrollMoveOptions` · `EngineScrollBehaviorMode` · `EngineScrollReducedMotion` · `EngineScrollResolvedBehaviorPolicy` · `EngineScrollSnapMode` · `EngineScrollSnapOptions` · `EngineScrollTimelineActivityEvent` · `EngineScrollTimelineActivitySubscriber` · `EngineScrollTimelineActivityType` · `EngineScrollTimelineBoundary` · `EngineScrollTimelineConfig` · `EngineScrollTimelineCrossEvent` · `EngineScrollTimelineCrossSubscriber` · `EngineScrollTimelineFrame` · `EngineScrollTimelineFrameSource` · `EngineScrollTimelineKeyframe` · `EngineScrollTimelineSource` · `EngineScrollTimelineStyleBinding` · `EngineScrollTimelineStyleBindings` · `EngineScrollTimelineStyleKeyframes` · `EngineScrollTimelineStyleRange` · `EngineScrollTimelineSubscriber` · `EngineScrollTimelineTarget`

### Primitive components

**Values** from `./components/primitives`

`EngineBox` · `EngineStack` · `EngineGrid` · `EngineText` · `EngineHeading` · `EngineSection` · `EngineButton` · `EngineCard` · `EngineSpacer` · `EngineDivider` · `EngineOption` · `EngineOptGroup` · `EngineSlot`

### Navigation and transitions

**Values** from `./components/EngineLink`

`EngineLink`

**Types** from `./components/EngineLink`

`EngineLinkConfig` · `EngineLinkProps`

**Values** from `./components/EngineNav`

`EngineNav` · `renderEngineAnchor`

**Values** from `./components/EngineTransitionLink`

`EngineTransitionLink`

**Types** from `./components/EngineTransitionLink`

`EngineTransitionLinkProps`

**Values** from `./core/enginetransitions`

`ENGINE_TRANSITIONS` · `coordinateEngineViewTransition` · `isKnownEngineTransition` · `navigateWithEngineTransition` · `normalizeEngineTransitionType` · `resolveEngineTransition` · `runEngineTransition` · `useEngineTransitions`

**Types** from `./core/enginetransitions`

`EngineTransitionAlias` · `EngineTransitionAxis` · `EngineTransitionConfig` · `EngineTransitionDirection` · `EngineTransitionEasing` · `EngineTransitionInput` · `EngineTransitionName` · `EngineTransitionOptions` · `EngineTransitionPointer` · `EngineTransitionRunContext` · `EngineTransitionShape` · `EngineTransitionsController` · `EngineViewTransitionConflict` · `EngineViewTransitionOptions` · `EngineViewTransitionStatus` · `ResolvedEngineTransition`

**Types** from `./components/EngineNav`

`EngineNavProps` · `EngineNavItem` · `EngineNavLogo` · `EngineNavVariant` · `EngineAnchorConfig`

### Animation

**Values** from `./components/EngineManim`

`EngineManim` · `EngineManim3D`

**Values** from `./components/EngineManim`

`compileManimConfig` · `applyEasing` · `parseManimDSL` · `routeAnimation`

**Types** from `./components/EngineManim`

`ManimConfig` · `Manim3DConfig` · `ManimDSLDocument` · `ManimAnimationRoute` · `EngineManimProps` · `EngineManim3DProps`

### Graphics

**Values** from `./components/EngineCanvas`

`EngineCanvas` · `useEngineCanvas`

**Types** from `./components/EngineCanvas`

`EngineCanvasFrameInfo` · `EngineCanvasProps`

**Values** from `./core/enginecanvas`

`ecVec2` · `ecVec3` · `ecTransform` · `ecMaterial` · `ecCircle` · `ecRect` · `ecPath` · `ecLine` · `ecPolygon` · `ecGroup` · `ecScene` · `ecVoidEnvironment` · `Engine2D` · `Engine3D` · `EngineSVGEngine` · `EngineSkiaEngine` · `importSVG` · `exportSVG` · `createRenderingEngine` · `registerRenderingEngine` · `hasRenderingEngine`

**Types** from `./core/enginecanvas`

`ECVector2` · `ECVector3` · `ECBounds` · `ECMaterial` · `ECShadingMode` · `ECTransform` · `ECCamera` · `ECMesh` · `ECGroup` · `ECNode` · `ECScene` · `ECEnvironment` · `RenderingEngine as ECRenderingEngine` · `ECRenderContext`

### Overlay

**Values** from `./components/EngineOverlay`

`EngineDialog` · `EngineDrawer` · `EnginePopover`

**Types** from `./components/EngineOverlay`

`EngineDialogProps` · `EngineDrawerProps` · `EngineOverlayAction` · `EngineOverlayActionVariant` · `EngineOverlayCommonProps` · `EngineOverlayOpenChange` · `EnginePopoverProps`

**Values** from `./core/engineoverlay`

`computePopoverPosition` · `getFocusableElements` · `isTopOverlay` · `lockBodyScroll` · `registerOverlay`

**Types** from `./core/engineoverlay`

`EnginePopoverAlign` · `EnginePopoverPlacement` · `OverlayRect` · `PopoverPosition` · `PopoverPositionOptions`

### HTTP networking and APIStatic

**Values** from `./core/EngineAPIResolver`

`EngineAPIResolver`

**Types** from `./core/EngineAPIResolver`

`EngineAPIAuthConfig` · `EngineAPIConfig` · `EngineAPIFormData` · `EngineAPIStaticEndpoint`

**Values** from `./core/APIStatic`

`APIStatic` · `configureAPIStatic` · `getDefaultAPIStatic` · `getAPIStaticRouteHash` · `getAPIStaticRouteURL` · `normalizeAPIStaticRoute` · `staticEndpoint`

**Types** from `./core/APIStatic`

`APIStaticEndpointInfo` · `APIStaticEndpointManifestEntry` · `APIStaticExecuteOptions` · `APIStaticInputSchema` · `APIStaticManifest` · `APIStaticOperation` · `APIStaticOptions` · `APIStaticProxyHandler` · `APIStaticResponseDescriptor` · `APIStaticRouteModule` · `APIStaticRunContext` · `APIStaticRunSource`

**Values** from `./core/EngineAPIConfigParser`

`compileAPIConfig` · `loadAPIConfigDir` · `setCompiledAPIConfig` · `getCompiledAPIConfig` · `ensureAPIConfig`

**Types** from `./core/EngineAPIConfigParser`

`EngineAPICompiledConfig`

### Browser and device

**Values** from `./core/EngineBrowserSafe`

`EngineBrowser` · `useBrowser`

**Types** from `./core/EngineBrowserSafe`

`BrowserInfo` · `BrowserIs` · `BrowserSupports` · `BrowserName` · `RenderingEngine` · `BrowserConditions` · `BrowserClipboard` · `BrowserInteract` · `ShareData` · `PickFileOptions` · `OrientationLock` · `BrowserMedia` · `MediaCameraOptions` · `BrowserSpeech` · `SpeakOptions` · `ListenOptions` · `BrowserNetwork` · `NetworkStatus` · `NetworkType`

**Values** from `./core/EngineDeviceShared`

`detectDevice`

**Types** from `./core/EngineDeviceShared`

`DeviceBrand` · `DeviceInfo` · `DeviceOS`

**Values** from `./core/EngineDevice`

`useMobileDevice`

### Provider, styles and hooks

**Values** from `./hooks/usePropStyles`

`cpropClass` · `staticClass` · `mediaClass`

**Values** from `./core/StyleCollector`

`EngineGlobalStyles`

**Values** from `./hooks/useInView`

`useInView` · `useImageInView` · `useSectionInView` · `useVisibleInView`

**Values** from `./providers/EngineProvider`

`useBreakpoint` · `useMinBreakpoint` · `useEngineContext`

**Values** from `./providers/EngineProvider`

`EngineProvider`

**Types** from `./providers/EngineProvider`

`EngineProviderProps`

---

## `nextjs-engine/server`

### Other public exports

**Values** from `./core/EngineServer`

`EngineServer` · `EngineServerSession`

**Types** from `./core/EngineServer`

`EngineServerCookieView` · `EngineServerFetchOptions` · `EngineServerHeaderView`

**Values** from `./core/EngineCORS`

`EngineCORS` · `EngineCORSRuleSet`

**Types** from `./core/EngineCORS`

`EngineCORSConfig`

**Values** from `./core/nenc/EngineCommand`

`executeRegisteredEngineCommand` · `getEngineCommandBuildDescriptors` · `getRegisteredEngineCommand` · `inspectEngineCommands` · `validateEngineCommandInput`

**Values** from `./core/nenc/NENCDispatcher`

`createNENCDispatcher`

**Values** from `./core/nenc/NENCDeviceProof`

`createNENCDeviceSignatureVerifier`

**Values** from `./core/nenc/NENCOrigin`

`resolveNENCRequestDestinationOrigin` · `resolveNENCRequestOrigin`

**Values** from `./core/nenc/NENCSessionAuth`

`createNENCAccountSessionPolicy` · `hashNENCSessionToken`

**Values** from `./core/nenc/NENCCommandAPI`

`createNENCCommandAPIResolverFactory`

**Types** from `./core/nenc/NENCCommandAPI`

`NENCCommandAPIContext` · `NENCCommandAPIResolverFactory` · `NENCCommandAPIResolverFactoryOptions`

**Values** from `./core/nenc/NENCCommandSecurity`

`NENCCommandSecurityPolicy` · `NENCMemoryRateLimitStore` · `NENCRateLimiter`

**Types** from `./core/nenc/NENCCommandSecurity`

`NENCCommandRateRule` · `NENCCommandSecurityPolicyOptions` · `NENCCommandSecurityRule` · `NENCRateLimitDecision` · `NENCRateLimiterOptions` · `NENCRateLimitStore`

**Types** from `./core/nenc/NENCSessionAuth`

`NENCAccountPrincipal` · `NENCAccountSession` · `NENCAccountSessionLookupContext` · `NENCAccountSessionPolicy` · `NENCAccountSessionPolicyOptions` · `NENCAccountSessionResolver`

**Types** from `./core/nenc/NENCDeviceProof`

`NENCDeviceIdentityContext` · `NENCDeviceSignatureVerifierOptions`

**Values** from `./core/nenc/NENCReplay`

`NENCReplayGuard` · `NENCMemoryReplayStore`

**Types** from `./core/nenc/NENCDispatcherTypes`

`NENCAPIResolverFactory` · `NENCAuthenticationContext` · `NENCAuthenticationResult` · `NENCAuthorizationContext` · `NENCDispatcherOptions` · `NENCRequestContext` · `NENCRequestHandler` · `NENCSignatureContext`

**Types** from `./core/nenc/NENCReplay`

`NENCReplayDecision` · `NENCReplayGuardOptions` · `NENCReplayStore`

**Types** from `./core/nenc/types`

`EngineCommandInputField` · `EngineCommandInputSchema` · `EngineCommandInputType` · `EngineCommandServerContext`

**Types** from `./core/nenc/NENCManifest`

`NENCServerCommand` · `NENCServerManifest` · `NENCWireHeaders`

### Browser and device

**Values** from `./core/EngineDeviceServer`

`getServerDevice`

**Values** from `./core/EngineDeviceShared`

`detectDevice` · `DESKTOP_DEVICE`

**Types** from `./core/EngineDeviceShared`

`DeviceBrand` · `DeviceInfo` · `DeviceOS`

---

## `nextjs-engine/network`

### Other public exports

**Values** from `./core/enginecookies`

`EngineCookies` · `EngineCookieIndex` · `EngineCookieMemoryStore` · `EngineCookieVault` · `EngineDeviceKey` · `EngineTrustList` · `decodeEngineDeviceProof` · `encodeEngineDeviceProof` · `hashEngineDeviceValue` · `isEngineDevicePublicIdentity` · `verifyEngineDeviceProof`

**Types** from `./core/enginecookies`

`EngineCookieAccessDecision` · `EngineCookieAccessRequest` · `EngineCookieAction` · `EngineCookieBindingMode` · `EngineCookieDeviceProofRequest` · `EngineCookieGrant` · `EngineCookieIndexEntry` · `EngineCookiePayload` · `EngineCookieRecordStore` · `EngineCookieRegistration` · `EngineCookieSealedRecord` · `EngineCookieUseRequest` · `EngineCookieVaultOptions` · `EngineDeviceKeyAlgorithm` · `EngineDeviceProof` · `EngineDeviceProofChallenge` · `EngineDeviceProofExpectation` · `EngineDevicePublicIdentity` · `EngineTrustListConfig` · `EngineTrustRule` · `NativeCookieOptions`

**Values** from `./core/nenc`

`EngineCommand` · `configureEngineCommandTransport` · `createNENCTransport` · `registerEngineCommand` · `validateEngineCommandInput`

**Types** from `./core/nenc`

`EngineCommandAuth` · `EngineCommandDefinition` · `EngineCommandDescriptor` · `EngineCommandExecutionContext` · `EngineCommandHandle` · `EngineCommandInputField` · `EngineCommandInputSchema` · `EngineCommandInputType` · `EngineCommandRuntime` · `EngineCommandServerContext` · `EngineCommandTransport` · `NENCClientCommand` · `NENCClientManifest` · `NENCServerCommand` · `NENCServerManifest` · `NENCTransportOptions` · `NENCWireHeaders`

---

## `nextjs-engine/seo`

This subpath uses `export * from "./core/engineseo"`. Its complete export set includes:

### Metadata and SEO

**Values** from `./EngineSEO`

`EngineSEO` · `compileEngineSEOJsonLd` · `compileEngineSEOMetadata` · `compileEngineSEORobots` · `compileEngineSEOSitemap` · `createEngineSEO` · `inferEngineSEOSchema` · `normalizeEngineSEOSchema`

**Values** from `./EngineSEOProviderSitemap`

`compileEngineSEOProviderSitemap`

**Values** from `./EngineSEOJsonLd`

`EngineSEOJsonLd` · `serializeEngineSEOJsonLd`

**Types** from `./EngineSEOJsonLd`

`EngineSEOJsonLdProps`

**Types** from `./EngineSEOTypes`

`EngineSEOBingSitemapFileOptions` · `EngineSEOBuilder` · `EngineSEOCustomPreview` · `EngineSEOGeneratedPreview` · `EngineSEOGoogleSitemapFileOptions` · `EngineSEOGeneratorProps` · `EngineSEOImage` · `EngineSEOInput` · `EngineSEOJsonLdNode` · `EngineSEOJsonValue` · `EngineSEOPageSchema` · `EngineSEOPreview` · `EngineSEOProviderSitemapCompileOptions` · `EngineSEOResolver` · `EngineSEORobotsSchema` · `EngineSEOSchema` · `EngineSEOSetters` · `EngineSEOSitemapLastModifiedMode` · `EngineSEOSitemapNews` · `EngineSEOSitemapProvider` · `EngineSEOSitemapProviderFileOptions` · `EngineSEOSitemapProviderFilesSchema` · `EngineSEOSitemapRoute` · `EngineSEOSitemapSchema` · `EngineSEOSitemapVideo` · `EngineSEOSitemapVideoPlatform` · `EngineSEOSitemapVideoRestriction` · `EngineSEOSitemapVideoUploader` · `EngineSEOYandexSitemapFileOptions` · `EngineSEOSiteSchema` · `EngineSEOSocialSchema` · `EngineSEOSource` · `EngineSEOVerificationSchema` · `EngineSEOWebsitePreview`

**Values** from `./core/engineseo/EngineSEOImage`: `createEngineSEOImageResponse`

**Types** from `./core/engineseo/EngineSEOImage`: `EngineSEOImageResponseOptions`

The SEO subpath is not merely a duplicate of the root barrel: it also exposes `normalizeEngineSEOSchema`, `compileEngineSEOProviderSitemap` and additional provider-sitemap types that are not all re-exported from the root import.

## Generation boundary

See the [Generation 2 inventory](../../2/api/exports.md) for the separate stable 2.7 contract.
