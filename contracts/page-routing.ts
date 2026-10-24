// Shared by content discovery and the publication reader; no filesystem at runtime.
export const notFoundEntry = '_404'

export function pagePath(entry: string): string | undefined {
  const segments = entry.split('/')
  if (segments.some((segment) => segment.startsWith('_'))) return undefined
  if (segments.some((segment) => !segment || segment === '.' || segment === '..'))
    throw new Error(`Invalid page entry: ${entry}`)
  if (segments.at(-1) === 'index') segments.pop()
  return '/' + segments.join('/')
}

export function discoverPages(files: string[]) {
  const paths = new Set<string>()
  return files.sort().flatMap((file) => {
    if (!file.endsWith('.tsx')) return []
    const document = file.slice(0, -4)
    const path = pagePath(document)
    if (path === undefined) return []
    if (paths.has(path)) throw new Error(`Duplicate page URL: ${path}`)
    paths.add(path)
    return [{ file, document, path }]
  })
}
