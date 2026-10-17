// Rive files are bundled as Metro assets (see metro.config.js).
declare module '*.riv' {
  const asset: number;
  export default asset;
}
