import type { JsonValue } from "./schema";

export function quantizeMm(value: number): number {
  if (!Number.isFinite(value)) return value;
  const result = Math.round((value + Math.sign(value) * Number.EPSILON) * 100) / 100;
  return Object.is(result, -0) ? 0 : result;
}

export function compareCanonicalText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function canonicalize(value: JsonValue): JsonValue {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("canonical JSON 不接受非有限数值");
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const result = Object.create(null) as Record<string, JsonValue>;
    for (const key of Object.keys(value).sort()) result[key] = canonicalize(value[key]);
    return result;
  }
  return value;
}

export function canonicalStringify(value: JsonValue): string {
  return JSON.stringify(canonicalize(value));
}

export function prettyCanonicalStringify(value: JsonValue): string {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}
