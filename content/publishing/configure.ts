import { execFileSync } from 'node:child_process'
import { generateKeyPairSync, createPrivateKey, createPublicKey } from 'node:crypto'

const repository = 'Xiphe/hannesdiem'
const environment = 'Production'
const entry = 'projects/hannesdiem/cmx/publishing-private-key'
const keyId = process.env.CMX_PUBLISH_KEY_ID ?? 'publisher-v1'
const siteUrl = process.env.SITE_URL
if (!siteUrl) throw new Error('Set SITE_URL to the deployed website origin.')
const url = new URL(siteUrl)
if (
  url.protocol !== 'https:' ||
  url.pathname !== '/' ||
  url.search ||
  url.hash ||
  url.username ||
  url.password
)
  throw new Error('SITE_URL must be an HTTPS origin without a trailing slash.')

const command = (program: string, args: string[], input?: string) =>
  execFileSync(program, args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })
let privateKey: string
try {
  privateKey = command('gopass', ['show', '-o', entry]).trim()
} catch {
  const key = generateKeyPairSync('ed25519').privateKey.export({ format: 'jwk' })
  privateKey = JSON.stringify(key)
  try {
    command('gopass', ['insert', '--multiline', entry], privateKey)
  } catch {
    throw new Error(
      `Could not securely store the signing key at ${entry}. GitHub configuration was not changed.`,
    )
  }
}
try {
  const key = createPrivateKey({ key: JSON.parse(privateKey), format: 'jwk' })
  if (key.asymmetricKeyType !== 'ed25519') throw new Error()
  const publicKey = createPublicKey(key).export({ format: 'jwk' })
  const args = ['--env', environment, '--repo', repository]
  let publicKeys: Record<string, JsonWebKey> = {}
  try {
    publicKeys = JSON.parse(command('gh', ['variable', 'get', 'CMX_PUBLISH_PUBLIC_KEYS', ...args]))
  } catch {
    /* First-time configuration. */
  }
  publicKeys[keyId] = publicKey
  // The private key stays in this process, gopass, and GitHub's encrypted secret.
  command('gh', ['secret', 'set', 'CMX_PUBLISH_PRIVATE_KEY', ...args], privateKey)
  for (const [name, value] of Object.entries({
    CMX_PUBLISH_KEY_ID: keyId,
    CMX_PUBLISH_PUBLIC_KEYS: JSON.stringify(publicKeys),
    SITE_URL: url.origin,
  }))
    command('gh', ['variable', 'set', name, ...args], value)
  console.log(
    `Configured ${repository}/${environment}; signing key retained at ${entry}. No private key was printed.`,
  )
} catch {
  throw new Error(
    `Could not finish GitHub configuration. The signing key remains at ${entry}; retrying reuses it.`,
  )
}
