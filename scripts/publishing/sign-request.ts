import { appendSignature, createSignature, webcrypto } from 'http-message-sig'
import {
  signatureLifetime,
  signatureTag,
  manifestConditionHeader,
  signatureComponents,
  maxPublicationBytes,
  publicationDigest,
} from '../../contracts/publication.ts'

export async function signPublicationRequest(
  request: Request,
  key: CryptoKey,
  keyId: string,
  now = Math.floor(Date.now() / 1000),
): Promise<Request> {
  const body = new Uint8Array(await request.arrayBuffer())
  if (body.byteLength > maxPublicationBytes) throw new Error('Publication exceeds 8 MiB.')
  const headers = new Headers(request.headers)
  headers.set('Content-Type', 'application/json')
  headers.set('Content-Digest', await publicationDigest(body))
  if (request.method === 'GET') {
    // The public edge can remove HTTP cache validators before invoking Workers.
    // Carry the authenticated CMX condition in an application header instead.
    headers.set(manifestConditionHeader, headers.get('If-None-Match') ?? '""')
    headers.delete('If-None-Match')
  }
  const signed = new Request(request.url, {
    method: request.method,
    headers,
    signal: request.signal,
    body: request.method === 'GET' ? undefined : body,
    redirect: 'error',
  })
  const fields = await createSignature(signed, {
    label: 'cmx',
    components: signatureComponents(request.method),
    parameters: {
      alg: 'ed25519',
      keyid: keyId,
      tag: signatureTag,
      created: now,
      expires: now + signatureLifetime,
      nonce: crypto.randomUUID(),
    },
    signer: webcrypto.signer(key),
  })
  return new Request(signed, { headers: appendSignature(signed.headers, fields) })
}
