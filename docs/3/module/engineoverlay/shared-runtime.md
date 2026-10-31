# EngineOverlay Shared Runtime

Dialog, Drawer and Popover use a shared runtime for behavior that should remain consistent across all overlay primitives.

## Responsibilities

| System | Responsibility |
|---|---|
| Overlay stack | Tracks the order of active overlay surfaces |
| Escape ownership | Only the topmost eligible overlay handles Escape |
| Focus discovery | Finds focusable controls within the active panel |
| Focus trap | Keeps modal keyboard navigation inside the panel |
| Focus restoration | Returns focus to the trigger when the overlay closes |
| Scroll lock | Prevents background document scrolling for modal surfaces |
| Portal targeting | Renders into `document.body` or a requested target |
| Presence/animation | Coordinates open/close presence and reduced-motion behavior |
| Popover positioning | Measures anchors and responds to viewport changes |

## Mental model

```text
schema node / React component
          ↓
Dialog | Drawer | Popover
          ↓
shared overlay behavior
          ├── active stack
          ├── Escape handling
          ├── focus and restoration
          ├── scroll lock
          └── viewport subscriptions
          ↓
React portal
```

## Trigger contract

The default trigger is a generated native button. For custom trigger content, provide non-interactive content. Generation 3 supports `triggerAsChild` with exactly one native button so the Engine can merge its ref, state and accessibility attributes without nesting buttons.

## Accessibility responsibilities

- Supply an accessible label, normally through a visible title or `ariaLabel`.
- Use `alertdialog` for urgent decisions that require attention.
- Ensure custom trigger content remains keyboard-operable.
- Keep non-modal popovers distinct from modal dialogs and drawers.
- Respect reduced-motion preferences.

This page describes shared behavior, not every internal helper file. The public props remain documented in [EngineOverlay](../engineoverlay.md).
