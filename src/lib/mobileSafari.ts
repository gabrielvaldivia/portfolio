const IOS_ALTERNATIVE_BROWSER_TOKENS = /(?:CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)\//

/** True only for Safari on an iPhone, iPad, or iPod user agent. */
export function isMobileSafariUserAgent(userAgent: string) {
  return /AppleWebKit\//.test(userAgent)
    && /Mobile\//.test(userAgent)
    && /Safari\//.test(userAgent)
    && !IOS_ALTERNATIVE_BROWSER_TOKENS.test(userAgent)
}
