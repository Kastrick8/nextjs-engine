# NE-CLI — Generation 3

NE-CLI is the `ne` executable shipped with the Generation 3 package. It provides command routing, project tasks, diagnostics, build orchestration, update channels and rollback support.

## Command discovery

| Command | Purpose |
|---|---|
| `ne` | Open the interactive dashboard |
| `ne dev` | Start the local Next.js development server |
| `ne build` | Run supported preparation/check tasks and the production build |
| `ne start` | Start the production server |
| `ne check` | Run TypeScript and applicable Engine diagnostics |
| `ne clean` | Remove bounded generated build/cache targets |
| `ne updater` / `ne update` | Inspect and select supported release channels |
| `ne rollback` | Restore a managed prior package/lockfile snapshot |
| `ne help` | Print command help |

Run `ne help` in the target project to discover the exact command surface for the installed package version.

## Build task model

```text
> ne build
│
├─> ne prepare:production       ✓
├─> ne check                    ✓
│   ├─> TypeScript              ✓
│   └─> Engine diagnostics      ✓
└─> next build                  ●
```

The live task tree shows only tasks configured and supported by the current project. Dependency installation and `npm audit fix` are not silently run as part of every build.

## Terminal and updater

Generation 3 CLI supports structured diagnostics, task-tree routing, terminal restoration and channel-aware version discovery. The detailed original guide remains at [NE-CLI](../../ne-cli.md).

Related: [Configuration](../../configuration/index.md) · [NE architecture](../architecture.md) · [Error handling](../errors/index.md).
