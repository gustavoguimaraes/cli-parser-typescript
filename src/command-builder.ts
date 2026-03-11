import type {
  ArgumentDefinition,
  ArgumentOptions,
  OptionArgumentDefinition,
  ParsedArguments,
  PositionalArgumentDefinition,
} from "./types.js";
import { castValueToType } from "./cast.js";
import { tokenizeInputString, type Token } from "./tokenizer.js";

/**
 * Fluent builder for defining and parsing CLI argument schemas.
 *
 * Call {@link addArgument} for each expected argument, then call {@link parse}
 * with the raw input string to receive a typed result object.
 *
 * @example
 * ```ts
 * const result = new CommandBuilder("greet")
 *   .addArgument("name")
 *   .addArgument("-v", "--verbose")
 *   .parse("Alice --verbose");
 * // → { name: "Alice", verbose: true }
 * ```
 */
export class CommandBuilder {
  private readonly commandName: string;
  private readonly argumentDefinitions: ArgumentDefinition[];

  /**
   * @param commandName - Display name used in error messages (e.g. `"my-cli"`).
   */
  constructor(commandName: string) {
    this.commandName = commandName;
    this.argumentDefinitions = [];
  }

  /**
   * Register a **positional** argument, consumed in declaration order.
   *
   * @param positionalName - Bare identifier (no leading `-`); becomes the result key.
   * @param options - Optional type and default configuration.
   * @returns `this` for chaining.
   *
   * @example
   * ```ts
   * builder.addArgument("file", { type: "string", default: "index.js" });
   * ```
   */
  addArgument(positionalName: string, options?: ArgumentOptions): this;

  /**
   * Register an **option flag** argument (short and/or long form).
   *
   * @param shortOrLongFlag - A short flag (`"-v"`) or long flag (`"--verbose"`).
   * @param longFlag - Companion long flag when supplying both forms.
   * @param options - Optional type and default configuration.
   * @returns `this` for chaining.
   *
   * @example
   * ```ts
   * builder.addArgument("-n", "--count", { type: "number", default: 1 });
   * ```
   */
  addArgument(shortOrLongFlag: string, longFlag: string, options?: ArgumentOptions): this;

  addArgument(
    firstArgument: string,
    secondArgumentOrOptions?: string | ArgumentOptions,
    optionsForTwoFlagForm?: ArgumentOptions,
  ): this {
    if (firstArgument.startsWith("-")) {
      this.registerOptionArgument(firstArgument, secondArgumentOrOptions, optionsForTwoFlagForm);
    } else {
      this.registerPositionalArgument(firstArgument, secondArgumentOrOptions as ArgumentOptions | undefined);
    }
    return this;
  }

