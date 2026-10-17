// Monorepo resolution is automatic in expo/metro-config (SDK 52+).
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// Rive animation files ship as assets (assets/rive/finn.riv).
config.resolver.assetExts.push('riv');

// withUniwindConfig must stay the outermost wrapper.
module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  dtsFile: './src/uniwind-types.d.ts',
});
