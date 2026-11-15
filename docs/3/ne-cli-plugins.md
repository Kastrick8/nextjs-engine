# NE-CLI Plugin API

NE-CLI plugins extend the **NE command-line application only**. They are not Engine runtime plugins and are not loaded by the Engine's application/runtime plugin system.

This API is intentionally local to a project. NE loads only plugins explicitly enabled in the project's NE-CLI configuration.

## Files and enablement

Create the following files:

\`\`\`text
.nextjs-engine/
├── config/
│   └── ne-cli.json
└── plugins/
    └── project-tools.cjs
\`\`\`

Enable the plugin in \`.nextjs-engine/config/ne-cli.json\`:

\`\`\`json
{
  "neCliPlugins": ["project-tools"]
}
\`\`\`

The plugin identifier is the file name without the \`.cjs\` extension. The directory is separate from \`src/engine/engine/plugins\`; putting a file in the Engine runtime plugin directory does not register an NE-CLI plugin.

## Minimal plugin

A plugin is a CommonJS \`.cjs\` module exporting \`apiVersion: 1\`, a name, and a \`register(api)\` function:

\`\`\`js
"use strict";

module.exports = {
  apiVersion: 1,
  name: "project-tools",
  version: "1.0.0",

  register(api) {
    api.command({
      name: "project-report",
      description: "Print a short project report",
      help: "ne project-report [--verbose]",
      async run(context) {
        const packageFile = require("node:path").join(context.root, "package.json");
        const pkg = require(packageFile);
        process.stdout.write("Project: " + (pkg.name || "unnamed") + "\n");
        process.stdout.write("NE CLI plugin: project-tools\n");

        if (context.pluginOptions.includes("--verbose")) {
          process.stdout.write("Project root: " + context.root + "\n");
        }
      }
    });
  }
};
\`\`\`

Run the command after enabling it:

\`\`\`sh
ne plugins
ne project-report --verbose
\`\`\`

Plugin commands use lowercase names and cannot replace built-in NE commands such as \`build\`, \`analyze\`, \`info\`, or \`update\`. Positional arguments are available as \`context.args\`; unknown long options supplied to a custom plugin command are passed through as \`context.pluginOptions\`. The shared \`context.options\` contains NE's parsed global options.

## Extension points

### Additional analysis checks

Register a project-analysis check with \`api.analyzeCheck\`:

\`\`\`js
api.analyzeCheck({
  id: "required-env-doc",
  label: "Environment documentation",
  async run({ root }) {
    const fs = require("node:fs");
    const exists = fs.existsSync(require("node:path").join(root, ".env.example"));
    return {
      status: exists ? "ok" : "warning",
      message: exists ? ".env.example exists" : "Add an .env.example file"
    };
  }
});
\`\`\`

NE runs registered checks during \`ne analyze\` and prints their result. A plugin check can inspect the project and report a finding; it should not modify application source files.

### Additional local information

Register an info provider with \`api.infoProvider\`:

\`\`\`js
api.infoProvider({
  id: "deployment-config",
  label: "Deployment configuration",
  run({ root }) {
    const fs = require("node:fs");
    return {
      hasVercelConfig: fs.existsSync(require("node:path").join(root, "vercel.json"))
    };
  }
});
\`\`\`

Its result is printed under the \`ne info\` report.

### Lifecycle hooks

The API exposes these hooks:

| Hook | When it runs |
| --- | --- |
| \`beforeCommand\` | Before a routed command executes. |
| \`afterCommand\` | After a routed command completes successfully. |
| \`beforeBuild\` | Before NE starts the project build sequence. |
| \`afterBuild\` | After the build sequence succeeds. |
| \`beforeAnalyze\` | Before built-in analysis starts. |
| \`afterAnalyze\` | After built-in analysis completes. |

Example:

\`\`\`js
api.on("beforeBuild", async ({ root, generation }) => {
  process.stdout.write("[project-tools] Preparing Gen " + generation + " build for " + root + "\n");
});
\`\`\`

Hook handlers run in registration order. A thrown error fails the corresponding NE command; errors are annotated with the responsible plugin and hook.

## API summary

- \`api.apiVersion\`: supported plugin API version (\`1\`).
- \`api.root\`: absolute project root.
- \`api.command({ name, description, help, run })\`: register a separate CLI command.
- \`api.analyzeCheck({ id, label, run })\`: register an analysis check.
- \`api.infoProvider({ id, label, run })\`: add a section to \`ne info\`.
- \`api.on(hookName, handler)\`: subscribe to a documented lifecycle hook.

The plugin host rejects malformed identifiers, duplicate names, duplicate commands/checks/providers, built-in command overrides, missing plugin files, and plugin symlinks. Plugin registration errors stop startup with the plugin name in the error.

## Trust and security

An NE-CLI plugin is executable Node.js code. It runs in the same user account and process as NE and can read or write files, start child processes, access the network, and use any permissions available to that account. **The plugin loader is not a sandbox.**

Enable only plugins whose source you trust. Review plugin changes before running them, keep secrets out of plugin logs, and do not enable a plugin just because an Engine runtime plugin uses the same name. Plugins are loaded only from the project's explicitly enabled \`.nextjs-engine/plugins/*.cjs\` files; the NE-CLI plugin system does not install or fetch arbitrary plugins from a registry.

The plugin API is versioned independently from the Engine runtime plugin API. A future NE-CLI plugin API version does not imply a change to Engine runtime plugins.
