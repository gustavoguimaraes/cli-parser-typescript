import { describe, it, expect } from "vitest";
import { CommandBuilder } from "./index.js";

// ---------------------------------------------------------------------------
// Spec example
// ---------------------------------------------------------------------------

describe("spec example", () => {
  it("parses the canonical cat-command example correctly", () => {
    const command = new CommandBuilder("cat");
    command.addArgument("file", { type: "string", default: "." });
    command.addArgument("-v", "--verbose", { type: "boolean" });
    command.addArgument("-l", "--line-limit", { type: "number", default: null });

    const result = command.parse("-v -l 5 ./path/to/file");

    expect(result).toEqual({
      file: "./path/to/file",
      verbose: true,
      "line-limit": 5,
    });
  });
});

// ---------------------------------------------------------------------------
// Positional arguments
// ---------------------------------------------------------------------------

describe("positional arguments", () => {
  it("parses a single required positional", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("file");

    expect(command.parse("myfile.txt")).toEqual({ file: "myfile.txt" });
  });

  it("uses the default when a positional with a default is omitted", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("file", { type: "string", default: "." });

    expect(command.parse("")).toEqual({ file: "." });
  });

  it("overrides the default when the positional is supplied", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("file", { type: "string", default: "." });

    expect(command.parse("./custom")).toEqual({ file: "./custom" });
  });

  it("parses multiple positionals in declaration order", () => {
    const command = new CommandBuilder("cp");
    command.addArgument("source");
    command.addArgument("destination");

    expect(command.parse("src.txt dst.txt")).toEqual({ source: "src.txt", destination: "dst.txt" });
  });

  it("throws on missing required positional", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("file");

    expect(() => command.parse("")).toThrow(/Required positional argument "file"/);
  });

  it("throws on missing second required positional", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("src");
    command.addArgument("dst");

    expect(() => command.parse("only-one")).toThrow(/Required positional argument "dst"/);
  });

  it("throws when too many positional values are supplied", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("file");

    expect(() => command.parse("a b")).toThrow(/Unexpected extra positional value: "b"/);
  });

  it("throws on third value when only two positionals declared", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("a");
    command.addArgument("b");

    expect(() => command.parse("x y z")).toThrow(/Unexpected extra positional value: "z"/);
  });

  it("casts a positional to number", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("count", { type: "number" });

    expect(command.parse("42")).toEqual({ count: 42 });
  });

  it("casts a positional to float", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("pi", { type: "number" });

    expect(command.parse("3.14")).toEqual({ pi: 3.14 });
  });

  it("uses a numeric default", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("port", { type: "number", default: 8080 });

    expect(command.parse("")).toEqual({ port: 8080 });
  });

  it("uses a null default for an optional positional", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("file", { type: "string", default: null });

    expect(command.parse("")).toEqual({ file: null });
  });
});

// ---------------------------------------------------------------------------
// Boolean option flags
// ---------------------------------------------------------------------------

