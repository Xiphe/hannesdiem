import { createPrivateKey, createPublicKey } from 'node:crypto'
import { publicationPath } from '../app/publication/index.ts'

const { CMX_PUBLISH_PRIVATE_KEY, CMX_PUBLISH_KEY_ID, CMX_PUBLISH_PUBLIC_KEYS, SITE_URL } =
  process.env
if (!CMX_PUBLISH_PRIVATE_KEY || !CMX_PUBLISH_KEY_ID || !CMX_PUBLISH_PUBLIC_KEYS || !SITE_URL) {
  throw new Error(
    'Configure Production CMX_PUBLISH_PRIVATE_KEY secret and CMX_PUBLISH_KEY_ID, CMX_PUBLISH_PUBLIC_KEYS, SITE_URL variables; see docs/content-publishing.md.',
  )
}
try {
  const url = new URL(SITE_URL)
  if (
    url.protocol !== 'https:' ||
    SITE_URL !== url.origin ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error()
  const privateKey = createPrivateKey({ key: JSON.parse(CMX_PUBLISH_PRIVATE_KEY), format: 'jwk' })
  const expected = createPublicKey(privateKey).export({ format: 'jwk' })
  const publicKey = JSON.parse(CMX_PUBLISH_PUBLIC_KEYS)[CMX_PUBLISH_KEY_ID]
  if (
    privateKey.asymmetricKeyType !== 'ed25519' ||
    !publicKey ||
    publicKey.d ||
    publicKey.kty !== expected.kty ||
    publicKey.crv !== expected.crv ||
    publicKey.x !== expected.x
  )
    throw new Error()
  console.log(`Publishing configuration verified for ${new URL(publicationPath, url).href}.`)
} catch {
  throw new Error(
    'Publishing URL or Ed25519 key configuration is invalid; no credentials were printed.',
  )
}
