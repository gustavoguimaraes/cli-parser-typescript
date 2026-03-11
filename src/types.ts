// Public types — the surface area consumers of this library interact with.

export type ArgumentType = "string" | "number" | "boolean";

export interface ArgumentOptions {
  type?: ArgumentType;
  // Pass null explicitly to mark an optional argument with no default value.
  default?: string | number | boolean | null;
}

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