describe("boolean option flags", () => {
  it("is false when not supplied (no explicit default)", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-v", "--verbose", { type: "boolean" });

    expect(command.parse("")).toEqual({ verbose: false });
  });

  it("is true when the short flag is supplied", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-v", "--verbose", { type: "boolean" });

    expect(command.parse("-v")).toEqual({ verbose: true });
  });

  it("is true when the long flag is supplied", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-v", "--verbose", { type: "boolean" });

    expect(command.parse("--verbose")).toEqual({ verbose: true });
  });

  it("respects explicit default: false", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-v", { type: "boolean", default: false });

    expect(command.parse("")).toEqual({ v: false });
  });

  it("respects explicit default: true when flag is absent", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-v", { type: "boolean", default: true });

    expect(command.parse("")).toEqual({ v: true });
  });

  it("flag presence overrides explicit default: false", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-v", { type: "boolean", default: false });

    expect(command.parse("-v")).toEqual({ v: true });
  });

  it("multiple boolean flags parsed together", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-v", "--verbose", { type: "boolean" });
    command.addArgument("-d", "--debug", { type: "boolean" });

    expect(command.parse("-v -d")).toEqual({ verbose: true, debug: true });
  });

  it("only one of two boolean flags supplied", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-v", "--verbose", { type: "boolean" });
    command.addArgument("-d", "--debug", { type: "boolean" });

    expect(command.parse("-d")).toEqual({ verbose: false, debug: true });
  });

  // Inline =value syntax for boolean flags
  it("--flag=true inline syntax sets the flag to true", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-v", "--verbose", { type: "boolean" });

    expect(command.parse("--verbose=true")).toEqual({ verbose: true });
  });

  it("--flag=false inline syntax sets the flag to false", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-v", "--verbose", { type: "boolean" });

    expect(command.parse("--verbose=false")).toEqual({ verbose: false });
  });

  it("--flag=1 inline syntax sets the flag to true", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-v", "--verbose", { type: "boolean" });

    expect(command.parse("--verbose=1")).toEqual({ verbose: true });
  });

  it("--flag=0 inline syntax sets the flag to false", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-v", "--verbose", { type: "boolean" });

    expect(command.parse("--verbose=0")).toEqual({ verbose: false });
  });

  it("--flag=yes inline syntax sets the flag to true", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-v", "--verbose", { type: "boolean" });

    expect(command.parse("--verbose=yes")).toEqual({ verbose: true });
  });

  it("--flag=no inline syntax sets the flag to false", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-v", "--verbose", { type: "boolean" });

    expect(command.parse("--verbose=no")).toEqual({ verbose: false });
  });

  it("throws when --flag=<invalid> is used on a boolean", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-v", "--verbose", { type: "boolean" });

    expect(() => command.parse("--verbose=maybe")).toThrow(/cannot convert "maybe" to a boolean/);
  });
});

// ---------------------------------------------------------------------------
// Number option flags
// ---------------------------------------------------------------------------

describe("number option flags", () => {
  it("parses an integer value via long flag", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-l", "--line-limit", { type: "number" });

    expect(command.parse("--line-limit 10")).toEqual({ "line-limit": 10 });
  });

  it("parses an integer value via short flag", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-l", "--line-limit", { type: "number" });

    expect(command.parse("-l 10")).toEqual({ "line-limit": 10 });
  });

  it("parses a float value", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("--ratio", { type: "number" });

    expect(command.parse("--ratio 0.75")).toEqual({ ratio: 0.75 });
  });

  it("parses zero", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("--count", { type: "number" });

    expect(command.parse("--count 0")).toEqual({ count: 0 });
  });

  it("parses scientific notation", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("--exp", { type: "number" });

    expect(command.parse("--exp 1e5")).toEqual({ exp: 100000 });
  });

  it("parses hex notation", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("--hex", { type: "number" });

    expect(command.parse("--hex 0xFF")).toEqual({ hex: 255 });
  });

  it("uses --flag=value inline syntax for numbers", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-l", "--line-limit", { type: "number" });

    expect(command.parse("--line-limit=5")).toEqual({ "line-limit": 5 });
  });

  it("uses the default when the option is absent", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-l", "--line-limit", { type: "number", default: null });

    expect(command.parse("")).toEqual({ "line-limit": null });
  });

  it("uses a numeric default", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("--port", { type: "number", default: 3000 });

    expect(command.parse("")).toEqual({ port: 3000 });
  });

  it("throws on a non-numeric string value", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("--count", { type: "number" });

    expect(() => command.parse("--count abc")).toThrow(/cannot convert "abc" to a number/);
  });

  it("throws on 'Infinity' as a number value", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("--val", { type: "number" });

    expect(() => command.parse("--val Infinity")).toThrow(/cannot convert "Infinity" to a number/);
  });

  it("throws on 'NaN' as a number value", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("--val", { type: "number" });

    expect(() => command.parse("--val NaN")).toThrow(/cannot convert "NaN" to a number/);
  });

  it("throws when a number option has no value at end of string", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-l", "--line-limit", { type: "number" });

    expect(() => command.parse("--line-limit")).toThrow(/requires a value but none was provided/);
  });

  it("throws when a number option is immediately followed by another flag", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-l", "--line-limit", { type: "number" });
    command.addArgument("-v", "--verbose", { type: "boolean" });

    expect(() => command.parse("--line-limit --verbose")).toThrow(/requires a value but none was provided/);
  });

  it("throws when default value is Infinity", () => {
    const command = new CommandBuilder("cmd");
    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
    expect(() => command.addArgument("--val", { type: "number", default: Infinity })).toThrow(
      /default value Infinity is not a finite number/,
    );
  });
});

