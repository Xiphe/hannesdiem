// This toolbar workaround is browser-specific; a WebKit/CSS feature probe also
// matches desktop Safari and other iOS browsers without Safari's floating UI.
export function isIOSSafari({
  userAgent,
  platform,
  maxTouchPoints,
}: Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'>) {
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)
  return (
    ios &&
    /AppleWebKit\//.test(userAgent) &&
    /Version\/[\d.]+.*Safari\//.test(userAgent) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA\//.test(userAgent)
  )
}
