// Public types — the surface area consumers of this library interact with.

/**
 * Built-in type tags that control how raw string tokens are cast.
 *
 * - `"string"` — keep the raw token as-is (the default for positional args)
 * - `"number"` — cast to a finite `number`; throws if the value is not parseable
 * - `"boolean"` — accept `"true"` / `"false"` / `"yes"` / `"no"` / `"1"` / `"0"`,
 *   or a bare flag presence; the default for option arguments
 */
export type ArgumentType = "string" | "number" | "boolean";

/**
 * Configuration options shared by positional and option argument definitions.
 */
export interface ArgumentOptions {
  /**
   * The type to cast the raw token to.
   * Defaults to `"string"` for positional arguments and `"boolean"` for option flags.
   */
  type?: ArgumentType;
  /**
   * Value to use when the argument is absent from the input.
   * Pass `null` explicitly to mark an optional argument with no fallback.
   * Omitting this field entirely makes the argument required (parse will throw if missing).
   */
  default?: string | number | boolean | null;
}

/**
 * The plain object returned by {@link CommandBuilder.parse}.
 * Every registered argument name appears as a key; values are fully cast and typed.
 */
export type ParsedArguments = Record<string, string | number | boolean | null>;

// ---------------------------------------------------------------------------
// Internal argument-definition shapes
// (exported so sibling modules can import them; not re-exported from index.ts)
// ---------------------------------------------------------------------------

export interface PositionalArgumentDefinition {
  kind: "positional";
  name: string;
  type: ArgumentType;
  hasDefault: boolean;
  defaultValue: string | number | boolean | null;
}

export interface OptionArgumentDefinition {
  kind: "option";
  shortFlag: string | null; // e.g. "-v"
  longFlag: string | null;  // e.g. "--verbose"
  // Derived from the long flag (without "--") when available, otherwise from the
  // short flag (without "-"). This becomes the key in the result object.
  canonicalName: string;
  type: ArgumentType;
  hasDefault: boolean;
  defaultValue: string | number | boolean | null;
}

export type ArgumentDefinition = PositionalArgumentDefinition | OptionArgumentDefinition;
