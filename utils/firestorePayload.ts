function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Firestore rejects explicit `undefined` anywhere in a payload. Strip it from
 * plain objects while preserving SDK sentinel values such as serverTimestamp()
 * and deleteField(), which are non-plain objects.
 */
export function withoutUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => withoutUndefined(item)) as T;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const next: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined) {
      next[key] = withoutUndefined(item);
    }
  }
  return next as T;
}
