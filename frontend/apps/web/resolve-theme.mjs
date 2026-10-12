import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.dirname(fileURLToPath(import.meta.url));

function findDesignSystemRoot(startDir) {
  // Walk up from apps/web → frontend → repo looking for the package.
  let dir = startDir;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "node_modules", "@playlovetoys", "design-system");
    if (existsSync(path.join(candidate, "package.json"))) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Resolve THEME (default workbench) to an absolute CSS path inside
 * @playlovetoys/design-system/themes/<THEME>.css
 */
export function resolvePltTheme(frontendRoot = webRoot) {
  const THEME = (process.env.THEME || "workbench").trim();
  const dsRoot = findDesignSystemRoot(frontendRoot);
  if (!dsRoot) {
    throw new Error(
      "Cannot resolve @playlovetoys/design-system. Run pnpm install in frontend/ (THEME theming).",
    );
  }

  const themesDir = path.join(dsRoot, "themes");
  const available = readdirSync(themesDir)
    .filter((name) => name.endsWith(".css"))
    .map((name) => name.slice(0, -4));

  if (!available.includes(THEME)) {
    throw new Error(
      `Unknown THEME "${THEME}". Available themes: ${available.sort().join(", ")}.`,
    );
  }

  const themeCss = path.join(themesDir, `${THEME}.css`);
  if (!existsSync(themeCss)) {
    throw new Error(`Theme file missing: ${themeCss}`);
  }

  return { THEME, themeCss, available, dsRoot };
}
