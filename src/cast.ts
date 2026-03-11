import type { ArgumentType } from "./types.js";

// Converts a raw value into the declared ArgumentType.
//
// - null / undefined → null (represents an absent optional argument).
// - A value already of the correct JS type is validated and returned as-is.
// - A string token from the CLI is parsed into the target type.
//
// `argumentLabel` is used only in error messages.
export function castValueToType(
  rawValue: string | number | boolean | null | undefined,
  targetType: ArgumentType,
  argumentLabel: string,
): string | number | boolean | null {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  switch (targetType) {
    case "string": {
      return String(rawValue);
    }

    case "number": {
      if (typeof rawValue === "number") {
        if (!Number.isFinite(rawValue)) {
          throw new Error(
            `Argument "${argumentLabel}": default value ${rawValue} is not a finite number.`,
          );
        }
        return rawValue;
      }

      const parsedNumber = Number(rawValue);

      if (!Number.isFinite(parsedNumber)) {
        throw new Error(
          `Argument "${argumentLabel}": cannot convert "${rawValue}" to a number.`,
        );
      }

      return parsedNumber;
    }

    case "boolean": {
      if (typeof rawValue === "boolean") return rawValue;

      const lowercaseValue = String(rawValue).toLowerCase();

      if (lowercaseValue === "true" || lowercaseValue === "1" || lowercaseValue === "yes") {
        return true;
      }

      if (lowercaseValue === "false" || lowercaseValue === "0" || lowercaseValue === "no") {
        return false;
      }

      throw new Error(
        `Argument "${argumentLabel}": cannot convert "${rawValue}" to a boolean. ` +
          `Accepted values: true/false, 1/0, yes/no.`,
      );
    }
  }
}
