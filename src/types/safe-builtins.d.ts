// Make the built-in sources of `any` return `unknown`, so untrusted data must be validated
// before use (the zod schemas in src/api/schemas.ts do that). Declared as global interface
// merges; later overloads take precedence over the lib.dom/lib.es5 signatures.

interface JSON {
  parse(text: string, reviver?: (this: unknown, key: string, value: unknown) => unknown): unknown;
}

interface Body {
  json(): Promise<unknown>;
}
