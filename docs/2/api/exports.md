# Complete Public Export Inventory — Generation 2

Source of truth: the named export barrels on `main-2`, package version `2.7.0`. Private exports in implementation files are deliberately excluded.

## Entry points

| Import | Boundary | Purpose |
|---|---|---|
| `nextjs-engine` | Shared/client | Factories, components, schema types, runtimes, hooks, EngineAPIResolver and APIStatic |
| `nextjs-engine/server` | Server-only | Request-aware device detection |

There is no Generation 2 `nextjs-engine/network` or `nextjs-engine/seo` subpath. Generation 3 compiler, `createTheme()`, scoped registry, EngineSEO, EngineDebug, NENC, EngineCookies, EngineCORS, EngineScheduler, EngineModel and EngineViewport are not part of this branch.

**Values** are runtime exports; **Types** are TypeScript-only contracts.

## `nextjs-engine`

### Factories and registry

**Values** from `./createPage`

`createPage` · `createComponent` · `defineSchema`

**Types** from `./createPage`

`CreateComponentOptions` · `CreatePageOptions` · `EngineComponentProps`

**Values** from `./core/registry`

`registerComponent` · `unregisterComponent` · `getComponent` · `hasComponent` · `registeredTypes`

### Other exports

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

### Validation

**Values** from `./core/validateSchema`

`validateSchema` · `validatePageSchema`

**Types** from `./core/validateSchema`

`ValidationError` · `ValidationResult`

**Values** from `./core/schemaAnalyzer`

`analyzeNode` · `analyzeSchema` · `isSchemaValid`

**Types** from `./core/schemaAnalyzer`

`EngineDiagnostic` · `AnalyzerResult` · `DiagnosticSeverity`

### Schema and types

**Types** from `./schema/types`

`PageSchema` · `SchemaNode` · `PageMeta` · `EngineTheme` · `EngineConfig` · `NodeType` · `BuiltinNodeType` · `Breakpoint` · `ResponsiveValue` · `CpropValue` · `SelectOption` · `BoxProps` · `StackProps` · `GridProps` · `TextProps` · `TextPart` · `TextVariant` · `MarkdownProps` · `HeadingProps` · `ImageNodeProps` · `ButtonProps` · `ButtonVariant` · `ButtonSize` · `SectionProps` · `HeroProps` · `CardProps` · `SpacerProps` · `DividerProps` · `EngineScrollProps` · `CustomSelectProps` · `OptionProps` · `OptGroupProps` · `SlotProps` · `EngineSuspenseProps` · `SuspensePreset` · `EngineHeroProps` · `EngineFormProps` · `EngineInputProps` · `EngineTextareaProps` · `EngineCheckboxProps` · `EngineLabelProps` · `InputType`

**Values** from `./schema/types`

`BREAKPOINTS` · `BREAKPOINT_ORDER`

### EngineScroll

**Types** from `./schema/EngineScrollSchema`

`EngineScrollPointSchemaProps`

**Values** from `./components/EngineScroll`

`EngineScroll as EngineScrollComponent` · `EngineScrollProvider as _OldScrollProvider` · `useEngineScroll as _oldUseEngineScroll`

**Values** from `./core/enginescroll`

`EngineScroll` · `EngineScrollProvider` · `useEngineScroll` · `useEngineScrollTimeline` · `EngineScrollRange` · `EngineScrollDirector` · `EngineScrollTimeline` · `EngineScrollTimelineTrack` · `bindEngineScrollTimelineStyles` · `EngineScrollNavigator` · `EngineScrollURL` · `EngineScrollMovement` · `EngineScrollHash` · `EngineScrollSnap` · `EngineScrollPointManager` · `EngineScrollPointTracker` · `EngineScrollEasing`

**Types** from `./core/enginescroll`

`EngineScrollCtx` · `EngineScrollTarget` · `EngineScrollNavigationOptions` · `EngineScrollState` · `EngineScrollPoint` · `EngineRegisteredPoint` · `EngineScrollPointGroupInput` · `EngineScrollPointLocation` · `EngineScrollPointOptions` · `EngineScrollRegisteredPoint` · `EngineScrollResolvedPoint` · `EngineScrollPointChangeSubscriber` · `EngineScrollPointTrackerConfig` · `EngineScrollPointTrackerFrame` · `EngineScrollPointTrackerSource` · `EngineScrollPointTrackerSubscriber` · `EngineScrollRangeConfig` · `EngineScrollRangeSnapshot` · `EngineScrollRangeTarget` · `EngineScrollDirectorConfig` · `EngineScrollDirectorFrame` · `EngineScrollDirectorName` · `EngineScrollDirectorSubscriber` · `EngineScrollDirectorTimelineFrames` · `EngineScrollAlignment` · `EngineScrollDirection` · `EngineScrollEasingName` · `EngineScrollMoveOptions` · `EngineScrollSnapMode` · `EngineScrollSnapOptions` · `EngineScrollTimelineActivityEvent` · `EngineScrollTimelineActivitySubscriber` · `EngineScrollTimelineActivityType` · `EngineScrollTimelineBoundary` · `EngineScrollTimelineConfig` · `EngineScrollTimelineCrossEvent` · `EngineScrollTimelineCrossSubscriber` · `EngineScrollTimelineFrame` · `EngineScrollTimelineFrameSource` · `EngineScrollTimelineKeyframe` · `EngineScrollTimelineSource` · `EngineScrollTimelineStyleBinding` · `EngineScrollTimelineStyleBindings` · `EngineScrollTimelineStyleKeyframes` · `EngineScrollTimelineStyleRange` · `EngineScrollTimelineSubscriber` · `EngineScrollTimelineTarget`

### Primitives

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

`ENGINE_TRANSITIONS` · `isKnownEngineTransition` · `navigateWithEngineTransition` · `normalizeEngineTransitionType` · `resolveEngineTransition` · `runEngineTransition` · `useEngineTransitions`

**Types** from `./core/enginetransitions`

`EngineTransitionAlias` · `EngineTransitionAxis` · `EngineTransitionConfig` · `EngineTransitionDirection` · `EngineTransitionEasing` · `EngineTransitionInput` · `EngineTransitionName` · `EngineTransitionOptions` · `EngineTransitionPointer` · `EngineTransitionRunContext` · `EngineTransitionShape` · `EngineTransitionsController` · `ResolvedEngineTransition`

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

### Networking

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

## `nextjs-engine/server`

### Browser and device

**Values** from `./core/EngineDeviceServer`

`getServerDevice`

**Values** from `./core/EngineDeviceShared`

`detectDevice` · `DESKTOP_DEVICE`

**Types** from `./core/EngineDeviceShared`

`DeviceBrand` · `DeviceInfo` · `DeviceOS`

Compatibility aliases retained by the root barrel: `EngineScrollComponent`, `_OldScrollProvider` and `_oldUseEngineScroll`.
