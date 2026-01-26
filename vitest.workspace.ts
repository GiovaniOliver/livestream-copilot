import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "apps/desktop-companion/vitest.config.ts",
  "apps/web/vitest.config.ts",
  "packages/shared/vitest.config.ts",
]);
