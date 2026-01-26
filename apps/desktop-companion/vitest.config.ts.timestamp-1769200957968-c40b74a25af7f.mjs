// apps/desktop-companion/vitest.config.ts
import { defineConfig } from "file:///C:/Users/Oliver%20Productions/Desktop/1.SMG-BUSINESS/0b.)SMG-Main%20Brands%20Dev/livestream-copilot/node_modules/.pnpm/vitest@2.1.9_@types+node@22.19.3_@vitest+ui@2.1.9_jsdom@25.0.1_lightningcss@1.30.2_terser@5.44.1/node_modules/vitest/dist/config.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\Oliver Productions\\Desktop\\1.SMG-BUSINESS\\0b.)SMG-Main Brands Dev\\livestream-copilot\\apps\\desktop-companion";
var vitest_config_default = defineConfig({
  test: {
    name: "desktop-companion",
    root: __vite_injected_original_dirname,
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.{test,spec}.ts",
        "src/__tests__/**",
        "src/index.ts",
        "node_modules"
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    },
    testTimeout: 1e4
  },
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiYXBwcy9kZXNrdG9wLWNvbXBhbmlvbi92aXRlc3QuY29uZmlnLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcT2xpdmVyIFByb2R1Y3Rpb25zXFxcXERlc2t0b3BcXFxcMS5TTUctQlVTSU5FU1NcXFxcMGIuKVNNRy1NYWluIEJyYW5kcyBEZXZcXFxcbGl2ZXN0cmVhbS1jb3BpbG90XFxcXGFwcHNcXFxcZGVza3RvcC1jb21wYW5pb25cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXE9saXZlciBQcm9kdWN0aW9uc1xcXFxEZXNrdG9wXFxcXDEuU01HLUJVU0lORVNTXFxcXDBiLilTTUctTWFpbiBCcmFuZHMgRGV2XFxcXGxpdmVzdHJlYW0tY29waWxvdFxcXFxhcHBzXFxcXGRlc2t0b3AtY29tcGFuaW9uXFxcXHZpdGVzdC5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL09saXZlciUyMFByb2R1Y3Rpb25zL0Rlc2t0b3AvMS5TTUctQlVTSU5FU1MvMGIuKVNNRy1NYWluJTIwQnJhbmRzJTIwRGV2L2xpdmVzdHJlYW0tY29waWxvdC9hcHBzL2Rlc2t0b3AtY29tcGFuaW9uL3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZXN0L2NvbmZpZ1wiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgdGVzdDoge1xuICAgIG5hbWU6IFwiZGVza3RvcC1jb21wYW5pb25cIixcbiAgICByb290OiBfX2Rpcm5hbWUsXG4gICAgZW52aXJvbm1lbnQ6IFwibm9kZVwiLFxuICAgIGluY2x1ZGU6IFtcInNyYy8qKi8qLnt0ZXN0LHNwZWN9Lnt0cyx0c3h9XCJdLFxuICAgIGV4Y2x1ZGU6IFtcIm5vZGVfbW9kdWxlc1wiLCBcImRpc3RcIl0sXG4gICAgZ2xvYmFsczogdHJ1ZSxcbiAgICBzZXR1cEZpbGVzOiBbXCIuL3NyYy9fX3Rlc3RzX18vc2V0dXAudHNcIl0sXG4gICAgY292ZXJhZ2U6IHtcbiAgICAgIHByb3ZpZGVyOiBcInY4XCIsXG4gICAgICByZXBvcnRlcjogW1widGV4dFwiLCBcImpzb25cIiwgXCJodG1sXCJdLFxuICAgICAgaW5jbHVkZTogW1wic3JjLyoqLyoudHNcIl0sXG4gICAgICBleGNsdWRlOiBbXG4gICAgICAgIFwic3JjLyoqLyoue3Rlc3Qsc3BlY30udHNcIixcbiAgICAgICAgXCJzcmMvX190ZXN0c19fLyoqXCIsXG4gICAgICAgIFwic3JjL2luZGV4LnRzXCIsXG4gICAgICAgIFwibm9kZV9tb2R1bGVzXCIsXG4gICAgICBdLFxuICAgICAgdGhyZXNob2xkczoge1xuICAgICAgICBzdGF0ZW1lbnRzOiA4MCxcbiAgICAgICAgYnJhbmNoZXM6IDgwLFxuICAgICAgICBmdW5jdGlvbnM6IDgwLFxuICAgICAgICBsaW5lczogODAsXG4gICAgICB9LFxuICAgIH0sXG4gICAgdGVzdFRpbWVvdXQ6IDEwMDAwLFxuICB9LFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMGlCLFNBQVMsb0JBQW9CO0FBQ3ZrQixPQUFPLFVBQVU7QUFEakIsSUFBTSxtQ0FBbUM7QUFHekMsSUFBTyx3QkFBUSxhQUFhO0FBQUEsRUFDMUIsTUFBTTtBQUFBLElBQ0osTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sYUFBYTtBQUFBLElBQ2IsU0FBUyxDQUFDLCtCQUErQjtBQUFBLElBQ3pDLFNBQVMsQ0FBQyxnQkFBZ0IsTUFBTTtBQUFBLElBQ2hDLFNBQVM7QUFBQSxJQUNULFlBQVksQ0FBQywwQkFBMEI7QUFBQSxJQUN2QyxVQUFVO0FBQUEsTUFDUixVQUFVO0FBQUEsTUFDVixVQUFVLENBQUMsUUFBUSxRQUFRLE1BQU07QUFBQSxNQUNqQyxTQUFTLENBQUMsYUFBYTtBQUFBLE1BQ3ZCLFNBQVM7QUFBQSxRQUNQO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLE1BQ0EsWUFBWTtBQUFBLFFBQ1YsWUFBWTtBQUFBLFFBQ1osVUFBVTtBQUFBLFFBQ1YsV0FBVztBQUFBLFFBQ1gsT0FBTztBQUFBLE1BQ1Q7QUFBQSxJQUNGO0FBQUEsSUFDQSxhQUFhO0FBQUEsRUFDZjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
