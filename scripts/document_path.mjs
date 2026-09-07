import fs from "node:fs";
import path from "node:path";

// Historical evidence keeps its original basename; never rewrite pinned JSON.
// Only a bare Markdown filename may fall back to docs/. Caller path-safety
// checks still apply to every other repository reference.
export function documentPath(rootDir, reference) {
  const direct = path.resolve(rootDir, reference);
  if (!fs.existsSync(direct) && /^[A-Z][A-Z0-9_-]*\.md$/.test(reference)) {
    const moved = path.resolve(rootDir, "docs", reference);
    if (fs.existsSync(moved)) return moved;
  }
  return direct;
}
