import { PublicationRequestError } from './PublicationRequestError.ts'
import { verifySignature, webcrypto, isSignatureError } from 'http-message-sig'
import {
  signatureLifetime,
  signatureTag,
  signatureComponents,
  maxPublicationBytes,
  publicationDigest,
} from '../../../contracts/publication.ts'

async function publicationBody(request: Request): Promise<Uint8Array<ArrayBuffer>> {
  if (!request.body) return new Uint8Array()
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > maxPublicationBytes) {
        await reader.cancel()
        throw new PublicationRequestError('Publication exceeds 8 MiB.', 413)
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return bytes
}

export async function verifyPublicationRequest(request: Request, publicKeys: string) {
  const keys: Record<string, JsonWebKey> = JSON.parse(publicKeys)
  if (!keys || typeof keys !== 'object' || !Object.keys(keys).length) {
    throw new PublicationRequestError('Publishing keys are not configured.', 503)
  }
  try {
    if (
      (request.headers.get('Signature-Input')?.length ?? 0) > 4096 ||
      (request.headers.get('Signature')?.length ?? 0) > 4096
    )
      throw new Error('Oversized signature')
    const verified = await verifySignature(request, {
      label: 'cmx',
      policy: {
        algorithms: ['ed25519'],
        requiredComponents: signatureComponents(request.method),
        requiredParameters: ['created', 'expires', 'nonce', 'keyid', 'alg', 'tag'],
        maxAge: signatureLifetime,
        clockSkew: 5,
        validate({ parameters: p }) {
          return (
            Number.isInteger(p.created) &&
            Number.isInteger(p.expires) &&
            p.expires! > p.created! &&
            p.expires! - p.created! <= signatureLifetime &&
            typeof p.nonce === 'string' &&
            /^[A-Za-z0-9_-]{20,128}$/.test(p.nonce) &&
            p.tag === signatureTag
          )
        },
      },
      async resolveVerifier(candidate) {
        const id = candidate.parameters.keyid
        if (typeof id !== 'string' || !Object.hasOwn(keys, id)) throw new Error('Unknown key')
        const jwk = keys[id]
        if (jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519' || jwk.d)
          throw new Error('Invalid public key')
        // Node and Workers differ on the optional JWK alg spelling. The protocol
        // pins Ed25519 explicitly; import only its public curve coordinates.
        const key = await crypto.subtle.importKey(
          'jwk',
          { kty: 'OKP', crv: 'Ed25519', x: jwk.x },
          'Ed25519',
          false,
          ['verify'],
        )
        return webcrypto.verifier(key)
      },
    })
    const body = await publicationBody(request)
    if (
      request.headers.get('Content-Digest') !== (await publicationDigest(body)) ||
      request.headers.get('Content-Type') !== 'application/json'
    )
      throw new Error('Invalid content digest')
    return {
      nonce: `${verified.parameters.keyid}:${verified.parameters.nonce}`,
      expires: verified.parameters.expires! + 5,
      body,
    }
  } catch (error) {
    if (error instanceof PublicationRequestError) throw error
    console.warn(
      JSON.stringify({
        message: 'Publication authentication rejected',
        reason: isSignatureError(error) ? error.code : 'InvalidContent',
      }),
    )
    throw new PublicationRequestError('Invalid or expired publication signature.', 401)
  }
}
