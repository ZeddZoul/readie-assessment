/** Typed index access for tests: returns the element or fails loudly (no casts under noUncheckedIndexedAccess). */
export function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`Expected an element at index ${index}, found ${items.length} items`);
  return item;
}
