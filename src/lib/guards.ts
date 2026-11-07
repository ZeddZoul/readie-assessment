/** Type guard for "is this string one of these literals?" without widening or asserting the list. */
export function isOneOf<const T extends string>(values: readonly T[], value: string): value is T {
  return values.some((v) => v === value);
}

/** `Array.isArray` narrows `unknown` to `any[]`; this narrows to `unknown[]` instead. */
export function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}
