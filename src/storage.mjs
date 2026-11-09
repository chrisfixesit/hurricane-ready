/**
 * Tiny on-disk JSON helpers shared by state.json and subscriptions.json.
 *
 * `writeJsonAtomic` writes to `<dest>.tmp` then renames over the destination —
 * so a crash mid-write can only leave the prior valid contents or a stray .tmp,
 * never a truncated destination. (Issue #21.)
 *
 * `readJsonSafe` returns a fallback when the file is missing or corrupt, but
 * surfaces the parse error to a caller-supplied `onError` so silent data loss
 * stops being invisible.
 */
import * as fs from "node:fs";
import path from "node:path";

export function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value));
  try {
    fs.renameSync(tmp, file);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* tmp already gone */ }
    throw err;
  }
}

export function readJsonSafe(file, fallback, { onError } = {}) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (err) {
    if (typeof onError === "function") onError(err);
    return fallback;
  }
}

/**
 * Resolve an env-supplied file path and require it to sit inside the data
 * directory (issue #30). Throws at config load, so the server refuses to
 * boot: with a read-only root filesystem the only writable places are the
 * data volume and /tmp, and /tmp dies with the task, so a stray path would
 * quietly lose alert state or subscribers on the next restart.
 */
export function resolveDataPath(name, value, dataDir) {
  // Relative paths resolve against the working directory, so `npm run demo`
  // can use ./data. In the container that's /app, which is outside /data and
  // still refused.
  const root = path.resolve(dataDir);
  const resolved = path.resolve(value);
  if (!resolved.startsWith(root + path.sep)) {
    throw new Error(`${name} must be inside ${root}, got "${value}"`);
  }
  return resolved;
}
