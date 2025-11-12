// Small helpers for editing JSON by path
export type PathSegment = string | number;

// Immutable set value at path. Returns a new object/array with the value set.
export function setValueAtPath(obj: any, path: PathSegment[], value: any): any {
  if (!path || path.length === 0) return value;

  const [head, ...rest] = path;

  // handle arrays
  if (Array.isArray(obj)) {
    const copy = obj.slice();
    const idx = typeof head === "number" ? head : parseInt(String(head), 10);
    copy[idx] = rest.length ? setValueAtPath(obj?.[idx], rest, value) : value;
    return copy;
  }

  // handle objects
  const copy: Record<string, any> = { ...(obj ?? {}) };
  const key = String(head);
  copy[key] = rest.length ? setValueAtPath(obj?.[key], rest, value) : value;
  return copy;
}

// Try to coerce an input string into the same type as currentValue when possible.
export function parseInputToType(input: string, currentValue: any) {
  const trimmed = input?.trim?.();

  // null
  if (currentValue === null) {
    if (!trimmed) return null;
    if (trimmed.toLowerCase() === "null") return null;
  }

  const t = typeof currentValue;
  if (t === "number") {
    const n = Number(trimmed);
    if (Number.isNaN(n)) throw new Error("Value must be a number");
    return n;
  }

  if (t === "boolean") {
    if (trimmed?.toLowerCase() === "true") return true;
    if (trimmed?.toLowerCase() === "false") return false;
    throw new Error("Value must be true or false");
  }

  if (t === "string") {
    return input;
  }

  // For objects/arrays, try parse JSON as a convenience, otherwise throw
  if (t === "object") {
    try {
      return JSON.parse(input);
    } catch (err) {
      throw new Error("Invalid JSON for object/array value");
    }
  }

  // Fallback — return raw input
  return input;
}

export function formatValueForInput(value: any) {
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}
