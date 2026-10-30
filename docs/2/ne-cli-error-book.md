# NE CLI Error Book — Generation 2

**Applies to:** `@kastrick/nextjs-engine` 2.x, beginning with v2.7.0  
**Scope:** The Generation 2 `ne` command-line interface  
**Source:** `bin/ne-cli/diagnostics.js` and `bin/ne-cli/presentation.js`

This is the long-form reference for NE CLI command and argument diagnostics. Terminal output stays compact: it prints a stable code, the immediate problem, a suggestion or hint when available, and a link to the matching entry here.

The CLI Error Book is separate from the Generation 3 compiler/runtime Error Code Book. A Gen 2 `NE####` code is not an alias for a Gen 3 `E3M####`, `W3M####`, `NEMIG####`, `NENC####`, or other subsystem diagnostic.

## Diagnostic format

A coded CLI failure follows this shape:

```text
ERROR · NE1001

Unknown command: bulid.
Suggestion: Did you mean "ne build"?
Hint: Run "ne help" to see the available commands.
Help: https://github.com/Kastrick8/nextjs-engine/blob/main-2/docs/2/ne-cli-error-book.md#ne1001
```

The adaptive renderer wraps the message to the terminal width. ANSI colors are excluded from width calculations. Use `--no-color` or `NO_COLOR=1` for plain output; set `NE_ASCII=1` for ASCII borders.

## Code format

Generation 2 CLI codes use the `NE` prefix followed by four decimal digits.

- **1xxx** — command and argument parsing errors.
- **2xxx** — execution/runtime diagnostics that the CLI can locate and explain.

## Code index

| Code | Severity | Meaning | Status |
|---|---|---|---|
| [NE1001](#ne1001) | Error | Unknown command | Emitted |
| [NE1002](#ne1002) | Error | Unknown option | Emitted |
| [NE1003](#ne1003) | Error | Required option value is missing | Emitted |
| [NE1004](#ne1004) | Error | Option value is invalid | Emitted |
| [NE2001](#ne2001) | Error | JavaScript syntax error with an inferable source location | Emitted when Node exposes source location context |

## Details

### NE1001 — Unknown command

**What it means:** The requested subcommand is not recognized.

**Example:**

```sh
ne bulid
```

**Why it happens:** The CLI could not match the requested command to its supported command list.

**Recommended action:** Run `ne help` and choose a listed command. When a sufficiently close spelling exists, NE suggests it (for example, `ne build`). Suggestions are advisory; the CLI never runs the suggested command automatically.

### NE1002 — Unknown option

**What it means:** A flag is not supported by the selected command.

**Example:**

```sh
ne --verison
```

**Why it happens:** The option name does not match a supported flag.

**Recommended action:** Check the command's supported options with `ne help`. A close match such as `--version` may be suggested. The suggestion is not executed.

### NE1003 — Required option value is missing

**What it means:** An option expects a value, but none was supplied.

**Example:**

```sh
ne update --channel
```

**Why it happens:** The CLI reached the end of the arguments or encountered another flag before receiving the required value.

**Recommended action:** Supply the value after the option or use the `--name=value` form.

### NE1004 — Option value is invalid

**What it means:** An option received a value outside its accepted range or format.

**Example:**

```sh
ne --and-terminal=0
```

**Why it happens:** The supplied value does not satisfy the command's validation rule. For `--and-terminal`, the accepted value is an integer from 1 through 100.

**Recommended action:** Use the range/format in the diagnostic message or run `ne help` for the supported syntax.

### NE2001 — JavaScript syntax error

**What it means:** Node reported a JavaScript syntax error and the CLI was able to recover its source file and line/column context.

**Why it happens:** A project configuration or script loaded by the CLI contains JavaScript that cannot be parsed.

**Recommended action:** Open the reported file and fix the syntax at the highlighted location. The CLI prints a source code frame when the stack contains a readable path and the source can be loaded. If Node does not expose enough source context, the failure is still reported but may use the generic `NE CLI` heading instead of `NE2001`.

## Warnings without a stable error code

The first-release notice is informational and intentionally has no diagnostic code:

> **NE CLI · NEW IN 2.7.0** — The NE CLI is newly introduced in v2.7.0. Its commands and behavior may change, and it could be removed in a future release.

This notice is shown for interactive command runs and can be suppressed with `-q` or `--quiet`. It is not a Gen 3 migration warning.

## Generation 3 migration diagnostics

The Generation 3 development compiler uses its own migration diagnostics. They are documented separately in [Migrating to Generation 3](./migrating-to-3.md) and the [Generation 3 Error Code Book](https://github.com/Kastrick8/nextjs-engine/tree/main-3/docs/3/error-codes). Do not copy Gen 3 migration IDs into Gen 2 code or treat them as replacements for the `NE####` CLI codes.
