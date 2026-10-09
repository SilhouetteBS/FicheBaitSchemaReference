export function readStorage(key, fallback, validate = (value) => (
  Array.isArray(fallback) ? Array.isArray(value) : value !== null && typeof value === 'object' && !Array.isArray(value)
), storage) {
  try {
    const value = JSON.parse((storage ?? globalThis.localStorage).getItem(key) ?? 'null');
    return validate(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
