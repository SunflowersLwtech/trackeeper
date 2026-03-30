const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Firebase JS SDK requires .cjs extension support (firebase-js-sdk#9020)
config.resolver.sourceExts.push("cjs");

module.exports = withNativeWind(config, { input: "./global.css" });
