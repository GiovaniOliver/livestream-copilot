// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// Find the workspace root
const workspaceRoot = path.resolve(__dirname, "../..");
const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// Let Metro know where to resolve packages from - include pnpm store
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Enable symlink resolution for pnpm
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