  /**
   * Parse a raw CLI input string against all registered argument definitions.
   *
   * Supported syntax forms:
   * - Positional value:  `value`
   * - Long option:       `--flag value`  or  `--flag=value`
   * - Short option:      `-f value`      or  `-f=value`
   * - Bare boolean flag: `--verbose`     (sets the value to `true`)
   * - Inline boolean:    `--verbose=false`
   * - Quoted value:      `"--literally-this-string"` (passed through as a positional)
   *
   * @param inputString - The raw argument string to parse.
   * @returns A {@link ParsedArguments} object; all registered argument names are present as keys.
   * @throws `Error` if an unknown flag is encountered, a required argument is missing,
   *   a value cannot be cast to its declared type, or the input contains an unterminated quote.
   *
   * @example
   * ```ts
   * const result = builder.parse("hello --count=3");
   * ```
   */
  parse(inputString: string): ParsedArguments {
    const tokens = tokenizeInputString(inputString);
    const result: ParsedArguments = this.buildResultWithDefaults();
    const positionalDefinitions = this.argumentDefinitions.filter(
      (definition): definition is PositionalArgumentDefinition => definition.kind === "positional",
    );

    let positionalFillIndex = 0;
    let tokenIndex = 0;

    while (tokenIndex < tokens.length) {
      // Guaranteed defined: the while condition ensures tokenIndex < tokens.length.
      const currentToken = tokens[tokenIndex] as Token;

      if (!currentToken.wasQuoted && currentToken.value.startsWith("-")) {
        tokenIndex = this.consumeOptionToken(tokens, tokenIndex, result);
      } else {
        this.consumePositionalToken(currentToken, positionalDefinitions, positionalFillIndex, result);
        positionalFillIndex += 1;
        tokenIndex += 1;
      }
    }

    this.validateRequiredPositionals(positionalDefinitions, result);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Token consumers
  // ---------------------------------------------------------------------------

  // Reads a flag token (and possibly the following value token) and writes the
  // result. Returns the next tokenIndex to continue from.
  private consumeOptionToken(
    tokens: Token[],
    tokenIndex: number,
    result: ParsedArguments,
  ): number {
    const currentToken = tokens[tokenIndex] as Token;
    const equalsSignPosition = currentToken.value.indexOf("=");
    const hasInlineValue = equalsSignPosition !== -1;

    const flagPortion = hasInlineValue
      ? currentToken.value.slice(0, equalsSignPosition)
      : currentToken.value;

    const inlineValue = hasInlineValue
      ? currentToken.value.slice(equalsSignPosition + 1)
      : null;

    const optionDefinition = this.findOptionDefinitionByFlag(flagPortion);

    if (optionDefinition === null) {
      throw new Error(
        `[${this.commandName}] Unknown option flag: "${flagPortion}". ` +
          `Registered flags: ${this.describeRegisteredFlags()}.`,
      );
    }

    if (optionDefinition.type === "boolean") {
      // A bare flag means true. An inline =value allows explicit control
      // (e.g. --verbose=false to disable a flag that defaults to true).
      result[optionDefinition.canonicalName] = hasInlineValue
        ? castValueToType(inlineValue as string, "boolean", flagPortion)
        : true;
      return tokenIndex + 1;
    }

    // Non-boolean: use the inline value if provided, otherwise consume the next token.
    if (hasInlineValue) {
      result[optionDefinition.canonicalName] = castValueToType(
        inlineValue as string,
        optionDefinition.type,
        flagPortion,
      );
      return tokenIndex + 1;
    }

    const nextToken: Token | undefined = tokens[tokenIndex + 1];

    if (nextToken === undefined || (!nextToken.wasQuoted && nextToken.value.startsWith("-"))) {
      throw new Error(
        `[${this.commandName}] Option "${flagPortion}" requires a value but none was provided.`,
      );
    }

    result[optionDefinition.canonicalName] = castValueToType(
      nextToken.value,
      optionDefinition.type,
      flagPortion,
    );
    return tokenIndex + 2;
  }

  // Fills the next unfilled positional slot with the given token's value.
  private consumePositionalToken(
    token: Token,
    positionalDefinitions: PositionalArgumentDefinition[],
    positionalFillIndex: number,
    result: ParsedArguments,
  ): void {
    if (positionalFillIndex >= positionalDefinitions.length) {
      throw new Error(
        `[${this.commandName}] Unexpected extra positional value: "${token.value}". ` +
          `Expected at most ${positionalDefinitions.length} positional argument(s).`,
      );
    }

    const definition = positionalDefinitions[positionalFillIndex] as PositionalArgumentDefinition;
    result[definition.name] = castValueToType(token.value, definition.type, definition.name);
  }

  // Throws if any required positional (one with no default) was never supplied.
  private validateRequiredPositionals(
    positionalDefinitions: PositionalArgumentDefinition[],
    result: ParsedArguments,
  ): void {
    for (const definition of positionalDefinitions) {
      if (!(definition.name in result)) {
        throw new Error(
          `[${this.commandName}] Required positional argument "${definition.name}" was not provided.`,
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Argument registration
  // ---------------------------------------------------------------------------

  private registerPositionalArgument(name: string, options: ArgumentOptions | undefined): void {
    const resolvedOptions = options ?? {};
    const hasDefault = Object.prototype.hasOwnProperty.call(resolvedOptions, "default");
    const defaultValue = hasDefault ? (resolvedOptions.default ?? null) : null;

    // Validate numeric defaults immediately so callers get a clear error at
    // definition time rather than a confusing failure the first time parse() runs.
    if (resolvedOptions.type === "number" && typeof defaultValue === "number" && !Number.isFinite(defaultValue)) {
      throw new Error(`Argument "${name}": default value ${defaultValue} is not a finite number.`);
    }

    this.argumentDefinitions.push({
      kind: "positional",
      name,
      type: resolvedOptions.type ?? "string",
      hasDefault,
      defaultValue,
    });
  }

  private registerOptionArgument(
    firstFlag: string,
    secondArgumentOrOptions: string | ArgumentOptions | undefined,
    optionsForTwoFlagForm: ArgumentOptions | undefined,
  ): void {
    let shortFlag: string | null = null;
    let longFlag: string | null = null;
    let resolvedOptions: ArgumentOptions;

    if (typeof secondArgumentOrOptions === "string") {
      // Two-flag form: addArgument("-v", "--verbose", options?)
      // Inlined rather than a helper to keep TypeScript's narrowing happy.
      if (firstFlag.startsWith("--")) { longFlag = firstFlag; } else { shortFlag = firstFlag; }
      if (secondArgumentOrOptions.startsWith("--")) { longFlag = secondArgumentOrOptions; } else { shortFlag = secondArgumentOrOptions; }
      resolvedOptions = optionsForTwoFlagForm ?? {};
    } else {
      // Single-flag form: addArgument("-v", options?) or addArgument("--verbose", options?)
      if (firstFlag.startsWith("--")) { longFlag = firstFlag; } else { shortFlag = firstFlag; }
      resolvedOptions = secondArgumentOrOptions ?? {};
    }

    // Long flags take priority for the result key: "--line-limit" → "line-limit"
    const canonicalName = longFlag !== null
      ? longFlag.replace(/^--/, "")
      : (shortFlag as string).replace(/^-/, "");

    const hasDefault = Object.prototype.hasOwnProperty.call(resolvedOptions, "default");
    const defaultValue = hasDefault ? (resolvedOptions.default ?? null) : null;

    if (resolvedOptions.type === "number" && typeof defaultValue === "number" && !Number.isFinite(defaultValue)) {
      throw new Error(`Argument "${canonicalName}": default value ${defaultValue} is not a finite number.`);
    }

    this.argumentDefinitions.push({
      kind: "option",
      shortFlag,
      longFlag,
      canonicalName,
      type: resolvedOptions.type ?? "boolean",
      hasDefault,
      defaultValue,
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  // Seeds the result object with default values before token processing begins.
  // Boolean options with no explicit default are seeded as false so they always
  // appear in the result even when the flag is absent.
  private buildResultWithDefaults(): ParsedArguments {
    const result: ParsedArguments = {};

    for (const definition of this.argumentDefinitions) {
      if (definition.kind === "positional") {
        if (definition.hasDefault) {
          result[definition.name] = castValueToType(
            definition.defaultValue,
            definition.type,
            definition.name,
          );
        }
      } else {
        if (definition.hasDefault) {
          result[definition.canonicalName] = castValueToType(
            definition.defaultValue,
            definition.type,
            definition.canonicalName,
          );
        } else if (definition.type === "boolean") {
          result[definition.canonicalName] = false;
        }
      }
    }

    return result;
  }

  private findOptionDefinitionByFlag(flag: string): OptionArgumentDefinition | null {
    for (const definition of this.argumentDefinitions) {
      if (definition.kind === "option") {
        if (definition.shortFlag === flag || definition.longFlag === flag) {
          return definition;
        }
      }
    }
    return null;
  }

  private describeRegisteredFlags(): string {
    const flagStrings: string[] = [];
    for (const definition of this.argumentDefinitions) {
      if (definition.kind === "option") {
        const parts = [definition.shortFlag, definition.longFlag].filter(Boolean);
        flagStrings.push(parts.join("/"));
      }
    }
    return flagStrings.length > 0 ? flagStrings.join(", ") : "(none)";
  }
}
