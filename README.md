# cli-parser-lib

A TypeScript library for declaratively defining CLI arguments and parsing a command string into a typed result object.

## Usage

```ts
import { CommandBuilder } from "cli-parser-lib";

const command = new CommandBuilder("cat");
command.addArgument("file", { type: "string", default: "." });
command.addArgument("-v", "--verbose", { type: "boolean" });
command.addArgument("-l", "--line-limit", { type: "number", default: null });

const args = command.parse("-v -l 5 ./notes.txt");
// { file: "./notes.txt", verbose: true, "line-limit": 5 }
```

## API

### `new CommandBuilder(name: string)`

Creates a builder for a command. `name` appears in error messages.

### `.addArgument(name, options?)` — positional argument

| Option | Type | Default |
|---|---|---|
| `type` | `"string" \| "number" \| "boolean"` | `"string"` |
| `default` | matching type or `null` | required (omit to make required) |

Positionals are filled left-to-right in declaration order.

### `.addArgument(shortFlag, longFlag?, options?)` — option flag

Flags start with `-`. The result key is derived from the long flag name (e.g. `"--line-limit"` → `"line-limit"`), or the short flag name when there is no long flag.

| Option | Type | Default |
|---|---|---|
| `type` | `"string" \| "number" \| "boolean"` | `"boolean"` |
| `default` | matching type or `null` | boolean flags default to `false` |

Both methods return `this` for chaining.

### `.parse(input: string)` → `ParsedArguments`

Parses a CLI string and returns `Record<string, string | number | boolean | null>`.

**Supported syntax:**
- Quoted values: `--msg "hello world"` or `--msg 'hello world'`
- Inline values: `--count=5` or `--verbose=false`
- Boolean shorthands: `true/false`, `1/0`, `yes/no`

## Known limitations

- **Negative numbers** as bare positional values (e.g. `-5`) are treated as unknown flags. Use inline option syntax instead: `--delta=-5`.
- Whitespace separator is space only — tabs are not treated as delimiters.

## Development

```sh
npm test            # run tests (78 cases)
npm run test:watch  # re-run on file changes
npm run typecheck   # type-check without emitting
npm run build       # compile to dist/
```

## Project structure

```
src/
  types.ts            ← all type definitions
  tokenizer.ts        ← CLI string → Token[]
  cast.ts             ← string → typed value
  command-builder.ts  ← CommandBuilder class
  index.ts            ← public entry point
  cli-parser.test.ts  ← tests
```


## What it does

`CommandBuilder` lets you define:

- positional arguments
- short flags like `-v`
- long flags like `--verbose`
- typed values: `string`, `number`, and `boolean`
- defaults for positional and option arguments

The parser supports:

- quoted values with spaces
- boolean flags that become `true` when present
- inline option values like `--line-limit=5`
- validation for unknown flags, missing required values, and invalid type conversions

## Example

```ts
import { CommandBuilder } from "./dist/cli-parser.js";

const command = new CommandBuilder("cat");

command.addArgument("file", { type: "string", default: "." });
command.addArgument("-v", "--verbose", { type: "boolean" });
command.addArgument("-l", "--line-limit", { type: "number", default: null });

const args = command.parse('-v -l 5 "./notes.txt"');

console.log(args);
// {
//   file: "./notes.txt",
//   verbose: true,
//   "line-limit": 5
// }
```

## Project layout

- `cli-parser.ts`: main library source
- `dist/`: compiled JavaScript and type declarations after build
- `package.json`: npm scripts for build, typecheck, and test

## Install dependencies

```bash
npm install
```

## Run the library

This repo is a library, not a standalone CLI executable. The normal workflow is:

1. Build the TypeScript output.
2. Import `CommandBuilder` from the compiled file.
3. Execute your own script or a Node one-liner.

Build:

```bash
npm run build
```

That emits compiled files into `dist/`.

One quick way to try it manually after building:

```bash
node --input-type=module
```

Then run:

```js
import { CommandBuilder } from "./dist/cli-parser.js";

const command = new CommandBuilder("cat");
command.addArgument("file", { type: "string", default: "." });
command.addArgument("-v", "--verbose", { type: "boolean" });
command.addArgument("-l", "--line-limit", { type: "number", default: null });

console.log(command.parse('-v --line-limit=5 "./notes.txt"'));
```

You can also run a one-liner:

```bash
node --input-type=module -e 'import { CommandBuilder } from "./dist/cli-parser.js"; const command = new CommandBuilder("cat"); command.addArgument("file", { type: "string", default: "." }); command.addArgument("-v", "--verbose", { type: "boolean" }); command.addArgument("-l", "--line-limit", { type: "number", default: null }); console.log(command.parse(`-v -l 5 "./notes.txt"`));'
```

## Type checking

```bash
npm run typecheck
```

This runs `tsc --noEmit`.

## Automated tests

Vitest is configured in `package.json`:

```bash
npm test
```

There are currently no `*.test.*` or `*.spec.*` files in the repository, so `npm test` exits with "No test files found". To add automated coverage, create test files such as:

- `cli-parser.test.ts`
- `cli-parser.spec.ts`

For watch mode:

```bash
npm run test:watch
```

## Manual testing ideas

Until automated tests are added, verify these behaviors manually:

- positional arguments parse in order
- boolean flags default to `false` unless provided
- number arguments reject non-numeric values
- quoted strings preserve spaces
- unknown flags throw descriptive errors
- required positional arguments throw when omitted

## Current scripts

```bash
npm run build
npm run typecheck
npm test
npm run test:watch
```
