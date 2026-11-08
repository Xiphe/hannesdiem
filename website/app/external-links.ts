/** Shared website policy for native anchors and rendered content. */
export function externalLinkProps(
  href: unknown,
  rel?: unknown,
): { target?: '_blank'; rel?: string } {
  if (typeof href !== 'string') return {}
  let url: URL
  try {
    url = new URL(href, 'https://hannesdiem.de')
  } catch {
    return {}
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    ['hannesdiem.de', 'www.hannesdiem.de'].includes(url.hostname)
  )
    return {}
  const relationships = new Set(
    typeof rel === 'string' ? rel.toLowerCase().split(/\s+/).filter(Boolean) : [],
  )
  relationships.delete('opener')
  relationships.add('noopener')
  relationships.add('noreferrer')
  return { target: '_blank', rel: [...relationships].join(' ') }
}
