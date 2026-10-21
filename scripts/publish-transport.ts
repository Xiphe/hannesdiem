import { publicationPath } from '../app/publication.ts'
import { signPublicationRequest } from '../app/publication-signatures.ts'

// Read in the publishing process only. Other CMX commands need no credentials.
const privateKey = process.env.CMX_PUBLISH_PRIVATE_KEY
const keyId = process.env.CMX_PUBLISH_KEY_ID
const endpoint = process.env.CMX_PUBLISH_URL

export const publicationFetch: typeof globalThis.fetch = async (input, init) => {
  if (!privateKey || !keyId || !endpoint)
    throw new Error('CMX_PUBLISH_PRIVATE_KEY, CMX_PUBLISH_KEY_ID and CMX_PUBLISH_URL are required.')
  const request = new Request(input, init)
  const url = new URL(endpoint)
  if (
    request.url !== url.href ||
    url.pathname !== publicationPath ||
    url.search ||
    url.username ||
    url.password ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
  ) {
    throw new Error('Refusing to sign for an unexpected publishing endpoint.')
  }
  const key = await crypto.subtle.importKey('jwk', JSON.parse(privateKey), 'Ed25519', false, [
    'sign',
  ])
  return globalThis.fetch(await signPublicationRequest(request, key, keyId))
}
