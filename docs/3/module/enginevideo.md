# EngineVideo viewport lifecycle

> **GENERATION 3 · ALPHA** · Source branch: `main-3`.

`EngineVideo` delays media activation until the wrapper enters its configured preload margin. The default margin is `800px 0px`, so the browser can prepare the media shortly before it is needed.


## Props

| Prop | Type | Default / behavior |
|---|---|---|
| `src` | `string \| VideoSource[]` | Required; a URL or ordered source entries. |
| `poster` | `string` | Optional poster URL. |
| `aspectRatio` | `string` | `"16/9"`; reserves the media box before mounting. |
| `autoPlay` / `muted` / `loop` | `boolean` | `false` / `true` / `false`. |
| `controls` / `playsInline` | `boolean` | `true` / `true`. |
| `preload` | `"none" \| "metadata" \| "auto"` | Metadata normally; auto for autoplay unless explicitly set. This remains a browser hint. |
| `rootMargin` | `string` | `"800px 0px"`; viewport distance before activation. |
| `eager` | `boolean` | `false`; bypasses the initial viewport gate. |
| `className` / `style` | `string` / `CSSProperties` | Wrapper class and inline styles. |
| `borderRadius` | `string` | Optional media corner radius. |
| `onCanPlay` / `onEnded` | `() => void` | Optional direct React callbacks for media lifecycle events. |

A `VideoSource` entry is `{ src: string; type?: string }`. The source
`type` may be a recognized MIME type such as `video/mp4`, `video/webm`, or
`application/x-mpegURL`, or another browser-supported video MIME type.

See [EngineImage + EngineVideo](./engineimage.md#enginevideo) for the combined
schema and media-loading reference.


## One-time source activation

The `<video>` element is not created before the component first reaches the preload margin unless `eager` is enabled.

After activation the element stays mounted. Scrolling away does not destroy the media element or force the browser to re-download/reselect its `<source>` list when the user comes back.

## Autoplay pause/resume

Viewport observation remains active after the first intersection.

For `autoPlay` videos:

```text
inside preload margin
	→ video may play

outside preload margin
	→ video.pause()

re-enter preload margin
	→ video.play() is requested again
```

Playback rejection from browser autoplay policy is treated as a normal condition; native controls remain available.

This prevents autoplay video decode/playback from continuing forever after the user has scrolled far past the media.

Videos with `autoPlay={false}` are not automatically paused or resumed. Manual playback remains under user control.

## Source changes

A stable source key is derived from every source URL/type pair. When that key changes, EngineVideo remounts the native `<video>` element so browsers reliably reselect the new source list, and resets readiness/buffering state.

## Reduced motion

The loading spinner animation is disabled under `prefers-reduced-motion: reduce`.
