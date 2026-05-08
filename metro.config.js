const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Firebase JS SDK requires .cjs extension support (firebase-js-sdk#9020)
config.resolver.sourceExts.push("cjs");

// Skip macOS AppleDouble resource-fork files (created on exFAT/NTFS volumes).
// They're empty siblings prefixed with ._ or .__ that crash Metro's parser.
config.resolver.blockList = [
  /(^|\/)\._[^/]+$/,
  /(^|\/)\.__[^/]+$/,
];

module.exports = withNativeWind(config, { input: "./global.css" });
