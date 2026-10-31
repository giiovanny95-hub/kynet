/** Metro resuelve los recursos de audio a un id numérico de asset. */
declare module '*.wav' {
  const asset: number;
  export default asset;
}

/** Metro resuelve las imágenes animadas de las guías a un id numérico de asset. */
declare module '*.webp' {
  const asset: number;
  export default asset;
}
