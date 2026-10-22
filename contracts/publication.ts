export const publicationPath = '/_cmx/publication'
export const maxPublicationBytes = 8 * 1024 * 1024

export const signatureLifetime = 60
export const signatureTag = 'cmx-publication'
export const manifestConditionHeader = 'cmx-if-none-match'
const baseComponents = ['@method', '@target-uri', 'content-type', 'content-digest']
export const signatureComponents = (method: string) =>
  method === 'GET' ? [...baseComponents, manifestConditionHeader] : baseComponents

export async function publicationDigest(body: Uint8Array<ArrayBuffer>): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', body))
  return `sha-256=:${btoa(String.fromCharCode(...hash))}:`
}