// ---------------------------------------------------------------------------
// String option flags
// ---------------------------------------------------------------------------

describe("string option flags", () => {
  it("parses a plain string value", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-o", "--output", { type: "string" });

    expect(command.parse("--output result.txt")).toEqual({ output: "result.txt" });
  });

  it("parses a quoted string value containing spaces", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("--msg", { type: "string" });

    expect(command.parse('--msg "hello world"')).toEqual({ msg: "hello world" });
  });

  it("parses a single-quoted string value containing spaces", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("--msg", { type: "string" });

    expect(command.parse("--msg 'hello world'")).toEqual({ msg: "hello world" });
  });

  it("uses --flag=value inline syntax", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("--output", { type: "string" });

    expect(command.parse("--output=result.txt")).toEqual({ output: "result.txt" });
  });

  it("preserves a string value that looks numeric", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("--label", { type: "string" });

    expect(command.parse("--label 42")).toEqual({ label: "42" });
  });
});

// ---------------------------------------------------------------------------
// Mixed positional + option ordering
// ---------------------------------------------------------------------------

describe("mixed positional and option ordering", () => {
  it("option before positional", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("file");
    command.addArgument("-v", "--verbose", { type: "boolean" });

    expect(command.parse("-v file.txt")).toEqual({ file: "file.txt", verbose: true });
  });

  it("option after positional", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("file");
    command.addArgument("-v", "--verbose", { type: "boolean" });

    expect(command.parse("file.txt -v")).toEqual({ file: "file.txt", verbose: true });
  });

  it("option between two positionals", () => {
    const command = new CommandBuilder("cp");
    command.addArgument("source");
    command.addArgument("destination");
    command.addArgument("-v", "--verbose", { type: "boolean" });

    expect(command.parse("src.txt -v dst.txt")).toEqual({
      source: "src.txt",
      destination: "dst.txt",
      verbose: true,
    });
  });

  it("multiple options interspersed with a positional", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("file");
    command.addArgument("-v", "--verbose", { type: "boolean" });
    command.addArgument("-l", "--line-limit", { type: "number" });

    expect(command.parse("-l 20 file.txt -v")).toEqual({
      file: "file.txt",
      verbose: true,
      "line-limit": 20,
    });
  });
});

// ---------------------------------------------------------------------------
// Canonical name derivation
// ---------------------------------------------------------------------------

describe("canonical name derivation", () => {
  it("uses the long flag name (without --) as the key", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-v", "--verbose", { type: "boolean" });

    expect(command.parse("-v")).toHaveProperty("verbose");
  });

  it("preserves dashes in a long flag name", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-l", "--line-limit", { type: "number", default: null });

    expect(command.parse("")).toHaveProperty("line-limit");
  });

  it("uses the short flag name (without -) when no long flag is given", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-v", { type: "boolean" });

    expect(command.parse("-v")).toHaveProperty("v");
    expect(command.parse("-v")).toEqual({ v: true });
  });

  it("uses the long flag name (without --) for a long-only flag", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("--verbose", { type: "boolean" });

    expect(command.parse("--verbose")).toEqual({ verbose: true });
  });

  it("can match via short flag when both are registered", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-v", "--verbose", { type: "boolean" });

    // Short flag sets the canonical "verbose" key too
    expect(command.parse("-v")).toEqual({ verbose: true });
  });
});

// ---------------------------------------------------------------------------
// Quoting and tokenisation
// ---------------------------------------------------------------------------

