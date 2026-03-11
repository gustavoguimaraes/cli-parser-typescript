// A token produced by the tokenizer, carrying the string value and a flag
// indicating whether it was wrapped in quotes in the original input.
// The `wasQuoted` flag lets the parser treat a quoted "--value" as a plain
// string rather than looking it up as a registered flag.
export interface Token {
  value: string;
  wasQuoted: boolean;
}

// Splits a CLI string into tokens, respecting single- and double-quoted regions
// so that a quoted string containing spaces is treated as a single token.
//
// Example:
//   `--msg "hello world"` → [
//     { value: "--msg",        wasQuoted: false },
//     { value: "hello world",  wasQuoted: true  },
//   ]
export function tokenizeInputString(inputString: string): Token[] {
  const tokens: Token[] = [];
  let currentToken = "";
  let insideSingleQuote = false;
  let insideDoubleQuote = false;
  let currentTokenIsQuoted = false;

  for (let i = 0; i < inputString.length; i++) {
    const character = inputString[i];

    if (character === "'" && !insideDoubleQuote) {
      insideSingleQuote = !insideSingleQuote;
      currentTokenIsQuoted = true;
    } else if (character === '"' && !insideSingleQuote) {
      insideDoubleQuote = !insideDoubleQuote;
      currentTokenIsQuoted = true;
    } else if (character === " " && !insideSingleQuote && !insideDoubleQuote) {
      if (currentToken.length > 0) {
        tokens.push({ value: currentToken, wasQuoted: currentTokenIsQuoted });
        currentToken = "";
        currentTokenIsQuoted = false;
      }
    } else {
      currentToken += character;
    }
  }

  if (currentToken.length > 0) {
    tokens.push({ value: currentToken, wasQuoted: currentTokenIsQuoted });
  }

  if (insideSingleQuote || insideDoubleQuote) {
    throw new Error("Unterminated quoted string in CLI input.");
  }

  return tokens;
}
