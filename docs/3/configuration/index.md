# Configuration

Configuration pages explain how to set up a working Engine subsystem in a project. They are task-oriented: where files go, what options are supported, how the build reads them, and how to verify the result.

| I want to configure… | Read |
|---|---|
| External API providers, headers, version macros and authentication | [EngineAPIResolver and .EngineAPIConfig](./engine-api.md) |
| Browser-side static endpoint programs and route compilation | [APIStatic](./api-static.md) |
| Page-level Engine settings and responsive breakpoints | [EngineConfig](./engine-config.md) |
| NENC command files and server handler integration | [NENC configuration](./nenc.md) |

## Configuration boundaries

- Project/build configuration belongs in the project and its Next.js config.
- Provider credentials belong in environment variables, not committed source.
- APIStatic `.route` files are browser-executable programs. Treat their contents as public.
- Request-only work, private credentials and database access belong behind a server endpoint or the server-owned NENC boundary.

The examples below are written for the Generation 3 branch. Check the Generation 2 configuration page before using them in a 2.x project.