describe("quoting and tokenisation", () => {
  it("double-quoted value with spaces is a single token", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("msg");

    expect(command.parse('"hello world"')).toEqual({ msg: "hello world" });
  });

  it("single-quoted value with spaces is a single token", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("msg");

    expect(command.parse("'hello world'")).toEqual({ msg: "hello world" });
  });

  it("tabs inside double quotes preserve the tab character", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("msg");

    expect(command.parse('"hello\tworld"')).toEqual({ msg: "hello\tworld" });
  });

  it("spaces inside single quotes are preserved", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("msg");

    expect(command.parse("'   '")).toEqual({ msg: "   " });
  });

  it("multiple consecutive spaces between tokens act as a single separator", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("a");
    command.addArgument("b");

    expect(command.parse("x   y")).toEqual({ a: "x", b: "y" });
  });

  it("leading and trailing spaces are ignored", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("file");

    expect(command.parse("  myfile.txt  ")).toEqual({ file: "myfile.txt" });
  });

  it("whitespace-only input is treated as empty", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("file", { type: "string", default: "." });

    expect(command.parse("   ")).toEqual({ file: "." });
  });

  it("throws on an unterminated double quote", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("msg");

    expect(() => command.parse('"hello world')).toThrow(/Unterminated quoted string/);
  });

  it("throws on an unterminated single quote", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("msg");

    expect(() => command.parse("'hello world")).toThrow(/Unterminated quoted string/);
  });

  it("a quoted value that starts with -- is treated as a positional, not a flag", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("msg");

    // Without quotes "--hello" would be treated as an unknown flag.
    // With quotes it is just a string value.
    expect(command.parse('"--hello"')).toEqual({ msg: "--hello" });
  });
});

// ---------------------------------------------------------------------------
// Error cases — unknown flags
// ---------------------------------------------------------------------------

describe("unknown flags", () => {
  it("throws when an unregistered short flag is supplied", () => {
    const command = new CommandBuilder("cmd");

    expect(() => command.parse("-z")).toThrow(/Unknown option flag: "-z"/);
  });

  it("throws when an unregistered long flag is supplied", () => {
    const command = new CommandBuilder("cmd");

    expect(() => command.parse("--unknown")).toThrow(/Unknown option flag: "--unknown"/);
  });

  it("error message names the command", () => {
    const command = new CommandBuilder("myprogram");

    expect(() => command.parse("--nope")).toThrow(/\[myprogram\]/);
  });

  it("error message lists registered flags", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("-v", "--verbose", { type: "boolean" });

    expect(() => command.parse("--unknown")).toThrow(/-v\/--verbose/);
  });
});

// ---------------------------------------------------------------------------
// Negative numbers — known behaviour
// ---------------------------------------------------------------------------

describe("negative numbers", () => {
  // A bare "-5" starts with "-" so the tokenizer treats it as a flag lookup.
  // This is a known limitation: negative numbers as positional values must be
  // quoted ("-5") or supplied via inline option syntax (--val=-5).
  it("bare -5 as a positional value throws (treated as unknown flag)", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("value", { type: "number" });

    expect(() => command.parse("-5")).toThrow(/Unknown option flag: "-5"/);
  });

  it("negative number via --flag=value inline syntax works", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("--delta", { type: "number" });

    expect(command.parse("--delta=-5")).toEqual({ delta: -5 });
  });

  it("a number option followed by a negative-looking token throws (treated as flag)", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("--delta", { type: "number" });

    // "--delta -5": -5 starts with "-" so it is treated as a flag, triggering
    // the "requires a value" error before it even reaches the unknown-flag check.
    expect(() => command.parse("--delta -5")).toThrow(/requires a value but none was provided/);
  });
});

// ---------------------------------------------------------------------------
// Fluent API / reuse
// ---------------------------------------------------------------------------

describe("fluent API and reuse", () => {
  it("addArgument returns the CommandBuilder instance for chaining", () => {
    const command = new CommandBuilder("cmd");
    const returned = command.addArgument("file");

    expect(returned).toBe(command);
  });

  it("addArgument chains work in sequence", () => {
    const command = new CommandBuilder("cmd");
    const result = command
      .addArgument("file")
      .addArgument("-v", "--verbose", { type: "boolean" })
      .parse("test.txt -v");

    expect(result).toEqual({ file: "test.txt", verbose: true });
  });

  it("parse() can be called multiple times on the same instance", () => {
    const command = new CommandBuilder("cmd");
    command.addArgument("file");
    command.addArgument("-v", "--verbose", { type: "boolean" });

    const first = command.parse("a.txt");
    const second = command.parse("-v b.txt");

    expect(first).toEqual({ file: "a.txt", verbose: false });
    expect(second).toEqual({ file: "b.txt", verbose: true });
  });

  it("parse() with no arguments registered returns an empty object", () => {
    const command = new CommandBuilder("cmd");

    expect(command.parse("")).toEqual({});
  });
});
